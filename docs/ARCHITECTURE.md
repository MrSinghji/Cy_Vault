# Architecture (Phase 0 baseline)

## Flow
USER -> CONNECT WALLET -> CRYPTOGRAPHIC LOGIN -> IDENTITY REGISTRY -> RESOLVE ROLE
-> RBAC AUTHORIZATION -> SMART CONTRACT -> OPERATION -> BLOCKCHAIN EVENT -> IMMUTABLE RECORD
-> AUDIT / VERIFICATION

## Components (as they land per feature)
- contracts/: IdentityRegistry.sol (F3), PlatformRoles/AccessControl (F4), AssetRegistry.sol (F5),
  AssetNFT.sol ERC-721 (F6-F8). RBAC is enforced on-chain via onlyRole modifiers.
- apps/api/: config (done P0), db bootstrap + schema (done P0), then auth (F2), identity service (F3),
  asset service (F5), verification services (F12-F13), indexer (F11).
- apps/web/: Next.js dashboard (F1), wallet connect (F2), admin/auditor views (F14-F15).

## Privacy boundary
On-chain: hashes, IDs, ownership/permission state, events, storage URIs.
Off-chain (DB/IPFS): names, emails, documents, serial numbers, large files.

## Data layer
SQLite (better-sqlite3) for dev/test with a portable SQL subset; PostgreSQL-compatible schema design.
audit_events table receives normalized blockchain events from the indexer (F11).
