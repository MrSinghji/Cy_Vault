// Reusable wallet state hook (F2: connection only — no auth/signature logic yet).
import { useCallback, useEffect, useState } from 'react';
import { getProvider } from './eip1193';
import {
  INITIAL_WALLET_STATE,
  classifyError,
  connectViaProvider,
  probeExistingConnection,
  type WalletState,
} from './connect';

export interface UseWalletResult extends WalletState {
  walletDetected: boolean;
  connect: () => Promise<void>;
  disconnect: () => void;
}

export function useWallet(): UseWalletResult {
  const [state, setState] = useState<WalletState>(INITIAL_WALLET_STATE);
  const walletDetected = getProvider() !== null;

  // Restore a previously-authorized connection on mount (eth_accounts never prompts),
  // and react to MetaMask accountDropped / chainChanged / disconnect events.
  useEffect(() => {
    const provider = getProvider();
    if (!provider) return;

    let cancelled = false;
    probeExistingConnection(provider)
      .then((res) => {
        if (cancelled || !res) return;
        setState({ ...INITIAL_WALLET_STATE, status: 'connected', address: res.address, chainId: res.chainId });
      })
      .catch(() => undefined);

    const handleAccountsChanged = (...args: unknown[]) => {
      const accounts = args[0] as string[] | undefined;
      if (!Array.isArray(accounts) || accounts.length === 0) {
        setState(INITIAL_WALLET_STATE); // user disconnected in the wallet itself
      } else {
        setState((s) => ({ ...s, status: 'connected', address: String(accounts[0]), errorMessage: null }));
      }
    };
    const handleChainChanged = (...args: unknown[]) => {
      const raw = args[0];
      if (typeof raw === 'string') {
        setState((s) => ({ ...s, chainId: Number.isNaN(parseInt(raw, 16)) ? s.chainId : parseInt(raw, 16) }));
      }
    };
    const handleDisconnect = () => setState(INITIAL_WALLET_STATE);

    provider.on?.('accountsChanged', handleAccountsChanged);
    provider.on?.('chainChanged', handleChainChanged);
    provider.on?.('disconnect', handleDisconnect);

    return () => {
      cancelled = true;
      provider.removeListener?.('accountsChanged', handleAccountsChanged);
      provider.removeListener?.('chainChanged', handleChainChanged);
      provider.removeListener?.('disconnect', handleDisconnect);
    };
  }, []);

  const connect = useCallback(async () => {
    const provider = getProvider();
    if (!provider) {
      setState((s) => ({
        ...s,
        status: 'unavailable',
        errorMessage: 'No browser wallet detected. Install MetaMask or another EIP-1193 wallet.',
      }));
      return;
    }
    setState((s) => ({ ...s, status: 'connecting', errorMessage: null }));
    try {
      const { address, chainId } = await connectViaProvider(provider);
      setState({ status: 'connected', address, chainId, errorMessage: null });
    } catch (err) {
      const classified = classifyError(err);
      setState({ ...INITIAL_WALLET_STATE, ...classified });
    }
  }, []);

  const disconnect = useCallback(() => {
    // Injected wallets have no "disconnect" RPC; forgetting the local session is the standard UX.
    setState(INITIAL_WALLET_STATE);
  }, []);

  return { ...state, walletDetected, connect, disconnect };
}
