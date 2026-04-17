import React from 'react';
import { Link, NavLink, useLocation } from 'react-router-dom';

const useIsDesktop = () => {
  const [d, setD] = React.useState(() => typeof window !== 'undefined' && window.innerWidth >= 960);
  React.useEffect(() => {
    const on = () => setD(window.innerWidth >= 960);
    window.addEventListener('resize', on);
    return () => window.removeEventListener('resize', on);
  }, []);
  return d;
};

const navItems = [
  { to: '/jobs', icon: '🏠', label: 'Ishlar' },
  { to: '/workers', icon: '🔍', label: 'Ishchilar' },
  { to: '/post', icon: '＋', label: 'E’lon' },
  { to: '/chat', icon: '💬', label: 'Chat' },
  { to: '/profile', icon: '👤', label: 'Profil' },
];

const Sidebar: React.FC = () => (
  <aside style={{
    width: 240, background: '#fff', borderRight: '1px solid var(--line)',
    padding: '22px 16px', display: 'flex', flexDirection: 'column', gap: 4,
    position: 'sticky', top: 0, height: '100vh',
  }}>
    <Link to="/" style={{ display: 'block', padding: '6px 8px 18px' }}>
      <img src="/images/logo.png" alt="Romchi" style={{ height: 140, width: 'auto', maxWidth: '100%', display: 'block', objectFit: 'contain' }} />
    </Link>
    <div style={{ fontSize: 11, textTransform: 'uppercase', color: 'var(--muted)', fontWeight: 600, letterSpacing: '.1em', padding: '6px 12px' }}>Ish maydoni</div>
    {navItems.map(n => (
      <NavLink key={n.to} to={n.to} style={({ isActive }) => ({
        display: 'flex', alignItems: 'center', gap: 12, padding: '11px 12px', borderRadius: 12,
        color: isActive ? 'var(--blue)' : 'var(--ink-2)', fontWeight: isActive ? 600 : 500,
        background: isActive ? 'var(--blue-50)' : 'transparent', fontSize: 14,
      })}>
        <span style={{ width: 20, textAlign: 'center' }}>{n.icon}</span> {n.label}
      </NavLink>
    ))}
    <div style={{ marginTop: 'auto', padding: '14px 12px', background: 'var(--blue-50)', borderRadius: 14 }}>
      <div style={{ fontWeight: 700, fontSize: 13, color: 'var(--blue)' }}>E’loningizni ko‘taring</div>
      <div style={{ fontSize: 12, color: 'var(--muted)', margin: '4px 0 8px' }}>3× ko‘proq ishchiga yetib boring</div>
      <button style={{
        background: 'var(--blue)', color: '#fff', border: 'none', borderRadius: 12,
        padding: '8px 12px', fontSize: 12, fontWeight: 600, cursor: 'pointer', width: '100%',
      }}>Yangilash</button>
    </div>
  </aside>
);

const BottomNav: React.FC = () => (
  <nav style={{
    position: 'fixed', left: 12, right: 12, bottom: 12, background: '#fff',
    border: '1px solid var(--line)', borderRadius: 20, display: 'flex',
    justifyContent: 'space-around', padding: '10px 8px', boxShadow: 'var(--shadow)',
    zIndex: 50,
  }}>
    {navItems.map(n => (
      <NavLink key={n.to} to={n.to} style={({ isActive }) => ({
        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2,
        fontSize: 10, color: isActive ? 'var(--blue)' : 'var(--muted)', fontWeight: 600,
      })}>
        <span style={{ fontSize: 18 }}>{n.icon}</span>{n.label}
      </NavLink>
    ))}
  </nav>
);

export const Layout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const desktop = useIsDesktop();
  const loc = useLocation();
  const hideChrome = loc.pathname === '/' || loc.pathname === '/romchi-ish' || loc.pathname.startsWith('/onboarding');

  if (hideChrome) return <>{children}</>;

  if (desktop) {
    return (
      <div style={{ display: 'flex', minHeight: '100vh', background: 'var(--bg)' }}>
        <Sidebar />
        <main style={{ flex: 1, padding: '28px 32px', maxWidth: 1280, margin: '0 auto', width: '100%' }}>
          {children}
        </main>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', paddingBottom: 96 }}>
      <div style={{ maxWidth: 540, margin: '0 auto', padding: '16px 18px' }}>{children}</div>
      <BottomNav />
    </div>
  );
};

export { useIsDesktop };
