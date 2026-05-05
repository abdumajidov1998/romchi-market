'use client';
import React from 'react';
import { useRouter } from 'next/navigation';
import { Btn, Input } from '@/components/ui';
import { api, auth } from '@/lib/api';
import { Logo } from '@/components/Logo';

const NAME_KEY = 'romchi_user_name';

const Progress: React.FC<{ step: 1 | 2 | 3 }> = ({ step }) => (
  <div style={{ display: 'flex', gap: 8, justifyContent: 'center', marginBottom: 28 }}>
    {[1, 2, 3].map(n => (
      <div key={n} style={{
        width: n === step ? 28 : 8, height: 8, borderRadius: 999,
        background: n <= step ? 'var(--blue)' : 'var(--line)',
        transition: 'all .2s',
      }} />
    ))}
  </div>
);

const Shell: React.FC<{ children: React.ReactNode; onBack?: () => void; step: 1 | 2 | 3 }> = ({ children, onBack, step }) => (
  <div style={{ minHeight: '100vh', background: 'var(--bg)', padding: '20px', display: 'flex', flexDirection: 'column' }}>
    <div style={{ maxWidth: 440, margin: '0 auto', width: '100%', flex: 1, display: 'flex', flexDirection: 'column' }}>
      <div style={{ display: 'flex', alignItems: 'center', minHeight: 40, marginBottom: 8 }}>
        {onBack ? (
          // eslint-disable-next-line @next/next/no-img-element
          <button type="button" onClick={onBack} style={{ width: 38, height: 38, borderRadius: 12, background: '#fff', border: '1px solid var(--line)', fontSize: 16, cursor: 'pointer' }}><img src="/images/back.png" alt="orqaga" style={{ width: 16, height: 16, display: 'block', margin: 'auto' }} /></button>
        ) : <div style={{ width: 38 }} />}
        <div style={{ flex: 1, textAlign: 'center', fontSize: 12, color: 'var(--muted)', fontWeight: 600 }}>{step} / 3</div>
        <div style={{ width: 38 }} />
      </div>
      <div style={{ textAlign: 'center', padding: '8px 0 16px' }}>
        <Logo size={32} />
      </div>
      <Progress step={step} />
      <div style={{ flex: 1 }}>{children}</div>
    </div>
  </div>
);

export default function WelcomePage() {
  const router = useRouter();
  const [step, setStep] = React.useState<1 | 2 | 3>(1);
  const [phone, setPhone] = React.useState('+998 ');
  const [code, setCode] = React.useState('');
  const [name, setName] = React.useState('');
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState('');
  const [countdown, setCountdown] = React.useState(0);
  const [devCode, setDevCode] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (auth.token() && localStorage.getItem(NAME_KEY)) {
      router.replace('/');
    }
  }, [router]);

  React.useEffect(() => {
    if (countdown <= 0) return;
    const t = setTimeout(() => setCountdown(c => c - 1), 1000);
    return () => clearTimeout(t);
  }, [countdown]);

  const sendCode = async () => {
    setError('');
    const cleanPhone = phone.replace(/\s/g, '');
    if (cleanPhone.replace(/\D/g, '').length < 12) {
      setError("Telefon raqamni to'liq kiriting"); return;
    }
    setLoading(true);
    try {
      const r = await api.sendCode(cleanPhone);
      setDevCode(r.devCode || null);
      setStep(2);
      setCountdown(60);
      setCode('');
    } catch (e: any) {
      setError(e.message || 'SMS yuborishda xatolik');
    } finally { setLoading(false); }
  };

  const verifyCode = async (c?: string) => {
    setError('');
    const useCode = c || code;
    if (useCode.length !== 4) { setError('4 raqamli kodni kiriting'); return; }
    setLoading(true);
    try {
      const cleanPhone = phone.replace(/\s/g, '');
      const autoPassword = `r${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
      const res = await api.verifyCode({ phone: cleanPhone, code: useCode, password: autoPassword, role: 'worker' });
      auth.set(res.token, res.user);
      if (res.isNew || !localStorage.getItem(NAME_KEY)) {
        setStep(3);
      } else {
        router.replace('/');
      }
    } catch (e: any) {
      setError(e.message || "Kod noto'g'ri");
    } finally { setLoading(false); }
  };

  const finish = () => {
    setError('');
    const trimmed = name.trim();
    if (trimmed.length < 2) { setError('Ismingizni kiriting'); return; }
    localStorage.setItem(NAME_KEY, trimmed);
    router.replace('/');
  };

  if (step === 1) {
    return (
      <Shell step={1}>
        <div style={{ textAlign: 'center', marginBottom: 16 }}>
          <h1 style={{ fontSize: 22, fontWeight: 800, margin: '0 0 6px' }}>Xush kelibsiz!</h1>
          <p style={{ color: 'var(--muted)', fontSize: 14, margin: 0 }}>Telefon raqamingizni kiriting — sizga SMS orqali kod yuboramiz</p>
        </div>
        <div style={{ marginTop: 18 }}>
          <Input
            value={phone}
            onChange={e => setPhone(e.target.value)}
            placeholder="+998 __ ___ __ __"
            inputMode="tel"
            autoFocus
            style={{ fontSize: 20, padding: '16px 18px', letterSpacing: 1, textAlign: 'center', fontWeight: 600 }}
          />
          {error && <div style={{ color: '#DC2626', fontSize: 13, marginTop: 10, textAlign: 'center' }}>⚠️ {error}</div>}
        </div>
        <div style={{ marginTop: 22 }}>
          <Btn full onClick={sendCode} style={{ padding: '16px', fontSize: 15, opacity: loading ? .6 : 1 }}>
            {loading ? 'Yuborilmoqda…' : '📩 SMS kod yuborish'}
          </Btn>
        </div>
      </Shell>
    );
  }

  if (step === 2) {
    return (
      <Shell step={2} onBack={() => { setStep(1); setCode(''); setError(''); }}>
        <div style={{ textAlign: 'center', marginBottom: 16 }}>
          <h1 style={{ fontSize: 22, fontWeight: 800, margin: '0 0 6px' }}>SMS kod</h1>
          <p style={{ color: 'var(--muted)', fontSize: 14, margin: 0 }}>
            <b style={{ color: 'var(--ink)' }}>{phone}</b> raqamiga 4 xonali kod yuborildi
          </p>
        </div>
        {devCode && (
          <div style={{ background: '#FEF3C7', border: '1px solid #F59E0B', color: '#92400E', borderRadius: 12, padding: '10px 14px', fontSize: 13, marginBottom: 12, textAlign: 'center' }}>
            🧪 Test rejimi: <b style={{ fontSize: 16, letterSpacing: 2 }}>{devCode}</b>
          </div>
        )}
        <div style={{ display: 'flex', gap: 10, justifyContent: 'center', marginTop: 14, marginBottom: 14 }}>
          {[0, 1, 2, 3].map(i => (
            <input
              key={i}
              maxLength={1}
              value={code[i] || ''}
              inputMode="numeric"
              autoComplete={i === 0 ? 'one-time-code' : 'off'}
              autoFocus={i === 0}
              onChange={e => {
                const v = e.target.value.replace(/\D/g, '');
                const arr = code.split('');
                arr[i] = v;
                const newCode = arr.join('').slice(0, 4);
                setCode(newCode);
                if (v && i < 3) {
                  const next = (e.target as HTMLElement).parentElement?.children[i + 1] as HTMLInputElement;
                  next?.focus();
                }
                if (newCode.length === 4) setTimeout(() => verifyCode(newCode), 150);
              }}
              onPaste={e => {
                e.preventDefault();
                const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 4);
                if (pasted.length > 0) {
                  setCode(pasted);
                  const last = Math.min(pasted.length, 3);
                  const target = (e.currentTarget as HTMLInputElement).parentElement?.children[last] as HTMLInputElement;
                  target?.focus();
                  if (pasted.length === 4) setTimeout(() => verifyCode(pasted), 150);
                }
              }}
              onKeyDown={e => {
                if (e.key === 'Backspace' && !code[i] && i > 0) {
                  const prev = (e.target as HTMLElement).parentElement?.children[i - 1] as HTMLInputElement;
                  prev?.focus();
                }
              }}
              style={{
                width: 56, height: 60, textAlign: 'center', fontSize: 30, fontWeight: 800,
                border: code[i] ? '2px solid var(--blue)' : 'none',
                borderRadius: 14,
                outline: 'none', background: '#fff', transition: 'border-color .2s',
                boxShadow: code[i] ? 'none' : '0 1px 3px rgba(15,23,42,.06), 0 0 0 1px rgba(15,23,42,.04)',
              }}
            />
          ))}
        </div>
        {error && <div style={{ color: '#DC2626', fontSize: 13, textAlign: 'center', marginBottom: 8 }}>⚠️ {error}</div>}
        <Btn full onClick={() => verifyCode()} style={{ padding: '16px', fontSize: 15, opacity: loading ? .6 : 1 }}>
          {loading ? 'Tekshirilmoqda…' : 'Tasdiqlash ✓'}
        </Btn>
        <div style={{ textAlign: 'center', marginTop: 12 }}>
          {countdown > 0 ? (
            <span style={{ color: 'var(--muted)', fontSize: 13 }}>Qayta yuborish: {countdown}s</span>
          ) : (
            <button type="button" onClick={sendCode} style={{ background: 'none', border: 'none', color: 'var(--blue)', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
              Qayta kod yuborish
            </button>
          )}
        </div>
      </Shell>
    );
  }

  return (
    <Shell step={3} onBack={() => { setStep(2); setError(''); }}>
      <div style={{ textAlign: 'center', marginBottom: 16 }}>
        <h1 style={{ fontSize: 22, fontWeight: 800, margin: '0 0 6px' }}>Sizning ismingiz</h1>
        <p style={{ color: 'var(--muted)', fontSize: 14, margin: 0 }}>Bu ism profilingizda ko'rinadi</p>
      </div>
      <div style={{ marginTop: 18 }}>
        <Input
          value={name}
          onChange={e => setName(e.target.value)}
          placeholder="Masalan: Akmal"
          autoFocus
          maxLength={50}
          style={{ fontSize: 18, padding: '16px 18px', textAlign: 'center', fontWeight: 600 }}
        />
        {error && <div style={{ color: '#DC2626', fontSize: 13, marginTop: 10, textAlign: 'center' }}>⚠️ {error}</div>}
      </div>
      <div style={{ marginTop: 22 }}>
        <Btn full onClick={finish} style={{ padding: '16px', fontSize: 15 }}>
          Tugatish →
        </Btn>
      </div>
    </Shell>
  );
}
