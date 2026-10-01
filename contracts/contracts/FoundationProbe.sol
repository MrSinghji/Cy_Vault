// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "./PlatformRoles.sol";

/// @notice Phase 0 test probe only: concrete instantiation of PlatformRoles.
/// Real platform contracts (IdentityRegistry, AssetRegistry, AssetNFT) arrive in Features 3-6.
contract FoundationProbe is PlatformRoles {
    constructor() {
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        // Platform convention: the deployer/admin also explicitly holds ADMIN_ROLE.
        _grantRole(ADMIN_ROLE, msg.sender);
    }
}
