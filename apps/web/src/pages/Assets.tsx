import PageHeader from '../components/PageHeader';
import Card from '../components/Card';
import Badge from '../components/Badge';
import { toneForStatus } from '../utils/status';
import DataTable from '../components/DataTable';
import { mockAssets } from '../mock/data';
import type { Asset } from '../types/models';

export default function Assets() {
  return (
    <>
      <PageHeader
        title="Assets"
        description="Asset registry records linked to NFT token IDs (smart-contract registry arrives in Features 5–6)."
      />
      <Card
        title="Asset records"
        actions={
          <button className="btn btn-primary" disabled title="Asset registration arrives in Feature 5">
            + Register Asset
          </button>
        }
      >
        <DataTable<Asset>
          caption="Assets"
          rows={mockAssets}
          columns={[
            { key: 'id', header: 'Asset ID' },
            { key: 'name', header: 'Name' },
            { key: 'category', header: 'Category' },
            { key: 'serialHash', header: 'Serial Hash' },
            { key: 'metadataRef', header: 'Metadata Ref' },
            { key: 'tokenId', header: 'NFT Token' },
            { key: 'ownerWallet', header: 'Owner' },
            { key: 'status', header: 'Status', render: (r) => <Badge label={r.status} tone={toneForStatus(r.status)} /> },
          ]}
        />
      </Card>
    </>
  );
}
