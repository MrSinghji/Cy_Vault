import PageHeader from '../components/PageHeader';
import Card from '../components/Card';
import { useWallet } from '../wallet/useWallet';
import { chainLabel, shortAddress } from '../wallet/eip1193';

export default function Settings() {
  const wallet = useWallet();
  const SETTINGS = [
    { group: 'Network', items: [['Chain', `${chainLabel(wallet.chainId)}${wallet.chainId ? ` (${wallet.chainId})` : ''}`], ['RPC URL', 'http://127.0.0.1:8545 (from apps/api config)']] },
    { group: 'Contracts', items: [['IdentityRegistry', 'Not deployed yet (Feature 3)'], ['AccessControl roles', 'PlatformRoles.sol compiled (Phase 0)'], ['AssetNFT (ERC-721)', 'Not deployed yet (Feature 6)']] },
    { group: 'Storage', items: [['Database', 'SQLite dev layer (apps/api/src/db)'], ['IPFS gateway', 'Configured in Feature 9']] },
    { group: 'Profile', items: [['Connected wallet', wallet.status === 'connected' && wallet.address ? `${wallet.address} · ${shortAddress(wallet.address)}` : `Not connected (${wallet.status}${wallet.walletDetected ? ', wallet detected' : ', no wallet detected'})`], ['Session', 'Connection only — signature login arrives in F2.2']] },
  ];
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
