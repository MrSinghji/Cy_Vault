import PageHeader from '../components/PageHeader';
import Card from '../components/Card';
import Badge from '../components/Badge';
import { toneForStatus } from '../utils/status';
import DataTable from '../components/DataTable';
import { mockIdentities } from '../mock/data';
import type { Identity } from '../types/models';

const roleTone: Record<string, 'active' | 'pending' | 'neutral' | 'inactive'> = {
  ADMIN: 'active',
  MANAGER: 'pending',
  AUDITOR: 'neutral',
  USER: 'neutral',
};

export default function Identities() {
  return (
    <>
      <PageHeader
        title="Identities"
        description="Blockchain-backed identities anchored to wallets (registry arrives in Feature 3)."
      />
      <Card
        title="Registered identities"
        subtitle="Create / activate / deactivate actions are placeholders until F3"
        actions={
          <button className="btn btn-primary" disabled title="Identity creation arrives in Feature 3">
            + Create Identity
          </button>
        }
      >
        <DataTable<Identity>
          caption="Identities"
          rows={mockIdentities}
          columns={[
            { key: 'did', header: 'DID' },
            { key: 'name', header: 'Name' },
            { key: 'wallet', header: 'Wallet' },
            { key: 'role', header: 'Role', render: (r) => <Badge label={r.role} tone={roleTone[r.role] ?? 'neutral'} /> },
            { key: 'status', header: 'Status', render: (r) => <Badge label={r.status} tone={toneForStatus(r.status)} /> },
            { key: 'createdAt', header: 'Created' },
          ]}
        />
      </Card>
    </>
  );
}
