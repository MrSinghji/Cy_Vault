import { useCallback, useEffect, useMemo, useState } from 'react';
import PageHeader from '../components/PageHeader';
import Card from '../components/Card';
import Badge from '../components/Badge';
import { toneForStatus } from '../utils/status';
import DataTable from '../components/DataTable';
import { mockIdentities } from '../mock/data';
import type { Identity } from '../types/models';
import { useWallet } from '../wallet/useWallet';
import { shortAddress, chainLabel } from '../wallet/eip1193';
import {
  getRegistryAddress,
  fetchIdentityList,
  fetchIdentity,
  sendRegistryTx,
  type IdentityRecord,
} from '../identity/client';
import { didIdForWallet, refHashFor, shortDid } from '../identity/dids';

const roleTone: Record<string, 'active' | 'pending' | 'neutral' | 'inactive'> = {
  ADMIN: 'active',
  MANAGER: 'pending',
  AUDITOR: 'neutral',
  USER: 'neutral',
};

interface DirectoryEntry {
  name: string; // off-chain display data — NEVER sent on-chain
  email: string; // used only to derive the reference hash
}

const DIR_KEY = 'platform.identityDirectory';

function loadDirectory(): Record<string, DirectoryEntry> {
  try {
    return JSON.parse(localStorage.getItem(DIR_KEY) ?? '{}') as Record<string, DirectoryEntry>;
  } catch {
    return {};
  }
}

export default function Identities() {
  const wallet = useWallet();
  const registry = getRegistryAddress();
  const [records, setRecords] = useState<IdentityRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [form, setForm] = useState({ wallet: '', name: '', email: '' });
  const [directory, setDirectory] = useState<Record<string, DirectoryEntry>>(loadDirectory);

  const refresh = useCallback(async () => {
    if (!registry) return;
    setLoading(true);
    setError(null);
    try {
      const wallets = await fetchIdentityList(registry);
      const recs = await Promise.all(wallets.map((w) => fetchIdentity(w, registry)));
      setRecords(recs.filter((r): r is IdentityRecord => r !== null));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to read registry.');
    } finally {
      setLoading(false);
    }
  }, [registry]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const rows: Identity[] = useMemo(() => {
    const onChain: Identity[] = records.map((r) => ({
      id: r.wallet.toLowerCase(),
      did: shortDid(didIdForWallet(r.wallet, wallet.chainId ?? 31337)),
      wallet: r.wallet,
      name: directory[r.wallet.toLowerCase()]?.name ?? '(no off-chain profile)',
      role: 'USER', // roles are Feature 4 scope
      status: r.active ? 'ACTIVE' : 'INACTIVE',
      createdAt: new Date(Number(r.createdAt) * 1000).toISOString().slice(0, 19).replace('T', ' '),
    }));
    const mock: Identity[] = registry
      ? mockIdentities.map((m) => ({ ...m, did: `${m.did} (mock)` }))
      : mockIdentities;
    return [...onChain, ...mock];
  }, [records, directory, wallet.chainId, registry]);

  async function createIdentity() {
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      const target = (form.wallet || wallet.address || '').trim();
      if (!/^0x[0-9a-fA-F]{40}$/.test(target)) throw new Error('Enter a valid wallet address (or connect your wallet).');
      if (!form.name.trim() || !form.email.trim()) throw new Error('Name and email are required for the off-chain record.');
      const ref = refHashFor(form.name, form.email);
      const tx = await sendRegistryTx('createIdentity(address,bytes32)', [target, ref]);
      const dir = { ...directory, [target.toLowerCase()]: { name: form.name, email: form.email } };
      localStorage.setItem(DIR_KEY, JSON.stringify(dir));
      setDirectory(dir);
      setNotice(`Identity created. Tx: ${tx.slice(0, 18)}…`);
      setForm({ wallet: '', name: '', email: '' });
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  }

  async function toggleActive(target: string, active: boolean) {
    setBusy(true);
    setError(null);
    try {
      const fn = active ? 'deactivateIdentity(address)' : 'activateIdentity(address)';
      const tx = await sendRegistryTx(fn, [target]);
      setNotice(`${active ? 'Deactivated' : 'Activated'} ${shortAddress(target)}. Tx: ${tx.slice(0, 18)}…`);
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <PageHeader
        title="Identities"
        description={
          registry
            ? `On-chain identities from IdentityRegistry @ ${shortAddress(registry)} plus offline sample data.`
            : 'Blockchain-backed identities anchored to wallets.'
        }
      />

      {!registry && (
        <div className="alert alert-warn">
          No Identity Registry contract address configured. Set one in <strong>Settings</strong> after deploying
          (<code>contracts/scripts/deploy.js</code>). Showing mock data only.
        </div>
      )}

      {registry && (
        <Card title="Create identity (admin action)" subtitle="One identity per wallet · personal data stays off-chain (only its reference hash goes on-chain)">
          <div className="form-grid">
            <label>
              Wallet address
              <input
                value={form.wallet}
                placeholder={wallet.address ?? '0x…'}
                onChange={(e) => setForm({ ...form, wallet: e.target.value })}
              />
            </label>
            <label>
              Display name (off-chain)
              <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </label>
            <label>
              Email (off-chain, hashed only)
              <input value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
            </label>
            <button className="btn btn-primary" onClick={() => void createIdentity()} disabled={busy || wallet.status !== 'connected'}>
              {busy ? 'Sending…' : '+ Create Identity'}
            </button>
          </div>
          {wallet.status !== 'connected' && (
            <p className="muted small">Connect a wallet (top-right) that holds the registry owner/admin role to send transactions.</p>
          )}
        </Card>
      )}

      {error && <div className="alert alert-error">{error}</div>}
      {notice && <div className="alert alert-ok">{notice}</div>}

      <Card
        title="Registered identities"
        subtitle={registry ? `${records.length} on-chain (${chainLabel(wallet.chainId)}) · loading ${loading ? '…' : 'done'}` : 'mock data'}
        actions={
          registry ? (
            <button className="btn btn-outline" onClick={() => void refresh()} disabled={loading}>
              ⟳ Refresh
            </button>
          ) : undefined
        }
      >
        <DataTable<Identity>
          caption="Identities"
          rows={rows}
          columns={[
            { key: 'did', header: 'DID' },
            { key: 'name', header: 'Name' },
            { key: 'wallet', header: 'Wallet', render: (r) => <span className="mono" title={r.wallet}>{shortAddress(r.wallet)}</span> },
            { key: 'role', header: 'Role', render: (r) => <Badge label={r.role} tone={roleTone[r.role] ?? 'neutral'} /> },
            { key: 'status', header: 'Status', render: (r) => <Badge label={r.status} tone={toneForStatus(r.status)} /> },
            { key: 'createdAt', header: 'Created' },
            {
              key: 'actions',
              header: 'Actions',
              render: (r) =>
                registry && !r.did.endsWith('(mock)') ? (
                  <button
                    className="btn btn-outline btn-sm"
                    disabled={busy}
                    title={`Only the registry admin can change status. Current wallet: ${wallet.address ?? 'not connected'}`}
                    onClick={() => void toggleActive(r.wallet, r.status === 'ACTIVE')}
                  >
                    {r.status === 'ACTIVE' ? 'Deactivate' : 'Activate'}
                  </button>
                ) : null,
            },
          ]}
        />
      </Card>
    </>
  );
}
