-- Phase 0 database schema (portable subset: works on SQLite now, PostgreSQL later).
-- Application data & indexes live here; the blockchain remains the source of truth for
-- identity/RBAC/NFT state. Rows below are caches/indexes of on-chain facts.

CREATE TABLE IF NOT EXISTS identities (
  id TEXT PRIMARY KEY,                -- internal UUID
  did TEXT UNIQUE,                    -- DID-compatible identifier (Feature 3)
  wallet TEXT NOT NULL,               -- lowercased EVM address
  identity_hash TEXT,                 -- keccak hash of off-chain identity document
  status TEXT NOT NULL DEFAULT 'pending', -- pending|active|inactive
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT
);

CREATE TABLE IF NOT EXISTS roles (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  wallet TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('ADMIN','MANAGER','AUDITOR','USER')),
  granted_by TEXT,
  revoked_at TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS assets (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  category TEXT,
  description TEXT,
  serial_hash TEXT,                   -- hash only; raw serial stays off-chain
  metadata_ref TEXT,                  -- IPFS CID / URI
  status TEXT NOT NULL DEFAULT 'registered', -- registered|minted|allocated|transferred|retired
  token_id INTEGER,                   -- linked NFT tokenId once minted
  nft_contract TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS auth_nonces (
  wallet TEXT PRIMARY KEY,
  nonce TEXT NOT NULL,
  expires_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS audit_events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  tx_hash TEXT,
  block_number INTEGER,
  contract_address TEXT,
  event_name TEXT NOT NULL,
  actor TEXT,
  subject TEXT,
  payload TEXT,                       -- JSON
  logged_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_audit_actor ON audit_events(actor);
CREATE INDEX IF NOT EXISTS idx_audit_event ON audit_events(event_name);
CREATE INDEX IF NOT EXISTS idx_assets_status ON assets(status);
