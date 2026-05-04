import { NavLink } from 'react-router-dom';
import './Layout.css';

// ─── Icons ────────────────────────────────────────────────────────────────────

function IconGrid() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/>
      <rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/>
    </svg>
  );
}

function IconInbox() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="22 12 16 12 14 15 10 15 8 12 2 12"/>
      <path d="M5.45 5.11L2 12v6a2 2 0 002 2h16a2 2 0 002-2v-6l-3.45-6.89A2 2 0 0016.76 4H7.24a2 2 0 00-1.79 1.11z"/>
    </svg>
  );
}

function IconPlus() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
      <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
    </svg>
  );
}

function IconClipboard() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M16 4h2a2 2 0 012 2v14a2 2 0 01-2 2H6a2 2 0 01-2-2V6a2 2 0 012-2h2"/>
      <rect x="8" y="2" width="8" height="4" rx="1" ry="1"/>
    </svg>
  );
}

function IconFileText() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/>
      <polyline points="14 2 14 8 20 8"/>
      <line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/>
      <polyline points="10 9 9 9 8 9"/>
    </svg>
  );
}

function IconBell() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9"/>
      <path d="M13.73 21a2 2 0 01-3.46 0"/>
    </svg>
  );
}

// ─── Nav config ───────────────────────────────────────────────────────────────

const NAV_ITEMS = [
  { to: '/',        label: 'Dashboard',       icon: <IconGrid />,      badgeKey: null        },
  { to: '/pending', label: 'Pending Tray',    icon: <IconInbox />,     badgeKey: 'pending'   },
  { to: '/log',     label: 'Log Time',        icon: <IconPlus />,      badgeKey: null        },
  { to: '/report',  label: 'Fee Earner Report', icon: <IconClipboard />, badgeKey: null      },
  { to: '/invoice', label: 'Invoice Summary', icon: <IconFileText />,  badgeKey: null        },
];

// Hardcoded user – swap for auth context when available
const USER = { name: 'Kevin Mokoena', initials: 'KM', role: 'Senior Associate' };

interface LayoutProps {
  children: React.ReactNode;
  pendingCount?: number;
}

export default function Layout({ children, pendingCount = 0 }: LayoutProps) {
  const now = new Date();
  const dateLabel = now.toLocaleDateString('en-ZA', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  });

  return (
    <div className="shell">
      {/* ── Sidebar ── */}
      <aside className="sidebar">
        {/* Brand */}
        <div className="sidebar__brand">
          <span className="sidebar__logo" aria-hidden="true">⚖</span>
          <div>
            <p className="sidebar__app-name">AutoTime</p>
            <p className="sidebar__firm">Legal Time Tracking</p>
          </div>
        </div>

        {/* Nav */}
        <nav className="sidebar__nav" aria-label="Main navigation">
          <ul>
            {NAV_ITEMS.map(({ to, label, icon, badgeKey }) => {
              const count = badgeKey === 'pending' ? pendingCount : 0;
              return (
                <li key={to}>
                  <NavLink
                    to={to}
                    end={to === '/'}
                    className={({ isActive }) =>
                      `sidebar__link${isActive ? ' sidebar__link--active' : ''}`
                    }
                  >
                    <span className="sidebar__link-icon">{icon}</span>
                    <span>{label}</span>
                    {count > 0 && (
                      <span className="sidebar__link-badge">{count}</span>
                    )}
                  </NavLink>
                </li>
              );
            })}
          </ul>
        </nav>

        {/* User footer */}
        <div className="sidebar__footer">
          <div className="sidebar__avatar">{USER.initials}</div>
          <div>
            <p className="sidebar__user-name">{USER.name}</p>
            <p className="sidebar__user-role">{USER.role}</p>
          </div>
        </div>
      </aside>

      {/* ── Main ── */}
      <main className="main-content">
        {/* Top bar */}
        <div className="top-bar">
          <div className="top-bar__date-block">
            <span className="top-bar__date-label">Today</span>
            <span className="top-bar__date-value">{dateLabel}</span>
          </div>
          <div className="top-bar__right">
            <div className="top-bar__bell" role="button" aria-label="Notifications">
              <IconBell />
              {pendingCount > 0 && <span className="top-bar__bell-dot" />}
            </div>
            <div className="top-bar__user">
              <div className="top-bar__user-info">
                <p className="top-bar__user-name">{USER.name}</p>
                <p className="top-bar__user-role">{USER.role}</p>
              </div>
              <div className="top-bar__avatar">{USER.initials}</div>
            </div>
          </div>
        </div>

        {/* Page content */}
        <div className="page-content">
          {children}
        </div>
      </main>
    </div>
  );
}