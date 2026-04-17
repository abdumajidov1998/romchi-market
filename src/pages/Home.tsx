import React from 'react';
import { useNavigate } from 'react-router-dom';

const SECTIONS = [
  {
    id: 'romchi-ish',
    icon: '🔧',
    title: 'Romchi Ish',
    sub: 'Termo · PVX · Alyumin ish va ishchi qidirish',
    color: '#EBF5FF',
    fg: '#0077FF',
    path: '/romchi-ish',
    active: true,
  },
  {
    id: 'atxod',
    icon: '♻️',
    title: 'Atxod oluvchilar',
    sub: 'Alyumin, plastik, temir atxod sotish va sotib olish',
    color: '#ECFDF5',
    fg: '#10B981',
    path: '/atxod',
    active: true,
  },
  {
    id: 'stanok',
    icon: '⚙️',
    title: 'Stanok remont',
    sub: 'Stanok ta\'mirlash va sozlash ustalari',
    color: '#FFF7ED',
    fg: '#F59E0B',
    path: '/stanok',
    active: false,
  },
  {
    id: 'asbob',
    icon: '🛠️',
    title: 'Asbob-uskuna',
    sub: 'Asbob va uskuna sotish, sotib olish',
    color: '#FDF2F8',
    fg: '#EC4899',
    path: '/asbob',
    active: false,
  },
];

export const Home: React.FC = () => {
  const nav = useNavigate();

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', padding: '20px' }}>
      <div style={{ maxWidth: 540, margin: '0 auto' }}>
        <div style={{ textAlign: 'center', padding: '20px 0 24px' }}>
          <img src="/images/logo.png" alt="Romchi" style={{ height: 100, margin: '0 auto', display: 'block', objectFit: 'contain' }} />
          <h1 style={{ fontSize: 24, fontWeight: 800, margin: '12px 0 4px', color: 'var(--ink)' }}>Xush kelibsiz!</h1>
          <p style={{ color: 'var(--muted)', fontSize: 14, margin: 0 }}>Kerakli bo'limni tanlang</p>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {SECTIONS.map(s => (
            <button
              key={s.id}
              onClick={() => s.active ? nav(s.path) : null}
              style={{
                display: 'flex', alignItems: 'center', gap: 14, padding: 18,
                background: '#fff', border: '1px solid var(--line)', borderRadius: 18,
                cursor: s.active ? 'pointer' : 'default', textAlign: 'left', width: '100%',
                opacity: s.active ? 1 : 0.6, position: 'relative',
              }}
            >
              <div style={{
                width: 52, height: 52, borderRadius: 14, background: s.color,
                display: 'grid', placeItems: 'center', fontSize: 26, flexShrink: 0,
              }}>
                {s.icon}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 700, fontSize: 16, color: 'var(--ink)' }}>{s.title}</div>
                <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 2 }}>{s.sub}</div>
              </div>
              {s.active ? (
                <div style={{ fontSize: 20, color: s.fg, flexShrink: 0 }}>→</div>
              ) : (
                <span style={{
                  fontSize: 10, fontWeight: 700, padding: '4px 8px', borderRadius: 8,
                  background: 'var(--bg)', color: 'var(--muted)', flexShrink: 0,
                }}>Tez kunda</span>
              )}
            </button>
          ))}
        </div>

        <p style={{ textAlign: 'center', color: 'var(--muted)', fontSize: 11, marginTop: 24 }}>
          Romchi Service © 2026
        </p>
      </div>
    </div>
  );
};
