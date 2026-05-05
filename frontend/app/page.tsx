'use client';
import React from 'react';
import { useRouter } from 'next/navigation';
import { Logo } from '@/components/Logo';
import { SectionIcon } from '@/components/SectionIcon';
import { auth, api } from '@/lib/api';

const SECTIONS: {
  id: string;
  icon: 'briefcase' | 'recycle' | 'gear' | 'factory' | 'wrench' | 'hardhat' | 'rainbow' | 'truck';
  title: string;
  sub: string;
  path: string;
}[] = [
  { id: 'ustanofka', icon: 'hardhat', title: 'Ustanovka brigadalar', sub: "Tayyor rom va eshik-derazani o'rnatuvchi brigadalar", path: '/ustanofka' },
  { id: 'stanok', icon: 'gear', title: 'Stanok remont qiluvchilar', sub: "Stanok ta'mirlash va sozlash ustalari", path: '/stanok' },
  { id: 'stanok-ads', icon: 'factory', title: "Stanok e'lonlari", sub: 'Yangi va ishlatilgan stanoklar oldi-sotdi', path: '/stanok-ads' },
  { id: 'atxod', icon: 'recycle', title: 'Atxod oluvchilar', sub: 'Alyumin, PVX, Termo atxod sotish va sotib olish', path: '/atxod' },
  { id: 'usluga', icon: 'wrench', title: 'Uslugachilar', sub: 'Turli xizmatlar va uslugalar', path: '/usluga' },
  { id: 'arkachilar', icon: 'rainbow', title: 'Arkachilar', sub: 'Profillarni ark shaklida tayyorlovchi ustalar', path: '/arkachilar' },
  { id: 'delivery', icon: 'truck', title: 'Dastavka', sub: 'Yuk tashish va kichik dostavka xizmatlari', path: '/delivery' },
  { id: 'romchi-ish', icon: 'briefcase', title: 'Ish platformasi', sub: "Termo · PVX · Alyumin ish va ishchi qidirish", path: '/romchi-ish' },
];

const NAME_KEY = 'romchi_user_name';

export default function HomePage() {
  const router = useRouter();
  const [ready, setReady] = React.useState(false);

  React.useEffect(() => {
    if (!auth.token() || !localStorage.getItem(NAME_KEY)) {
      router.replace('/welcome');
      return;
    }
    if (auth.token() && !auth.user()) {
      api.me()
        .then(m => auth.setUser(m.user))
        .catch(() => auth.clear());
    }
    setReady(true);
  }, [router]);

  if (!ready) return null;

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', padding: '32px 16px 80px' }}>
      <div style={{ maxWidth: 1100, margin: '0 auto' }}>
        <div style={{ textAlign: 'center', padding: '12px 0 8px' }}>
          <Logo size={36} />
          <h1 style={{ fontSize: 28, fontWeight: 800, margin: '14px 0 0', color: 'var(--ink)', letterSpacing: '-0.02em' }}>Xush kelibsiz!</h1>
        </div>

        <div style={{
          display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
          gap: 14, marginTop: 28,
        }}>
          {SECTIONS.map(s => (
            <button
              key={s.id}
              onClick={() => router.push(s.path)}
              style={{
                display: 'flex', alignItems: 'center', gap: 14, padding: '16px 18px',
                background: '#fff', border: '1px solid var(--line)', borderRadius: 18,
                cursor: 'pointer', textAlign: 'left', width: '100%',
                boxShadow: '0 1px 2px rgba(15,23,42,.04)',
                transition: 'transform .1s, box-shadow .15s',
              }}
              onMouseEnter={e => (e.currentTarget.style.boxShadow = '0 4px 12px rgba(15,23,42,.06)')}
              onMouseLeave={e => (e.currentTarget.style.boxShadow = '0 1px 2px rgba(15,23,42,.04)')}
            >
              <div style={{
                width: 96, height: 96, borderRadius: 18,
                background: '#EEF1F5', display: 'grid', placeItems: 'center', flexShrink: 0,
              }}>
                <SectionIcon name={s.icon} size={80} color="#1F2937" />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 700, fontSize: 15, color: 'var(--ink)' }}>{s.title}</div>
                <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 2 }}>{s.sub}</div>
              </div>
              <span style={{ color: '#9CA3AF', fontSize: 18, flexShrink: 0 }}>›</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
