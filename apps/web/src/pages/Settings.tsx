import PageHeader from '../components/PageHeader';
import Card from '../components/Card';

const SETTINGS = [
  { group: 'Network', items: [['Chain', 'EVM testnet / Hardhat localhost (31337)'], ['RPC URL', 'http://127.0.0.1:8545 (from apps/api config)']] },
  { group: 'Contracts', items: [['IdentityRegistry', 'Not deployed yet (Feature 3)'], ['AccessControl roles', 'PlatformRoles.sol compiled (Phase 0)'], ['AssetNFT (ERC-721)', 'Not deployed yet (Feature 6)']] },
  { group: 'Storage', items: [['Database', 'SQLite dev layer (apps/api/src/db)'], ['IPFS gateway', 'Configured in Feature 9']] },
  { group: 'Profile', items: [['Connected wallet', 'None — wallet auth is Feature 2'], ['Session', 'Anonymous mock session (UI shell only)']] },
];

export default function Settings() {
  return (
    <>
      <PageHeader
        title="Settings"
        description="Environment and platform configuration — read-only placeholders until backend features land."
      />
      <div className="grid-2">
        {SETTINGS.map((s) => (
          <Card key={s.group} title={s.group}>
            <dl className="settings-list">
              {s.items.map(([k, v]) => (
                <div key={k} className="settings-row">
                  <dt>{k}</dt>
                  <dd>{v}</dd>
                </div>
              ))}
            </dl>
          </Card>
        ))}
      </div>
    </>
  );
}
