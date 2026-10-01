import { useState } from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import WalletButton from '../components/WalletButton';

const NAV_ITEMS = [
  { to: '/dashboard', label: 'Dashboard', icon: '▦' },
  { to: '/identities', label: 'Identities', icon: '◉' },
  { to: '/assets', label: 'Assets', icon: '▣' },
  { to: '/roles', label: 'Roles', icon: '⚿' },
  { to: '/audit', label: 'Audit Logs', icon: '≡' },
  { to: '/verify', label: 'Verification', icon: '✓' },
  { to: '/settings', label: 'Settings', icon: '⚙' },
];

/** App shell: sidebar + header + routed content. Responsive: hamburger toggles sidebar on small screens. */
export default function DashboardLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="layout">
      <aside className={`sidebar ${sidebarOpen ? 'sidebar-open' : ''}`} aria-label="Primary navigation">
        <div className="sidebar-brand">
          <span className="brand-mark">◆</span>
          <div>
            <strong>IdentityChain</strong>
            <small>Decentralized ID · RBAC · NFT</small>
          </div>
        </div>
        <nav>
          <ul className="sidebar-nav">
            {NAV_ITEMS.map((item) => (
              <li key={item.to}>
                <NavLink
                  to={item.to}
                  className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}
                  onClick={() => setSidebarOpen(false)}
                >
                  <span aria-hidden="true">{item.icon}</span>
                  {item.label}
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>
        <p className="sidebar-footer">Prototype — mock data (F1)</p>
      </aside>

      {sidebarOpen && <div className="sidebar-backdrop" onClick={() => setSidebarOpen(false)} />}

      <div className="main-area">
        <header className="topbar">
          <button
            className="hamburger"
            aria-label="Toggle navigation"
            onClick={() => setSidebarOpen((o) => !o)}
          >
            ☰
          </button>
          {/* F2: live network pill moved into WalletButton (shown when connected). */}
          <div className="topbar-right">
            <WalletButton />
            <span className="avatar" aria-hidden="true">
              A
            </span>
          </div>
        </header>
        <main className="content">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
