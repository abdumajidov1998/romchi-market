import React from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Btn, Input, Field, EmptyState } from '../ui';
import { cities, regions } from '../data';
import { api, auth } from '../api';
import { MapPicker } from '../components/MapPicker';
import { PhoneVerify } from '../components/PhoneVerify';
import { STANOK_SPECS as SPECS } from '../constants';
import { SectionIcon } from '../components/SectionIcon';

export const CreateStanokAd: React.FC = () => {
  const nav = useNavigate();
  const { id } = useParams();
  const isEdit = !!id;

  const [verified, setVerified] = React.useState(!!auth.token());
  const [loadingAd, setLoadingAd] = React.useState(isEdit);
  const [forbidden, setForbidden] = React.useState(false);
  const [loadError, setLoadError] = React.useState('');

  const [title, setTitle] = React.useState('');
  const [stanokType, setStanokType] = React.useState('');
  const [condition, setCondition] = React.useState<'new' | 'used' | ''>('');
  const [price, setPrice] = React.useState('');
  const [description, setDescription] = React.useState('');
  const [city, setCity] = React.useState('Toshkent');
  const [district, setDistrict] = React.useState('');
  const [coords, setCoords] = React.useState<{ lat: number; lng: number } | null>(null);
  const [telegram, setTelegram] = React.useState('');

  const [imageFile, setImageFile] = React.useState<File | null>(null);
  const [imagePreview, setImagePreview] = React.useState<string | null>(null);
  const [existingImageUrl, setExistingImageUrl] = React.useState<string | null>(null);
  const [removeExistingImage, setRemoveExistingImage] = React.useState(false);

  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState('');

  const pickCity = (c: string) => { setCity(c); setDistrict(''); };

  // Pre-fill in edit mode
  React.useEffect(() => {
    if (!isEdit || !id) return;
    setLoadingAd(true);
    api.stanokAd(id)
      .then(ad => {
        const me = auth.user();
        if (!me || me.id !== ad.user_id) { setForbidden(true); return; }
        setTitle(ad.title || '');
        setStanokType(ad.stanokType || '');
        setCondition(ad.condition || '');
        setPrice(ad.price ? String(ad.price) : '');
        setDescription(ad.description || '');
        setCity(ad.city || 'Toshkent');
        setDistrict(ad.district || '');
        if (typeof ad.lat === 'number' && typeof ad.lng === 'number') setCoords({ lat: ad.lat, lng: ad.lng });
        setTelegram(ad.telegram || '');
        setExistingImageUrl(ad.imageUrl || null);
      })
      .catch(e => setLoadError(e.message))
      .finally(() => setLoadingAd(false));
  }, [id, isEdit]);

  // Image preview lifecycle
  React.useEffect(() => {
    if (!imageFile) { setImagePreview(null); return; }
    const url = URL.createObjectURL(imageFile);
    setImagePreview(url);
    return () => URL.revokeObjectURL(url);
  }, [imageFile]);

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) { setImageFile(f); setRemoveExistingImage(true); }
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!auth.token()) { setError('Avval telefon raqamingizni tasdiqlang'); window.scrollTo({ top: 0, behavior: 'smooth' }); return; }
    if (!title.trim()) { setError('Sarlavhani kiriting'); return; }
    if (!condition) { setError('Holatini tanlang (Yangi yoki Ishlatilgan)'); return; }
    if (!imageFile && !(existingImageUrl && !removeExistingImage)) { setError('Stanok rasmini yuklang'); return; }
    if (!description.trim()) { setError('Tavsifni kiriting'); return; }
    if (!district) { setError('Tumanni tanlang'); return; }
    if (!coords) { setError('Xaritada joylashuvni belgilang'); return; }

    setSaving(true);
    try {
      const fd = new FormData();
      fd.append('title', title.trim());
      if (stanokType) fd.append('stanokType', stanokType);
      fd.append('condition', condition);
      const priceNum = price ? Number(String(price).replace(/\D/g, '')) : 0;
      fd.append('price', String(priceNum));
      fd.append('description', description.trim());
      fd.append('city', city);
      fd.append('district', district);
      fd.append('lat', String(coords.lat));
      fd.append('lng', String(coords.lng));
      if (telegram.trim()) fd.append('telegram', telegram.trim());
      if (imageFile) fd.append('image', imageFile);
      if (isEdit && removeExistingImage && !imageFile) fd.append('removeImage', '1');

      let saved: any;
      if (isEdit && id) saved = await api.updateStanokAd(id, fd);
      else saved = await api.saveStanokAd(fd);

      const newId = saved?.id ?? id;
      nav(`/stanok-ads/${newId}`);
    } catch (e: any) { setError(e.message || 'Xatolik'); }
    finally { setSaving(false); }
  };

  if (loadingAd) return <EmptyState icon="⏳" title="Yuklanmoqda..." sub="" />;
  if (forbidden) return <EmptyState icon="🚫" title="Ruxsat yo'q" sub="Bu e'lonni faqat egasi tahrirlay oladi" ctaLabel="Orqaga" onCta={() => nav('/stanok-ads')} />;
  if (loadError) return <EmptyState icon="⚠️" title="Xatolik" sub={loadError} ctaLabel="Orqaga" onCta={() => nav('/stanok-ads')} />;

  const showPreview = imagePreview || (existingImageUrl && !removeExistingImage ? existingImageUrl : null);

  return (
    <form onSubmit={submit} style={{ maxWidth: 540, margin: '0 auto', paddingBottom: 24 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '6px 0 14px' }}>
        <button type="button" onClick={() => nav(isEdit && id ? `/stanok-ads/${id}` : '/stanok-ads')} style={{ width: 38, height: 38, borderRadius: 12, background: '#fff', border: '1px solid var(--line)', fontSize: 16, cursor: 'pointer' }}><img src="/images/back.png" alt="orqaga" style={{ width: 16, height: 16, display: 'block', margin: 'auto' }} /></button>
        <div style={{ fontWeight: 700, fontSize: 15 }}>{isEdit ? "E'lonni tahrirlash" : "Yangi e'lon"}</div>
        <div style={{ width: 38 }} />
      </div>

      <div style={{ fontSize: 24, fontWeight: 800, lineHeight: 1.15, display: 'flex', alignItems: 'center', gap: 8 }}>
        <SectionIcon name="factory" size={26} /> Stanok e'lonini joylash
      </div>
      <p style={{ color: 'var(--muted)', margin: '6px 0 16px', fontSize: 14 }}>Yangi yoki ishlatilgan stanokni soting</p>

      {!verified && !isEdit && (
        <div style={{ marginBottom: 16 }}>
          <PhoneVerify role="stanok-ads" title="📱 Telefonni tasdiqlang" onDone={() => setVerified(true)} />
        </div>
      )}

      {!verified && !isEdit ? (
        <div style={{ padding: '20px 16px', background: '#FEF3C7', border: '1px solid #F59E0B', borderRadius: 12, color: '#92400E', fontSize: 14, textAlign: 'center' }}>
          ⬆️ E'lon joylash uchun avval telefon raqamingizni tasdiqlang
        </div>
      ) : (
        <>
          <Field label="Sarlavha">
            <Input value={title} onChange={e => setTitle(e.target.value)} placeholder="Masalan: Frezerlash stanogi sotiladi" maxLength={120} />
          </Field>

          <Field label="Stanok turi (ixtiyoriy)">
            <select value={stanokType} onChange={e => setStanokType(e.target.value)} style={{ width: '100%', border: '1px solid var(--line)', background: '#fff', borderRadius: 14, padding: '13px 14px', fontSize: 15 }}>
              <option value="">Tanlanmagan</option>
              {SPECS.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </Field>

          <div style={{ fontWeight: 700, fontSize: 13, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '.06em', margin: '6px 0 8px' }}>Holati</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 14 }}>
            <button type="button" onClick={() => setCondition('new')} style={{
              padding: '14px 8px', borderRadius: 14, cursor: 'pointer', fontWeight: 700, fontSize: 14,
              background: condition === 'new' ? '#ECFDF5' : '#fff',
              color: condition === 'new' ? '#10B981' : 'var(--ink)',
              border: `1.5px solid ${condition === 'new' ? '#10B981' : 'var(--line)'}`,
            }}>🆕 Yangi</button>
            <button type="button" onClick={() => setCondition('used')} style={{
              padding: '14px 8px', borderRadius: 14, cursor: 'pointer', fontWeight: 700, fontSize: 14,
              background: condition === 'used' ? '#FEF3C7' : '#fff',
              color: condition === 'used' ? '#D97706' : 'var(--ink)',
              border: `1.5px solid ${condition === 'used' ? '#D97706' : 'var(--line)'}`,
            }}>♻️ Ishlatilgan</button>
          </div>

          <Field label="Narxi (so'm) — bo'sh qoldiring = Kelishiladi">
            <Input value={price} onChange={e => setPrice(e.target.value)} placeholder="25 000 000" inputMode="numeric" />
          </Field>

          <Field label="Rasm (majburiy)">
            <div>
              {showPreview ? (
                <div style={{ position: 'relative', borderRadius: 14, overflow: 'hidden', border: '1px solid var(--line)', background: '#FEF2F2', marginBottom: 8 }}>
                  <img src={showPreview} alt="" style={{ width: '100%', maxHeight: 280, objectFit: 'contain', display: 'block' }} />
                  <button type="button" onClick={() => { setImageFile(null); setRemoveExistingImage(true); }} style={{
                    position: 'absolute', top: 8, right: 8, width: 32, height: 32, borderRadius: 999,
                    background: 'rgba(0,0,0,0.6)', color: '#fff', border: 'none', cursor: 'pointer', fontSize: 16,
                  }}>✕</button>
                </div>
              ) : null}
              <label style={{
                display: 'block', padding: '14px', background: 'var(--blue-50)', color: 'var(--blue)',
                borderRadius: 14, textAlign: 'center', fontWeight: 700, fontSize: 14, cursor: 'pointer',
                border: '1.5px dashed var(--blue)',
              }}>
                {showPreview ? '🔄 Rasmni almashtirish' : '📷 Rasm yuklash'}
                <input type="file" accept="image/*" onChange={handleFile} style={{ display: 'none' }} />
              </label>
            </div>
          </Field>

          <Field label="Tavsif">
            <textarea value={description} onChange={e => setDescription(e.target.value)} maxLength={2000} rows={6}
              placeholder="Stanokning xususiyatlari, ish holati, ishlatilgan vaqti va boshqa tafsilotlar..."
              style={{ width: '100%', border: '1px solid var(--line)', background: '#fff', borderRadius: 14, padding: '14px 16px', fontSize: 15, lineHeight: 1.5, outline: 'none', resize: 'vertical', fontFamily: 'inherit' }}
            />
            <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 4, textAlign: 'right' }}>{description.length}/2000</div>
          </Field>

          <Field label="Viloyat">
            <select value={city} onChange={e => pickCity(e.target.value)} style={{ width: '100%', border: '1px solid var(--line)', background: '#fff', borderRadius: 14, padding: '13px 14px', fontSize: 15 }}>
              {cities.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </Field>
          <Field label="Tuman">
            <select value={district} onChange={e => setDistrict(e.target.value)} style={{ width: '100%', border: '1px solid var(--line)', background: '#fff', borderRadius: 14, padding: '13px 14px', fontSize: 15 }}>
              <option value="" disabled>Tumanni tanlang...</option>
              {(regions[city] || []).map(d => <option key={d} value={d}>{d}</option>)}
            </select>
          </Field>

          <Field label="Aniq manzil (xaritadan belgilang)">
            <MapPicker value={coords} onChange={setCoords} city={city} />
          </Field>

          <Field label="Telegram username (ixtiyoriy)">
            <Input value={telegram} onChange={e => setTelegram(e.target.value)} placeholder="@username" />
          </Field>

          {error && <div style={{ padding: 12, background: '#FEE2E2', color: '#DC2626', borderRadius: 12, fontSize: 13, fontWeight: 500, marginTop: 6 }}>⚠️ {error}</div>}

          <Btn type="submit" full style={{ marginTop: 16, opacity: saving ? .6 : 1 }}>
            {saving ? 'Saqlanmoqda...' : (isEdit ? "O'zgarishlarni saqlash →" : "E'lon joylash →")}
          </Btn>
        </>
      )}
    </form>
  );
};
