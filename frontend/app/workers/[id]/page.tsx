'use client';
import React from 'react';
import { useRouter, useParams } from 'next/navigation';
import { Avatar, Badge, Btn, Card, Chip, EmptyState, TelegramIcon, tgHref } from '@/components/ui';
import { api } from '@/lib/api';
import { SpecIcon } from '@/components/SpecIcon';

const initials = (n: string) => (n || '?').split(' ').map(p => p[0]).slice(0, 2).join('').toUpperCase();

export default function WorkerProfile() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [w, setW] = React.useState<any>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState('');

  React.useEffect(() => {
    if (!id) return;
    setLoading(true);
    api.worker(id)
      .then(d => { setW(d); setError(''); })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return <EmptyState icon="⏳" title="Yuklanmoqda…" sub="" />;
  if (error || !w) return <EmptyState icon="🔎" title="Ishchi topilmadi" sub={error} ctaLabel="Orqaga" onCta={() => router.push('/workers')} />;

  return (
    <div style={{ maxWidth: 540, margin: '0 auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '6px 0 14px' }}>
        <button onClick={() => router.back()} style={{ width: 38, height: 38, borderRadius: 12, background: '#fff', border: '1px solid var(--line)' }}><img src="/images/back.png" alt="orqaga" style={{ width: 16, height: 16, display: 'block', margin: 'auto' }} /></button>
        <div style={{ fontWeight: 700, fontSize: 15 }}>Profil</div>
        <button style={{ width: 38, height: 38, borderRadius: 12, background: '#fff', border: '1px solid var(--line)' }}>⋯</button>
      </div>

      <Card style={{ textAlign: 'center', padding: '22px 16px' }}>
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 12 }}>
          <Avatar initials={initials(w.name)} color="blue" size={80} />
        </div>
        <div style={{ display: 'flex', justifyContent: 'center', gap: 6, alignItems: 'center' }}>
          <div style={{ fontWeight: 800, fontSize: 18 }}>{w.name}</div>
          {w.verified && <span style={{ width: 16, height: 16, borderRadius: 8, background: 'var(--blue)', color: '#fff', display: 'inline-grid', placeItems: 'center', fontSize: 10 }}>✓</span>}
        </div>
        <div style={{ color: 'var(--muted)', fontSize: 14, marginTop: 2 }}>📍 {w.city} · {w.district}</div>

        <div style={{ display: 'flex', justifyContent: 'center', gap: 10, flexWrap: 'wrap', marginTop: 14 }}>
          {(w.specs || []).map((s: string) => (
            <div key={s} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', borderRadius: 12, background: 'var(--blue-50)' }}>
              <SpecIcon name={s} size={32} />
              <span style={{ fontWeight: 700, fontSize: 14, color: 'var(--blue)' }}>{s}</span>
            </div>
          ))}
        </div>

        <div style={{ display: 'flex', justifyContent: 'center', gap: 18, marginTop: 14 }}>
          <div><div style={{ fontWeight: 800, fontSize: 18 }}>{w.experience}</div><div style={{ color: 'var(--muted)', fontSize: 11 }}>Tajriba</div></div>
          <div style={{ width: 1, background: 'var(--line)' }} />
          <div><div style={{ fontWeight: 800, fontSize: 18 }}>{w.jobs || 0}</div><div style={{ color: 'var(--muted)', fontSize: 11 }}>Bajarilgan</div></div>
        </div>
      </Card>

      <div style={{ marginTop: 12 }}>
        <Card>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
              <div style={{ width: 38, height: 38, borderRadius: 12, background: 'var(--green-50)', color: 'var(--green)', display: 'grid', placeItems: 'center' }}>●</div>
              <div>
                <div style={{ fontWeight: 700, fontSize: 14 }}>Romchi faolligi</div>
                <div style={{ color: 'var(--muted)', fontSize: 12 }}>Oxirgi 24 soat ichida onlayn</div>
              </div>
            </div>
            {w.verified && <Badge tone="green">Tasdiqlangan</Badge>}
          </div>
        </Card>
      </div>

      {w.about && (
        <div style={{ marginTop: 12 }}>
          <Card>
            <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 6 }}>O‘zi haqida</div>
            <p style={{ color: 'var(--muted)', fontSize: 13, margin: 0 }}>{w.about}</p>
          </Card>
        </div>
      )}

      <Card style={{ marginTop: 12, padding: 0, overflow: 'hidden' }}>
        <div style={{ padding: '14px 16px 10px' }}>
          <div style={{ fontWeight: 700, fontSize: 15 }}>📍 Joylashuv</div>
          <div style={{ color: 'var(--muted)', fontSize: 13, marginTop: 2 }}>{w.city} · {w.district}</div>
        </div>
        <iframe
          title="worker-map"
          src={w.lat && w.lng
            ? `https://maps.google.com/maps?q=${w.lat},${w.lng}&z=15&output=embed`
            : `https://maps.google.com/maps?q=${encodeURIComponent(`${w.district}, ${w.city}, Uzbekistan`)}&z=12&output=embed`}
          style={{ width: '100%', height: 240, border: 'none', display: 'block' }}
          loading="lazy"
        />
        <a
          href={w.lat && w.lng
            ? `https://www.google.com/maps/search/?api=1&query=${w.lat},${w.lng}`
            : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${w.district}, ${w.city}, Uzbekistan`)}`}
          target="_blank" rel="noopener noreferrer"
          style={{ display: 'block', padding: '12px 16px', fontSize: 13, fontWeight: 600, color: 'var(--blue)', borderTop: '1px solid var(--line)', textAlign: 'center' }}
        >
          Xaritada ochish →
        </a>
      </Card>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginTop: 14 }}>
        <a href={w.phone ? `tel:${w.phone}` : undefined} style={{ textDecoration: 'none', opacity: w.phone ? 1 : .5, pointerEvents: w.phone ? 'auto' : 'none' }}>
          <Btn full>📞 Qo‘ng‘iroq</Btn>
        </a>
        <a href={tgHref(w.telegram)} target="_blank" rel="noreferrer" style={{ textDecoration: 'none', display: tgHref(w.telegram) ? undefined : 'none' }}>
          <Btn variant="soft" full style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}><TelegramIcon size={22} /> Telegram</Btn>
        </a>
      </div>
    </div>
  );
};
