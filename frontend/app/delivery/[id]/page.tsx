'use client';
import React from 'react';
import { useRouter, useParams } from 'next/navigation';
import { Avatar, Badge, Btn, Card, EmptyState, TelegramIcon, tgHref } from '@/components/ui';
import { api } from '@/lib/api';
import { DELIVERY_VEHICLES } from '@/lib/constants';
import { SectionIcon } from '@/components/SectionIcon';

const initials = (n: string) => (n || '?').split(' ').map(p => p[0]).slice(0, 2).join('').toUpperCase();

const vehicleFor = (m: any): { src: string | null; icon: string } => {
  const preset = DELIVERY_VEHICLES.find(v => v.name === m.vehicleModel);
  return { src: preset?.image || null, icon: preset?.icon || '🚚' };
};

const VehicleHero: React.FC<{ src: string | null; icon: string }> = ({ src, icon }) => {
  const [failed, setFailed] = React.useState(false);
  React.useEffect(() => { setFailed(false); }, [src]);
  if (!src || failed) {
    return (
      <div style={{ width: '100%', height: 200, background: '#EFF6FF', display: 'grid', placeItems: 'center', fontSize: 96 }}>
        {icon}
      </div>
    );
  }
  return (
    <div style={{ width: '100%', height: 200, background: '#EFF6FF', display: 'grid', placeItems: 'center', overflow: 'hidden' }}>
      <img src={src} alt="" onError={() => setFailed(true)} style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
    </div>
  );
};

export default function DeliveryProfile() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [d, setD] = React.useState<any>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState('');

  React.useEffect(() => {
    if (!id) return;
    setLoading(true);
    api.deliveryDriver(id).then(r => { setD(r); setError(''); }).catch(e => setError(e.message)).finally(() => setLoading(false));
  }, [id]);

  if (loading) return <EmptyState icon="⏳" title="Yuklanmoqda..." sub="" />;
  if (error || !d) return <EmptyState icon="🔎" title="Topilmadi" sub={error} ctaLabel="Orqaga" onCta={() => router.push('/delivery')} />;

  return (
    <div style={{ maxWidth: 540, margin: '0 auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '6px 0 14px' }}>
        <button onClick={() => router.push(-1)} style={{ width: 38, height: 38, borderRadius: 12, background: '#fff', border: '1px solid var(--line)' }}><img src="/images/back.png" alt="orqaga" style={{ width: 16, height: 16, display: 'block', margin: 'auto' }} /></button>
        <div style={{ fontWeight: 700, fontSize: 15 }}>Dostavkachi</div>
        <div style={{ width: 38 }} />
      </div>

      <Card style={{ textAlign: 'center', padding: '22px 16px' }}>
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 12 }}>
          <Avatar initials={initials(d.name)} color="blue" size={80} />
        </div>
        <div style={{ display: 'flex', justifyContent: 'center', gap: 6, alignItems: 'center' }}>
          <div style={{ fontWeight: 800, fontSize: 18 }}>{d.name}</div>
          {d.verified && <span style={{ width: 16, height: 16, borderRadius: 8, background: 'var(--blue)', color: '#fff', display: 'inline-grid', placeItems: 'center', fontSize: 10 }}>✓</span>}
        </div>
        <div style={{ color: 'var(--muted)', fontSize: 14, marginTop: 2 }}>📍 {d.city} · {d.district}</div>
        {d.verified && (
          <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginTop: 10 }}>
            <Badge tone="green">Tasdiqlangan</Badge>
          </div>
        )}
      </Card>

      <Card style={{ marginTop: 12, padding: 0, overflow: 'hidden' }}>
        <VehicleHero {...vehicleFor(d)} />
        <div style={{ padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 10 }}>
          <SectionIcon name="truck" size={22} color="var(--ink)" />
          <div>
            <div style={{ fontSize: 12, color: 'var(--muted)' }}>Avtomobil</div>
            <div style={{ fontWeight: 700, fontSize: 16 }}>{d.vehicleModel}</div>
          </div>
        </div>
      </Card>

      {d.about && (
        <Card style={{ marginTop: 12 }}>
          <div style={{ fontWeight: 700, marginBottom: 6 }}>Haqida</div>
          <div style={{ fontSize: 14, color: 'var(--muted)', lineHeight: 1.5 }}>{d.about}</div>
        </Card>
      )}

      {(d.lat && d.lng) && (
        <Card style={{ marginTop: 12, padding: 0, overflow: 'hidden' }}>
          <iframe title="map" src={`https://maps.google.com/maps?q=${d.lat},${d.lng}&z=15&output=embed`} style={{ width: '100%', height: 200, border: 'none', display: 'block' }} />
        </Card>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginTop: 14 }}>
        <a href={d.phone ? `tel:${d.phone}` : undefined} style={{ textDecoration: 'none', opacity: d.phone ? 1 : .5, pointerEvents: d.phone ? 'auto' : 'none' }}>
          <Btn full>📞 Qo'ng'iroq</Btn>
        </a>
        <a href={tgHref(d.telegram)} target="_blank" rel="noreferrer" style={{ textDecoration: 'none', display: tgHref(d.telegram) ? undefined : 'none' }}>
          <Btn variant="soft" full style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}><TelegramIcon size={22} /> Telegram</Btn>
        </a>
      </div>
    </div>
  );
};
