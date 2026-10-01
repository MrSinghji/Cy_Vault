// Feature 4 — canonical platform role hashes.
// These MUST equal keccak256("<NAME>_ROLE") as computed in contracts/PlatformRoles.sol.
// Parity is asserted by unit tests and verified on-chain by scripts/e2e-rbac.mjs.
import { keccak256, toHex } from 'viem';

export type PlatformRole = 'ADMIN_ROLE' | 'MANAGER_ROLE' | 'AUDITOR_ROLE' | 'USER_ROLE';

export const PLATFORM_ROLES: PlatformRole[] = ['ADMIN_ROLE', 'MANAGER_ROLE', 'AUDITOR_ROLE', 'USER_ROLE'];

/** Canonical 32-byte role hash for a platform role name (keccak256 of the name). */
export function roleHash(role: PlatformRole): `0x${string}` {
  return keccak256(toHex(role), 'hex');
}

/** Human-readable permission matrix shown in the Roles page (mirrors contract enforcement). */
export const ROLE_PERMISSIONS: Record<PlatformRole, string[]> = {
  ADMIN_ROLE: ['Manage roles (grant/revoke)', 'Deactivate/reactivate identities', 'Mint NFTs (F6)', 'Emergency controls (F16)'],
  MANAGER_ROLE: ['Create identities', 'Update identity references', 'Register assets (F5)', 'Allocate NFTs (F7)'],
  AUDITOR_ROLE: ['Read audit trail (F11/F15)', 'Verification queries', 'No write powers'],
  USER_ROLE: ['View own assets', 'Authorized transfers (F8)', 'No provisioning powers'],
};
