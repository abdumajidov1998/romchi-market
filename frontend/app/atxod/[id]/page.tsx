'use client';
import React from 'react';
import { useRouter, useParams } from 'next/navigation';
import { Avatar, Badge, Btn, Card, EmptyState, TelegramIcon, tgHref } from '@/components/ui';
import { api } from '@/lib/api';
import { SpecIcon } from '@/components/SpecIcon';

import { WASTE_MATERIALS as MATERIALS } from '@/lib/constants';

const fmt = (n: number) => n ? n.toLocaleString('uz-UZ') : '—';
const initials = (n: string) => (n || '?').split(' ').map(p => p[0]).slice(0, 2).join('').toUpperCase();

export default function WasteBuyerProfile() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [b, setB] = React.useState<any>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState('');

  React.useEffect(() => {
    if (!id) return;
    setLoading(true);
    api.wasteBuyer(id)
      .then(d => { setB(d); setError(''); })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return <EmptyState icon="⏳" title="Yuklanmoqda…" sub="" />;
  if (error || !b) return <EmptyState icon="🔎" title="Topilmadi" sub={error} ctaLabel="Orqaga" onCta={() => router.push('/atxod')} />;

  return (
    <div style={{ maxWidth: 540, margin: '0 auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '6px 0 14px' }}>
        <button onClick={() => router.back()} style={{ width: 38, height: 38, borderRadius: 12, background: '#fff', border: '1px solid var(--line)' }}><img src="/images/back.png" alt="orqaga" style={{ width: 16, height: 16, display: 'block', margin: 'auto' }} /></button>
        <div style={{ fontWeight: 700, fontSize: 15 }}>Atxod oluvchi</div>
        <div style={{ width: 38 }} />
      </div>

      <Card style={{ textAlign: 'center', padding: '22px 16px' }}>
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 12 }}>
          <Avatar initials={initials(b.name)} color="green" size={80} />
        </div>
        <div style={{ display: 'flex', justifyContent: 'center', gap: 6, alignItems: 'center' }}>
          <div style={{ fontWeight: 800, fontSize: 18 }}>{b.name}</div>
          {b.verified && <span style={{ width: 16, height: 16, borderRadius: 8, background: 'var(--blue)', color: '#fff', display: 'inline-grid', placeItems: 'center', fontSize: 10 }}>✓</span>}
        </div>
        <div style={{ color: 'var(--muted)', fontSize: 14, marginTop: 2 }}>📍 {b.city} · {b.district}</div>
        <div style={{ display: 'flex', justifyContent: 'center', gap: 18, marginTop: 16 }}>
          <div><b>{b.verified ? '✓ Tasdiqlangan' : 'Yangi'}</b><div style={{ fontSize: 11, color: 'var(--muted)' }}>Holat</div></div>
        </div>
      </Card>

      <Card style={{ marginTop: 12 }}>
        <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 12 }}>💰 Olinadigan narxlar (1 kg)</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {MATERIALS.map(m => {
            const price = b[m.key] || 0;
            return (
              <div key={m.key} style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '12px 14px', background: price > 0 ? '#ECFDF5' : 'var(--bg)', borderRadius: 12,
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <SpecIcon name={m.spec} size={32} />
                  <span style={{ fontWeight: 600, fontSize: 15 }}>{m.label}</span>
                </div>
                <span style={{ fontWeight: 800, fontSize: 16, color: price > 0 ? '#10B981' : 'var(--muted)' }}>
                  {price > 0 ? `${fmt(price)} so'm` : 'Olmaymiz'}
                </span>
              </div>
            );
          })}
        </div>
      </Card>

      {b.about && (
        <Card style={{ marginTop: 12 }}>
          <div style={{ fontWeight: 700, marginBottom: 6 }}>Haqida</div>
          <div style={{ fontSize: 14, color: 'var(--muted)', lineHeight: 1.5 }}>{b.about}</div>
        </Card>
      )}

      {(b.lat && b.lng) && (
        <Card style={{ marginTop: 12, padding: 0, overflow: 'hidden' }}>
          <iframe
            title="map"
            src={`https://maps.google.com/maps?q=${b.lat},${b.lng}&z=15&output=embed`}
            style={{ width: '100%', height: 200, border: 'none', display: 'block' }}
          />
        </Card>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginTop: 14 }}>
        <a href={b.phone ? `tel:${b.phone}` : undefined} style={{ textDecoration: 'none', opacity: b.phone ? 1 : .5, pointerEvents: b.phone ? 'auto' : 'none' }}>
          <Btn full>📞 Qo'ng'iroq</Btn>
        </a>
        <a href={tgHref(b)} target="_blank" rel="noreferrer" style={{ textDecoration: 'none', display: tgHref(b) ? undefined : 'none' }}>
          <Btn variant="soft" full style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}><TelegramIcon size={22} /> Telegram</Btn>
        </a>
      </div>
    </div>
  );
};
