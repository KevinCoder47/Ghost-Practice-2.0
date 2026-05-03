import { NavLink } from 'react-router-dom';
import './Layout.css';

const NAV_ITEMS = [
  { to: '/',        label: 'Dashboard',    icon: '▦' },
  { to: '/pending', label: 'Pending Tray', icon: '⏳' },
  { to: '/report',  label: 'Fee Earner',   icon: '📋' },
  { to: '/log',     label: 'Log Time',     icon: '+' },
];

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <div className="shell">
      {/* ── Sidebar ── */}
      <aside className="sidebar">
        <div className="sidebar__brand">
          <span className="sidebar__logo" aria-hidden="true">⚖</span>
          <div>
            <p className="sidebar__app-name">AutoTime</p>
            <p className="sidebar__firm">MB Law</p>
          </div>
        </div>

        <nav className="sidebar__nav" aria-label="Main navigation">
          <ul>
            {NAV_ITEMS.map(({ to, label, icon }) => (
              <li key={to}>
                <NavLink
                  to={to}
                  end={to === '/'}
                  className={({ isActive }) =>
                    `sidebar__link${isActive ? ' sidebar__link--active' : ''}`
                  }
                >
                  <span className="sidebar__link-icon" aria-hidden="true">{icon}</span>
                  <span>{label}</span>
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>

        <div className="sidebar__footer">
          <div className="sidebar__status-dot" aria-label="System online" />
          <span>System online</span>
        </div>
      </aside>

      {/* ── Main ── */}
      <main className="main-content">
        {children}
      </main>
    </div>
  );
}