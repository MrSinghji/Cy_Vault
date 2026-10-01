// Shared domain models for the Decentralized Identity, RBAC & NFT Asset Ownership Platform.
// F1: types only (mock data lives in src/mock/data.ts). Backend will reuse these shapes later.

export type Role = 'ADMIN' | 'MANAGER' | 'AUDITOR' | 'USER';

export type IdentityStatus = 'ACTIVE' | 'INACTIVE' | 'PENDING';

export type AssetStatus = 'REGISTERED' | 'MINTED' | 'ALLOCATED' | 'TRANSFERRED' | 'ARCHIVED';

export interface Identity {
  id: string;
  did: string; // DID-compatible identifier (placeholder until F3)
  wallet: string;
  name: string; // off-chain display data only
  role: Role;
  status: IdentityStatus;
  createdAt: string; // ISO date
}

export interface Asset {
  id: string;
  name: string;
  category: string;
  description: string;
  serialHash: string; // hash of serial number (sensitive value stays off-chain)
  metadataRef: string; // IPFS CID / URI placeholder until F9
  status: AssetStatus;
  tokenId?: string; // linked NFT token id (placeholder until F6/F7)
  ownerWallet?: string;
}

export interface AuditEvent {
  id: string;
  type: string; // e.g. IDENTITY_CREATED, ROLE_GRANTED, NFT_MINTED, OWNERSHIP_TRANSFERRED
  actor: string;
  target: string;
  txHash: string; // placeholder until F10/F11
  blockNumber: number;
  timestamp: string; // ISO date
}

export interface RoleAssignmentSummary {
  role: Role;
  description: string;
  memberCount: number;
  permissions: string[];
}
