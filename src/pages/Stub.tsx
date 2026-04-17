import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Btn, Card, EmptyState } from '../ui';
import { api, auth } from '../api';

export const Chat: React.FC = () => (
  <EmptyState icon="💬" title="Hali xabarlar yo‘q" sub="Ishchi yoki vakansiyada ✈ Telegram tugmasini bosib suhbatni boshlang." />
);

export const Profile: React.FC = () => {
  const nav = useNavigate();
  const [me, setMe] = React.useState<any>(null);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    if (!auth.token()) { setLoading(false); return; }
    api.me().then(d => setMe(d)).catch(() => auth.clear()).finally(() => setLoading(false));
  }, []);

  if (loading) return <EmptyState icon="⏳" title="Yuklanmoqda…" sub="" />;

  if (!me) return (
    <div style={{ maxWidth: 480, margin: '0 auto' }}>
      <EmptyState icon="👤" title="Hali ro‘yxatdan o‘tmagansiz" sub="Ish qidirish yoki e’lon joylash uchun boshlang." />
      <div style={{ display: 'grid', gap: 10, padding: '0 16px' }}>
        <Btn full onClick={() => nav('/profile/create')}>Ishchi sifatida ro‘yxatdan o‘tish</Btn>
        <Btn variant="ghost" full onClick={() => nav('/post')}>Vakansiya joylash (ish beruvchi)</Btn>
      </div>
    </div>
  );

  return (
    <div style={{ maxWidth: 540, margin: '0 auto' }}>
      <div style={{ fontSize: 22, fontWeight: 800, marginBottom: 14 }}>Mening profilim</div>
      <Card>
        <div style={{ fontSize: 12, color: 'var(--muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.06em' }}>Telefon</div>
        <div style={{ fontWeight: 700, fontSize: 16, marginTop: 4 }}>{me.user.phone}</div>
        <div style={{ fontSize: 12, color: 'var(--muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.06em', marginTop: 14 }}>Rol</div>
        <div style={{ fontWeight: 700, fontSize: 16, marginTop: 4 }}>{me.user.role === 'worker' ? 'Ishchi' : 'Ish beruvchi'}</div>
      </Card>
      {me.profile && (
        <Card style={{ marginTop: 12 }}>
          <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 6 }}>{me.profile.name}</div>
          <div style={{ color: 'var(--muted)', fontSize: 14 }}>📍 {me.profile.city} · {me.profile.district}</div>
          <div style={{ color: 'var(--muted)', fontSize: 14, marginTop: 4 }}>Ishlar: {(me.profile.specs || []).join(', ')}</div>
          <div style={{ color: 'var(--muted)', fontSize: 14, marginTop: 4 }}>Tajriba: {me.profile.experience}</div>
          {me.profile.about && <div style={{ marginTop: 10, fontSize: 13, lineHeight: 1.5 }}>{me.profile.about}</div>}
        </Card>
      )}

      <div style={{ fontSize: 12, color: 'var(--muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.06em', margin: '18px 2px 8px' }}>
        Qidiruv
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        <button type="button" onClick={() => nav('/jobs')} style={{
          padding: '16px 12px', borderRadius: 16, cursor: 'pointer', textAlign: 'left',
          background: '#fff', border: '1px solid var(--line)',
        }}>
          <div style={{ fontSize: 24 }}>💼</div>
          <div style={{ fontWeight: 700, fontSize: 14, marginTop: 6 }}>Ish qidirish</div>
          <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 2 }}>Vakansiyalarni ko‘rish</div>
        </button>
        <button type="button" onClick={() => nav('/workers')} style={{
          padding: '16px 12px', borderRadius: 16, cursor: 'pointer', textAlign: 'left',
          background: '#fff', border: '1px solid var(--line)',
        }}>
          <div style={{ fontSize: 24 }}>👷</div>
          <div style={{ fontWeight: 700, fontSize: 14, marginTop: 6 }}>Ishchi qidirish</div>
          <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 2 }}>Ishchilarni topish</div>
        </button>
      </div>
      <Btn full style={{ marginTop: 10 }} onClick={() => nav('/post')}>＋ Yangi e’lon joylash</Btn>

      <Btn variant="ghost" full style={{ marginTop: 16 }} onClick={() => { auth.clear(); nav('/'); }}>Chiqish</Btn>
    </div>
  );
};
