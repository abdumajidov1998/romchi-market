import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Btn } from '../ui';

export const Onboarding: React.FC = () => {
  const nav = useNavigate();
  const [choice, setChoice] = React.useState<'worker' | 'employer'>('worker');

  return (
    <div style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', padding: 20 }}>
      <div style={{ width: '100%', maxWidth: 460, background: '#fff', borderRadius: 24, padding: 28, boxShadow: 'var(--shadow-lg)' }}>
        <button onClick={() => nav('/')} style={{ width: 38, height: 38, borderRadius: 12, background: '#f5f5f5', border: '1px solid var(--line)', fontSize: 16, cursor: 'pointer', marginBottom: 10 }}>←</button>
        <div style={{ marginBottom: 18, display: 'flex', justifyContent: 'center' }}>
          <img src="/images/onboarding.png" alt="Romchi Ish platformasiga xush kelibsiz" style={{ width: '100%', maxWidth: 420, height: 'auto', display: 'block' }} />
        </div>

        {([
          { key: 'worker', icon: '👷', title: 'Men ish qidiryapman', sub: 'Termo · PVX · Alyumin ishchilari', color: 'var(--blue-50)', fg: 'var(--blue)' },
          { key: 'employer', icon: '🏭', title: 'Men ishchi qidiryapman', sub: 'Zavod yoki ustaxona', color: '#FFF4E5', fg: '#F59E0B' },
        ] as const).map(o => (
          <div key={o.key} onClick={() => setChoice(o.key)} style={{
            display: 'flex', alignItems: 'center', gap: 14, padding: 18,
            background: choice === o.key ? 'linear-gradient(180deg, #fff, rgba(0,119,255,0.06))' : '#fff',
            border: `1.5px solid ${choice === o.key ? 'var(--blue)' : 'var(--line)'}`,
            borderRadius: 18, cursor: 'pointer', marginBottom: 10,
          }}>
            <div style={{ width: 48, height: 48, borderRadius: 14, background: o.color, color: o.fg, display: 'grid', placeItems: 'center', fontSize: 22 }}>{o.icon}</div>
            <div>
              <div style={{ fontWeight: 700, fontSize: 15 }}>{o.title}</div>
              <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 2 }}>{o.sub}</div>
            </div>
          </div>
        ))}

        <Btn full onClick={() => nav(choice === 'worker' ? '/profile/create' : '/post')} style={{ marginTop: 18 }}>Davom etish →</Btn>
        <p style={{ textAlign: 'center', color: 'var(--muted)', fontSize: 12, marginTop: 12 }}>Davom etish orqali siz Shartlarga rozi bo‘lasiz</p>
      </div>
    </div>
  );
};
