'use client';
import React from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Card, Btn, Badge, Chip, EmptyState, TelegramIcon, tgHref } from '@/components/ui';
import { usePersistedState } from '@/lib/persist';
import { useIsDesktop } from '@/components/Layout';
import { api } from '@/lib/api';
import { STANOK_SPECS as SPECS } from '@/lib/constants';
import { StanokSpecIcon } from '@/components/StanokSpecIcon';
import { getSavedCoords, requestCoords } from '@/lib/userLocation';
import { LocationPickerModal } from '@/components/LocationPickerModal';
import { SectionIcon } from '@/components/SectionIcon';

const RADII = [5, 10, 15, 25, 50];

const haversine = (a: { lat: number; lng: number }, b: { lat: number; lng: number }) => {
  const R = 6371;
  const toRad = (x: number) => (x * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const s = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(s));
};

const fmtPrice = (n: number) => n ? `${Number(n).toLocaleString('uz-UZ')} so'm` : 'Kelishiladi';

const AdThumb: React.FC<{ src: string | null | undefined; size?: number }> = ({ src, size = 84 }) => {
  const [failed, setFailed] = React.useState(false);
  React.useEffect(() => { setFailed(false); }, [src]);
  if (!src || failed) {
    return (
      <div style={{ width: size, height: size, borderRadius: 12, background: '#FEF2F2', display: 'grid', placeItems: 'center', fontSize: Math.round(size * 0.55), flexShrink: 0 }}>
        🏭
      </div>
    );
  }
  return (
    <div style={{ width: size, height: size, borderRadius: 12, background: '#FEF2F2', display: 'grid', placeItems: 'center', overflow: 'hidden', flexShrink: 0 }}>
      <img src={src} alt="" onError={() => setFailed(true)} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
    </div>
  );
};

const AdCard: React.FC<{ a: any }> = ({ a }) => (
  <Card>
    <Link href={`/stanok-ads/${a.id}`} style={{ textDecoration: 'none', color: 'inherit', display: 'block' }}>
      <div style={{ display: 'flex', gap: 12 }}>
        <AdThumb src={a.imageUrl} size={84} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 }}>
            <b style={{ fontSize: 15, lineHeight: 1.25 }}>{a.title}</b>
            {a.condition === 'new'
              ? <Badge tone="green">🆕 Yangi</Badge>
              : <Badge tone="amber">♻️ Ishlatilgan</Badge>}
          </div>
          <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 4 }}>📍 {a.city} · {a.district}</div>
          {a.stanokType && (
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 8 }}>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 11, fontWeight: 600, padding: '3px 8px', borderRadius: 999, background: 'var(--blue-50)', color: 'var(--blue)' }}>
                <StanokSpecIcon name={a.stanokType} size={14} /> {a.stanokType}
              </span>
            </div>
          )}
        </div>
      </div>

      <div style={{ display: 'flex', gap: 10, marginTop: 10, flexWrap: 'wrap' }}>
        <div style={{ padding: '6px 10px', background: '#FEF2F2', borderRadius: 8, fontSize: 13 }}>
          <span style={{ color: 'var(--muted)', fontSize: 11 }}>Narxi: </span>
          <b style={{ color: '#EF4444' }}>{fmtPrice(a.price)}</b>
        </div>
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

export default function StanokAds() {
  const desktop = useIsDesktop();
  const router = useRouter();
  const [condition, setCondition] = usePersistedState<'' | 'new' | 'used'>('filters:stanokAds:condition', '');
  const [selectedTypes, setSelectedTypes] = usePersistedState<string[]>('filters:stanokAds:types', []);
  const [typeOpen, setTypeOpen] = React.useState(false);
  const [list, setList] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState('');
  const [nearbyOn, setNearbyOn] = usePersistedState('filters:stanokAds:nearbyOn', false);
  const [radiusKm, setRadiusKm] = usePersistedState<number>('filters:stanokAds:radiusKm', 15);
  const [myCoords, setMyCoords] = React.useState<{ lat: number; lng: number } | null>(getSavedCoords());
  const [geoBusy, setGeoBusy] = React.useState(false);
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

  const toggleType = (t: string) => setSelectedTypes(p => p.includes(t) ? p.filter(x => x !== t) : [...p, t]);

  React.useEffect(() => {
    let ok = true;
    setLoading(true);
    api.stanokAds({ condition: condition || undefined })
      .then(d => { if (ok) { setList(d); setError(''); } })
      .catch(e => ok && setError(e.message))
      .finally(() => { if (ok) setLoading(false); });
    return () => { ok = false; };
  }, [condition]);

  const filtered = React.useMemo(() => {
    let result = list;
    if (selectedTypes.length > 0) result = result.filter(a => a.stanokType && selectedTypes.includes(a.stanokType));
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
  }, [list, selectedTypes, nearbyOn, myCoords, radiusKm]);

  const Header = (
    <>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '6px 0 14px' }}>
        <button onClick={() => router.push('/')} style={{ width: 38, height: 38, borderRadius: 12, background: '#fff', border: '1px solid var(--line)', fontSize: 16, cursor: 'pointer' }}><img src="/images/back.png" alt="orqaga" style={{ width: 16, height: 16, display: 'block', margin: 'auto' }} /></button>
        <div style={{ textAlign: 'center', flex: 1 }}>
          <div style={{ fontSize: 12, color: 'var(--muted)', display: 'inline-flex', alignItems: 'center', gap: 4, justifyContent: 'center' }}>
            <SectionIcon name="factory" size={14} /> Stanok bozori
          </div>
          <div style={{ fontWeight: 800, fontSize: desktop ? 26 : 20 }}>Stanok e'lonlari</div>
        </div>
        <div style={{ width: 38 }} />
      </div>
      <div style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 8, marginBottom: 8, alignItems: 'center' }}>
        <Chip on={nearbyOn} onClick={enableNearby}>
          {geoBusy ? '⏳ Aniqlanmoqda…' : '📍 Yaqin atrofdagilar'}
        </Chip>
        <Chip on={condition === ''} onClick={() => setCondition('')}>Hammasi</Chip>
        <Chip on={condition === 'new'} onClick={() => setCondition('new')}>🆕 Yangi</Chip>
        <Chip on={condition === 'used'} onClick={() => setCondition('used')}>♻️ Ishlatilgan</Chip>
        <Chip on={typeOpen || selectedTypes.length > 0} onClick={() => setTypeOpen(!typeOpen)}>
          {selectedTypes.length > 0 ? `🏭 ${selectedTypes.length} ta tanlandi` : '🏭 Stanok turi'}
        </Chip>
        {(nearbyOn || selectedTypes.length > 0 || condition !== '') && (
          <Chip onClick={() => { setNearbyOn(false); setSelectedTypes([]); setCondition(''); setTypeOpen(false); }}>✕ Tozalash</Chip>
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
      {typeOpen && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, marginBottom: 12 }}>
          {SPECS.map(s => {
            const on = selectedTypes.includes(s);
            return (
              <button key={s} type="button" onClick={() => toggleType(s)} style={{
                padding: '10px 6px', borderRadius: 12, cursor: 'pointer',
                background: on ? 'var(--blue-50)' : '#fff',
                border: `1.5px solid ${on ? 'var(--blue)' : 'var(--line)'}`,
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3,
                position: 'relative',
              }}>
                <StanokSpecIcon name={s} size={28} color={on ? 'var(--blue)' : 'var(--ink)'} />
                <div style={{ fontWeight: 700, fontSize: 10, color: on ? 'var(--blue)' : 'var(--ink)', textAlign: 'center' }}>{s}</div>
                {on && <div style={{ position: 'absolute', top: 4, right: 4, width: 16, height: 16, borderRadius: 999, background: 'var(--blue)', color: '#fff', display: 'grid', placeItems: 'center', fontSize: 10, fontWeight: 700 }}>✓</div>}
              </button>
            );
          })}
        </div>
      )}
      <div style={{ fontSize: 13, color: 'var(--muted)', margin: '6px 2px 12px' }}>
        <b style={{ color: 'var(--ink)' }}>{filtered.length}</b> ta e'lon
        {condition === 'new' && <> · 🆕 Yangi</>}
        {condition === 'used' && <> · ♻️ Ishlatilgan</>}
        {selectedTypes.length > 0 && <> · {selectedTypes.join(', ')}</>}
      </div>
    </>
  );

  if (loading) return <>{Header}<EmptyState icon="⏳" title="Yuklanmoqda..." sub="" /></>;
  if (error) return <>{Header}<EmptyState icon="⚠️" title="Xatolik" sub={error} /></>;
  if (filtered.length === 0) return <>{Header}<EmptyState icon="🏭" title="E'lonlar topilmadi" sub="Birinchi bo'lib e'lon joylang!" ctaLabel="+ E'lon joylash" onCta={() => router.push('/stanok-ads/create')} /></>;

  return (
    <div>
      {Header}
      <div style={{ display: desktop ? 'grid' : 'flex', flexDirection: 'column', gap: 12, gridTemplateColumns: desktop ? 'repeat(auto-fill, minmax(380px, 1fr))' : undefined }}>
        {filtered.map(a => <AdCard key={a.id} a={a} />)}
      </div>
    </div>
  );
};
