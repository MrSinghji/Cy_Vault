import PageHeader from '../components/PageHeader';
import StatCard from '../components/StatCard';
import Card from '../components/Card';
import Badge from '../components/Badge';
import { toneForStatus } from '../utils/status';
import DataTable from '../components/DataTable';
import { mockStats, mockAuditEvents, mockAssets } from '../mock/data';
import type { AuditEvent, Asset } from '../types/models';

export default function Dashboard() {
  return (
    <>
      <PageHeader
        title="Dashboard"
        description="Platform overview — identities, assets, NFTs and recent activity."
      />

      <div className="stat-grid">
        <StatCard label="Total Identities" value={mockStats.totalIdentities} hint={`${mockStats.activeIdentities} active`} />
        <StatCard label="Registered Assets" value={mockStats.totalAssets} />
        <StatCard label="Minted NFTs" value={mockStats.mintedNfts} hint="linked token IDs" />
        <StatCard label="Recent Events" value={mockStats.recentEvents} hint="audit trail" />
      </div>

      <div className="grid-2">
        <Card title="Recent blockchain events" subtitle="Mock until Features 10–11 (events + indexer)">
          <DataTable<AuditEvent>
            caption="Recent audit events"
            rows={mockAuditEvents.slice(0, 5)}
            columns={[
              { key: 'type', header: 'Event', render: (r) => <Badge label={r.type} tone="neutral" /> },
              { key: 'actor', header: 'Actor' },
              { key: 'target', header: 'Target' },
              { key: 'blockNumber', header: 'Block' },
            ]}
          />
        </Card>

        <Card title="Asset snapshot" subtitle="Mock until Feature 5 (asset registry)">
          <DataTable<Asset>
            caption="Asset snapshot"
            rows={mockAssets.slice(0, 5)}
            columns={[
              { key: 'id', header: 'Asset ID' },
              { key: 'name', header: 'Name' },
              { key: 'tokenId', header: 'Token' },
              { key: 'status', header: 'Status', render: (r) => <Badge label={r.status} tone={toneForStatus(r.status)} /> },
            ]}
          />
        </Card>
      </div>
    </>
  );
}
