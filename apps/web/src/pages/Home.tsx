import { Link } from 'react-router-dom';

/** Landing page — routes into the dashboard shell. No auth yet (F2). */
export default function Home() {
  return (
    <div className="home">
      <div className="home-card">
        <span className="brand-mark big">◆</span>
        <h1>Decentralized Identity, RBAC &amp; NFT Asset Ownership</h1>
        <p>
          Wallet-controlled identities, smart-contract-enforced roles, and ERC-721 asset
          ownership with an immutable audit trail.
        </p>
        <div className="home-actions">
          <Link className="btn btn-primary" to="/dashboard">
            Open Dashboard
          </Link>
          <Link className="btn btn-outline" to="/login">
            Login (mock)
          </Link>
        </div>
        <p className="home-note">Feature 1 UI shell — all data shown is mock data.</p>
      </div>
    </div>
  );
}
