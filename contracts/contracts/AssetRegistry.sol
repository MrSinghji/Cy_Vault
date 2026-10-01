// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {IAccessControl} from "@openzeppelin/contracts/access/IAccessControl.sol";

/// @title IAccessManager
/// @notice Minimal interface for the platform AccessManager (F4). Declares only the
///         four canonical keccak256("<NAME>_ROLE") hashes so dependent contracts
///         (AssetRegistry, AssetNFT) provably share the SAME role constants —
///         one RBAC system, no drifting copies.
interface IAccessManager is IAccessControl {
    function ADMIN_ROLE() external view returns (bytes32);
    function MANAGER_ROLE() external view returns (bytes32);
    function AUDITOR_ROLE() external view returns (bytes32);
    function USER_ROLE() external view returns (bytes32);
}

contract AssetRegistry {
    /// @dev Platform AccessManager holding canonical roles. Immutable per deployment.
    IAccessManager public immutable accessManager;

    enum Status {
        Registered, // created, awaiting production/issuance
        Active,     // live asset
        Suspended,  // temporarily disabled by admin
        Retired     // permanently retired
    }

    struct Asset {
        uint256 assetId;      // unique sequential id (starts at 1; 0 = sentinel "missing")
        string name;          // display name (non-sensitive)
        string category;      // display category (non-sensitive)
        string description;   // short non-sensitive description
        bytes32 serialHash;   // keccak256(rawSerial || salt) — raw value NEVER stored on-chain
        bytes32 metadataRef;  // reference hash binding off-chain metadata/doc (URI/CID arrives in F9)
        Status status;
        uint256 nftTokenId;   // 0 = not linked; set once via linkNft (F6 integration point)
        uint256 createdAt;
        uint256 updatedAt;
    }

    uint256 private _nextAssetId = 1;
    mapping(uint256 => Asset) private _assets;
    mapping(bytes32 => uint256) private _serialHashToAssetId; // duplicate-serial guard
    mapping(uint256 => uint256) private _tokenIdToAssetId;    // reverse NFT lookup

    event AssetRegistered(
        uint256 indexed assetId,
        bytes32 indexed serialHash,
        string name,
        string category,
        address registeredBy,
        uint256 timestamp
    );
    event AssetUpdated(uint256 indexed assetId, bytes32 newSerialHash, bytes32 newMetadataRef, uint256 timestamp);
    event AssetStatusChanged(uint256 indexed assetId, Status oldStatus, Status newStatus, uint256 timestamp);
    event AssetNftLinked(uint256 indexed assetId, uint256 indexed tokenId, uint256 timestamp);

    error AssetNotFound(uint256 assetId);
    error ZeroSerialHash();
    error EmptyName();
    error DuplicateSerialHash(bytes32 serialHash);
    error NftAlreadyLinked(uint256 assetId);
    error TokenAlreadyLinked(uint256 tokenId);
    error NotProvisioner();
    error NotAdmin();

    modifier onlyProvisioner() {
        if (!accessManager.hasRole(accessManager.ADMIN_ROLE(), msg.sender)
            && !accessManager.hasRole(accessManager.MANAGER_ROLE(), msg.sender)) {
            revert NotProvisioner();
        }
        _;
    }

    modifier onlyAdmin() {
        if (!accessManager.hasRole(accessManager.ADMIN_ROLE(), msg.sender)) revert NotAdmin();
        _;
    }

    /// @param manager platform AccessManager address (must be non-zero — single RBAC source).
    constructor(address manager) {
        require(manager != address(0), "accessManager required");
        accessManager = IAccessManager(manager);
    }

    /// @notice Register a new asset. ADMIN/MANAGER only. Callers pass the serial
    ///         HASH (keccak256(rawSerial||salt)) — never the raw serial number.
    function registerAsset(
        string calldata name,
        string calldata category,
        string calldata description,
        bytes32 serialHash,
        bytes32 metadataRef
    ) external onlyProvisioner returns (uint256 assetId) {
        if (bytes(name).length == 0) revert EmptyName();
        if (serialHash == bytes32(0)) revert ZeroSerialHash();
        if (_serialHashToAssetId[serialHash] != 0) revert DuplicateSerialHash(serialHash);

        assetId = _nextAssetId++;
        _assets[assetId] = Asset({
            assetId: assetId,
            name: name,
            category: category,
            description: description,
            serialHash: serialHash,
            metadataRef: metadataRef,
            status: Status.Registered,
            nftTokenId: 0,
            createdAt: block.timestamp,
            updatedAt: block.timestamp
        });
        _serialHashToAssetId[serialHash] = assetId;

        emit AssetRegistered(assetId, serialHash, name, category, msg.sender, block.timestamp);
    }

    /// @notice Read a full asset record. Reverts when unknown so callers cannot
    ///         confuse "missing" with a zero-filled struct.
    function getAsset(uint256 assetId) external view returns (Asset memory) {
        Asset storage a = _assets[assetId];
        if (a.assetId == 0) revert AssetNotFound(assetId);
        return a;
    }

    /// @notice Lightweight existence check used by verification UIs (F12).
    function assetExists(uint256 assetId) external view returns (bool) {
        return _assets[assetId].assetId != 0;
    }

    /// @notice Resolve an asset by its serial hash (holders can prove knowledge of
    ///         a serial without exposing it on-chain). Returns 0 when unknown.
    function assetIdBySerialHash(bytes32 serialHash) external view returns (uint256) {
        return _serialHashToAssetId[serialHash];
    }

    /// @notice Update mutable fields. Serial-hash rotation allowed; duplicate
    ///         guard applies against OTHER assets. ADMIN/MANAGER only.
    function updateAsset(
        uint256 assetId,
        string calldata name,
        string calldata category,
        string calldata description,
        bytes32 serialHash,
        bytes32 metadataRef
    ) external onlyProvisioner {
        Asset storage a = _assets[assetId];
        if (a.assetId == 0) revert AssetNotFound(assetId);
        if (bytes(name).length == 0) revert EmptyName();
        if (serialHash == bytes32(0)) revert ZeroSerialHash();
        uint256 existing = _serialHashToAssetId[serialHash];
        if (existing != 0 && existing != assetId) revert DuplicateSerialHash(serialHash);

        if (a.serialHash != serialHash) {
            delete _serialHashToAssetId[a.serialHash];
            _serialHashToAssetId[serialHash] = assetId;
        }
        a.name = name;
        a.category = category;
        a.description = description;
        a.serialHash = serialHash;
        a.metadataRef = metadataRef;
        a.updatedAt = block.timestamp;

        emit AssetUpdated(assetId, serialHash, metadataRef, block.timestamp);
    }

    /// @notice Lifecycle status transitions. ADMIN/MANAGER only. Idempotent no-op
    ///         when unchanged (no event spam).
    function setStatus(uint256 assetId, Status newStatus) external onlyProvisioner {
        Asset storage a = _assets[assetId];
        if (a.assetId == 0) revert AssetNotFound(assetId);
        Status old = a.status;
        if (old == newStatus) return;
        a.status = newStatus;
        a.updatedAt = block.timestamp;
        emit AssetStatusChanged(assetId, old, newStatus, block.timestamp);
    }

    /// @notice Link an asset to its NFT token id. One NFT per asset, one asset per
    ///         token, set-once semantics. ADMIN only (the F6 NFT flow calls this after minting).
    function linkNft(uint256 assetId, uint256 tokenId) external onlyAdmin {
        Asset storage a = _assets[assetId];
        if (a.assetId == 0) revert AssetNotFound(assetId);
        if (a.nftTokenId != 0) revert NftAlreadyLinked(assetId);
        if (_tokenIdToAssetId[tokenId] != 0) revert TokenAlreadyLinked(tokenId);
        a.nftTokenId = tokenId;
        _tokenIdToAssetId[tokenId] = assetId;
        a.updatedAt = block.timestamp;
        emit AssetNftLinked(assetId, tokenId, block.timestamp);
    }

    /// @notice Reverse lookup for the NFT contract/UI: which asset does this token
    ///         represent? 0 when unlinked.
    function assetIdForNft(uint256 tokenId) external view returns (uint256) {
        return _tokenIdToAssetId[tokenId];
    }

    /// @notice Total registered assets (sequential ids run 1..count).
    function assetCount() external view returns (uint256) {
        return _nextAssetId - 1;
    }
}
