import { useEffect, useState } from 'react';
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { apiGet } from '../api/client';
import { clearToken } from '../auth/auth';
import { onSetupStatusChanged } from '../lib/setupStatus';
import type { Business } from '../types/business';
import type { Service } from '../types/catalog';
import './AppLayout.css';

const NAV_ITEMS = [
  { to: '/dashboard', label: 'Dashboard', icon: 'M4 4h7v7H4zM13 4h7v4h-7zM13 11h7v9h-7zM4 14h7v6H4z' },
  { to: '/business', label: 'Business Profile', icon: 'M6 21V5a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v16M9 21v-4h6v4M9 8h1M14 8h1M9 12h1M14 12h1' },
  { to: '/customers', label: 'Customers', icon: 'M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8ZM22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75' },
  { to: '/services', label: 'Services', icon: 'M4 6h16M4 12h16M4 18h10' },
  { to: '/packages', label: 'Packages', icon: 'M21 8 12 3 3 8l9 5 9-5ZM3 8v8l9 5 9-5V8M12 13v8' },
  { to: '/proposals/new', label: 'Create Proposal', icon: 'M8 3h5l5 5v11a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2ZM13 3v5h5M9 13h6M9 17h6' },
  { to: '/proposals', label: 'Proposal History', icon: 'M12 8v4l3 2M21 12a9 9 0 1 1-3-6.7M21 4v5h-5' },
];

function NavIcon({ path }: { path: string }) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d={path} stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function LogoutIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M15 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h9" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      <path d="M10 12h11m0 0-3.5-3.5M21 12l-3.5 3.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function CollapseIcon({ collapsed }: { collapsed: boolean }) {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d={collapsed ? 'm9 6 6 6-6 6' : 'm15 6-6 6 6 6'}
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

const SIDEBAR_COLLAPSED_KEY = 'sidebar_collapsed';

export default function AppLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const [needsBusiness, setNeedsBusiness] = useState(false);
  const [needsServices, setNeedsServices] = useState(false);
  const [collapsed, setCollapsed] = useState(
    () => localStorage.getItem(SIDEBAR_COLLAPSED_KEY) === 'true',
  );

  function toggleCollapsed() {
    setCollapsed((prev) => {
      const next = !prev;
      localStorage.setItem(SIDEBAR_COLLAPSED_KEY, String(next));
      return next;
    });
  }

  useEffect(() => {
    function refreshSetupStatus() {
      apiGet<Business>('/api/business')
        .then((business) => setNeedsBusiness(!business.phone))
        .catch(() => setNeedsBusiness(false));
      apiGet<Service[]>('/api/services')
        .then((services) => setNeedsServices(services.length === 0))
        .catch(() => setNeedsServices(false));
    }
    refreshSetupStatus();
    return onSetupStatusChanged(refreshSetupStatus);
  }, []);

  function handleLogout() {
    clearToken();
    navigate('/');
  }

  return (
    <div className="app-shell">
      <aside className={'app-sidebar' + (collapsed ? ' collapsed' : '')}>
        <div className="app-brand">
          <span className="app-brand-mark">FW</span>
          {!collapsed && <span className="app-brand-name">Framewise</span>}
        </div>

        <nav className="app-nav">
          {NAV_ITEMS.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              title={collapsed ? item.label : undefined}
              className={
                'app-nav-item' +
                (location.pathname.startsWith(item.to) ? ' active' : '')
              }
            >
              <span className="app-nav-icon">
                <NavIcon path={item.icon} />
              </span>
              {!collapsed && item.label}
            </Link>
          ))}
        </nav>

        <div className="app-logout-wrap">
          <button
            type="button"
            className="app-collapse-btn"
            onClick={toggleCollapsed}
            title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            <CollapseIcon collapsed={collapsed} />
            {!collapsed && 'Collapse'}
          </button>
          <button
            type="button"
            className="app-logout-btn"
            onClick={handleLogout}
            title={collapsed ? 'Logout' : undefined}
          >
            <LogoutIcon />
            {!collapsed && 'Logout'}
          </button>
        </div>
      </aside>

      <main className="app-main">
        {needsBusiness && (
          <p className="app-setup-notice">
            Your business profile isn&apos;t set up —{' '}
            <Link to="/business">complete your organization profile</Link> to start sending
            proposals.
          </p>
        )}
        {needsServices && (
          <p className="app-setup-notice">
            You have no services yet — <Link to="/services">add a service</Link> to start sending
            proposals.
          </p>
        )}
        <Outlet />
      </main>
    </div>
  );
}
