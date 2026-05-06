'use client';
import React from 'react';
import { useRouter, useParams } from 'next/navigation';
import { Avatar, Badge, Btn, Card, EmptyState, TelegramIcon, tgHref } from '@/components/ui';
import { api } from '@/lib/api';
import { StanokSpecIcon } from '@/components/StanokSpecIcon';

const fmt = (n: number) => n ? n.toLocaleString('uz-UZ') : '---';
const initials = (n: string) => (n || '?').split(' ').map(p => p[0]).slice(0, 2).join('').toUpperCase();

export default function StanokProfile() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [m, setM] = React.useState<any>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState('');

  React.useEffect(() => {
    if (!id) return;
    setLoading(true);
    api.stanokMaster(id).then(d => { setM(d); setError(''); }).catch(e => setError(e.message)).finally(() => setLoading(false));
  }, [id]);

  if (loading) return <EmptyState icon="⏳" title="Yuklanmoqda..." sub="" />;
  if (error || !m) return <EmptyState icon="🔎" title="Topilmadi" sub={error} ctaLabel="Orqaga" onCta={() => router.push('/stanok')} />;

  return (
    <div style={{ maxWidth: 540, margin: '0 auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '6px 0 14px' }}>
        <button onClick={() => router.back()} style={{ width: 38, height: 38, borderRadius: 12, background: '#fff', border: '1px solid var(--line)' }}><img src="/images/back.png" alt="orqaga" style={{ width: 16, height: 16, display: 'block', margin: 'auto' }} /></button>
        <div style={{ fontWeight: 700, fontSize: 15 }}>Stanok ustasi</div>
        <div style={{ width: 38 }} />
      </div>

      <Card style={{ textAlign: 'center', padding: '22px 16px' }}>
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 12 }}>
          <Avatar initials={initials(m.name)} color="amber" size={80} />
        </div>
        <div style={{ display: 'flex', justifyContent: 'center', gap: 6, alignItems: 'center' }}>
          <div style={{ fontWeight: 800, fontSize: 18 }}>{m.name}</div>
          {m.verified && <span style={{ width: 16, height: 16, borderRadius: 8, background: 'var(--blue)', color: '#fff', display: 'inline-grid', placeItems: 'center', fontSize: 10 }}>✓</span>}
        </div>
        <div style={{ color: 'var(--muted)', fontSize: 14, marginTop: 2 }}>📍 {m.city} · {m.district}</div>
        {m.experience && <div style={{ color: 'var(--muted)', fontSize: 13, marginTop: 4 }}>Tajriba: {m.experience}</div>}
        <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginTop: 10 }}>
          {m.urgent && <Badge tone="amber">⚡ Shoshilinch 24/7</Badge>}
          {m.verified && <Badge tone="green">Tasdiqlangan</Badge>}
        </div>
      </Card>

      <Card style={{ marginTop: 12 }}>
        <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 12 }}>⚙️ Yo'nalishlari</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {(m.specs || []).map((s: string) => (
            <div key={s} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', background: 'var(--blue-50)', borderRadius: 12 }}>
              <StanokSpecIcon name={s} size={26} color="var(--blue)" />
              <span style={{ fontWeight: 600, fontSize: 15 }}>{s}</span>
            </div>
          ))}
        </div>
      </Card>

      <Card style={{ marginTop: 12 }}>
        <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 12 }}>💰 Narxlar</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {(m.specs || []).some((s: string) => s !== 'Arra chaxlovchi') && (
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 14px', background: '#ECFDF5', borderRadius: 12 }}>
              <span style={{ fontWeight: 600 }}>⚡ Diagnostika / Chaqiruv</span>
              <span style={{ fontWeight: 800, color: '#10B981' }}>{m.priceDiagnostika ? `${fmt(m.priceDiagnostika)} so'm` : 'Kelishiladi'}</span>
            </div>
          )}
          {(m.specs || []).includes('Arra chaxlovchi') && (
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 14px', background: '#FEF3C7', borderRadius: 12 }}>
              <span style={{ fontWeight: 600 }}>🪚 Arra charxlash</span>
              <span style={{ fontWeight: 800, color: '#D97706' }}>{m.priceCharxlash ? `${fmt(m.priceCharxlash)} so'm` : 'Kelishiladi'}</span>
            </div>
          )}
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 14px', background: 'var(--bg)', borderRadius: 12 }}>
            <span style={{ fontWeight: 600 }}>🔧 Remont</span>
            <span style={{ fontWeight: 800, color: 'var(--ink)' }}>Kelishiladi</span>
          </div>
        </div>
      </Card>

      {m.about && (
        <Card style={{ marginTop: 12 }}>
          <div style={{ fontWeight: 700, marginBottom: 6 }}>Haqida</div>
          <div style={{ fontSize: 14, color: 'var(--muted)', lineHeight: 1.5 }}>{m.about}</div>
        </Card>
      )}

      {(m.lat && m.lng) && (
        <Card style={{ marginTop: 12, padding: 0, overflow: 'hidden' }}>
          <iframe title="map" src={`https://maps.google.com/maps?q=${m.lat},${m.lng}&z=15&output=embed`} style={{ width: '100%', height: 200, border: 'none', display: 'block' }} />
        </Card>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginTop: 14 }}>
        <a href={m.phone ? `tel:${m.phone}` : undefined} style={{ textDecoration: 'none', opacity: m.phone ? 1 : .5, pointerEvents: m.phone ? 'auto' : 'none' }}>
          <Btn full>📞 Qo'ng'iroq</Btn>
        </a>
        <a href={tgHref(m)} target="_blank" rel="noreferrer" style={{ textDecoration: 'none', display: tgHref(m) ? undefined : 'none' }}>
          <Btn variant="soft" full style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}><TelegramIcon size={22} /> Telegram</Btn>
        </a>
      </div>
    </div>
  );
};
