'use client';
import React from 'react';
import { useRouter, useParams } from 'next/navigation';
import { Badge, Btn, Card, EmptyState, TelegramIcon, tgHref } from '@/components/ui';
import { api, auth } from '@/lib/api';
import { StanokSpecIcon } from '@/components/StanokSpecIcon';

const fmtPrice = (n: number) => n ? `${Number(n).toLocaleString('uz-UZ')} so'm` : 'Kelishiladi';

const Hero: React.FC<{ src: string | null | undefined }> = ({ src }) => {
  const [failed, setFailed] = React.useState(false);
  React.useEffect(() => { setFailed(false); }, [src]);
  if (!src || failed) {
    return (
      <div style={{ width: '100%', height: 240, background: '#FEF2F2', display: 'grid', placeItems: 'center', fontSize: 96 }}>
        🏭
      </div>
    );
  }
  return (
    <div style={{ width: '100%', maxHeight: 360, background: '#FEF2F2', display: 'grid', placeItems: 'center', overflow: 'hidden' }}>
      <img src={src} alt="" onError={() => setFailed(true)} style={{ width: '100%', maxHeight: 360, objectFit: 'contain' }} />
    </div>
  );
};

export default function StanokAdDetail() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [d, setD] = React.useState<any>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState('');
  const [confirmDel, setConfirmDel] = React.useState(false);
  const [deleting, setDeleting] = React.useState(false);

  React.useEffect(() => {
    if (!id) return;
    setLoading(true);
    api.stanokAd(id).then(r => { setD(r); setError(''); }).catch(e => setError(e.message)).finally(() => setLoading(false));
  }, [id]);

  if (loading) return <EmptyState icon="⏳" title="Yuklanmoqda..." sub="" />;
  if (error || !d) return <EmptyState icon="🔎" title="Topilmadi" sub={error} ctaLabel="Orqaga" onCta={() => router.push('/stanok-ads')} />;

  const me = auth.user();
  const isOwner = !!(me && me.id === d.user_id);

  const doDelete = async () => {
    setDeleting(true);
    try {
      await api.deleteStanokAd(d.id);
      router.push('/stanok-ads');
    } catch (e: any) {
      setError(e.message);
      setDeleting(false);
    }
  };

  return (
    <div style={{ maxWidth: 540, margin: '0 auto', paddingBottom: 24 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '6px 0 14px' }}>
        <button onClick={() => router.back()} style={{ width: 38, height: 38, borderRadius: 12, background: '#fff', border: '1px solid var(--line)' }}><img src="/images/back.png" alt="orqaga" style={{ width: 16, height: 16, display: 'block', margin: 'auto' }} /></button>
        <div style={{ fontWeight: 700, fontSize: 15 }}>Stanok e'loni</div>
        <div style={{ width: 38 }} />
      </div>

      <Card style={{ padding: 0, overflow: 'hidden' }}>
        <Hero src={d.imageUrl} />
        <div style={{ padding: '16px 18px' }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 }}>
            <div style={{ fontSize: 22, fontWeight: 800, lineHeight: 1.2 }}>{d.title}</div>
            {d.condition === 'new'
              ? <Badge tone="green">🆕 Yangi</Badge>
              : <Badge tone="amber">♻️ Ishlatilgan</Badge>}
          </div>
          {d.stanokType && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: 'var(--muted)', marginTop: 6 }}>
              <StanokSpecIcon name={d.stanokType} size={18} /> {d.stanokType}
            </div>
          )}
          <div style={{ fontWeight: 800, fontSize: 24, color: '#EF4444', marginTop: 10 }}>
            {fmtPrice(d.price)}
          </div>
          <div style={{ fontSize: 13, color: 'var(--muted)', marginTop: 8 }}>📍 {d.city} · {d.district}</div>
        </div>
      </Card>

      {d.description && (
        <Card style={{ marginTop: 12 }}>
          <div style={{ fontWeight: 700, marginBottom: 6 }}>Batafsil</div>
          <div style={{ fontSize: 14, color: 'var(--muted)', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>{d.description}</div>
        </Card>
      )}

      {(d.lat && d.lng) && (
        <Card style={{ marginTop: 12, padding: 0, overflow: 'hidden' }}>
          <iframe title="map" src={`https://maps.google.com/maps?q=${d.lat},${d.lng}&z=15&output=embed`} style={{ width: '100%', height: 200, border: 'none', display: 'block' }} />
        </Card>
      )}

      {(d.phone || d.telegram) && (
        <Card style={{ marginTop: 12 }}>
          <div style={{ fontWeight: 700, marginBottom: 8 }}>Bog'lanish</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, fontSize: 14 }}>
            {d.phone && <div>📞 <a href={`tel:${d.phone}`} style={{ color: 'var(--blue)', textDecoration: 'none', fontWeight: 600 }}>{d.phone}</a></div>}
            {d.telegram && <div>💬 <a href={`https://t.me/${String(d.telegram).replace(/^@/, '')}`} target="_blank" rel="noreferrer" style={{ color: 'var(--blue)', textDecoration: 'none', fontWeight: 600 }}>@{String(d.telegram).replace(/^@/, '')}</a></div>}
          </div>
        </Card>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginTop: 14 }}>
        <a href={d.phone ? `tel:${d.phone}` : undefined} style={{ textDecoration: 'none', opacity: d.phone ? 1 : .5, pointerEvents: d.phone ? 'auto' : 'none' }}>
          <Btn full>📞 Qo'ng'iroq</Btn>
        </a>
        <a href={tgHref(d)} target="_blank" rel="noreferrer" style={{ textDecoration: 'none', display: tgHref(d) ? undefined : 'none' }}>
          <Btn variant="soft" full style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}><TelegramIcon size={22} /> Telegram</Btn>
        </a>
      </div>

      {isOwner && (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginTop: 10 }}>
            <Btn variant="ghost" full onClick={() => router.push(`/stanok-ads/${d.id}/edit`)}>✏️ Tahrirlash</Btn>
            <Btn variant="ghost" full style={{ color: '#DC2626', borderColor: '#FECACA' }} onClick={() => setConfirmDel(true)}>🗑️ O'chirish</Btn>
          </div>
          {confirmDel && (
            <div style={{ position: 'fixed', inset: 0, background: 'rgba(11,18,32,.5)', zIndex: 100, display: 'grid', placeItems: 'center', padding: 20 }} onClick={() => !deleting && setConfirmDel(false)}>
              <div onClick={e => e.stopPropagation()} style={{ background: '#fff', borderRadius: 18, padding: 22, maxWidth: 400, width: '100%' }}>
                <div style={{ fontSize: 36, textAlign: 'center', marginBottom: 8 }}>⚠️</div>
                <div style={{ fontWeight: 800, fontSize: 18, textAlign: 'center' }}>E'lonni o'chirasizmi?</div>
                <p style={{ color: 'var(--muted)', fontSize: 13, textAlign: 'center', margin: '6px 0 18px' }}>Bu amalni qaytarib bo'lmaydi.</p>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                  <Btn variant="ghost" full onClick={() => setConfirmDel(false)}>Yo'q</Btn>
                  <Btn full style={{ background: '#DC2626', opacity: deleting ? .6 : 1 }} onClick={doDelete}>{deleting ? "O'chirilmoqda…" : "Ha, o'chirish"}</Btn>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};
