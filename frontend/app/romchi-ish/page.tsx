'use client';
import React from 'react';
import { useRouter } from 'next/navigation';
import { Btn } from '@/components/ui';

export default function OnboardingPage() {
  const router = useRouter();
  const [choice, setChoice] = React.useState<'worker' | 'employer'>('worker');

  return (
    <div style={{ minHeight: '100vh', display: 'flex', justifyContent: 'center', alignItems: 'flex-start', padding: 14 }}>
      <div style={{ width: '100%', maxWidth: 440, background: '#fff', borderRadius: 18, padding: 16, boxShadow: 'var(--shadow-lg)' }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <button onClick={() => router.push('/')} style={{ width: 34, height: 34, borderRadius: 10, background: '#f5f5f5', border: '1px solid var(--line)', fontSize: 14, cursor: 'pointer', marginBottom: 6 }}><img src="/images/back.png" alt="orqaga" style={{ width: 16, height: 16, display: 'block', margin: 'auto' }} /></button>
        <div style={{ marginBottom: 10, display: 'flex', justifyContent: 'center' }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/images/onboarding.png" alt="Romchi Ish platformasiga xush kelibsiz" style={{ width: '100%', maxWidth: 240, height: 'auto', display: 'block' }} />
        </div>

        {([
          { key: 'worker', icon: '👷', title: 'Ish qidiryapman', sub: 'Termo · PVX · Alyumin ishchilari', color: 'var(--blue-50)', fg: 'var(--blue)' },
          { key: 'employer', icon: '🏭', title: 'Ishchi qidiryapman', sub: 'Zavod yoki ustaxona', color: '#FFF4E5', fg: '#F59E0B' },
        ] as const).map(o => (
          <div key={o.key} onClick={() => setChoice(o.key)} style={{
            display: 'flex', alignItems: 'center', gap: 12, padding: 12,
            background: choice === o.key ? 'linear-gradient(180deg, #fff, rgba(0,119,255,0.06))' : '#fff',
            border: `1.5px solid ${choice === o.key ? 'var(--blue)' : 'var(--line)'}`,
            borderRadius: 14, cursor: 'pointer', marginBottom: 8,
          }}>
            <div style={{ width: 40, height: 40, borderRadius: 12, background: o.color, color: o.fg, display: 'grid', placeItems: 'center', fontSize: 19, flexShrink: 0 }}>{o.icon}</div>
            <div>
              <div style={{ fontWeight: 700, fontSize: 14 }}>{o.title}</div>
              <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 1 }}>{o.sub}</div>
            </div>
          </div>
        ))}

        <Btn full onClick={() => router.push(choice === 'worker' ? '/jobs' : '/workers')} style={{ marginTop: 10, padding: '14px' }}>Davom etish</Btn>
        <p style={{ textAlign: 'center', color: 'var(--muted)', fontSize: 11, marginTop: 8, marginBottom: 0 }}>Davom etish orqali siz Shartlarga rozi bo‘lasiz</p>
      </div>
    </div>
  );
}
