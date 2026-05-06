'use client';
import React from 'react';
import { useRouter, useParams } from 'next/navigation';
import { Btn, Card, EmptyState, TelegramIcon, tgHref } from '@/components/ui';
import { api } from '@/lib/api';
import { SpecIcon } from '@/components/SpecIcon';

const PRICES = [
  { key: 'priceTermo', label: 'Termo', spec: 'Termo' },
  { key: 'pricePvx', label: 'PVX', spec: 'PVX' },
  { key: 'priceAlyumin', label: 'Alyumin', spec: 'Alyumin' },
  { key: 'priceJpFasad', label: 'JP fasad', spec: 'JP fasad' },
];
const fmt = (n: number) => n ? n.toLocaleString('uz-UZ') : '---';

const SpecVisual: React.FC<{ name: string; size?: number }> = ({ name, size = 32 }) => <SpecIcon name={name} size={size} />;

export default function ArkachiProfile() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [a, setA] = React.useState<any>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState('');

  React.useEffect(() => {
    if (!id) return;
    setLoading(true);
    api.arkachi(id)
      .then(d => { setA(d); setError(''); })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return <EmptyState icon="⏳" title="Yuklanmoqda…" sub="" />;
  if (error || !a) return <EmptyState icon="🔎" title="Topilmadi" sub={error} ctaLabel="Orqaga" onCta={() => router.push('/arkachilar')} />;

  return (
    <div style={{ maxWidth: 540, margin: '0 auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '6px 0 14px' }}>
        <button onClick={() => router.back()} style={{ width: 38, height: 38, borderRadius: 12, background: '#fff', border: '1px solid var(--line)' }}><img src="/images/back.png" alt="orqaga" style={{ width: 16, height: 16, display: 'block', margin: 'auto' }} /></button>
        <div style={{ fontWeight: 700, fontSize: 15 }}>Arkachi</div>
        <div style={{ width: 38 }} />
      </div>

      <Card style={{ textAlign: 'center', padding: '22px 16px' }}>
        <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginBottom: 12, flexWrap: 'wrap' }}>
          {(a.specs || []).map((s: string) => (
            <div key={s} style={{ width: 56, height: 56, borderRadius: 14, background: 'var(--blue-50)', display: 'grid', placeItems: 'center' }}>
              <SpecVisual name={s} size={44} />
            </div>
          ))}
        </div>
        <div style={{ display: 'flex', justifyContent: 'center', gap: 6, alignItems: 'center' }}>
          <div style={{ fontWeight: 800, fontSize: 18 }}>{a.name}</div>
          {a.verified && <span style={{ width: 16, height: 16, borderRadius: 8, background: 'var(--blue)', color: '#fff', display: 'inline-grid', placeItems: 'center', fontSize: 10 }}>✓</span>}
        </div>
        <div style={{ color: 'var(--muted)', fontSize: 14, marginTop: 2 }}>📍 {a.city} · {a.district}</div>
        {a.experience && <div style={{ color: 'var(--muted)', fontSize: 13, marginTop: 4 }}>🔧 {a.experience}</div>}
        <div style={{ display: 'flex', justifyContent: 'center', gap: 8, flexWrap: 'wrap', marginTop: 10 }}>
          {(a.specs || []).map((s: string) => (
            <span key={s} style={{ fontSize: 12, fontWeight: 700, padding: '4px 10px', borderRadius: 999, background: 'var(--blue-50)', color: 'var(--blue)' }}>{s}</span>
          ))}
        </div>
      </Card>

      <Card style={{ marginTop: 12 }}>
        <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 12 }}>💰 Ark narxlari (1 metr uchun)</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {PRICES.map(m => {
            const price = a[m.key] || 0;
            if (!price && !a.specs?.includes(m.label)) return null;
            return (
              <div key={m.key} style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '12px 14px', background: price > 0 ? '#EBF5FF' : 'var(--bg)', borderRadius: 12,
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <SpecVisual name={m.spec} size={32} />
                  <span style={{ fontWeight: 600, fontSize: 15 }}>{m.label}</span>
                </div>
                <span style={{ fontWeight: 800, fontSize: 16, color: price > 0 ? 'var(--blue)' : 'var(--muted)' }}>
                  {price > 0 ? `${fmt(price)} so'm/m` : '---'}
                </span>
              </div>
            );
          })}
        </div>
      </Card>

      {a.about && (
        <Card style={{ marginTop: 12 }}>
          <div style={{ fontWeight: 700, marginBottom: 6 }}>Haqida</div>
          <div style={{ fontSize: 14, color: 'var(--muted)', lineHeight: 1.5 }}>{a.about}</div>
        </Card>
      )}

      {(a.lat && a.lng) && (
        <Card style={{ marginTop: 12, padding: 0, overflow: 'hidden' }}>
          <iframe title="map" src={`https://maps.google.com/maps?q=${a.lat},${a.lng}&z=15&output=embed`} style={{ width: '100%', height: 200, border: 'none', display: 'block' }} />
        </Card>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginTop: 14 }}>
        <a href={a.phone ? `tel:${a.phone}` : undefined} style={{ textDecoration: 'none', opacity: a.phone ? 1 : .5, pointerEvents: a.phone ? 'auto' : 'none' }}>
          <Btn full>📞 Qo'ng'iroq</Btn>
        </a>
        <a href={tgHref(a)} target="_blank" rel="noreferrer" style={{ textDecoration: 'none', display: tgHref(a) ? undefined : 'none' }}>
          <Btn variant="soft" full style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}><TelegramIcon size={22} /> Telegram</Btn>
        </a>
      </div>
    </div>
  );
};
