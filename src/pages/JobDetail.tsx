import React from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Badge, Btn, Card, Chip, EmptyState, formatUZS, TelegramIcon, tgHref } from '../ui';
import { api, auth } from '../api';
import { SpecIcon } from '../SpecIcon';

const BADGE_UZ: Record<string, string> = { New: 'Yangi', Verified: 'Tasdiqlangan', Urgent: 'Shoshilinch' };

export const JobDetail: React.FC = () => {
  const { id } = useParams();
  const nav = useNavigate();
  const [j, setJ] = React.useState<any>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState('');
  const [deleting, setDeleting] = React.useState(false);
  const [confirmDel, setConfirmDel] = React.useState(false);

  const load = React.useCallback(() => {
    if (!id) return;
    setLoading(true);
    api.job(id)
      .then(d => { setJ(d); setError(''); })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, [id]);

  React.useEffect(() => { load(); }, [load]);

  if (loading) return <EmptyState icon="⏳" title="Yuklanmoqda…" sub="" />;
  if (error || !j) return <EmptyState icon="🔎" title="Ish topilmadi" sub={error} ctaLabel="Orqaga" onCta={() => nav('/jobs')} />;

  const me = auth.user();
  const isOwner = me && me.id === j.user_id;
  const mapQuery = encodeURIComponent(`${j.district}, ${j.city}, Uzbekistan`);

  const doDelete = async () => {
    setDeleting(true);
    try {
      await api.deleteJob(j.id);
      nav('/jobs');
    } catch (e: any) {
      setError(e.message);
      setDeleting(false);
    }
  };

  return (
    <div style={{ maxWidth: 720, margin: '0 auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '6px 0 14px' }}>
        <button onClick={() => nav(-1)} style={{ width: 38, height: 38, borderRadius: 12, background: '#fff', border: '1px solid var(--line)' }}><img src="/images/back.png" alt="orqaga" style={{ width: 16, height: 16, display: 'block', margin: 'auto' }} /></button>
        <div style={{ fontWeight: 700, fontSize: 15 }}>Vakansiya</div>
        <button style={{ width: 38, height: 38, borderRadius: 12, background: '#fff', border: '1px solid var(--line)' }}>⋯</button>
      </div>

      <Card>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 22, fontWeight: 800, letterSpacing: '-.02em' }}>{j.title}</div>
            <div style={{ color: 'var(--muted)', marginTop: 4 }}>{j.company} · {j.type === 'Factory' ? 'Zavod' : 'Ustaxona'}</div>
          </div>
          {j.badge && j.badge !== 'Top' && BADGE_UZ[j.badge] && <Badge tone={j.badge === 'New' ? 'green' : 'amber'}>{BADGE_UZ[j.badge]}</Badge>}
        </div>

        {(j.specs || []).length > 0 && (
          <div style={{ display: 'flex', gap: 10, marginTop: 14, flexWrap: 'wrap' }}>
            {j.specs.map((s: string) => (
              <div key={s} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', borderRadius: 12, background: 'var(--blue-50)' }}>
                <SpecIcon name={s} size={32} />
                <span style={{ fontWeight: 700, fontSize: 14, color: 'var(--blue)' }}>{s}</span>
              </div>
            ))}
          </div>
        )}

        <div style={{ display: 'flex', gap: 8, marginTop: 14, flexWrap: 'wrap' }}>
          <Chip soft>{j.workType === 'Full-time' ? 'To‘liq stavka' : j.workType === 'Part-time' ? 'Yarim stavka' : 'Loyiha'}</Chip>
          <Chip soft>📍 {j.city} · {j.district}</Chip>
          {j.experience && <Chip soft>{j.experience}</Chip>}
        </div>
        <div style={{ height: 1, background: 'var(--line)', margin: '16px 0' }} />
        <div style={{ fontSize: 22, fontWeight: 800 }}>
          {formatUZS(j.salaryFrom)}–{formatUZS(j.salaryTo)} <span style={{ color: 'var(--muted)', fontWeight: 500, fontSize: 13 }}>so‘m / oy</span>
        </div>
      </Card>

      {j.description && (
        <Card style={{ marginTop: 12 }}>
          <div style={{ fontWeight: 700, marginBottom: 6 }}>Talablar</div>
          <p style={{ color: 'var(--muted)', margin: 0, lineHeight: 1.5 }}>{j.description}</p>
        </Card>
      )}

      <Card style={{ marginTop: 12, padding: 0, overflow: 'hidden' }}>
        <div style={{ padding: '14px 16px 10px' }}>
          <div style={{ fontWeight: 700, fontSize: 15 }}>📍 Joylashuv</div>
          <div style={{ color: 'var(--muted)', fontSize: 13, marginTop: 2 }}>{j.city} · {j.district}</div>
        </div>
        <iframe
          title="map"
          src={`https://maps.google.com/maps?q=${mapQuery}&z=12&output=embed`}
          style={{ width: '100%', height: 260, border: 'none', display: 'block' }}
          loading="lazy"
        />
        <a
          href={`https://www.google.com/maps/search/?api=1&query=${mapQuery}`}
          target="_blank" rel="noopener noreferrer"
          style={{ display: 'block', padding: '12px 16px', fontSize: 13, fontWeight: 600, color: 'var(--blue)', borderTop: '1px solid var(--line)', textAlign: 'center' }}
        >
          Xaritada ochish →
        </a>
      </Card>

      {isOwner ? (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginTop: 14 }}>
            <Btn full onClick={() => nav(`/post?edit=${j.id}`)}>✏️ Tahrirlash</Btn>
            <Btn variant="ghost" full style={{ color: '#DC2626', borderColor: '#FECACA' }} onClick={() => setConfirmDel(true)}>🗑 Bekor qilish</Btn>
          </div>
          {confirmDel && (
            <div style={{ position: 'fixed', inset: 0, background: 'rgba(11,18,32,.5)', zIndex: 100, display: 'grid', placeItems: 'center', padding: 20 }} onClick={() => !deleting && setConfirmDel(false)}>
              <div onClick={e => e.stopPropagation()} style={{ background: '#fff', borderRadius: 18, padding: 22, maxWidth: 400, width: '100%' }}>
                <div style={{ fontSize: 36, textAlign: 'center', marginBottom: 8 }}>⚠️</div>
                <div style={{ fontWeight: 800, fontSize: 18, textAlign: 'center' }}>Vakansiyani bekor qilasizmi?</div>
                <p style={{ color: 'var(--muted)', fontSize: 13, textAlign: 'center', margin: '6px 0 18px' }}>Bu amalni qaytarib bo‘lmaydi. E'lon ro‘yxatdan o‘chiriladi.</p>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                  <Btn variant="ghost" full onClick={() => setConfirmDel(false)}>Yo‘q</Btn>
                  <Btn full style={{ background: '#DC2626', opacity: deleting ? .6 : 1 }} onClick={doDelete}>{deleting ? 'O‘chirilmoqda…' : 'Ha, bekor qilish'}</Btn>
                </div>
              </div>
            </div>
          )}
        </>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginTop: 14 }}>
          <a href={j.phone ? `tel:${j.phone}` : undefined} style={{ textDecoration: 'none', opacity: j.phone ? 1 : .5, pointerEvents: j.phone ? 'auto' : 'none' }}>
            <Btn full>📞 Qo‘ng‘iroq</Btn>
          </a>
          <a href={tgHref(j.telegram)} target="_blank" rel="noreferrer" style={{ textDecoration: 'none', display: tgHref(j.telegram) ? undefined : 'none' }}>
            <Btn variant="soft" full style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}><TelegramIcon size={22} /> Telegram</Btn>
          </a>
        </div>
      )}
    </div>
  );
};
