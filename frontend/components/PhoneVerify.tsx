'use client';
import React from 'react';
import { Btn, Input } from './ui';
import { api, auth, User } from '@/lib/api';

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
  const [devCode, setDevCode] = React.useState<string | null>(null);

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
      const r = await api.sendCode(cleanPhone);
      setDevCode(r.devCode || null);
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
          {devCode && (
            <div style={{ background: '#FEF3C7', border: '1px solid #F59E0B', color: '#92400E', borderRadius: 10, padding: '10px 12px', fontSize: 13, marginTop: 8, marginBottom: 4 }}>
              🧪 Test rejimi: kod <b style={{ fontSize: 16, letterSpacing: 2 }}>{devCode}</b>
            </div>
          )}
          <input
            type="hidden"
            autoComplete="one-time-code"
            onChange={e => {
              const v = e.target.value.replace(/\D/g, '').slice(0, 4);
              if (v.length === 4) { setCode(v); }
            }}
          />
          <div style={{ display: 'flex', gap: 8, marginTop: 10, marginBottom: 10 }}>
            {[0, 1, 2, 3].map(i => (
              <input
                key={i}
                maxLength={1}
                value={code[i] || ''}
                inputMode="numeric"
                autoComplete={i === 0 ? 'one-time-code' : 'off'}
                onChange={e => {
                  const v = e.target.value.replace(/\D/g, '');
                  const arr = code.split('');
                  arr[i] = v;
                  const newCode = arr.join('').slice(0, 4);
                  setCode(newCode);
                  if (v && i < 3) {
                    const next = (e.target as HTMLInputElement).parentElement?.children[i + 1] as HTMLInputElement;
                    next?.focus();
                  }
                  if (newCode.length === 4) {
                    setTimeout(() => {
                      const btn = document.querySelector('[data-verify-btn]') as HTMLElement;
                      btn?.click();
                    }, 200);
                  }
                }}
                onPaste={e => {
                  e.preventDefault();
                  const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 4);
                  if (pasted.length > 0) {
                    setCode(pasted);
                    const last = Math.min(pasted.length, 3);
                    const target = (e.currentTarget as HTMLInputElement).parentElement?.children[last] as HTMLInputElement;
                    target?.focus();
                    if (pasted.length === 4) {
                      setTimeout(() => {
                        const btn = document.querySelector('[data-verify-btn]') as HTMLElement;
                        btn?.click();
                      }, 200);
                    }
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
                  padding: '12px 0', border: `2px solid ${code[i] ? 'var(--blue)' : 'var(--line)'}`, borderRadius: 12,
                  outline: 'none', background: '#fff', transition: 'border-color .2s',
                }}
              />
            ))}
          </div>
          {error && <div style={{ color: '#DC2626', fontSize: 13, marginBottom: 8 }}>⚠️ {error}</div>}
          <Btn full onClick={verifyCode} style={{ opacity: loading ? .6 : 1 }} data-verify-btn>
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
