import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Btn, Card, EmptyState } from '../ui';
import { api, auth } from '../api';
import { SpecIcon } from '../SpecIcon';

export const Chat: React.FC = () => (
  <EmptyState icon="💬" title="Hali xabarlar yo'q" sub="Ishchi yoki vakansiyada Telegram tugmasini bosib suhbatni boshlang." />
);

const ProfileCard: React.FC<{
  icon: string; title: string; name: string; sub: string;
  editPath: string; onDelete: () => void; deleting: boolean;
}> = ({ icon, title, name, sub, editPath, onDelete, deleting }) => {
  const nav = useNavigate();
  const [confirm, setConfirm] = React.useState(false);
  return (
    <Card style={{ marginTop: 12 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <div style={{ fontSize: 11, color: 'var(--muted)', fontWeight: 600, textTransform: 'uppercase' }}>{icon} {title}</div>
          <div style={{ fontWeight: 700, fontSize: 16, marginTop: 4 }}>{name}</div>
          <div style={{ color: 'var(--muted)', fontSize: 13, marginTop: 2 }}>{sub}</div>
        </div>
      </div>
      <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
        <Btn variant="soft" style={{ flex: 1, fontSize: 13 }} onClick={() => nav(editPath)}>✏️ Tahrirlash</Btn>
        {!confirm ? (
          <button onClick={() => setConfirm(true)} style={{
            flex: 1, padding: '10px', borderRadius: 12, cursor: 'pointer', fontSize: 13, fontWeight: 600,
            background: '#fff', border: '1px solid #DC2626', color: '#DC2626',
          }}>🗑 O'chirish</button>
        ) : (
          <div style={{ flex: 1, display: 'flex', gap: 4 }}>
            <button onClick={onDelete} disabled={deleting} style={{
              flex: 1, padding: '10px', borderRadius: 12, cursor: 'pointer', fontSize: 12, fontWeight: 700,
              background: '#DC2626', border: 'none', color: '#fff', opacity: deleting ? .6 : 1,
            }}>{deleting ? '...' : 'Ha'}</button>
            <button onClick={() => setConfirm(false)} style={{
              flex: 1, padding: '10px', borderRadius: 12, cursor: 'pointer', fontSize: 12, fontWeight: 600,
              background: '#f5f5f5', border: 'none', color: 'var(--ink)',
            }}>Yo'q</button>
          </div>
        )}
      </div>
    </Card>
  );
};

export const Profile: React.FC = () => {
  const nav = useNavigate();
  const [me, setMe] = React.useState<any>(null);
  const [profiles, setProfiles] = React.useState<any>(null);
  const [loading, setLoading] = React.useState(true);
  const [deleting, setDeleting] = React.useState('');

  const load = async () => {
    if (!auth.token()) { setLoading(false); return; }
    try {
      const m = await api.me();
      setMe(m);
      const p = await api.myProfiles();
      setProfiles(p);
    } catch { auth.clear(); }
    finally { setLoading(false); }
  };

  React.useEffect(() => { load(); }, []);

  const del = async (type: string) => {
    setDeleting(type);
    try {
      if (type === 'worker') await api.deleteWorker();
      if (type === 'wasteBuyer') await api.deleteWasteBuyer();
      if (type === 'usluga') await api.deleteUsluga();
      if (type === 'stanok') await api.deleteStanok();
      await load();
    } catch {}
    finally { setDeleting(''); }
  };

  if (loading) return <EmptyState icon="⏳" title="Yuklanmoqda..." sub="" />;

  if (!me) return (
    <div style={{ maxWidth: 480, margin: '0 auto' }}>
      <EmptyState icon="👤" title="Hali ro'yxatdan o'tmagansiz" sub="Bosh sahifadan boshlang." />
      <div style={{ padding: '0 16px' }}>
        <Btn full onClick={() => nav('/')}>Bosh sahifaga</Btn>
      </div>
    </div>
  );

  const hasAny = profiles?.worker || profiles?.wasteBuyer || profiles?.usluga || profiles?.stanok;

  return (
    <div style={{ maxWidth: 540, margin: '0 auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '6px 0 14px' }}>
        <button onClick={() => nav('/')} style={{ width: 38, height: 38, borderRadius: 12, background: '#fff', border: '1px solid var(--line)', fontSize: 16, cursor: 'pointer' }}>←</button>
        <div style={{ fontWeight: 800, fontSize: 20 }}>Mening profilim</div>
        <div style={{ width: 38 }} />
      </div>

      <Card>
        <div style={{ fontSize: 12, color: 'var(--muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.06em' }}>Telefon</div>
        <div style={{ fontWeight: 700, fontSize: 16, marginTop: 4 }}>{me.user.phone}</div>
      </Card>

      {profiles?.worker && (
        <ProfileCard
          icon="🔧" title="Romchi Ish - Ishchi"
          name={profiles.worker.name}
          sub={`📍 ${profiles.worker.city} · ${(profiles.worker.specs || []).join(', ')}`}
          editPath="/profile/create"
          onDelete={() => del('worker')}
          deleting={deleting === 'worker'}
        />
      )}

      {profiles?.wasteBuyer && (
        <ProfileCard
          icon="♻️" title="Atxod oluvchi"
          name={profiles.wasteBuyer.name}
          sub={`📍 ${profiles.wasteBuyer.city} · ${profiles.wasteBuyer.district}`}
          editPath="/atxod/create"
          onDelete={() => del('wasteBuyer')}
          deleting={deleting === 'wasteBuyer'}
        />
      )}

      {profiles?.stanok && (
        <ProfileCard
          icon="⚙️" title="Stanok ustasi"
          name={profiles.stanok.name}
          sub={`📍 ${profiles.stanok.city} · ${(profiles.stanok.specs || []).join(', ')}`}
          editPath="/stanok/create"
          onDelete={() => del('stanok')}
          deleting={deleting === 'stanok'}
        />
      )}

      {profiles?.usluga && (
        <ProfileCard
          icon="🛠️" title="Uslugachi"
          name={profiles.usluga.name}
          sub={`📍 ${profiles.usluga.city} · ${(profiles.usluga.specs || []).join(', ')}`}
          editPath="/usluga/create"
          onDelete={() => del('usluga')}
          deleting={deleting === 'usluga'}
        />
      )}

      {!hasAny && (
        <Card style={{ marginTop: 12, textAlign: 'center', padding: 24 }}>
          <div style={{ fontSize: 32 }}>📋</div>
          <div style={{ fontWeight: 700, fontSize: 15, marginTop: 8 }}>Hali profilingiz yo'q</div>
          <div style={{ color: 'var(--muted)', fontSize: 13, marginTop: 4 }}>Bosh sahifadan kerakli bo'limga kiring</div>
        </Card>
      )}

      <div style={{ fontSize: 12, color: 'var(--muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.06em', margin: '18px 2px 8px' }}>
        Yangi profil qo'shish
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
        {!profiles?.worker && (
          <button type="button" onClick={() => nav('/profile/create')} style={{ padding: '12px 8px', borderRadius: 14, cursor: 'pointer', textAlign: 'center', background: '#fff', border: '1px solid var(--line)' }}>
            <div style={{ fontSize: 20 }}>🔧</div>
            <div style={{ fontWeight: 600, fontSize: 11, marginTop: 4 }}>Ishchi</div>
          </button>
        )}
        {!profiles?.wasteBuyer && (
          <button type="button" onClick={() => nav('/atxod/create')} style={{ padding: '12px 8px', borderRadius: 14, cursor: 'pointer', textAlign: 'center', background: '#fff', border: '1px solid var(--line)' }}>
            <div style={{ fontSize: 20 }}>♻️</div>
            <div style={{ fontWeight: 600, fontSize: 11, marginTop: 4 }}>Atxodchi</div>
          </button>
        )}
        {!profiles?.stanok && (
          <button type="button" onClick={() => nav('/stanok/create')} style={{ padding: '12px 8px', borderRadius: 14, cursor: 'pointer', textAlign: 'center', background: '#fff', border: '1px solid var(--line)' }}>
            <div style={{ fontSize: 20 }}>⚙️</div>
            <div style={{ fontWeight: 600, fontSize: 11, marginTop: 4 }}>Stanokchi</div>
          </button>
        )}
        {!profiles?.usluga && (
          <button type="button" onClick={() => nav('/usluga/create')} style={{ padding: '12px 8px', borderRadius: 14, cursor: 'pointer', textAlign: 'center', background: '#fff', border: '1px solid var(--line)' }}>
            <div style={{ fontSize: 20 }}>🛠️</div>
            <div style={{ fontWeight: 600, fontSize: 11, marginTop: 4 }}>Uslugachi</div>
          </button>
        )}
      </div>

      <Btn variant="ghost" full style={{ marginTop: 20, color: '#DC2626' }} onClick={() => { auth.clear(); nav('/'); }}>Chiqish</Btn>
    </div>
  );
};
