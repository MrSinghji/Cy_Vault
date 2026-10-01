import PageHeader from '../components/PageHeader';
import Card from '../components/Card';
import Badge from '../components/Badge';
import { mockRoleSummaries } from '../mock/data';

export default function Roles() {
  return (
    <>
      <PageHeader
        title="Roles & Permissions"
        description="ADMIN / MANAGER / AUDITOR / USER — enforced by smart contracts (Feature 4), not just UI."
      />
      <div className="roles-grid">
        {mockRoleSummaries.map((r) => (
          <Card key={r.role} title={r.role} subtitle={`${r.memberCount} member(s)`}>
            <p className="card-subtitle-block">{r.description}</p>
            <ul className="permission-list">
              {r.permissions.map((p) => (
                <li key={p}>
                  <Badge label={p} tone="neutral" />
                </li>
              ))}
            </ul>
            <div className="role-actions">
              <button className="btn btn-outline" disabled title="Grant/revoke arrives with Feature 4 RBAC contract">
                Grant Role
              </button>
              <button className="btn btn-outline" disabled title="Grant/revoke arrives with Feature 4 RBAC contract">
                Revoke Role
              </button>
            </div>
          </Card>
        ))}
      </div>
    </>
  );
}
