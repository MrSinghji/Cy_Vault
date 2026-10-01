// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

/// @title IdentityRegistry
/// @notice Wallet-anchored, blockchain-backed identity registry (Feature 3).
///         One identity per wallet. Only non-sensitive data is stored on-chain:
///         the wallet address, a reference hash binding the identity to off-chain
///         records, an active flag and timestamps. Full DID/VC ecosystems are NOT
///         claimed — this is a minimal DID-compatible identifier derived from the
///         wallet address + creation block ("did:platform:<chainId>:<address>").
contract IdentityRegistry is Ownable {
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

    constructor(address initialOwner) Ownable(initialOwner) {}

    /// @notice Create an identity for `wallet`. Owner (admin) only.
    /// @dev Rejects zero address and duplicate wallets (one identity per wallet rule).
    function createIdentity(address wallet, bytes32 refHash) external onlyOwner returns (bytes32 id) {
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
    function deactivateIdentity(address wallet) external onlyOwner {
        Identity storage rec = _identities[wallet];
        if (rec.wallet == address(0)) revert IdentityNotFound(wallet);
        if (!rec.active) return; // idempotent no-op (still valid state, no event spam)
        rec.active = false;
        rec.updatedAt = block.timestamp;
        emit IdentityDeactivated(wallet, idOf(wallet), block.timestamp);
    }

    /// @notice Reactivate a previously deactivated identity. Owner (admin) only.
    function activateIdentity(address wallet) external onlyOwner {
        Identity storage rec = _identities[wallet];
        if (rec.wallet == address(0)) revert IdentityNotFound(wallet);
        if (rec.active) return;
        rec.active = true;
        rec.updatedAt = block.timestamp;
        emit IdentityReactivated(wallet, idOf(wallet), block.timestamp);
    }

    /// @notice Rotate the off-chain reference binding (e.g. after metadata update). Owner only.
    function updateReference(address wallet, bytes32 newRefHash) external onlyOwner {
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
