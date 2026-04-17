import React from 'react';
import { Btn, Input } from '../ui';
import { api, auth, User } from '../api';

type Step = 'phone' | 'code' | 'password';

export const PhoneVerify: React.FC<{
  role: string;
  onDone: (user: User, isNew: boolean) => void;
  title?: string;
}> = ({ role, onDone, title = 'Telefon bilan kirish' }) => {
  const [step, setStep] = React.useState<Step>('phone');
  const [phone, setPhone] = React.useState('+998 ');
  const [code, setCode] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [error, setError] = React.useState('');
  const [loading, setLoading] = React.useState(false);
  const [countdown, setCountdown] = React.useState(0);

  React.useEffect(() => {
    if (countdown <= 0) return;
    const t = setTimeout(() => setCountdown(c => c - 1), 1000);
    return () => clearTimeout(t);
  }, [countdown]);

  const sendCode = async () => {
    setError('');
    const cleanPhone = phone.replace(/\s/g, '');
    if (cleanPhone.replace(/\D/g, '').length < 12) {
      setError('Telefon raqamni to\'liq kiriting'); return;
    }
    setLoading(true);
    try {
      await api.sendCode(cleanPhone);
      setStep('code');
      setCountdown(60);
    } catch (e: any) {
      setError(e.message || 'SMS yuborishda xatolik');
    } finally { setLoading(false); }
  };

  const verifyCode = async () => {
    setError('');
    if (code.length !== 4) { setError('4 raqamli kodni kiriting'); return; }
    setLoading(true);
    try {
      const cleanPhone = phone.replace(/\s/g, '');
      const res = await api.verifyCode({ phone: cleanPhone, code, password: password || undefined, role });
      if (res.isNew && !password) {
        // Yangi foydalanuvchi — parol kerak
        setStep('password');
        setLoading(false);
        return;
      }
      auth.set(res.token, res.user);
      onDone(res.user, res.isNew);
    } catch (e: any) {
      if (e.message?.includes('Parol va rol kerak')) {
        setStep('password');
      } else {
        setError(e.message || 'Kod noto\'g\'ri');
      }
    } finally { setLoading(false); }
  };

  const verifyWithPassword = async () => {
    setError('');
    if (password.length < 4) { setError('Parol kamida 4 belgi bo\'lishi kerak'); return; }
    setLoading(true);
    try {
      const cleanPhone = phone.replace(/\s/g, '');
      const res = await api.verifyCode({ phone: cleanPhone, code, password, role });
      auth.set(res.token, res.user);
      onDone(res.user, res.isNew);
    } catch (e: any) {
      setError(e.message || 'Xatolik');
    } finally { setLoading(false); }
  };

  return (
    <div style={{ background: '#fff', border: '1px solid var(--line)', borderRadius: 16, padding: 18 }}>
      <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 12 }}>{title}</div>

      {step === 'phone' && (
        <>
          <div style={{ color: 'var(--muted)', fontSize: 13, marginBottom: 10 }}>
            Telefon raqamingizga SMS kod yuboriladi
          </div>
          <Input
            value={phone} onChange={e => setPhone(e.target.value)}
            placeholder="+998 __ ___ __ __"
            style={{ fontSize: 18, padding: '14px 16px', letterSpacing: 1, marginBottom: 10 }}
          />
          {error && <div style={{ color: '#DC2626', fontSize: 13, marginBottom: 8 }}>⚠️ {error}</div>}
          <Btn full onClick={sendCode} style={{ opacity: loading ? .6 : 1 }}>
            {loading ? 'Yuborilmoqda…' : '📩 SMS kod yuborish'}
          </Btn>
        </>
      )}

      {step === 'code' && (
        <>
          <div style={{ color: 'var(--muted)', fontSize: 13, marginBottom: 4 }}>
            <b>{phone}</b> raqamiga 4 raqamli kod yuborildi
          </div>
          <div style={{ display: 'flex', gap: 8, marginTop: 10, marginBottom: 10 }}>
            {[0, 1, 2, 3].map(i => (
              <input
                key={i}
                maxLength={1}
                value={code[i] || ''}
                inputMode="numeric"
                onChange={e => {
                  const v = e.target.value.replace(/\D/g, '');
                  const arr = code.split('');
                  arr[i] = v;
                  const newCode = arr.join('').slice(0, 4);
                  setCode(newCode);
                  if (v && i < 3) {
                    const next = e.target.parentElement?.children[i + 1] as HTMLInputElement;
                    next?.focus();
                  }
                }}
                onKeyDown={e => {
                  if (e.key === 'Backspace' && !code[i] && i > 0) {
                    const prev = (e.target as HTMLElement).parentElement?.children[i - 1] as HTMLInputElement;
                    prev?.focus();
                  }
                }}
                style={{
                  width: '100%', textAlign: 'center', fontSize: 28, fontWeight: 800,
                  padding: '12px 0', border: '2px solid var(--line)', borderRadius: 12,
                  outline: 'none', background: '#fff',
                }}
              />
            ))}
          </div>
          {error && <div style={{ color: '#DC2626', fontSize: 13, marginBottom: 8 }}>⚠️ {error}</div>}
          <Btn full onClick={verifyCode} style={{ opacity: loading ? .6 : 1 }}>
            {loading ? 'Tekshirilmoqda…' : 'Tasdiqlash ✓'}
          </Btn>
          <div style={{ textAlign: 'center', marginTop: 10 }}>
            {countdown > 0 ? (
              <span style={{ color: 'var(--muted)', fontSize: 13 }}>Qayta yuborish: {countdown}s</span>
            ) : (
              <button type="button" onClick={sendCode} style={{ background: 'none', border: 'none', color: 'var(--blue)', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
                Qayta kod yuborish
              </button>
            )}
          </div>
          <button type="button" onClick={() => { setStep('phone'); setCode(''); setError(''); }} style={{ background: 'none', border: 'none', color: 'var(--muted)', fontSize: 12, cursor: 'pointer', marginTop: 6, width: '100%', textAlign: 'center' }}>
            ← Raqamni o'zgartirish
          </button>
        </>
      )}

      {step === 'password' && (
        <>
          <div style={{ color: 'var(--muted)', fontSize: 13, marginBottom: 10 }}>
            Siz yangi foydalanuvchisiz. Keyinchalik kirish uchun parol yarating.
          </div>
          <Input
            type="password" value={password} onChange={e => setPassword(e.target.value)}
            placeholder="Parol (kamida 4 belgi)"
            style={{ fontSize: 16, padding: '14px 16px', marginBottom: 10 }}
          />
          {error && <div style={{ color: '#DC2626', fontSize: 13, marginBottom: 8 }}>⚠️ {error}</div>}
          <Btn full onClick={verifyWithPassword} style={{ opacity: loading ? .6 : 1 }}>
            {loading ? 'Saqlanmoqda…' : 'Ro\'yxatdan o\'tish →'}
          </Btn>
        </>
      )}
    </div>
  );
};
