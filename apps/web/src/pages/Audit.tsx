import PageHeader from '../components/PageHeader';
import Card from '../components/Card';
import Badge from '../components/Badge';
import DataTable from '../components/DataTable';
import { mockAuditEvents } from '../mock/data';
import type { AuditEvent } from '../types/models';

export default function Audit() {
  return (
    <>
      <PageHeader
        title="Audit Logs"
        description="Immutable blockchain event history (on-chain events + indexer arrive in Features 10–11)."
      />
      <Card
        title="Event stream"
        subtitle="Read-only. Filters and search become functional once indexed events exist."
        actions={
          <button className="btn btn-outline" disabled title="CSV export planned with Feature 15 auditor dashboard">
            Export CSV
          </button>
        }
      >
        <DataTable<AuditEvent>
          caption="Audit events"
          rows={mockAuditEvents}
          columns={[
            { key: 'timestamp', header: 'Timestamp' },
            { key: 'type', header: 'Event Type', render: (r) => <Badge label={r.type} tone="neutral" /> },
            { key: 'actor', header: 'Actor' },
            { key: 'target', header: 'Target' },
            { key: 'txHash', header: 'Tx Hash' },
            { key: 'blockNumber', header: 'Block' },
          ]}
        />
      </Card>
    </>
  );
}
