import { Link } from 'react-router-dom';

/** Placeholder login screen. Real wallet-signature authentication is Feature 2. */
export default function Login() {
  return (
    <div className="login-page">
      <div className="login-card card">
        <h1 className="page-title">Sign in with your wallet</h1>
        <p className="page-description">
          Cryptographic login (nonce → EIP-4361 signature → server verification) will be wired
          here in <strong>Feature 2 — Wallet Authentication</strong>.
        </p>
        <button className="btn btn-primary" disabled>
          🔗 Connect Wallet &amp; Sign In
        </button>
        <Link className="btn btn-outline" to="/dashboard">
          Continue with mock data →
        </Link>
        <p className="home-note">No wallet or auth logic exists yet — by design (F1 scope).</p>
      </div>
    </div>
  );
}
