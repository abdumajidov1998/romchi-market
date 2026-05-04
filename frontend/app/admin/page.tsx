'use client';
import React from 'react';
import { useRouter } from 'next/navigation';
import { api, auth } from '@/lib/api';

const LISTING_TYPES = [
  { key: 'workers', label: 'Ishchilar' },
  { key: 'jobs', label: 'Vakansiyalar' },
  { key: 'waste-buyers', label: 'Atxod oluvchilar' },
  { key: 'usluga', label: 'Uslugachilar' },
  { key: 'stanok', label: 'Stanok ustalari' },
  { key: 'stanok-ads', label: 'Stanok e\'lonlari' },
  { key: 'install-brigades', label: 'Ustanofka brigada' },
  { key: 'arkachilar', label: 'Arkachilar' },
  { key: 'delivery', label: 'Dostavkachilar' },
] as const;

type Tab = 'stats' | 'users' | 'listings';

const SHORT_DESC_LEN = 20;

type Accent = 'blue' | 'amber' | 'green' | 'red' | 'muted';

const ACCENT_STYLES: Record<Accent, { bg: string; fg: string; border: string }> = {
  blue:  { bg: 'var(--blue-50)',  fg: 'var(--blue)',  border: 'var(--blue)' },
  amber: { bg: 'var(--amber-50)', fg: 'var(--amber)', border: 'var(--amber)' },
  green: { bg: 'var(--green-50)', fg: 'var(--green)', border: 'var(--green)' },
  red:   { bg: '#FEE2E2',         fg: '#DC2626',      border: '#DC2626' },
  muted: { bg: '#fff',            fg: 'var(--ink)',   border: 'var(--line)' },
};

const StatCard: React.FC<{ label: string; value: number | string; accent?: Accent; sublabel?: string; onClick?: () => void }> =
  ({ label, value, accent = 'blue', sublabel, onClick }) => {
    const c = ACCENT_STYLES[accent];
    return (
      <div
        onClick={onClick}
        style={{
          background: c.bg, border: `1px solid ${c.border}`, borderRadius: 14, padding: 16,
          cursor: onClick ? 'pointer' : 'default',
        }}
      >
        <div style={{ fontSize: 12, color: c.fg, fontWeight: 600 }}>{label}</div>
        <div style={{ fontSize: 28, fontWeight: 800, color: c.fg, marginTop: 4 }}>{value}</div>
        {sublabel && <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 2 }}>{sublabel}</div>}
      </div>
    );
  };

const StatSection: React.FC<{ title: string; children: React.ReactNode; minWidth?: number }> =
  ({ title, children, minWidth = 160 }) => (
    <div style={{ marginBottom: 22 }}>
      <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--ink)', marginBottom: 10 }}>{title}</div>
      <div style={{ display: 'grid', gridTemplateColumns: `repeat(auto-fill, minmax(${minWidth}px, 1fr))`, gap: 12 }}>
        {children}
      </div>
    </div>
  );

const TOP_CITIES_DEFAULT = 10;

const CitiesBlock: React.FC<{ cities: { city: string; count: number }[] }> = ({ cities }) => {
  const [expanded, setExpanded] = React.useState(false);
  const visible = expanded ? cities : cities.slice(0, TOP_CITIES_DEFAULT);
  const hidden = cities.length - TOP_CITIES_DEFAULT;
  return (
    <div style={{ marginBottom: 22 }}>
      <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--ink)', marginBottom: 10 }}>📍 Eng faol hududlar</div>
      {cities.length === 0 ? (
        <div style={{ color: 'var(--muted)', padding: 14, background: '#fff', border: '1px solid var(--line)', borderRadius: 14 }}>Hozircha hech qaysi shahardan e'lon yo'q</div>
      ) : (
        <div style={{ background: '#fff', border: '1px solid var(--line)', borderRadius: 14, overflow: 'hidden' }}>
          {visible.map((c, i) => {
            const max = cities[0].count || 1;
            const pct = (c.count / max) * 100;
            return (
              <div key={c.city} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 14px', borderTop: i ? '1px solid var(--line)' : 'none' }}>
                <div style={{ width: 24, fontSize: 12, color: 'var(--muted)', fontWeight: 600 }}>#{i + 1}</div>
                <div style={{ width: 110, fontSize: 13, fontWeight: 600 }}>{c.city}</div>
                <div style={{ flex: 1, height: 8, background: 'var(--line)', borderRadius: 999, overflow: 'hidden' }}>
                  <div style={{ width: `${pct}%`, height: '100%', background: 'var(--blue)' }} />
                </div>
                <div style={{ width: 50, textAlign: 'right', fontSize: 13, fontWeight: 700, color: 'var(--blue)' }}>{c.count}</div>
              </div>
            );
          })}
          {hidden > 0 && (
            <button
              onClick={() => setExpanded(e => !e)}
              style={{
                width: '100%', padding: '12px 14px', fontSize: 13, fontWeight: 600,
                background: 'var(--blue-50)', color: 'var(--blue)',
                border: 'none', borderTop: '1px solid var(--line)', cursor: 'pointer',
              }}
            >{expanded ? 'Yashirish ▲' : `Hammasini ko'rish (+${hidden}) ▼`}</button>
          )}
        </div>
      )}
    </div>
  );
};

const Stats: React.FC<{ onGoToListings?: (type?: string) => void }> = ({ onGoToListings }) => {
  const [data, setData] = React.useState<Awaited<ReturnType<typeof api.adminStats>> | null>(null);
  const [error, setError] = React.useState('');

  React.useEffect(() => {
    api.adminStats().then(setData).catch(e => setError(e.message));
  }, []);

  if (error) return <div style={{ color: '#DC2626', padding: 12 }}>⚠️ {error}</div>;
  if (!data) return <div style={{ padding: 12, color: 'var(--muted)' }}>Yuklanmoqda…</div>;

  const totalListings = LISTING_TYPES.reduce((s, t) => s + (data.counts[t.key] ?? 0), 0);
  const todayListings = LISTING_TYPES.reduce((s, t) => s + (data.today[t.key] ?? 0), 0);
  const attentionTotal = data.attention.moderation + data.attention.noImage + data.attention.noPrice + data.attention.shortDesc;

  return (
    <>
      {attentionTotal > 0 && (
        <div style={{ background: '#FEF2F2', border: '1px solid #FCA5A5', borderRadius: 14, padding: 14, marginBottom: 22 }}>
          <div style={{ fontSize: 14, fontWeight: 800, color: '#DC2626', marginBottom: 10 }}>⚠️ ADMIN E'TIBORI KERAK</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 10 }}>
            {data.attention.moderation > 0 && <StatCard label="Moderatsiyada" value={data.attention.moderation} accent="red"   sublabel="tasdiqlanmagan" onClick={() => onGoToListings?.()} />}
            {data.attention.noImage    > 0 && <StatCard label="Rasmsiz e'lonlar" value={data.attention.noImage} accent="amber" sublabel="stanok / dostavka" onClick={() => onGoToListings?.('stanok-ads')} />}
            {data.attention.noPrice    > 0 && <StatCard label="Narxsiz e'lonlar" value={data.attention.noPrice} accent="amber" sublabel="stanok-ads"        onClick={() => onGoToListings?.('stanok-ads')} />}
            {data.attention.shortDesc  > 0 && <StatCard label="Qisqa tavsifli"   value={data.attention.shortDesc} accent="amber" sublabel={`< ${SHORT_DESC_LEN} belgi`} />}
          </div>
        </div>
      )}

      <StatSection title="📅 Bugun">
        <StatCard label="Ro'yxatdan o'tganlar" value={`+${data.today.users}`} accent="green" />
        <StatCard label="Yangi e'lonlar" value={`+${todayListings}`} accent="green" />
      </StatSection>

      <StatSection title="📊 Hajm">
        <StatCard label="Foydalanuvchilar" value={data.counts.users} accent="blue" />
        <StatCard label="Jami e'lonlar" value={totalListings} accent="blue" />
      </StatSection>

      <StatSection title="📋 Kategoriyalar">
        {LISTING_TYPES.map(t => (
          <StatCard
            key={t.key}
            label={t.label}
            value={data.counts[t.key] ?? 0}
            accent="muted"
            sublabel={data.today[t.key] ? `+${data.today[t.key]} bugun` : undefined}
            onClick={() => onGoToListings?.(t.key)}
          />
        ))}
      </StatSection>

      <div style={{ marginBottom: 22 }}>
        <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--ink)', marginBottom: 10 }}>🔍 Sifat indikatorlari</div>
        <div style={{ background: '#fff', border: '1px solid var(--line)', borderRadius: 14, overflow: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13, minWidth: 520 }}>
            <thead>
              <tr style={{ background: 'var(--amber-50)', textAlign: 'left' }}>
                <th style={{ padding: '10px 14px', fontWeight: 700, color: 'var(--amber)' }}>Bo'lim</th>
                <th style={{ padding: '10px 14px', fontWeight: 700, color: 'var(--amber)', width: 110 }}>Tasdiqlanmagan</th>
                <th style={{ padding: '10px 14px', fontWeight: 700, color: 'var(--amber)', width: 90 }}>Rasmsiz</th>
                <th style={{ padding: '10px 14px', fontWeight: 700, color: 'var(--amber)', width: 90 }}>Narxsiz</th>
                <th style={{ padding: '10px 14px', fontWeight: 700, color: 'var(--amber)', width: 110 }}>Qisqa tavsif</th>
              </tr>
            </thead>
            <tbody>
              {LISTING_TYPES.map(t => {
                const u  = data.unverified[t.key];
                const ni = data.quality.noImage[t.key];
                const np = data.quality.noPrice[t.key];
                const sd = data.quality.shortDesc[t.key] ?? 0;
                const cell = (v: number | undefined, danger = false) => ({
                  padding: '8px 14px',
                  color: v === undefined ? 'var(--muted)' : (v > 0 ? (danger ? '#DC2626' : 'var(--amber)') : 'var(--muted)'),
                  fontWeight: v && v > 0 ? 700 : 400,
                });
                return (
                  <tr key={t.key} style={{ borderTop: '1px solid var(--line)' }}>
                    <td style={{ padding: '8px 14px', cursor: 'pointer' }} onClick={() => onGoToListings?.(t.key)}>{t.label}</td>
                    <td style={cell(u, true)}>{u ?? '—'}</td>
                    <td style={cell(ni)}>{ni ?? '—'}</td>
                    <td style={cell(np)}>{np ?? '—'}</td>
                    <td style={cell(sd)}>{sd}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <CitiesBlock cities={data.cities} />

      {data.sms && (
        <StatSection title="📱 SMS xarajati" minWidth={180}>
          <StatCard label="Oxirgi 1 soat"  value={data.sms.lastHour} accent="blue" />
          <StatCard label="Oxirgi 24 soat" value={data.sms.last24h}  accent="blue" />
        </StatSection>
      )}
    </>
  );
};

const Users: React.FC = () => {
  const [list, setList] = React.useState<any[] | null>(null);
  const [q, setQ] = React.useState('');
  const [error, setError] = React.useState('');

  const load = React.useCallback(() => {
    api.adminUsers({ q: q || undefined })
      .then(setList)
      .catch(e => setError(e.message));
  }, [q]);

  React.useEffect(() => {
    const t = setTimeout(load, 300);
    return () => clearTimeout(t);
  }, [load]);

  const onDelete = async (id: number, phone: string) => {
    if (!window.confirm(`${phone} foydalanuvchini va uning barcha e'lonlarini o'chirilsinmi?`)) return;
    try {
      await api.adminDeleteUser(id);
      load();
    } catch (e: any) {
      alert(e.message);
    }
  };

  return (
    <div>
      <input
        value={q}
        onChange={e => setQ(e.target.value)}
        placeholder="Telefon bo'yicha qidirish…"
        style={{ width: '100%', padding: '10px 14px', border: '1px solid var(--line)', borderRadius: 12, fontSize: 14, marginBottom: 12 }}
      />
      {error && <div style={{ color: '#DC2626', padding: 8, marginBottom: 8 }}>⚠️ {error}</div>}
      {!list ? <div style={{ color: 'var(--muted)' }}>Yuklanmoqda…</div> : (
        <div style={{ background: '#fff', border: '1px solid var(--line)', borderRadius: 14, overflow: 'hidden' }}>
          {list.length === 0 && <div style={{ padding: 16, color: 'var(--muted)', textAlign: 'center' }}>Foydalanuvchi topilmadi</div>}
          {list.map(u => (
            <div key={u.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px', borderBottom: '1px solid var(--line)' }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 600, fontSize: 14, display: 'flex', alignItems: 'center', gap: 8 }}>
                  {u.phone}
                  {u.isAdmin && <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 6px', borderRadius: 4, background: 'var(--amber-50)', color: 'var(--amber)' }}>ADMIN</span>}
                </div>
                <div style={{ fontSize: 12, color: 'var(--muted)' }}>id: {u.id} · {u.role} · {new Date(u.created_at * 1000).toLocaleDateString('uz-UZ')}</div>
              </div>
              <button
                onClick={() => onDelete(u.id, u.phone)}
                disabled={u.isAdmin}
                style={{
                  padding: '6px 12px', fontSize: 12, fontWeight: 600,
                  background: u.isAdmin ? 'var(--line)' : '#FEE2E2', color: u.isAdmin ? 'var(--muted)' : '#DC2626',
                  border: 'none', borderRadius: 8, cursor: u.isAdmin ? 'not-allowed' : 'pointer',
                }}
              >🗑 O'chirish</button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

const Listings: React.FC<{ initialType?: string }> = ({ initialType }) => {
  const [type, setType] = React.useState<string>(initialType || LISTING_TYPES[0].key);
  React.useEffect(() => { if (initialType) setType(initialType); }, [initialType]);
  const [list, setList] = React.useState<any[] | null>(null);
  const [error, setError] = React.useState('');

  const load = React.useCallback(() => {
    setList(null);
    api.adminListings(type)
      .then(setList)
      .catch(e => setError(e.message));
  }, [type]);

  React.useEffect(() => { load(); }, [load]);

  const onDelete = async (id: number, name: string) => {
    if (!window.confirm(`"${name}" e'lonni o'chirilsinmi?`)) return;
    try {
      await api.adminDeleteListing(type, id);
      load();
    } catch (e: any) {
      alert(e.message);
    }
  };

  const onVerify = async (id: number, currentVerified: boolean) => {
    try {
      await api.adminVerifyListing(type, id, !currentVerified);
      load();
    } catch (e: any) {
      alert(e.message);
    }
  };

  return (
    <div>
      <div style={{ display: 'flex', gap: 6, overflowX: 'auto', paddingBottom: 6, marginBottom: 12 }}>
        {LISTING_TYPES.map(t => (
          <button
            key={t.key}
            onClick={() => setType(t.key)}
            style={{
              padding: '8px 12px', borderRadius: 999, fontSize: 13, fontWeight: 600, whiteSpace: 'nowrap',
              background: type === t.key ? 'var(--blue)' : '#fff',
              color: type === t.key ? '#fff' : 'var(--ink-2)',
              border: `1px solid ${type === t.key ? 'var(--blue)' : 'var(--line)'}`, cursor: 'pointer',
            }}
          >{t.label}</button>
        ))}
      </div>
      {error && <div style={{ color: '#DC2626', padding: 8, marginBottom: 8 }}>⚠️ {error}</div>}
      {!list ? <div style={{ color: 'var(--muted)' }}>Yuklanmoqda…</div> : (
        <div style={{ background: '#fff', border: '1px solid var(--line)', borderRadius: 14, overflow: 'hidden' }}>
          {list.length === 0 && <div style={{ padding: 16, color: 'var(--muted)', textAlign: 'center' }}>E'lonlar yo'q</div>}
          {list.map(item => {
            const title = item.name || item.title || `#${item.id}`;
            const sub = [item.city, item.district].filter(Boolean).join(' · ');
            return (
              <div key={item.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px', borderBottom: '1px solid var(--line)' }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 600, fontSize: 14, display: 'flex', alignItems: 'center', gap: 6 }}>
                    {title}
                    {item.verified && <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 6px', borderRadius: 4, background: 'var(--green-50)', color: 'var(--green)' }}>✓ Tasdiqlangan</span>}
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--muted)' }}>id: {item.id}{sub ? ' · ' + sub : ''}{item.phone ? ' · ' + item.phone : ''}</div>
                </div>
                <button
                  onClick={() => onVerify(item.id, !!item.verified)}
                  style={{
                    padding: '6px 10px', fontSize: 12, fontWeight: 600, marginRight: 6,
                    background: item.verified ? 'var(--line)' : 'var(--blue-50)',
                    color: item.verified ? 'var(--muted)' : 'var(--blue)',
                    border: 'none', borderRadius: 8, cursor: 'pointer',
                  }}
                >{item.verified ? '✕ Bekor' : '✓ Tasdiq'}</button>
                <button
                  onClick={() => onDelete(item.id, title)}
                  style={{
                    padding: '6px 10px', fontSize: 12, fontWeight: 600,
                    background: '#FEE2E2', color: '#DC2626',
                    border: 'none', borderRadius: 8, cursor: 'pointer',
                  }}
                >🗑</button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default function Admin() {
  const router = useRouter();
  const [tab, setTab] = React.useState<Tab>('stats');
  const [listingsType, setListingsType] = React.useState<string | undefined>(undefined);
  const [checking, setChecking] = React.useState(true);
  const [allowed, setAllowed] = React.useState(false);

  React.useEffect(() => {
    if (!auth.token()) { router.replace('/welcome'); return; }
    api.me()
      .then(m => {
        if (m.isAdmin) setAllowed(true);
        else router.replace('/');
      })
      .catch(() => router.replace('/welcome'))
      .finally(() => setChecking(false));
  }, [nav]);

  if (checking) return <div style={{ padding: 40, textAlign: 'center', color: 'var(--muted)' }}>Tekshirilmoqda…</div>;
  if (!allowed) return null;

  return (
    <div style={{ maxWidth: 960, margin: '0 auto', padding: '16px 14px', minHeight: '100vh' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '6px 0 14px' }}>
        <button onClick={() => router.push('/')} style={{ width: 38, height: 38, borderRadius: 12, background: '#fff', border: '1px solid var(--line)', cursor: 'pointer' }}>
          <img src="/images/back.png" alt="orqaga" style={{ width: 16, height: 16, display: 'block', margin: 'auto' }} />
        </button>
        <div style={{ fontWeight: 800, fontSize: 20 }}>⚙️ Admin panel</div>
        <div style={{ width: 38 }} />
      </div>

      <div style={{ display: 'flex', gap: 6, marginBottom: 16, borderBottom: '1px solid var(--line)' }}>
        {([
          { key: 'stats', label: '📊 Statistika' },
          { key: 'users', label: '👥 Foydalanuvchilar' },
          { key: 'listings', label: '📋 E\'lonlar' },
        ] as { key: Tab; label: string }[]).map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            style={{
              padding: '10px 16px', fontSize: 14, fontWeight: 600,
              background: 'transparent', border: 'none', cursor: 'pointer',
              borderBottom: `2px solid ${tab === t.key ? 'var(--blue)' : 'transparent'}`,
              color: tab === t.key ? 'var(--blue)' : 'var(--muted)',
            }}
          >{t.label}</button>
        ))}
      </div>

      {tab === 'stats' && <Stats onGoToListings={(t) => { setListingsType(t); setTab('listings'); }} />}
      {tab === 'users' && <Users />}
      {tab === 'listings' && <Listings initialType={listingsType} />}
    </div>
  );
};
