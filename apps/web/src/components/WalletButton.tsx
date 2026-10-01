// Reusable wallet connection widget (F2). Uses the useWallet hook; replaces the F1 placeholder button.
// NOTE: signature-based login is still disabled — that is the next step of Feature 2 (F2.2).
import { useWallet } from '../wallet/useWallet';
import { chainLabel, shortAddress } from '../wallet/eip1193';

export default function WalletButton() {
  const { status, address, chainId, errorMessage, walletDetected, connect, disconnect } = useWallet();

  if (status === 'connected' && address) {
    return (
      <div className="wallet-cluster">
        <span className="network-pill" title={`Chain id ${chainId ?? 'unknown'}`}>
          Network: <strong>{chainLabel(chainId)}</strong>
        </span>
        <span className="wallet-address mono" title={address}>
          {shortAddress(address)}
        </span>
        <button className="btn btn-outline" onClick={disconnect}>
          Disconnect
        </button>
      </div>
    );
  }

  return (
    <div className="wallet-cluster">
      {errorMessage && (
        <span className="wallet-error" role="alert">
          {errorMessage}
        </span>
      )}
      <button
        className="btn btn-primary"
        onClick={() => void connect()}
        disabled={status === 'connecting'}
        title={walletDetected ? 'Connect your injected browser wallet' : 'No EIP-1193 wallet detected in this browser'}
      >
        {status === 'connecting' ? 'Connecting…' : status === 'unavailable' ? 'Wallet Unavailable' : 'Connect Wallet'}
      </button>
      {/* Sign-in with wallet signature — implemented in F2.2 (nonce → personal_sign → server verify). */}
      <button className="btn btn-outline" disabled title="Signature login arrives in F2.2">
        🔏 Sign In
      </button>
    </div>
  );
}
