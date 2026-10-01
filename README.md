# Decentralized Identity, RBAC & NFT Asset Ownership Platform (MVP)

Wallet-controlled identity + DID-compatible on-chain registry, smart-contract-enforced RBAC,
ERC-721 asset ownership with admin-only minting, controlled transfers, blockchain audit events,
an indexer into a SQL database, and independent verification of assets and ownership history.

## Repository layout
```
contracts/     Hardhat project: Solidity contracts, tests, deploy scripts (Phase 0+)
apps/api/      Node.js + TypeScript backend: auth, identity, asset, RBAC, verification, indexer
apps/web/      Vite + React + TypeScript + React Router frontend (dashboard shell, mock data)
docs/          Architecture notes and flows
TODO.md        Master feature checklist (one-feature-at-a-time workflow)
```

## Development workflow
For every feature: implement only that feature -> compile -> automated tests -> manual test ->
report -> git commit -> next feature. See `TODO.md` for the full plan and status tracking.

## Stack
- Frontend: Vite, React, TypeScript, React Router (custom CSS design tokens; scaffolded under `apps/web/`)
- Wallet: MetaMask / EIP-1193 provider
- Contracts: Solidity + OpenZeppelin, Hardhat (local EVM for dev/test; EVM testnet for final deployment)
- Blockchain client: ethers/viem
- Backend: Node.js + TypeScript
- Database: SQLite (dev/test via better-sqlite3), schema portable to PostgreSQL
- Metadata: IPFS-compatible storage (only CID/URI stored on-chain)

## Privacy boundary
No sensitive personal data or large files on-chain. On-chain we store only hashes, identifiers,
ownership/permission state, event records and storage references.
