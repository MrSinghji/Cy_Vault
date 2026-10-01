# Master To-Do List — Decentralized Identity, RBAC & NFT Asset Ownership Platform

Working rules (from the roadmap doc):
- One feature at a time. Implement -> compile -> automated tests -> manual test -> report -> git commit -> next.
- Never weaken authorization; enforce RBAC in smart contracts, not just UI.
- Sensitive data stays off-chain; only hashes/URIs/events on-chain.
- No jumping ahead: dependency order is Foundation -> UI -> Wallet -> Identity -> RBAC -> Assets -> NFT -> Allocation -> Transfer -> IPFS -> Audit -> Indexer -> Verification -> Admin -> Auditor -> Security -> Testing -> Deployment.

Legend: [ ] pending | [~] in progress | [x] done + tested + committed

## Phase 0 — Project Foundation  ✅ COMPLETE
- [x] P0.1 Monorepo structure: `apps/web` (Vite + React + TypeScript + React Router), `apps/api` (Node+TS), `contracts/` (Hardhat+OpenZeppelin), shared config
- [x] P0.2 Environment/config system (.env handling, chain RPC settings, network IDs)
- [x] P0.3 Database layer (SQLite via better-sqlite3 for dev/test; schema designed to port to PostgreSQL)
- [x] P0.4 Smart-contract project compiles; base test harness runs green (Hardhat local network)
- [x] P0.5 Docs: README, ARCHITECTURE, this TODO; git committed
- [x] P0.6 Test report for Phase 0 delivered and approved

## Feature 1 — Application UI (mock data)  ✅ COMPLETE (commit: feat(F1): application UI shell)
- [x] F1.1 Dashboard shell: sidebar + header, responsive, nav for Identities, Assets, Roles, Audit Logs, Verification, Settings
- [x] F1.2 Pages with mock data + shared domain types (`src/types/models.ts`); routes /, /login, /dashboard, /identities, /assets, /roles, /audit, /verify, /settings
- [x] F1.3 Reusable components: Card, StatCard, Badge (+ status tone util), DataTable, PageHeader
- [x] F1.4 Verification: lint 0 errors, tsc clean, production build OK, all 9 routes serve 200, no Phase-0 regressions (contracts 5/5, api 4/4)
- Stack note: frontend is **Vite + React + TypeScript + React Router** (offline environment could not reliably scaffold Next.js; same component model). This is the project's canonical frontend stack. Wallet/auth buttons are disabled placeholders by design (F2 scope).

## Feature 2 — Wallet Authentication
- [x] F2.1 Connect/disconnect wallet, account + network detection (MetaMask via window.ethereum / wagmi or ethers) — **DONE this step** (`src/wallet/eip1193.ts`, `src/wallet/connect.ts`, `src/wallet/useWallet.ts`, `components/WalletButton.tsx`; wired into topbar, Login and Settings; viem used for chainId decoding; 15 unit tests green)
- [ ] F2.2 SIWE-style cryptographic login: nonce -> EIP-4361/personal_sign -> verify signature server-side -> session
- [ ] F2.3 Tests: signature verification unit tests, replay/invalid-signature rejection

## Feature 3 — Identity Registry
- [ ] F3.1 `IdentityRegistry.sol`: create/resolve/verify/activate/deactivate identity records (wallet, hash/ref, status, timestamps) + events
- [ ] F3.2 Backend service + endpoints wrapping the contract; DID-compatible identifier generation
- [ ] F3.3 Contract tests (create, duplicate, deactivate, event emission) + API tests

## Feature 4 — RBAC
- [ ] F4.1 AccessControl: ADMIN, MANAGER, AUDITOR, USER roles (OpenZeppelin AccessControl); grant/revoke + events
- [ ] F4.2 Enforce permissions inside every privileged contract function (onlyRole modifiers)
- [ ] F4.3 Tests: each role's allowed/denied matrix; unauthorized calls revert

## Feature 5 — Asset Registration
- [ ] F5.1 `AssetRegistry.sol`: asset ID, name, category, description, serial hash, metadata ref, status; link to NFT tokenId
- [ ] F5.2 Backend CRUD (off-chain fields stored in DB; hashes/refs on-chain) + search/details endpoints
- [ ] F5.3 Tests: registration, status transitions, unauthorized creation rejected

## Feature 6 — NFT Contract
- [ ] F6.1 `AssetNFT.sol`: ERC-721, admin-only minting, tokenURI support, events
- [ ] F6.2 Tests: mint by admin OK, mint by non-admin reverts, ownership queries, URI behavior

## Feature 7 — NFT Allocation
- [ ] F7.1 Allocate minted NFTs to verified identities/wallets (admin-controlled safeTransfer/mint-to-verified)
- [ ] F7.2 "My assets" view for users showing owned tokens linked to registry assets
- [ ] F7.3 Tests: allocation to registered vs unregistered wallet, event/index correctness

## Feature 8 — Ownership Transfer
- [ ] F8.1 Authorized transfers only (owner or authorized role); reject unauthorized attempts
- [ ] F8.2 Ownership-change events emitted and surfaced in UI history
- [ ] F8.3 Tests: happy path transfer, non-owner revert, double-transfer guard

## Feature 9 — Metadata / IPFS
- [ ] F9.1 Upload NFT metadata JSON to IPFS (pinata/local IPFS node abstraction); store only CID/URI on-chain
- [ ] F9.2 Hashing utilities for serial numbers/documents; off-chain storage of private files
- [ ] F9.3 Tests: CID resolution, URI composition, no sensitive data on-chain

## Feature 10 — Blockchain Audit Events
- [ ] F10.1 Standardized events across all contracts: identity created, role granted/revoked, asset created, minted, allocated, transferred, permission updated
- [ ] F10.2 Event payload spec (actor, subject, action, timestamp context)
- [ ] F10.3 Tests: each flow emits expected event(s) with correct args

## Feature 11 — Blockchain Indexer
- [ ] F11.1 Event listener service (viem/ethers watchEvents), reconnect/backfill logic
- [ ] F11.2 Normalize + persist query-friendly audit rows in DB (tx hash, block, event, actor, target)
- [ ] F11.3 Tests: simulated events indexed exactly once; restart-resilience check

## Feature 12 — Asset Verification
- [ ] F12.1 Verification endpoint/UI: NFT exists, current owner, asset status, identity association, tx info
- [ ] F12.2 Tests: valid/invalid/tampered-reference cases

## Feature 13 — Identity Verification
- [ ] F13.1 Verify identity exists, active, expected role/permission state (on-chain read + registry cross-check)
- [ ] F13.2 Tests: inactive identity, wrong role, missing identity cases

## Feature 14 — Admin Dashboard
- [ ] F14.1 Admin pages/actions: manage identities, roles, assets, NFTs, permissions (wired to real APIs)
- [ ] F14.2 Role-gated UI + server-side role checks
- [ ] F14.3 Tests: admin flows end-to-end on local chain

## Feature 15 — Auditor Dashboard
- [ ] F15.1 Read-only audit search with filters (date, actor, event type, asset/token)
- [ ] F15.2 Transaction history + ownership history views
- [ ] F15.3 Tests: auditor can read but cannot mutate (contract + API level)

## Feature 16 — Security Hardening
- [ ] F16.1 Negative test suite: unauthorized mint/transfer/role change, input validation, replay concerns
- [ ] F16.2 Reentrancy review + guards where applicable; emergency controls (Pausable) where justified
- [ ] F16.3 Report of findings + fixes

## Feature 17 — Complete Testing
- [ ] F17.1 Unit + contract + API + integration suites green in one command
- [ ] F17.2 Playwright E2E covering the Section 14 demo flow
- [ ] F17.3 Regression pass over all prior features

## Feature 18 — Final Integration & Deployment
- [ ] F18.1 Deploy contracts to EVM testnet (e.g., Sepolia) + verified sources
- [ ] F18.2 Deploy web/API + indexer; final env docs
- [ ] F18.3 Full demo run + documentation + final report

---
## How I will work (per-feature loop)
1. Inspect current repo state and previous commits.
2. Implement ONLY the current to-do item.
3. Compile + run automated tests (Hardhat tests for contracts, node --test/vitest for backend, `npm run web:build` — i.e. eslint + `tsc -b --noEmit` + `vite build` — for the Vite frontend).
4. Manual/runtime smoke test where applicable (local Hardhat node + scripts).
5. Deliver a written test report: files changed, tests run, results, known issues.
6. `git commit` with message `feat(PX/FN): <summary>`.
7. Wait for your approval before starting the next item.

## Local-chain strategy note
No public testnet keys are available in this environment, so development/testing uses the Hardhat in-process/local EVM (identical Solidity/EVM behavior). Feature 18 swaps the RPC/network config to Sepolia when you provide a deployer key + RPC URL — no code changes needed beyond config.
