import { useState } from 'react';
import PageHeader from '../components/PageHeader';
import Card from '../components/Card';
import Badge from '../components/Badge';

type Tab = 'asset' | 'identity' | 'ownership' | 'transaction';

const TABS: { id: Tab; label: string }[] = [
  { id: 'asset', label: 'Asset / NFT' },
  { id: 'identity', label: 'Identity' },
  { id: 'ownership', label: 'Ownership' },
  { id: 'transaction', label: 'Transaction' },
];

/** Verification UI (Features 12–13 will replace mock results with contract reads). */
export default function Verify() {
  const [tab, setTab] = useState<Tab>('asset');
  const [query, setQuery] = useState('');
  const [result, setResult] = useState<null | 'found'>(null);

  const runMockVerify = () => {
    if (!query.trim()) return;
    setResult('found'); // always mock-success until F12/F13
  };

  return (
    <>
      <PageHeader
        title="Verification"
        description="Independently verify assets, NFTs, identities, ownership and transactions against the chain."
      />
      <Card title="Lookup">
        <div className="tabs" role="tablist" aria-label="Verification type">
          {TABS.map((t) => (
            <button
              key={t.id}
              role="tab"
              aria-selected={tab === t.id}
              className={`tab${tab === t.id ? ' active' : ''}`}
              onClick={() => {
                setTab(t.id);
                setResult(null);
              }}
            >
              {t.label}
            </button>
          ))}
        </div>
        <div className="verify-form">
          <input
            className="input"
            placeholder={
              tab === 'asset'
                ? 'Enter asset ID or token ID…'
                : tab === 'identity'
                  ? 'Enter DID or wallet address…'
                  : tab === 'ownership'
                    ? 'Enter token ID…'
                    : 'Enter transaction hash…'
            }
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setResult(null);
            }}
          />
          <button className="btn btn-primary" onClick={runMockVerify}>
            Verify
          </button>
        </div>
        {result === 'found' && (
          <div className="verify-result card">
            <p>
              <Badge label="VERIFIED (MOCK)" tone="active" />
            </p>
            <p className="page-description">
              Sample result for “{query}” — real on-chain verification arrives in Features 12–13.
            </p>
          </div>
        )}
      </Card>
    </>
  );
}
