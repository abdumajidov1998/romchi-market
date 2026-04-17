import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Card, Btn, Badge, Chip, EmptyState, TelegramIcon } from '../ui';
import { useIsDesktop } from '../Layout';
import { api } from '../api';
import { SpecIcon } from '../SpecIcon';

const SPECS = ['Termo', 'PVX', 'Alyumin', 'Surma'];
const PRICES = [
  { key: 'priceTermo', label: 'Termo', spec: 'Termo' },
  { key: 'pricePvx', label: 'PVX', spec: 'PVX' },
  { key: 'priceAlyumin', label: 'Alyumin', spec: 'Alyumin' },
  { key: 'priceSurma', label: 'Surma', spec: 'Surma' },
];
const fmt = (n: number) => n ? n.toLocaleString('uz-UZ') : '---';

const ProviderCard: React.FC<{ p: any }> = ({ p }) => (
  <Card>
    <Link to={`/usluga/${p.id}`} style={{ textDecoration: 'none', color: 'inherit' }}>
      <div style={{ display: 'flex', gap: 12 }}>
        {p.specs && p.specs.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4, flexShrink: 0 }}>
            {p.specs.slice(0, 3).map((s: string) => (
              <div key={s} style={{ width: 44, height: 44, borderRadius: 10, background: 'var(--blue-50)', display: 'grid', placeItems: 'center' }}>
                <SpecIcon name={s} size={36} />
              </div>
            ))}
          </div>
        )}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <b style={{ fontSize: 15 }}>{p.name}</b>
            {p.verified && <span style={{ width: 16, height: 16, borderRadius: 8, background: 'var(--blue)', color: '#fff', display: 'inline-grid', placeItems: 'center', fontSize: 10 }}>✓</span>}
          </div>
          <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 2 }}>📍 {p.city} · {p.district}</div>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 8 }}>
            {(p.specs || []).map((s: string) => (
              <span key={s} style={{ fontSize: 11, fontWeight: 600, padding: '3px 8px', borderRadius: 999, background: 'var(--blue-50)', color: 'var(--blue)' }}>{s}</span>
            ))}
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 6, marginTop: 12 }}>
        {PRICES.map(m => {
          const price = p[m.key] || 0;
          if (!price) return null;
          return (
            <div key={m.key} style={{
              flex: 1, display: 'flex', alignItems: 'center', gap: 4, padding: '6px 8px',
              background: 'var(--blue-50)', borderRadius: 8, fontSize: 12,
            }}>
              <SpecIcon name={m.spec} size={18} />
              <span style={{ fontWeight: 700, color: 'var(--blue)' }}>{fmt(price)}</span>
              <span style={{ color: 'var(--muted)', fontSize: 10 }}>m²</span>
            </div>
          );
        })}
      </div>
    </Link>

    <div style={{ height: 1, background: 'var(--line)', margin: '12px 0' }} />
    <div style={{ display: 'flex', gap: 6 }}>
      <a href={p.phone ? `tel:${p.phone}` : undefined} style={{ flex: 1, textDecoration: 'none', opacity: p.phone ? 1 : .5, pointerEvents: p.phone ? 'auto' : 'none' }}>
        <Btn variant="soft" style={{ width: '100%', fontSize: 13 }}>📞 Qo'ng'iroq</Btn>
      </a>
      <a href={p.telegram ? `https://t.me/${p.telegram}` : p.phone ? `https://t.me/+${String(p.phone).replace(/\D/g, '')}` : undefined} target="_blank" rel="noreferrer" style={{ flex: 1, textDecoration: 'none', opacity: (p.telegram || p.phone) ? 1 : .5, pointerEvents: (p.telegram || p.phone) ? 'auto' : 'none' }}>
        <Btn variant="soft" style={{ width: '100%', fontSize: 13, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4 }}><TelegramIcon size={18} /> Telegram</Btn>
      </a>
    </div>
  </Card>
);

export const UslugaProviders: React.FC = () => {
  const desktop = useIsDesktop();
  const nav = useNavigate();
  const [q, setQ] = React.useState('');
  const [spec, setSpec] = React.useState<string | null>(null);
  const [list, setList] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState('');

  React.useEffect(() => {
    let ok = true;
    setLoading(true);
    api.uslugaProviders({ q: q || undefined, spec: spec || undefined })
      .then(d => { if (ok) { setList(d); setError(''); } })
      .catch(e => ok && setError(e.message))
      .finally(() => { if (ok) setLoading(false); });
    return () => { ok = false; };
  }, [q, spec]);

  const Header = (
    <>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '6px 0 14px' }}>
        <button onClick={() => nav('/')} style={{ width: 38, height: 38, borderRadius: 12, background: '#fff', border: '1px solid var(--line)', fontSize: 16, cursor: 'pointer' }}>←</button>
        <div style={{ textAlign: 'center', flex: 1 }}>
          <div style={{ fontSize: 12, color: 'var(--muted)' }}>🛠️ Xizmatlar</div>
          <div style={{ fontWeight: 800, fontSize: desktop ? 26 : 20 }}>Uslugachilar</div>
        </div>
        <button onClick={() => nav('/usluga/create')} style={{ width: 38, height: 38, borderRadius: 12, background: 'var(--blue)', border: 'none', color: '#fff', fontSize: 20, cursor: 'pointer', fontWeight: 700 }}>+</button>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, background: '#fff', border: '1px solid var(--line)', borderRadius: 14, padding: '12px 14px', marginBottom: 12 }}>
        <span style={{ color: 'var(--muted)' }}>🔍</span>
        <input value={q} onChange={e => setQ(e.target.value)} placeholder="Sex yoki ustaxona qidirish…" style={{ flex: 1, border: 'none', outline: 'none', fontSize: 14, background: 'transparent' }} />
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8, marginBottom: 12 }}>
        {SPECS.map(s => {
          const on = spec === s;
          return (
            <button key={s} type="button" onClick={() => setSpec(on ? null : s)} style={{
              padding: '10px 6px', borderRadius: 14, cursor: 'pointer',
              background: on ? 'var(--blue-50)' : '#fff',
              border: `1.5px solid ${on ? 'var(--blue)' : 'var(--line)'}`,
              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
            }}>
              <SpecIcon name={s} size={32} />
              <div style={{ fontWeight: 700, fontSize: 12, color: on ? 'var(--blue)' : 'var(--ink)' }}>{s}</div>
            </button>
          );
        })}
      </div>
      <div style={{ fontSize: 13, color: 'var(--muted)', margin: '6px 2px 12px' }}>
        <b style={{ color: 'var(--ink)' }}>{list.length}</b> ta uslugachi
      </div>
    </>
  );

  if (loading) return <>{Header}<EmptyState icon="⏳" title="Yuklanmoqda…" sub="" /></>;
  if (error) return <>{Header}<EmptyState icon="⚠️" title="Xatolik" sub={error} /></>;
  if (list.length === 0) return <>{Header}<EmptyState icon="🛠️" title="Uslugachilar topilmadi" sub="Birinchi bo'lib ro'yxatdan o'ting!" /></>;

  return (
    <div>
      {Header}
      <div style={{ display: desktop ? 'grid' : 'flex', flexDirection: 'column', gap: 12, gridTemplateColumns: desktop ? 'repeat(auto-fill, minmax(380px, 1fr))' : undefined }}>
        {list.map(p => <ProviderCard key={p.id} p={p} />)}
      </div>
    </div>
  );
};
