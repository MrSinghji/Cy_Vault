import { Link } from 'react-router-dom';
import WalletButton from '../components/WalletButton';

/** Login screen. F2 step 1: real wallet connect/disconnect works here; signature login (nonce → personal_sign → server verify) lands in F2.2. */
export default function Login() {
  return (
    <div className="login-page">
      <div className="login-card card">
        <h1 className="page-title">Sign in with your wallet</h1>
        <p className="page-description">
          Connect your browser wallet below. Cryptographic login (nonce → EIP-4361/personal_sign →
          server verification) will be wired on top of this connection in{' '}
          <strong>F2.2</strong>.
        </p>
        <WalletButton />
        <Link className="btn btn-outline" to="/dashboard">
          Continue with mock data →
        </Link>
        <p className="home-note">Connection state is shared app-wide via the useWallet hook.</p>
      </div>
    </div>
  );
}
