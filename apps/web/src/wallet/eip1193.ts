// Minimal EIP-1193 provider typing for injected browser wallets (MetaMask, Rabby, etc.).
// F2 scope: connection + detection only. Signature-based login arrives in the next step of Feature 2.

export interface Eip1193Provider {
  request(args: { method: 'eth_requestAccounts' }): Promise<string[]>;
  request(args: { method: 'eth_accounts' }): Promise<string[]>;
  request(args: { method: 'eth_chainId' }): Promise<string>;
  request(args: { method: string; params?: unknown[] | object }): Promise<unknown>;
  on?(event: string, listener: (...args: unknown[]) => void): void;
  removeListener?(event: string, listener: (...args: unknown[]) => void): void;
  isMetaMask?: boolean;
}

declare global {
  interface Window {
    ethereum?: Eip1193Provider;
  }
}

/** Well-known chain ids used by this project (matches apps/api config default 31337 and hardhat.config.js). */
export const KNOWN_CHAINS: Record<number, string> = {
  31337: 'Hardhat Localhost',
  1: 'Ethereum Mainnet',
  11155111: 'Sepolia Testnet',
  8453: 'Base',
  80002: 'Polygon Amoy Testnet',
};

export function chainLabel(chainId: number | null): string {
  if (chainId == null) return 'Unknown network';
  return KNOWN_CHAINS[chainId] ?? `Chain ${chainId}`;
}

/** Returns the injected wallet provider if present, otherwise null. */
export function getProvider(): Eip1193Provider | null {
  return typeof window !== 'undefined' && window.ethereum ? window.ethereum : null;
}

export function isWalletAvailable(): boolean {
  return getProvider() !== null;
}

/** Truncated 0x…abcd display form for addresses. */
export function shortAddress(address: string | null): string {
  if (!address) return '';
  return `${address.slice(0, 6)}…${address.slice(-4)}`;
}
