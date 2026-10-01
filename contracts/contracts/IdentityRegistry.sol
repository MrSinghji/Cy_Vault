// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {IAccessControl} from "@openzeppelin/contracts/access/IAccessControl.sol";
import "./PlatformRoles.sol";


/// @title IdentityRegistry
/// @notice Wallet-anchored, blockchain-backed identity registry (Feature 3).
///         One identity per wallet. Only non-sensitive data is stored on-chain:
///         the wallet address, a reference hash binding the identity to off-chain
///         records, an active flag and timestamps. Full DID/VC ecosystems are NOT
///         claimed — this is a minimal DID-compatible identifier derived from the
///         wallet address + creation block ("did:platform:<chainId>:<address>").
///
/// Feature 4 RBAC integration (backward compatible):
///   - If constructed with an AccessManager address, privileged actions are
///     authorized against the platform roles:
///       createIdentity / updateReference : ADMIN_ROLE or MANAGER_ROLE
///       deactivate / activate            : ADMIN_ROLE only
///   - If constructed with the zero access-manager address (the original F3
///     constructor form), it falls back to OZ Ownable semantics exactly as in
///     Feature 3 (owner-only), preserving all prior behavior and tests.
///   - The access manager is immutable per deployment, so role state can never
///     be swapped mid-life by a later admin.
contract IdentityRegistry is Ownable {
    /// @dev Platform AccessManager holding canonical roles (may be address(0) = legacy owner-only mode).
    address public immutable accessManager;

    /// @dev Canonical role hashes — identical keccak256 values as PlatformRoles / AccessManager.
    bytes32 private constant ADMIN_ROLE = keccak256("ADMIN_ROLE");
    bytes32 private constant MANAGER_ROLE = keccak256("MANAGER_ROLE");

    event AccessManagerModeSet(address indexed accessManager);

    error AdminRoleRequired();
    error ManagerOrAdminRoleRequired();
    struct Identity {
        address wallet;      // wallet controlling the identity
        bytes32 refHash;     // keccak256 reference binding identity to off-chain record (no PII)
        bool active;         // status flag
        uint256 createdAt;   // block.timestamp at creation
        uint256 updatedAt;   // block.timestamp of last status change
    }

    /// @dev id => identity record. `id` is the wallet address (one identity per wallet).
    mapping(address => Identity) private _identities;
    address[] private _idList;

    // ---- Events (consumed by the indexer in Feature 11) ----
    event IdentityCreated(address indexed wallet, bytes32 indexed id, bytes32 refHash, uint256 createdAt);
    event IdentityDeactivated(address indexed wallet, bytes32 indexed id, uint256 timestamp);
    event IdentityReactivated(address indexed wallet, bytes32 indexed id, uint256 timestamp);
    event IdentityRefUpdated(address indexed wallet, bytes32 indexed id, bytes32 newRefHash, uint256 timestamp);

    error IdentityAlreadyExists(address wallet);
    error IdentityNotFound(address wallet);
    error ZeroAddressNotAllowed();
    error EmptyReference();

    /// @notice Deploy the registry.
    /// @dev Feature 4: `manager` is the platform AccessManager whose ADMIN/MANAGER
    ///      roles authorize privileged actions. Passing address(0) selects the
    ///      original Feature 3 behavior exactly (OZ Ownable, owner-only), which
    ///      keeps all pre-RBAC deployments and tests valid.
    constructor(address initialOwner, address manager) Ownable(initialOwner) {
        accessManager = manager;
        emit AccessManagerModeSet(manager);
    }

    /// @dev ADMIN or MANAGER may create identities / rotate references (RBAC mode);
    ///      contract owner in legacy F3 mode.
    modifier onlyProvisioner() {
        if (accessManager == address(0)) {
            _checkOwner(); // legacy F3 behavior preserved exactly
        } else {
            IAccessControl am = IAccessControl(accessManager);
            bytes32 adminRole = ADMIN_ROLE;
            bytes32 managerRole = MANAGER_ROLE;
            if (!am.hasRole(adminRole, msg.sender) && !am.hasRole(managerRole, msg.sender)) {
                revert ManagerOrAdminRoleRequired();
            }
        }
        _;
    }

    /// @dev ADMIN only may activate/deactivate identities (RBAC mode);
    ///      contract owner in legacy F3 mode.
    modifier onlyAdminRole() {
        if (accessManager == address(0)) {
            _checkOwner();
        } else {
            IAccessControl am = IAccessControl(accessManager);
            if (!am.hasRole(ADMIN_ROLE, msg.sender)) revert AdminRoleRequired();
        }
        _;
    }

    /// @notice Create an identity for `wallet`. ADMIN/MANAGER (RBAC mode) or owner (legacy).
    /// @dev Rejects zero address and duplicate wallets (one identity per wallet rule).
    function createIdentity(address wallet, bytes32 refHash) external onlyProvisioner returns (bytes32 id) {
        if (wallet == address(0)) revert ZeroAddressNotAllowed();
        if (refHash == bytes32(0)) revert EmptyReference();
        if (_identities[wallet].wallet != address(0)) revert IdentityAlreadyExists(wallet);

        _identities[wallet] = Identity({
            wallet: wallet,
            refHash: refHash,
            active: true,
            createdAt: block.timestamp,
            updatedAt: block.timestamp
        });
        _idList.push(wallet);

        emit IdentityCreated(wallet, idOf(wallet), refHash, block.timestamp);
        return idOf(wallet);
    }

    /// @notice Full record retrieval. Reverts when unknown so callers cannot confuse
    ///         "missing" with "zero-filled struct".
    function getIdentity(address wallet) external view returns (Identity memory) {
        Identity storage rec = _identities[wallet];
        if (rec.wallet == address(0)) revert IdentityNotFound(wallet);
        return rec;
    }

    /// @notice Lightweight verification check: exists AND active.
    function verifyIdentity(address wallet) external view returns (bool verified, bytes32 id, uint256 createdAt) {
        Identity storage rec = _identities[wallet];
        verified = rec.wallet != address(0) && rec.active;
        id = idOf(wallet);
        createdAt = rec.createdAt;
    }

    /// @notice Deactivate an identity. Owner (admin) only — matches the platform rule
    ///         that only authorized administrators may deactivate identities.
    function deactivateIdentity(address wallet) external onlyAdminRole {
        Identity storage rec = _identities[wallet];
        if (rec.wallet == address(0)) revert IdentityNotFound(wallet);
        if (!rec.active) return; // idempotent no-op (still valid state, no event spam)
        rec.active = false;
        rec.updatedAt = block.timestamp;
        emit IdentityDeactivated(wallet, idOf(wallet), block.timestamp);
    }

    /// @notice Reactivate a previously deactivated identity. Owner (admin) only.
    function activateIdentity(address wallet) external onlyAdminRole {
        Identity storage rec = _identities[wallet];
        if (rec.wallet == address(0)) revert IdentityNotFound(wallet);
        if (rec.active) return;
        rec.active = true;
        rec.updatedAt = block.timestamp;
        emit IdentityReactivated(wallet, idOf(wallet), block.timestamp);
    }

    /// @notice Rotate the off-chain reference binding (e.g. after metadata update). Owner only.
    function updateReference(address wallet, bytes32 newRefHash) external onlyProvisioner {
        Identity storage rec = _identities[wallet];
        if (rec.wallet == address(0)) revert IdentityNotFound(wallet);
        if (newRefHash == bytes32(0)) revert EmptyReference();
        rec.refHash = newRefHash;
        rec.updatedAt = block.timestamp;
        emit IdentityRefUpdated(wallet, idOf(wallet), newRefHash, block.timestamp);
    }

    /// @notice Minimal DID-compatible identifier: did:platform:<chainId>:<wallet>.
    ///         Not a full W3C DID method — deliberately scoped small.
    function idOf(address wallet) public view returns (bytes32) {
        return keccak256(abi.encodePacked("did:platform:", block.chainid, ":", wallet));
    }

    function identityCount() external view returns (uint256) {
        return _idList.length;
    }

    function identityAt(uint256 index) external view returns (address) {
        require(index < _idList.length, "index out of range");
        return _idList[index];
    }
}
