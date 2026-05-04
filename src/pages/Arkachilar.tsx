import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Card, Btn, Chip, EmptyState, TelegramIcon, tgHref } from '../ui';
import { usePersistedState } from '../persist';
import { useIsDesktop } from '../Layout';
import { api } from '../api';
import { SpecIcon } from '../SpecIcon';
import { ARKACHI_SPECS as SPECS } from '../constants';
import { getSavedCoords, requestCoords } from '../userLocation';
import { LocationPickerModal } from '../components/LocationPickerModal';
import { SectionIcon } from '../components/SectionIcon';

const RADII = [5, 10, 15, 25, 50];

const haversine = (a: { lat: number; lng: number }, b: { lat: number; lng: number }) => {
  const R = 6371;
  const toRad = (x: number) => (x * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const s = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(s));
};

const PRICES = [
  { key: 'priceTermo', label: 'Termo', spec: 'Termo' },
  { key: 'pricePvx', label: 'PVX', spec: 'PVX' },
  { key: 'priceAlyumin', label: 'Alyumin', spec: 'Alyumin' },
  { key: 'priceJpFasad', label: 'JP fasad', spec: 'JP fasad' },
];
const fmt = (n: number) => n ? n.toLocaleString('uz-UZ') : '---';

const SpecVisual: React.FC<{ name: string; size?: number }> = ({ name, size = 32 }) => <SpecIcon name={name} size={size} />;

const ArkachiCard: React.FC<{ a: any }> = ({ a }) => (
  <Card>
    <Link to={`/arkachilar/${a.id}`} style={{ textDecoration: 'none', color: 'inherit' }}>
      <div style={{ display: 'flex', gap: 12 }}>
        {a.specs && a.specs.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 3, flexShrink: 0 }}>
            {a.specs.slice(0, 3).map((s: string) => (
              <div key={s} style={{ width: 36, height: 36, borderRadius: 8, background: 'var(--blue-50)', display: 'grid', placeItems: 'center' }}>
                <SpecVisual name={s} size={28} />
              </div>
            ))}
          </div>
        )}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <b style={{ fontSize: 15 }}>{a.name}</b>
            {a.verified && <span style={{ width: 16, height: 16, borderRadius: 8, background: 'var(--blue)', color: '#fff', display: 'inline-grid', placeItems: 'center', fontSize: 10 }}>✓</span>}
          </div>
          <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 2 }}>📍 {a.city} · {a.district}</div>
          {a.experience && <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 2 }}>🔧 {a.experience}</div>}
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 8 }}>
            {(a.specs || []).map((s: string) => (
              <span key={s} style={{ fontSize: 11, fontWeight: 600, padding: '3px 8px', borderRadius: 999, background: 'var(--blue-50)', color: 'var(--blue)' }}>{s}</span>
            ))}
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 6, marginTop: 12, flexWrap: 'wrap' }}>
        {PRICES.map(m => {
          const price = a[m.key] || 0;
          if (!price) return null;
          return (
            <div key={m.key} style={{
              display: 'flex', alignItems: 'center', gap: 4, padding: '4px 8px',
              background: 'var(--blue-50)', borderRadius: 8, fontSize: 11,
            }}>
              <SpecVisual name={m.spec} size={16} />
              <span style={{ fontWeight: 700, color: 'var(--blue)' }}>{fmt(price)}</span>
              <span style={{ color: 'var(--muted)', fontSize: 9 }}>m</span>
            </div>
          );
        })}
      </div>
    </Link>

    <div style={{ height: 1, background: 'var(--line)', margin: '12px 0' }} />
    <div style={{ display: 'flex', gap: 6 }}>
      <a href={a.phone ? `tel:${a.phone}` : undefined} style={{ flex: 1, textDecoration: 'none', opacity: a.phone ? 1 : .5, pointerEvents: a.phone ? 'auto' : 'none' }}>
        <Btn variant="soft" style={{ width: '100%', fontSize: 13 }}>📞 Qo'ng'iroq</Btn>
      </a>
      <a href={tgHref(a.telegram)} target="_blank" rel="noreferrer" style={{ flex: 1, textDecoration: 'none', display: tgHref(a.telegram) ? undefined : 'none' }}>
        <Btn variant="soft" style={{ width: '100%', fontSize: 13, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4 }}><TelegramIcon size={18} /> Telegram</Btn>
      </a>
    </div>
  </Card>
);

export const Arkachilar: React.FC = () => {
  const desktop = useIsDesktop();
  const nav = useNavigate();
  const [specs, setSpecs] = usePersistedState<string[]>('filters:arkachilar:specs', []);
  const [list, setList] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState('');
  const [nearbyOn, setNearbyOn] = usePersistedState('filters:arkachilar:nearbyOn', false);
  const [radiusKm, setRadiusKm] = usePersistedState<number>('filters:arkachilar:radiusKm', 15);
  const [myCoords, setMyCoords] = React.useState<{ lat: number; lng: number } | null>(getSavedCoords());
  const [geoBusy, setGeoBusy] = React.useState(false);
  const [specOpen, setSpecOpen] = React.useState(false);
  const [pickerOpen, setPickerOpen] = React.useState(false);

  const enableNearby = async () => {
    if (nearbyOn) { setNearbyOn(false); return; }
    if (myCoords) { setNearbyOn(true); return; }
    setGeoBusy(true);
    try {
      const c = await requestCoords();
      setMyCoords(c);
      setNearbyOn(true);
    } catch {
      setPickerOpen(true);
    } finally {
      setGeoBusy(false);
    }
  };

  React.useEffect(() => {
    let ok = true;
    setLoading(true);
    api.arkachilar()
      .then(d => { if (ok) { setList(d); setError(''); } })
      .catch(e => ok && setError(e.message))
      .finally(() => { if (ok) setLoading(false); });
    return () => { ok = false; };
  }, []);

  const toggleSpec = (s: string) => setSpecs(p => p.includes(s) ? p.filter(x => x !== s) : [...p, s]);

  const filtered = React.useMemo(() => {
    let result = list;
    if (specs.length > 0) {
      result = result.filter(a => (a.specs || []).some((s: string) => specs.includes(s)));
    }
    if (nearbyOn && myCoords) {
      result = result
        .map(a => ({
          ...a,
          distanceKm: (typeof a.lat === 'number' && typeof a.lng === 'number')
            ? haversine(myCoords, { lat: a.lat, lng: a.lng }) : Infinity,
        }))
        .filter(a => a.distanceKm <= radiusKm)
        .sort((a, b) => a.distanceKm - b.distanceKm);
    }
    return result;
  }, [list, specs, nearbyOn, myCoords, radiusKm]);

  const Header = (
    <>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '6px 0 14px' }}>
        <button onClick={() => nav('/')} style={{ width: 38, height: 38, borderRadius: 12, background: '#fff', border: '1px solid var(--line)', fontSize: 16, cursor: 'pointer' }}><img src="/images/back.png" alt="orqaga" style={{ width: 16, height: 16, display: 'block', margin: 'auto' }} /></button>
        <div style={{ textAlign: 'center', flex: 1 }}>
          <div style={{ fontSize: 12, color: 'var(--muted)', display: 'inline-flex', alignItems: 'center', gap: 4, justifyContent: 'center' }}>
            <SectionIcon name="rainbow" size={14} /> Ark egish xizmati
          </div>
          <div style={{ fontWeight: 800, fontSize: desktop ? 26 : 20 }}>Arkachilar</div>
        </div>
        <div style={{ width: 38 }} />
      </div>
      <div style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 8, marginBottom: 8, alignItems: 'center' }}>
        <Chip on={nearbyOn} onClick={enableNearby}>
          {geoBusy ? '⏳ Aniqlanmoqda…' : '📍 Yaqin atrofdagilar'}
        </Chip>
        <Chip on={specOpen || specs.length > 0} onClick={() => setSpecOpen(!specOpen)}>
          {specs.length > 0 ? `🌙 ${specs.join(', ')}` : '🌙 Profil turi'}
        </Chip>
        {(nearbyOn || specs.length > 0) && (
          <Chip onClick={() => { setNearbyOn(false); setSpecs([]); setSpecOpen(false); }}>✕ Tozalash</Chip>
        )}
      </div>
      {nearbyOn && (
        <div style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 8, marginBottom: 8, alignItems: 'center' }}>
          <span style={{ fontSize: 12, color: 'var(--muted)', flexShrink: 0 }}>Radius:</span>
          {RADII.map(r => (
            <Chip key={r} on={radiusKm === r} onClick={() => setRadiusKm(r)}>{r} km</Chip>
          ))}
        </div>
      )}
      <LocationPickerModal
        open={pickerOpen}
        onClose={() => setPickerOpen(false)}
        onPicked={c => { setMyCoords(c); setNearbyOn(true); }}
      />
      {specOpen && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8, marginBottom: 12 }}>
          {SPECS.map(s => {
            const on = specs.includes(s);
            return (
              <button key={s} type="button" onClick={() => toggleSpec(s)} style={{
                padding: '10px 4px', borderRadius: 12, cursor: 'pointer',
                background: on ? 'var(--blue-50)' : '#fff',
                border: `1.5px solid ${on ? 'var(--blue)' : 'var(--line)'}`,
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
                position: 'relative',
              }}>
                <SpecVisual name={s} size={28} />
                <div style={{ fontWeight: 700, fontSize: 11, color: on ? 'var(--blue)' : 'var(--ink)', textAlign: 'center' }}>{s}</div>
                {on && <div style={{ position: 'absolute', top: 4, right: 4, width: 16, height: 16, borderRadius: 999, background: 'var(--blue)', color: '#fff', display: 'grid', placeItems: 'center', fontSize: 10, fontWeight: 700 }}>✓</div>}
              </button>
            );
          })}
        </div>
      )}
      <div style={{ fontSize: 13, color: 'var(--muted)', margin: '6px 2px 12px' }}>
        <b style={{ color: 'var(--ink)' }}>{filtered.length}</b> ta arkachi
        {nearbyOn && <> · {radiusKm} km radiusda</>}
        {specs.length > 0 && <> · {specs.join(', ')}</>}
      </div>
    </>
  );

  if (loading) return <>{Header}<EmptyState icon="⏳" title="Yuklanmoqda…" sub="" /></>;
  if (error) return <>{Header}<EmptyState icon="⚠️" title="Xatolik" sub={error} /></>;
  if (filtered.length === 0) return <>{Header}<EmptyState icon="🌙" title="Arkachilar topilmadi" sub={nearbyOn ? `${radiusKm} km radiusda topilmadi` : 'Birinchi bo\'lib ro\'yxatdan o\'ting!'} /></>;

  return (
    <div>
      {Header}
      <div style={{ display: desktop ? 'grid' : 'flex', flexDirection: 'column', gap: 12, gridTemplateColumns: desktop ? 'repeat(auto-fill, minmax(380px, 1fr))' : undefined }}>
        {filtered.map(a => <ArkachiCard key={a.id} a={a} />)}
      </div>
    </div>
  );
};
