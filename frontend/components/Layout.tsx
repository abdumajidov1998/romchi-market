'use client';
import React from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Logo } from './Logo';

const useIsDesktop = () => {
  const [d, setD] = React.useState(() => typeof window !== 'undefined' && window.innerWidth >= 960);
  React.useEffect(() => {
    const on = () => setD(window.innerWidth >= 960);
    window.addEventListener('resize', on);
    return () => window.removeEventListener('resize', on);
  }, []);
  return d;
};

const createPathFor = (pathname: string): string | null => {
  if (pathname.startsWith('/jobs')) return '/profile/create';
  if (pathname.startsWith('/workers')) return '/post';
  if (pathname.startsWith('/atxod')) return '/atxod/create';
  if (pathname.startsWith('/usluga')) return '/usluga/create';
  if (pathname.startsWith('/stanok-ads')) return '/stanok-ads/create';
  if (pathname.startsWith('/stanok')) return '/stanok/create';
  if (pathname.startsWith('/ustanofka')) return '/ustanofka/create';
  if (pathname.startsWith('/arkachilar')) return '/arkachilar/create';
  if (pathname.startsWith('/delivery')) return '/delivery/create';
  return null;
};

const navLinkStyle = (active: boolean): React.CSSProperties => ({
  display: 'flex', alignItems: 'center', gap: 12, padding: '11px 12px', borderRadius: 12,
  color: active ? 'var(--blue)' : 'var(--ink-2)', fontWeight: active ? 600 : 500,
  background: active ? 'var(--blue-50)' : 'transparent', fontSize: 14,
});

const Sidebar: React.FC = () => {
  const pathname = usePathname() || '/';
  const router = useRouter();
  const createPath = createPathFor(pathname);
  return (
    <aside style={{
      width: 240, background: '#fff', borderRight: '1px solid var(--line)',
      padding: '22px 16px', display: 'flex', flexDirection: 'column', gap: 4,
      position: 'sticky', top: 0, height: '100vh',
    }}>
      <Link href="/" style={{ display: 'block', padding: '8px 12px 22px' }}>
        <Logo size={32} />
      </Link>
      <Link href="/" style={navLinkStyle(pathname === '/')}>
        <span style={{ width: 20, textAlign: 'center' }}>🏠</span> Bosh sahifa
      </Link>
      {createPath && (
        <button type="button" onClick={() => router.push(createPath)} style={{
          display: 'flex', alignItems: 'center', gap: 12, padding: '11px 12px', borderRadius: 12,
          color: '#fff', fontWeight: 600, background: 'var(--blue)', fontSize: 14, border: 'none',
          cursor: 'pointer', textAlign: 'left',
        }}>
          <span style={{ width: 20, textAlign: 'center', fontSize: 18 }}>+</span> Yangi anketa
        </button>
      )}
      <Link href="/profile" style={navLinkStyle(pathname.startsWith('/profile') && pathname !== '/profile/create')}>
        <span style={{ width: 20, textAlign: 'center' }}>👤</span> Profil
      </Link>
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
};

const BottomNav: React.FC = () => {
  const pathname = usePathname() || '/';
  const router = useRouter();
  const createPath = createPathFor(pathname);
  const isHome = pathname === '/';
  const isProfile = pathname.startsWith('/profile') && pathname !== '/profile/create';

  return (
    <nav style={{
      position: 'fixed', left: 12, right: 12, bottom: 12, background: '#fff',
      border: '1px solid var(--line)', borderRadius: 20, display: 'flex',
      alignItems: 'center', justifyContent: 'space-around', padding: '10px 8px', boxShadow: 'var(--shadow)',
      zIndex: 1000,
    }}>
      <Link href="/" style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2,
        fontSize: 10, color: isHome ? 'var(--blue)' : 'var(--muted)', fontWeight: 600, flex: 1,
      }}>
        <span style={{ fontSize: 18 }}>🏠</span>Bosh sahifa
      </Link>
      <button
        type="button"
        onClick={() => createPath && router.push(createPath)}
        disabled={!createPath}
        title={createPath ? "Shu bo'limda anketa to'ldirish" : ''}
        style={{
          width: 52, height: 52, borderRadius: 999,
          background: createPath ? 'var(--blue)' : 'var(--line)',
          color: '#fff', fontSize: 28, lineHeight: 1, fontWeight: 700,
          border: 'none', cursor: createPath ? 'pointer' : 'default',
          boxShadow: createPath ? '0 4px 12px rgba(0,119,255,.35)' : 'none',
          marginTop: -28, flexShrink: 0,
          opacity: createPath ? 1 : 0.4,
        }}
      >+</button>
      <Link href="/profile" style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2,
        fontSize: 10, color: isProfile ? 'var(--blue)' : 'var(--muted)', fontWeight: 600, flex: 1,
      }}>
        <span style={{ fontSize: 18 }}>👤</span>Profil
      </Link>
    </nav>
  );
};

export const Layout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const desktop = useIsDesktop();
  const pathname = usePathname() || '/';
  const hideChrome = pathname === '/' || pathname === '/welcome' || pathname === '/romchi-ish' || pathname.startsWith('/onboarding') || pathname.startsWith('/admin');

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
