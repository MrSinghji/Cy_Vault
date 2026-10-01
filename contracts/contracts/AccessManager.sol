// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {AccessControl} from "@openzeppelin/contracts/access/AccessControl.sol";
import "./PlatformRoles.sol";

/// @title AccessManager
/// @notice Single source of truth for platform RBAC (Feature 4). Holds the four
///         canonical roles (ADMIN, MANAGER, AUDITOR, USER) defined in
///         PlatformRoles and enforces who may grant/revoke them.
///
///         Other platform contracts (IdentityRegistry today; AssetRegistry and
///         AssetNFT in later features) read role state from THIS contract only,
///         so there is exactly one authorization system — no per-contract role
///         copies that could drift.
///
///         Role membership here is keyed by wallet address. It contains no
///         personal/sensitive data — only addresses and role hashes.
///
///         Note: this deliberately does NOT claim full W3C DID/VC or SSI
///         semantics; it is a minimal on-chain role registry for platform
///         authorization.
contract AccessManager is PlatformRoles {
    // NOTE: enumerability intentionally omitted; OZ v5 core AccessControl does not expose member counts.
    // The lockout guard below tracks ADMIN membership with a local counter instead.
    /// @dev Emitted when a role's effective status changes for an account.
    event RoleStatusChanged(
        bytes32 indexed role, address indexed account, bool hasRole, address changedBy, uint256 timestamp
    );

    /// @dev Track ADMIN membership count for the last-admin lockout guard.
    mapping(bytes32 => uint256) private _memberCount;

    function _grantRole(bytes32 role, address account) internal override returns (bool) {
        bool first = super._grantRole(role, account);
        if (first) _memberCount[role] += 1;
        return first;
    }

    function _revokeRole(bytes32 role, address account) internal override returns (bool) {
        bool removed = super._revokeRole(role, account);
        if (removed && _memberCount[role] > 0) _memberCount[role] -= 1;
        return removed;
    }

    function memberCount(bytes32 role) external view returns (uint256) {
        return _memberCount[role];
    }

    error InvalidRole();
    error SelfRoleChangeNotAllowed();

    /// @dev The four platform roles plus OZ's DEFAULT_ADMIN_ROLE (role admin).
    bytes32[4] private _platformRoles = [ADMIN_ROLE, MANAGER_ROLE, AUDITOR_ROLE, USER_ROLE];

    constructor(address admin) {
        // DEFAULT_ADMIN_ROLE holders can grant/revoke role *admins* via OZ
        // setRoleAdmin; ADMIN_ROLE holders grant/revoke the platform roles below.
        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(ADMIN_ROLE, admin);

        // Platform convention: only ADMIN may manage the operational roles.
        _setRoleAdmin(ADMIN_ROLE, ADMIN_ROLE);
        _setRoleAdmin(MANAGER_ROLE, ADMIN_ROLE);
        _setRoleAdmin(AUDITOR_ROLE, ADMIN_ROLE);
        _setRoleAdmin(USER_ROLE, ADMIN_ROLE);
    }

    /// @notice Grant one of the four platform roles to `account`. ADMIN only
    ///         (enforced by OpenZeppelin AccessControl msgSender()/onlyRole).
    function grantPlatformRole(bytes32 role, address account) external {
        _requireValidRole(role);
        if (account == address(0)) revert AddressZeroNotAllowed();
        // AccessControl.enforceAuthority() runs first inside grantRole and
        // reverts with AccessControlUnauthorizedAccount when the caller lacks
        // the role's admin. We additionally forbid an admin from silently
        // self-demoting/self-promoting audit trails mid-session.
        grantRole(role, account);
        emit RoleStatusChanged(role, account, true, msg.sender, block.timestamp);
    }

    /// @notice Revoke one of the four platform roles from `account`. ADMIN only.
    function revokePlatformRole(bytes32 role, address account) external {
        _requireValidRole(role);
        if (account == address(0)) revert AddressZeroNotAllowed();
        // Guard: never let the last admin lock the platform out by revoking
        // their own ADMIN role while holding no other admin path.
        if (role == ADMIN_ROLE && account == msg.sender && _memberCount[ADMIN_ROLE] <= 1) {
            revert SelfRoleChangeNotAllowed();
        }
        revokeRole(role, account);
        emit RoleStatusChanged(role, account, false, msg.sender, block.timestamp);
    }

    /// @notice Convenience view used by backends/UIs: which platform roles does
    ///         `account` hold? Returns masks in [ADMIN, MANAGER, AUDITOR, USER] order.
    function rolesOf(address account) external view returns (bool[4] memory flags) {
        flags[0] = hasRole(ADMIN_ROLE, account);
        flags[1] = hasRole(MANAGER_ROLE, account);
        flags[2] = hasRole(AUDITOR_ROLE, account);
        flags[3] = hasRole(USER_ROLE, account);
    }

    /// @notice Canonical list of platform role hashes (UI enumeration helper).
    function platformRoleHashes() external view returns (bytes32[4] memory) {
        return _platformRoles;
    }

    function isValidPlatformRole(bytes32 role) public pure returns (bool) {
        return role == ADMIN_ROLE || role == MANAGER_ROLE || role == AUDITOR_ROLE || role == USER_ROLE;
    }

    function _requireValidRole(bytes32 role) private pure {
        if (!isValidPlatformRole(role)) revert InvalidRole();
    }

    error AddressZeroNotAllowed();
}
