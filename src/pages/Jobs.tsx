import React from 'react';
import { Avatar, Chip, JobCard, EmptyState } from '../ui';
import { useIsDesktop } from '../Layout';
import { useNavigate } from 'react-router-dom';
import { api } from '../api';
import { allSpecs } from '../data';
import { SpecIcon } from '../SpecIcon';

const fmt = (v: string) => v.replace(/\D/g, '').replace(/\B(?=(\d{3})+(?!\d))/g, ' ');

export const Jobs: React.FC = () => {
  const desktop = useIsDesktop();
  const nav = useNavigate();
  const [tab, setTab] = React.useState<'Siz uchun' | 'Yaqinda' | 'Yuqori maosh' | 'Yangi'>('Siz uchun');
  const [q, setQ] = React.useState('');
  const [pickedSpecs, setPickedSpecs] = React.useState<string[]>([]);
  const [salaryMin, setSalaryMin] = React.useState('');
  const [salaryMax, setSalaryMax] = React.useState('');
  const [list, setList] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState('');

  React.useEffect(() => {
    let ok = true;
    setLoading(true);
    api.jobs({ q: q || undefined })
      .then(d => { if (ok) { setList(d); setError(''); } })
      .catch(e => ok && setError(e.message))
      .finally(() => { if (ok) setLoading(false); });
    return () => { ok = false; };
  }, [q]);

  const minN = Number(salaryMin.replace(/\D/g, '')) || 0;
  const maxN = Number(salaryMax.replace(/\D/g, '')) || 0;
  let filtered = list;
  if (pickedSpecs.length) filtered = filtered.filter(j => (j.specs || []).some((s: string) => pickedSpecs.includes(s)));
  if (minN) filtered = filtered.filter(j => (j.salaryTo || 0) >= minN);
  if (maxN) filtered = filtered.filter(j => (j.salaryFrom || 0) <= maxN);
  if (tab === 'Yuqori maosh') filtered = [...filtered].sort((a, b) => b.salaryTo - a.salaryTo);
  if (tab === 'Yangi') filtered = filtered.filter(j => j.badge === 'New');
  const toggleSpec = (s: string) => setPickedSpecs(p => p.includes(s) ? p.filter(x => x !== s) : [...p, s]);

  const Header = (
    <>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '6px 0 14px' }}>
        <button onClick={() => nav('/')} style={{ width: 38, height: 38, borderRadius: 12, background: '#fff', border: '1px solid var(--line)', fontSize: 16, cursor: 'pointer' }}>←</button>
        <div style={{ textAlign: 'center', flex: 1 }}>
          <div style={{ fontSize: 12, color: 'var(--muted)' }}>🔧 Romchi Ish</div>
          <div style={{ fontWeight: 800, fontSize: desktop ? 26 : 20 }}>Keyingi ishingizni toping</div>
        </div>
        {!desktop && <Avatar initials="AK" size={38} />}
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, background: '#fff', border: '1px solid var(--line)', borderRadius: 14, padding: '12px 14px', marginBottom: 12 }}>
        <span style={{ color: 'var(--muted)' }}>🔍</span>
        <input value={q} onChange={e => setQ(e.target.value)} placeholder="PVX, Termo, Alyumin, Toshkent…" style={{ flex: 1, border: 'none', outline: 'none', fontSize: 14, background: 'transparent' }} />
      </div>
      <div style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 8, marginBottom: 12 }}>
        {(['Siz uchun', 'Yaqinda', 'Yuqori maosh', 'Yangi'] as const).map(t =>
          <Chip key={t} on={tab === t} onClick={() => setTab(t)}>{t}</Chip>
        )}
      </div>
      <div style={{ fontSize: 12, color: 'var(--muted)', fontWeight: 600, margin: '4px 2px 8px' }}>Yo‘nalish bo‘yicha</div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, marginBottom: 12 }}>
        {allSpecs.map(s => {
          const on = pickedSpecs.includes(s);
          return (
            <button key={s} type="button" onClick={() => toggleSpec(s)} style={{
              padding: '12px 6px', borderRadius: 14, cursor: 'pointer',
              background: on ? 'var(--blue-50)' : '#fff',
              border: `1.5px solid ${on ? 'var(--blue)' : 'var(--line)'}`,
              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
            }}>
              <SpecIcon name={s} size={36} />
              <div style={{ fontWeight: 700, fontSize: 13, color: on ? 'var(--blue)' : 'var(--ink)' }}>{s}</div>
            </button>
          );
        })}
      </div>
      <div style={{ fontSize: 12, color: 'var(--muted)', fontWeight: 600, margin: '4px 2px 8px' }}>Maosh oralig‘i (so‘m)</div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 12, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, background: '#fff', border: '1px solid var(--line)', borderRadius: 10, padding: '8px 10px', minWidth: 0, boxSizing: 'border-box' }}>
          <span style={{ fontSize: 13 }}>💵</span>
          <input value={salaryMin} onChange={e => setSalaryMin(fmt(e.target.value))} placeholder="Dan" inputMode="numeric" style={{ width: '100%', minWidth: 0, border: 'none', outline: 'none', fontSize: 13, background: 'transparent' }} />
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, background: '#fff', border: '1px solid var(--line)', borderRadius: 10, padding: '8px 10px', minWidth: 0, boxSizing: 'border-box' }}>
          <span style={{ fontSize: 13 }}>💰</span>
          <input value={salaryMax} onChange={e => setSalaryMax(fmt(e.target.value))} placeholder="Gacha" inputMode="numeric" style={{ width: '100%', minWidth: 0, border: 'none', outline: 'none', fontSize: 13, background: 'transparent' }} />
        </div>
      </div>
      {(pickedSpecs.length > 0 || salaryMin || salaryMax) && (
        <button type="button" onClick={() => { setPickedSpecs([]); setSalaryMin(''); setSalaryMax(''); }} style={{ background: 'transparent', border: 'none', color: 'var(--blue)', fontSize: 13, fontWeight: 600, cursor: 'pointer', marginBottom: 10 }}>
          ✕ Filterlarni tozalash
        </button>
      )}
    </>
  );

  if (loading) return <>{Header}<EmptyState icon="⏳" title="Yuklanmoqda…" sub="" /></>;
  if (error) return <>{Header}<EmptyState icon="⚠️" title="Xatolik" sub={error} /></>;
  if (filtered.length === 0) return <>{Header}<EmptyState icon="💼" title="Hozircha ishlar yo‘q" sub="Yangi e’lonlar paydo bo‘lganda sizga xabar beramiz." /></>;

  return (
    <div>
      {Header}
      <div style={{ display: desktop ? 'grid' : 'flex', flexDirection: 'column', gap: 12, gridTemplateColumns: desktop ? 'repeat(auto-fill, minmax(380px, 1fr))' : undefined }}>
        {filtered.map(j => <JobCard key={j.id} job={j} />)}
      </div>
    </div>
  );
};
