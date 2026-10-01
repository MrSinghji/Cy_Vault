// Mock data ONLY — Feature 1. No wallet, auth, blockchain or backend calls here.
import type { Identity, Asset, AuditEvent, RoleAssignmentSummary } from '../types/models';

export const mockIdentities: Identity[] = [
  { id: 'id-1', did: 'did:example:admin001', wallet: '0x1000…AA01', name: 'Alice Admin', role: 'ADMIN', status: 'ACTIVE', createdAt: '2026-09-02' },
  { id: 'id-2', did: 'did:example:mgr002', wallet: '0x2000…BB02', name: 'Marcus Manager', role: 'MANAGER', status: 'ACTIVE', createdAt: '2026-09-05' },
  { id: 'id-3', did: 'did:example:aud003', wallet: '0x3000…CC03', name: 'Ava Auditor', role: 'AUDITOR', status: 'ACTIVE', createdAt: '2026-09-08' },
  { id: 'id-4', did: 'did:example:user004', wallet: '0x4000…DD04', name: 'Ben User', role: 'USER', status: 'PENDING', createdAt: '2026-09-11' },
  { id: 'id-5', did: 'did:example:user005', wallet: '0x5000…EE05', name: 'Chloe User', role: 'USER', status: 'INACTIVE', createdAt: '2026-09-14' },
];

export const mockAssets: Asset[] = [
  { id: 'AST-1001', name: 'Industrial Sensor X200', category: 'Hardware', description: 'IoT temperature/pressure sensor unit.', serialHash: '0x9f2a…c17d', metadataRef: 'ipfs://QmMock…X200', status: 'ALLOCATED', tokenId: '#41', ownerWallet: '0x4000…DD04' },
  { id: 'AST-1002', name: 'Laptop Dell Latitude 7440', category: 'IT Equipment', description: 'Corporate laptop, asset tag LT-7440-02.', serialHash: '0x1b8e…44a0', metadataRef: 'ipfs://QmMock…7440', status: 'MINTED', tokenId: '#42' },
  { id: 'AST-1003', name: 'Office Desk Lease Contract', category: 'Document', description: 'Digitised lease agreement, unit B-12.', serialHash: '0x77cd…9e02', metadataRef: 'ipfs://QmMock…LEASE', status: 'REGISTERED' },
  { id: 'AST-1004', name: 'Projector Epson EB-1795F', category: 'Hardware', description: 'Conference-room projector.', serialHash: '0xa0f3…12bb', metadataRef: 'ipfs://QmMock…PROJ', status: 'TRANSFERRED', tokenId: '#43', ownerWallet: '0x2000…BB02' },
  { id: 'AST-1005', name: 'Warehouse Forklift FL-09', category: 'Vehicle', description: 'Electric forklift, serial on file.', serialHash: '0x5e6d…08af', metadataRef: 'ipfs://QmMock…FL09', status: 'ARCHIVED' },
];

export const mockAuditEvents: AuditEvent[] = [
  { id: 'ev-1', type: 'IDENTITY_CREATED', actor: '0x1000…AA01', target: 'did:example:user004', txHash: '0xtxmock…0001', blockNumber: 1041221, timestamp: '2026-09-11T09:12:04Z' },
  { id: 'ev-2', type: 'ROLE_GRANTED', actor: '0x1000…AA01', target: 'USER → 0x4000…DD04', txHash: '0xtxmock…0002', blockNumber: 1041225, timestamp: '2026-09-11T09:15:30Z' },
  { id: 'ev-3', type: 'ASSET_REGISTERED', actor: '0x2000…BB02', target: 'AST-1001', txHash: '0xtxmock…0003', blockNumber: 1041900, timestamp: '2026-09-12T14:02:11Z' },
  { id: 'ev-4', type: 'NFT_MINTED', actor: '0x1000…AA01', target: 'token #41 (AST-1001)', txHash: '0xtxmock…0004', blockNumber: 1041930, timestamp: '2026-09-12T14:20:45Z' },
  { id: 'ev-5', type: 'NFT_ALLOCATED', actor: '0x1000…AA01', target: '#41 → 0x4000…DD04', txHash: '0xtxmock…0005', blockNumber: 1041944, timestamp: '2026-09-12T14:31:09Z' },
  { id: 'ev-6', type: 'OWNERSHIP_TRANSFERRED', actor: '0x4000…DD04', target: '#43 → 0x2000…BB02', txHash: '0xtxmock…0006', blockNumber: 1042601, timestamp: '2026-09-14T08:47:52Z' },
  { id: 'ev-7', type: 'PERMISSION_UPDATE', actor: '0x1000…AA01', target: 'MANAGER +mintAsset', txHash: '0xtxmock…0007', blockNumber: 1042700, timestamp: '2026-09-14T10:05:00Z' },
];

export const mockRoleSummaries: RoleAssignmentSummary[] = [
  { role: 'ADMIN', description: 'Full platform control: identities, roles, minting, emergency actions.', memberCount: 1, permissions: ['identity:create', 'role:grant', 'role:revoke', 'asset:create', 'nft:mint', 'nft:allocate'] },
  { role: 'MANAGER', description: 'Operational management of assets and allocations.', memberCount: 1, permissions: ['asset:create', 'asset:update', 'nft:allocate'] },
  { role: 'AUDITOR', description: 'Read-only access to audit trail and verification.', memberCount: 1, permissions: ['audit:read', 'verify:read'] },
  { role: 'USER', description: 'Views own assets, may transfer owned assets when authorized.', memberCount: 2, permissions: ['asset:viewOwn', 'transfer:authorized'] },
];

export const mockStats = {
  totalIdentities: mockIdentities.length,
  activeIdentities: mockIdentities.filter((i) => i.status === 'ACTIVE').length,
  totalAssets: mockAssets.length,
  mintedNfts: mockAssets.filter((a) => a.tokenId).length,
  recentEvents: mockAuditEvents.length,
};
