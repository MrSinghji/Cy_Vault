import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  INITIAL_WALLET_STATE,
  classifyError,
  connectViaProvider,
  isUserRejection,
  parseChainId,
  probeExistingConnection,
} from '../src/wallet/connect';
import { chainLabel, shortAddress } from '../src/wallet/eip1193';
import type { Eip1193Provider } from '../src/wallet/eip1193';

const ADDR = '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266';

function mockProvider(handlers: Record<string, () => unknown>): Eip1193Provider {
  return {
    request: async ({ method }: { method: string }) => {
      const h = handlers[method];
      if (!h) throw new Error(`Unsupported method ${method}`);
      return h() as never;
    },
  };
}

describe('parseChainId (viem fromHex)', () => {
  it('parses known hex chain ids', () => {
    assert.equal(parseChainId('0x7a69'), 31337); // hardhat localhost
    assert.equal(parseChainId('0x1'), 1);
    assert.equal(parseChainId('0xaa36a7'), 11155111); // sepolia
  });
  it('returns null for invalid input instead of throwing', () => {
    assert.equal(parseChainId('not-hex'), null);
    assert.equal(parseChainId(null), null);
    assert.equal(parseChainId(42), null);
  });
});

describe('isUserRejection / classifyError', () => {
  it('classifies EIP-1193 code 4001 as rejection', () => {
    const err = Object.assign(new Error('User rejected the request.'), { code: 4001 });
    assert.equal(isUserRejection(err), true);
    const c = classifyError(err);
    assert.equal(c.status, 'rejected');
    assert.match(c.errorMessage ?? '', /rejected/i);
  });
  it('classifies message-only rejections (some wallets omit code)', () => {
    assert.equal(isUserRejection(new Error('User denied message signature.')), true);
  });
  it('classifies generic failures as error status with message preserved', () => {
    const c = classifyError(new Error('socket hang up'));
    assert.equal(c.status, 'error');
    assert.equal(c.errorMessage, 'socket hang up');
  });
  it('does not misclassify unrelated errors as rejection', () => {
    assert.equal(isUserRejection(Object.assign(new Error('x'), { code: -32601 })), false);
  });
});

describe('connectViaProvider', () => {
  it('returns first account + parsed chain id on success', async () => {
    const p = mockProvider({
      eth_requestAccounts: () => [ADDR],
      eth_chainId: () => '0x7a69',
    });
    const res = await connectViaProvider(p);
    assert.deepEqual(res, { address: ADDR, chainId: 31337 });
  });
  it('throws when wallet returns no accounts', async () => {
    const p = mockProvider({ eth_requestAccounts: () => [] });
    await assert.rejects(() => connectViaProvider(p), /No accounts/);
  });
  it('propagates user rejection so callers can show "rejected" state', async () => {
    const p: Eip1193Provider = {
      request: async () => {
        throw Object.assign(new Error('User rejected.'), { code: 4001 });
      },
    };
    await assert.rejects(() => connectViaProvider(p));
  });
  it('still connects when chain id lookup fails (chainId null)', async () => {
    const p = mockProvider({
      eth_requestAccounts: () => [ADDR],
      eth_chainId: () => {
        throw new Error('disconnected');
      },
    });
    const res = await connectViaProvider(p);
    assert.equal(res.address, ADDR);
    assert.equal(res.chainId, null);
  });
});

describe('probeExistingConnection', () => {
  it('restores an existing authorized session without prompting', async () => {
    const p = mockProvider({ eth_accounts: () => [ADDR], eth_chainId: () => '0x1' });
    const res = await probeExistingConnection(p);
    assert.deepEqual(res, { address: ADDR, chainId: 1 });
  });
  it('returns null when no accounts are authorized', async () => {
    const p = mockProvider({ eth_accounts: () => [] });
    assert.equal(await probeExistingConnection(p), null);
  });
});

describe('display helpers', () => {
  it('INITIAL_WALLET_STATE is disconnected with empty fields', () => {
    assert.deepEqual(INITIAL_WALLET_STATE, { status: 'disconnected', address: null, chainId: null, errorMessage: null });
  });
  it('chainLabel maps known chains and falls back', () => {
    assert.equal(chainLabel(31337), 'Hardhat Localhost');
    assert.equal(chainLabel(11155111), 'Sepolia Testnet');
    assert.equal(chainLabel(999), 'Chain 999');
    assert.equal(chainLabel(null), 'Unknown network');
  });
  it('shortAddress truncates safely', () => {
    assert.equal(shortAddress(ADDR), '0xf39F…2266');
    assert.equal(shortAddress(null), '');
  });
});
