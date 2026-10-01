// Pure, testable wallet connection logic (no React). Uses viem for hex->chainId parsing and
// EIP-1193 error-code classification. The React hook in useWallet.ts composes these helpers.

import { fromHex } from 'viem';
import type { Eip1193Provider } from './eip1193';

export type WalletStatus =
  | 'disconnected' // no active connection
  | 'connecting' // connect() in flight
  | 'connected' // account + chain resolved
  | 'unavailable' // no injected wallet detected in this browser
  | 'rejected' // user rejected the connection request (EIP-1193 code 4001)
  | 'error'; // any other failure

export interface WalletState {
  status: WalletStatus;
  address: string | null;
  chainId: number | null;
  errorMessage: string | null;
}

export const INITIAL_WALLET_STATE: WalletState = {
  status: 'disconnected',
  address: null,
  chainId: null,
  errorMessage: null,
};

/** EIP-1193 provider errors carry a numeric `code`. 4001 = user rejected the request. */
export function isUserRejection(err: unknown): boolean {
  if (typeof err !== 'object' || err === null) return false;
  const code = 'code' in err ? (err as { code: unknown }).code : undefined;
  if (code === 4001) return true;
  // Some wallets surface the rejection as a plain Error without a code — match on message text.
  const msg = String('message' in err ? (err as { message: unknown }).message : '').toLowerCase();
  return msg.includes('user rejected') || msg.includes('user denied');
}

/** Parse an eth_chainId hex string ("0x7a69") into a number using viem's strict decoder. */
export function parseChainId(hex: unknown): number | null {
  if (typeof hex !== 'string' || !/^0x[0-9a-fA-F]+$/.test(hex)) return null;
  try {
    return fromHex(hex as `0x${string}`, 'number'); // regex above guarantees 0x-hex shape viem requires
  } catch {
    return null;
  }
}

export interface ConnectResult {
  address: string;
  chainId: number | null;
}

/**
 * Request accounts, then read the current chain id. Throws through rejections so the
 * caller can classify them; returns the first checksummed-format account string.
 */
export async function connectViaProvider(provider: Eip1193Provider): Promise<ConnectResult> {
  const accounts = await provider.request({ method: 'eth_requestAccounts' });
  if (!Array.isArray(accounts) || accounts.length === 0) {
    throw new Error('No accounts returned by wallet');
  }
  let chainId: number | null = null;
  try {
    chainId = parseChainId(await provider.request({ method: 'eth_chainId' }));
  } catch {
    chainId = null; // chain detection failure must not block showing the connected account
  }
  return { address: String(accounts[0]), chainId };
}

/** Read-only restore of an already-authorized session (eth_accounts does not prompt). */
export async function probeExistingConnection(
  provider: Eip1193Provider,
): Promise<ConnectResult | null> {
  const accounts = await provider.request({ method: 'eth_accounts' });
  if (!Array.isArray(accounts) || accounts.length === 0) return null;
  let chainId: number | null = null;
  try {
    chainId = parseChainId(await provider.request({ method: 'eth_chainId' }));
  } catch {
    chainId = null;
  }
  return { address: String(accounts[0]), chainId };
}

/** Map a caught exception onto the status/errorMessage fields shown in the UI. */
export function classifyError(err: unknown): Pick<WalletState, 'status' | 'errorMessage'> {
  if (isUserRejection(err)) {
    return { status: 'rejected', errorMessage: 'Connection request was rejected in the wallet.' };
  }
  const message = err instanceof Error ? err.message : String(err);
  return { status: 'error', errorMessage: message || 'Unknown wallet error.' };
}
