// Feature 5 — Asset Registry client (browser).
// Reads/writes the deployed AssetRegistry.sol through the injected EIP-1193 wallet:
//   - registerAsset / updateAsset / setStatus send wallet-confirmed transactions
//     (contract-side RBAC via AccessManager rejects unauthorized callers on-chain)
//   - getAsset / assetExists / assetIdBySerialHash / assetCount are read-only eth_call queries
// Only non-sensitive fields go on-chain; serial numbers are hashed off-chain first.
// Addresses come from localStorage (Settings page) or VITE_ASSET_REGISTRY_ADDRESS.

import type { Eip1193Provider } from '../wallet/eip1193';
import { getProvider } from '../wallet/eip1193';
import { keccak256, toHex, toFunctionSelector } from 'viem';
import { addrWord, bytes32Word, pad } from '../identity/client';

const ADDR_KEY = 'platform.assetRegistryAddress';

export function getAssetRegistryAddress(): string | null {
  const fromEnv = (import.meta.env.VITE_ASSET_REGISTRY_ADDRESS as string | undefined) ?? '';
  const stored = typeof localStorage !== 'undefined' ? localStorage.getItem(ADDR_KEY) : null;
  const addr = (stored || fromEnv).trim();
  return /^0x[0-9a-fA-F]{40}$/.test(addr) ? addr : null;
}

export function setAssetRegistryAddress(addr: string): void {
  if (!/^0x[0-9a-fA-F]{40}$/.test(addr.trim())) throw new Error('Invalid asset registry address');
  localStorage.setItem(ADDR_KEY, addr.trim());
}

async function rpc<T = unknown>(provider: Eip1193Provider, method: string, params: unknown[]): Promise<T> {
  return (await provider.request({ method, params })) as T;
}

function selector(sig: string): string {
  // viem's canonical keccak selector — same value the Solidity ABI produces.
  return toFunctionSelector(sig);
}

function uintWord(n: bigint | number): string {
  return pad(BigInt(n).toString(16));
}

// ---------- ABI encoding (dynamic-string calls) ----------

/** keccak256(rawSerial + "|" + salt) — the ONLY serial form ever sent on-chain. */
export function hashSerial(rawSerial: string, salt: string): `0x${string}` {
  return keccak256(toHex(`${rawSerial}|${salt}`), 'hex');
}

/**
 * Encode a call whose arguments are (head args...) followed by dynamic strings.
 * Layout per Solidity ABI: head words (uint/address/bytes32), then string offsets,
 * then each string as (length, padded bytes).
 */
export function encodeRegisterAsset(name: string, category: string, description: string, serialHash: string, metadataRef: string): string {
  const heads = [uintWord(0), bytes32Word(serialHash), bytes32Word(metadataRef)]; // placeholder for name/category/desc offsets appended below
  void heads;
  const strs = [name, category, description];
  const tails = strs.map((s) => {
    const hex = toHex(s).slice(2);
    const len = uintWord(s.length ? Buffer.from(s).length : 0);
    const data = hex.padEnd(Math.ceil(hex.length / 64) * 64 || 64, '0');
    return len + data;
  });
  // head: 3 string offsets (after fixed heads) + serialHash + metadataRef
  const dynamicStart = 5; // 5 head words: offsetName, offsetCategory, offsetDesc, serialHash, metadataRef
  const offsets: number[] = [];
  let cursor = dynamicStart;
  for (const t of tails) {
    offsets.push(cursor);
    cursor += t.length / 64;
  }
  const head = offsets.map((o) => uintWord(o)).join('') + bytes32Word(serialHash) + bytes32Word(metadataRef);
  return selector('registerAsset(string,string,string,bytes32,bytes32)') + head + tails.join('');
}

export function encodeUpdateAsset(assetId: bigint | number, name: string, category: string, description: string, serialHash: string, metadataRef: string): string {
  const strs = [name, category, description];
  const tails = strs.map((s) => {
    const hex = toHex(s).slice(2);
    const len = uintWord(Buffer.from(s).length);
    const data = hex.padEnd(Math.ceil(hex.length / 64) * 64 || 64, '0');
    return len + data;
  });
  const dynamicStart = 6; // id + 3 offsets + serialHash + metadataRef
  const offsets: number[] = [];
  let cursor = dynamicStart;
  for (const t of tails) {
    offsets.push(cursor);
    cursor += t.length / 64;
  }
  const head =
    uintWord(assetId) +
    offsets.map((o) => uintWord(o)).join('') +
    bytes32Word(serialHash) +
    bytes32Word(metadataRef);
  return selector('updateAsset(uint256,string,string,string,bytes32,bytes32)') + head + tails.join('');
}

export function encodeSetStatus(assetId: bigint | number, status: number): string {
  return selector('setStatus(uint256,uint8)') + uintWord(assetId) + uintWord(status);
}

export function encodeGetAsset(assetId: bigint | number): string {
  return selector('getAsset(uint256)') + uintWord(assetId);
}

export function encodeAssetIdBySerialHash(serialHash: string): string {
  return selector('assetIdBySerialHash(bytes32)') + bytes32Word(serialHash);
}

// ---------- Decoding ----------

function word(hex: string, i: number): string {
  return '0x' + hex.slice(2 + i * 64, 2 + (i + 1) * 64);
}

function decodeString(hex: string, offsetWordsFromStart: number): string {
  // offsetWordsFromStart: absolute word index where the string length word lives
  const len = Number(BigInt(word(hex, offsetWordsFromStart)));
  const dataStart = offsetWordsFromStart + 1;
  const dataHex = hex.slice(2 + dataStart * 64, 2 + dataStart * 64 + len * 2);
  return Buffer.from(dataHex, 'hex').toString('utf8');
}

export const ASSET_STATUS_NAMES = ['Registered', 'Active', 'Suspended', 'Retired'] as const;
export type OnChainAssetStatus = (typeof ASSET_STATUS_NAMES)[number];

export interface AssetRecord {
  assetId: bigint;
  name: string;
  category: string;
  description: string;
  serialHash: string;
  metadataRef: string;
  status: OnChainAssetStatus;
  nftTokenId: bigint;
  createdAt: bigint;
  updatedAt: bigint;
}

/** Decode getAsset() output. Returns null when the call reverted (AssetNotFound). */
export function decodeAssetReturn(data: string): AssetRecord | null {
  try {
    const w1 = BigInt(word(data, 1)); // name offset
    const w2 = BigInt(word(data, 2)); // category offset
    const w3 = BigInt(word(data, 3)); // description offset
    const statusIdx = Number(BigInt(word(data, 7)));
    return {
      assetId: BigInt(word(data, 0)),
      name: decodeString(data, Number(w1 / 64n) + 0) && decodeStringAt(data, w1),
      category: decodeStringAt(data, w2),
      description: decodeStringAt(data, w3),
      serialHash: word(data, 4),
      metadataRef: word(data, 5),
      status: ASSET_STATUS_NAMES[statusIdx] ?? 'Registered',
      nftTokenId: BigInt(word(data, 8)),
      createdAt: BigInt(word(data, 9)),
      updatedAt: BigInt(word(data, 10)),
    };
  } catch {
    return null;
  }
}

/** Byte-offset based string decoding: `off` is a BYTE offset relative to tuple start (word 0). */
function decodeStringAt(hex: string, byteOffset: bigint): string {
  const wordIdx = Number(byteOffset / 64n);
  const len = Number(BigInt(word(hex, wordIdx)));
  const dataHex = hex.slice(2 + (wordIdx + 1) * 64, 2 + (wordIdx + 1) * 64 + len * 2);
  return Buffer.from(dataHex, 'hex').toString('utf8');
}

// ---------- Read operations ----------

export async function fetchAsset(assetId: bigint | number, registry?: string | null): Promise<AssetRecord | null> {
  const provider = getProvider();
  const addr = registry ?? getAssetRegistryAddress();
  if (!provider || !addr) return null;
  try {
    const data = await rpc<string>(provider, 'eth_call', [{ to: addr, data: encodeGetAsset(assetId) }, 'latest']);
    return decodeAssetReturn(data);
  } catch {
    return null; // AssetNotFound revert => unknown id
  }
}

export async function fetchAssetCount(registry?: string | null): Promise<number> {
  const provider = getProvider();
  const addr = registry ?? getAssetRegistryAddress();
  if (!provider || !addr) return 0;
  const data = await rpc<string>(provider, 'eth_call', [{ to: addr, data: selector('assetCount()') }, 'latest']);
  return Number(BigInt(word(data, 0)));
}

export async function fetchAssetIdBySerialHash(serialHash: string, registry?: string | null): Promise<bigint> {
  const provider = getProvider();
  const addr = registry ?? getAssetRegistryAddress();
  if (!provider || !addr) return 0n;
  const data = await rpc<string>(provider, 'eth_call', [{ to: addr, data: encodeAssetIdBySerialHash(serialHash) }, 'latest']);
  return BigInt(word(data, 0));
}

// ---------- Write operations ----------

export async function sendAssetTx(data: string): Promise<string> {
  const provider = getProvider();
  const addr = getAssetRegistryAddress();
  if (!provider) throw new Error('No browser wallet detected.');
  if (!addr) throw new Error('Asset Registry address not configured (see Settings).');
  const accounts = await rpc<string[]>(provider, 'eth_accounts');
  if (!accounts.length) throw new Error('Wallet not connected.');
  const txHash = await rpc<string>(provider, 'eth_sendTransaction', [{ from: accounts[0], to: addr, data }]);
  for (let attempt = 0; attempt < 60; attempt++) {
    const receipt = await rpc<{ status?: string } | null>(provider, 'eth_getTransactionReceipt', [txHash]);
    if (receipt) {
      if (receipt.status && BigInt(receipt.status) === 0n) {
        throw new Error('Transaction reverted on-chain — check role authorization / validation rules.');
      }
      return txHash;
    }
    await new Promise((r) => setTimeout(r, 1000));
  }
  throw new Error('Timed out waiting for transaction confirmation.');
}
