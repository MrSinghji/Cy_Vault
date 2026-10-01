// Minimal DID-compatible identifier helpers (Feature 3).
// The on-chain registry derives ids as keccak256(abi.encodePacked("did:platform:", chainid, ":", wallet)).
// This module mirrors that derivation off-chain so the UI can display/verify ids without a round-trip.
// Deliberately NOT a full W3C DID method — see docs/ARCHITECTURE.md privacy/scope note.

import { keccak256, solidityPacked } from 'viem';

export function didIdForWallet(wallet: string, chainId: number): `0x${string}` {
  return solidityPacked(['string', 'uint256', 'string', 'address'], ['did:platform:', chainId, ':', wallet]);
}

/** Deterministic keccak reference hash binding an identity to its off-chain record (no PII on-chain). */
export function refHashFor(name: string, email: string): `0x${string}` {
  return keccak256(solidityPacked(['string', 'string'], [name.trim().toLowerCase(), email.trim().toLowerCase()]));
}

/** Short human-readable form of the 32-byte id for display; full value stays in tooltips/exports. */
export function shortDid(id: string): string {
  if (!id.startsWith('0x') || id.length < 14) return id;
  return `${id.slice(0, 10)}…${id.slice(-6)}`;
}
