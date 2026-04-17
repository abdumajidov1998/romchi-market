import React from 'react';
import { Link } from 'react-router-dom';
import { Card, Btn, Badge, EmptyState, TelegramIcon } from '../ui';
import { useIsDesktop } from '../Layout';
import { useNavigate } from 'react-router-dom';
import { api } from '../api';
import { Chip } from '../ui';
import { SpecIcon } from '../SpecIcon';

const RADII = [5, 10, 15, 25, 50];

const haversine = (a: { lat: number; lng: number }, b: { lat: number; lng: number }) => {
  const R = 6371;
  const toRad = (x: number) => (x * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const s = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(s));
};

const MATERIALS = [
  { key: 'priceTermo', label: 'Termo', spec: 'Termo' },
  { key: 'pricePvxOq', label: 'PVX Oq', spec: 'PVX Oq' },
  { key: 'pricePvxRangli', label: 'PVX Rangli', spec: 'PVX' },
  { key: 'priceAlyumin', label: 'Alyumin', spec: 'Alyumin' },
];

const fmt = (n: number) => n ? n.toLocaleString('uz-UZ') : '—';

const BuyerCard: React.FC<{ b: any }> = ({ b }) => (
  <Card>
    <Link to={`/atxod/${b.id}`} style={{ textDecoration: 'none', color: 'inherit' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <b style={{ fontSize: 15 }}>{b.name}</b>
            {b.verified && <span style={{ width: 16, height: 16, borderRadius: 8, background: 'var(--blue)', color: '#fff', display: 'inline-grid', placeItems: 'center', fontSize: 10 }}>✓</span>}
          </div>
          <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 2 }}>📍 {b.city} · {b.district}</div>
        </div>
        <div style={{ textAlign: 'right', flexShrink: 0 }}>
          {b.verified && <Badge tone="green">Tasdiqlangan</Badge>}
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 6, marginTop: 12 }}>
        {MATERIALS.map(m => {
          const price = b[m.key] || 0;
          return (
            <div key={m.key} style={{
              display: 'flex', alignItems: 'center', gap: 6, padding: '6px 10px',
              background: price > 0 ? 'var(--blue-50)' : 'var(--bg)', borderRadius: 10, fontSize: 13,
            }}>
              <SpecIcon name={m.spec} size={24} />
              <span style={{ fontWeight: 600, color: 'var(--ink)' }}>{m.label}</span>
              <span style={{ marginLeft: 'auto', fontWeight: 700, color: price > 0 ? 'var(--blue)' : 'var(--muted)' }}>
                {price > 0 ? `${fmt(price)} so'm` : '—'}
              </span>
            </div>
          );
        })}
      </div>
    </Link>

    <div style={{ height: 1, background: 'var(--line)', margin: '12px 0' }} />
    <div style={{ display: 'flex', gap: 6 }}>
      <a href={b.phone ? `tel:${b.phone}` : undefined} style={{ flex: 1, textDecoration: 'none', opacity: b.phone ? 1 : .5, pointerEvents: b.phone ? 'auto' : 'none' }}>
        <Btn variant="soft" style={{ width: '100%', fontSize: 13 }}>📞 Qo'ng'iroq</Btn>
      </a>
      <a href={b.telegram ? `https://t.me/${b.telegram}` : b.phone ? `https://t.me/+${String(b.phone).replace(/\D/g, '')}` : undefined} target="_blank" rel="noreferrer" style={{ flex: 1, textDecoration: 'none', opacity: (b.telegram || b.phone) ? 1 : .5, pointerEvents: (b.telegram || b.phone) ? 'auto' : 'none' }}>
        <Btn variant="soft" style={{ width: '100%', fontSize: 13, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4 }}><TelegramIcon size={18} /> Telegram</Btn>
      </a>
    </div>
  </Card>
);

export const WasteBuyers: React.FC = () => {
  const desktop = useIsDesktop();
  const nav = useNavigate();
  const [q, setQ] = React.useState('');
  const [list, setList] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState('');
  const [nearbyOn, setNearbyOn] = React.useState(false);
  const [radiusKm, setRadiusKm] = React.useState<number>(15);
  const [myCoords, setMyCoords] = React.useState<{ lat: number; lng: number } | null>(null);
  const [geoBusy, setGeoBusy] = React.useState(false);
  const [geoError, setGeoError] = React.useState('');

  const enableNearby = () => {
    if (nearbyOn) { setNearbyOn(false); return; }
    setGeoError('');
    if (!navigator.geolocation) { setGeoError('Brauzeringiz lokatsiyani qo\'llab-quvvatlamaydi'); return; }
    setGeoBusy(true);
    navigator.geolocation.getCurrentPosition(
      pos => {
        setMyCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setNearbyOn(true);
        setGeoBusy(false);
      },
      err => {
        setGeoError(err.code === 1 ? 'Lokatsiyaga ruxsat bermadingiz' : 'Lokatsiyani aniqlab bo\'lmadi');
        setGeoBusy(false);
      },
      { enableHighAccuracy: true, timeout: 15000 },
    );
  };

  React.useEffect(() => {
    let ok = true;
    setLoading(true);
    api.wasteBuyers({ q: q || undefined })
      .then(d => { if (ok) { setList(d); setError(''); } })
      .catch(e => ok && setError(e.message))
      .finally(() => { if (ok) setLoading(false); });
    return () => { ok = false; };
  }, [q]);

  const filtered = React.useMemo(() => {
    if (!nearbyOn || !myCoords) return list;
    return list
      .map(b => {
        if (typeof b.lat === 'number' && typeof b.lng === 'number') {
          return { ...b, distanceKm: haversine(myCoords, { lat: b.lat, lng: b.lng }) };
        }
        return { ...b, distanceKm: Infinity };
      })
      .filter(b => b.distanceKm <= radiusKm)
      .sort((a, b) => a.distanceKm - b.distanceKm);
  }, [list, nearbyOn, myCoords, radiusKm]);

  const Header = (
    <>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '6px 0 14px' }}>
        <button onClick={() => nav('/')} style={{ width: 38, height: 38, borderRadius: 12, background: '#fff', border: '1px solid var(--line)', fontSize: 16, cursor: 'pointer' }}>←</button>
        <div style={{ textAlign: 'center', flex: 1 }}>
          <div style={{ fontSize: 12, color: 'var(--muted)' }}>♻️ Atxod xizmati</div>
          <div style={{ fontWeight: 800, fontSize: desktop ? 26 : 20 }}>Atxod oluvchilar</div>
        </div>
        <button onClick={() => nav('/atxod/create')} style={{ width: 38, height: 38, borderRadius: 12, background: 'var(--blue)', border: 'none', color: '#fff', fontSize: 20, cursor: 'pointer', fontWeight: 700 }}>+</button>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, background: '#fff', border: '1px solid var(--line)', borderRadius: 14, padding: '12px 14px', marginBottom: 12 }}>
        <span style={{ color: 'var(--muted)' }}>🔍</span>
        <input value={q} onChange={e => setQ(e.target.value)} placeholder="Atxod oluvchi qidirish…" style={{ flex: 1, border: 'none', outline: 'none', fontSize: 14, background: 'transparent' }} />
      </div>
      <div style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 8, marginBottom: 8, alignItems: 'center' }}>
        <Chip on={nearbyOn} onClick={enableNearby}>
          {geoBusy ? '⏳ Aniqlanmoqda…' : '📍 Yaqin atrofdagilar'}
        </Chip>
      </div>
      {nearbyOn && (
        <div style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 8, marginBottom: 8, alignItems: 'center' }}>
          <span style={{ fontSize: 12, color: 'var(--muted)', flexShrink: 0 }}>Radius:</span>
          {RADII.map(r => (
            <Chip key={r} on={radiusKm === r} onClick={() => setRadiusKm(r)}>{r} km</Chip>
          ))}
        </div>
      )}
      {geoError && <div style={{ marginBottom: 8, padding: 10, background: '#FEE2E2', color: '#DC2626', borderRadius: 12, fontSize: 12, fontWeight: 500 }}>⚠️ {geoError}</div>}
      <div style={{ display: 'flex', justifyContent: 'space-between', margin: '6px 2px 12px' }}>
        <div style={{ fontSize: 13, color: 'var(--muted)' }}>
          <b style={{ color: 'var(--ink)' }}>{filtered.length}</b> ta atxod oluvchi
          {nearbyOn && <> · {radiusKm} km radiusda</>}
        </div>
      </div>
    </>
  );

  if (loading) return <>{Header}<EmptyState icon="⏳" title="Yuklanmoqda…" sub="" /></>;
  if (error) return <>{Header}<EmptyState icon="⚠️" title="Xatolik" sub={error} /></>;
  if (filtered.length === 0) return <>{Header}<EmptyState icon="♻️" title="Atxod oluvchilar topilmadi" sub={nearbyOn ? `${radiusKm} km radiusda topilmadi. Radiusni kattalashtiring.` : 'Birinchi bo\'lib ro\'yxatdan o\'ting!'} /></>;

  return (
    <div>
      {Header}
      <div style={{ display: desktop ? 'grid' : 'flex', flexDirection: 'column', gap: 12, gridTemplateColumns: desktop ? 'repeat(auto-fill, minmax(380px, 1fr))' : undefined }}>
        {filtered.map(b => <BuyerCard key={b.id} b={b} />)}
      </div>
    </div>
  );
};
