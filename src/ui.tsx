import React from 'react';
import { Worker, Job } from './data';
import { Link } from 'react-router-dom';
import { SpecIcon } from './SpecIcon';

export const Avatar: React.FC<{ initials: string; color?: 'blue' | 'amber' | 'green'; size?: number }> = ({ initials, color = 'blue', size = 48 }) => {
  const palette = {
    blue: { bg: 'linear-gradient(135deg, rgba(0,119,255,0.18), rgba(0,119,255,0.08))', fg: '#0077FF' },
    amber: { bg: '#FEF3E2', fg: '#F59E0B' },
    green: { bg: '#E8F7EE', fg: '#16A34A' },
  }[color];
  return (
    <div style={{
      width: size, height: size, borderRadius: size >= 64 ? 22 : size >= 48 ? 14 : 10,
      background: palette.bg, color: palette.fg, display: 'grid', placeItems: 'center',
      fontWeight: 700, fontSize: Math.round(size / 3), flexShrink: 0,
    }}>{initials}</div>
  );
};

export const Verified: React.FC = () => (
  <span title="Tasdiqlangan" style={{
    width: 16, height: 16, borderRadius: '50%', background: 'var(--blue)', color: '#fff',
    display: 'inline-grid', placeItems: 'center', fontSize: 10, fontWeight: 700,
  }}>✓</span>
);

export const Badge: React.FC<{ tone?: 'blue' | 'green' | 'amber'; children: React.ReactNode }> = ({ tone = 'blue', children }) => {
  const tones = {
    blue: { bg: 'var(--blue-50)', fg: 'var(--blue)' },
    green: { bg: 'var(--green-50)', fg: 'var(--green)' },
    amber: { bg: 'var(--amber-50)', fg: 'var(--amber)' },
  }[tone];
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 11, fontWeight: 600,
      padding: '4px 8px', borderRadius: 8, background: tones.bg, color: tones.fg,
    }}>{children}</span>
  );
};

export const Chip: React.FC<{ on?: boolean; soft?: boolean; onClick?: () => void; children: React.ReactNode }> = ({ on, soft, onClick, children }) => (
  <button onClick={onClick} style={{
    padding: '8px 12px', borderRadius: 999,
    background: on ? 'var(--blue)' : soft ? 'var(--blue-50)' : '#fff',
    color: on ? '#fff' : soft ? 'var(--blue)' : 'var(--ink-2)',
    border: `1px solid ${on ? 'var(--blue)' : soft ? 'transparent' : 'var(--line)'}`,
    fontSize: 13, fontWeight: 500, cursor: 'pointer', whiteSpace: 'nowrap',
  }}>{children}</button>
);

type BtnProps = { variant?: 'primary' | 'ghost' | 'soft' | 'dark'; full?: boolean; onClick?: () => void; children: React.ReactNode; style?: React.CSSProperties; type?: 'button' | 'submit' };
export const Btn: React.FC<BtnProps> = ({ variant = 'primary', full, onClick, children, style, type = 'button' }) => {
  const styles: React.CSSProperties = {
    display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8,
    padding: '12px 16px', borderRadius: 14, fontWeight: 600, fontSize: 14, border: 'none',
    width: full ? '100%' : 'auto', cursor: 'pointer', ...style,
  };
  if (variant === 'primary') Object.assign(styles, { background: 'var(--blue)', color: '#fff', boxShadow: '0 8px 18px rgba(0,119,255,.25)' });
  if (variant === 'ghost') Object.assign(styles, { background: '#fff', color: 'var(--ink)', border: '1px solid var(--line)' });
  if (variant === 'soft') Object.assign(styles, { background: 'var(--blue-50)', color: 'var(--blue)' });
  if (variant === 'dark') Object.assign(styles, { background: 'var(--ink)', color: '#fff' });
  return <button type={type} onClick={onClick} style={styles}>{children}</button>;
};

export const Card: React.FC<{ children: React.ReactNode; style?: React.CSSProperties; onClick?: () => void }> = ({ children, style, onClick }) => (
  <div onClick={onClick} style={{
    background: '#fff', border: '1px solid var(--line)', borderRadius: 18, padding: 16,
    boxShadow: 'var(--shadow)', cursor: onClick ? 'pointer' : 'default', ...style,
  }}>{children}</div>
);

export const Field: React.FC<{ label: string; children: React.ReactNode }> = ({ label, children }) => (
  <div style={{ marginBottom: 12 }}>
    <label style={{ fontSize: 12, color: 'var(--muted)', fontWeight: 600, marginBottom: 6, display: 'block', textTransform: 'uppercase', letterSpacing: '.06em' }}>{label}</label>
    {children}
  </div>
);

export const Input: React.FC<React.InputHTMLAttributes<HTMLInputElement>> = (props) => (
  <input {...props} style={{
    width: '100%', border: '1px solid var(--line)', background: '#fff', borderRadius: 14,
    padding: '13px 14px', fontSize: 15, color: 'var(--ink)', outline: 'none', ...props.style,
  }} />
);

export const Textarea: React.FC<React.TextareaHTMLAttributes<HTMLTextAreaElement>> = (props) => (
  <textarea {...props} style={{
    width: '100%', border: '1px solid var(--line)', background: '#fff', borderRadius: 14,
    padding: '13px 14px', fontSize: 15, color: 'var(--ink)', outline: 'none', resize: 'none',
    fontFamily: 'inherit', ...props.style,
  }} />
);

export const formatUZS = (n: number) => `${(n / 1_000_000).toFixed(n % 1_000_000 === 0 ? 0 : 1)}M`;

export const tr = (s: string) => s;

export const WorkerCard: React.FC<{ worker: Worker; compact?: boolean }> = ({ worker, compact }) => (
  <Card>
    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
      <Link to={`/workers/${worker.id}`} style={{ display: 'flex', gap: 12, flex: 1, minWidth: 0 }}>
        {worker.specs && worker.specs.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4, flexShrink: 0 }}>
            {worker.specs.slice(0, 3).map(s => (
              <div key={s} style={{ width: 44, height: 44, borderRadius: 10, background: 'var(--blue-50)', display: 'grid', placeItems: 'center' }}>
                <SpecIcon name={s} size={36} />
              </div>
            ))}
          </div>
        )}
        <div style={{ minWidth: 0, flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <b style={{ fontSize: 14, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{worker.name}</b>
            {worker.verified && <Verified />}
          </div>
          <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 2 }}>{worker.experience}</div>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 8 }}>
            {worker.specs.map(s => (
              <span key={s} style={{ fontSize: 11, fontWeight: 600, padding: '3px 8px', borderRadius: 999, background: 'var(--blue-50)', color: 'var(--blue)' }}>{s}</span>
            ))}
          </div>
        </div>
      </Link>
      <div style={{ textAlign: 'right', flexShrink: 0 }}>
        <div style={{ fontWeight: 700, fontSize: 13 }}>{(worker.rating || 0).toFixed(1)} <span style={{ color: 'var(--amber)' }}>★</span></div>
        <div style={{ fontSize: 11, color: 'var(--muted)' }}>📍 {worker.city}</div>
      </div>
    </div>
    {!compact && (
      <>
        <div style={{ height: 1, background: 'var(--line)', margin: '14px 0' }} />
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
          {worker.top ? <Badge tone="amber">⭐ Top ishchi</Badge> : worker.active === 'now' ? <Badge tone="green">● Hozir onlayn</Badge> : <Badge>Tasdiqlangan</Badge>}
          <div style={{ display: 'flex', gap: 6 }}>
            {worker.phone && (
              <a href={`tel:${worker.phone}`} onClick={e => e.stopPropagation()} style={{ textDecoration: 'none' }}>
                <Btn variant="soft" style={{ padding: '8px 12px', fontSize: 13 }}>📞 Qo‘ng‘iroq</Btn>
              </a>
            )}
            {((worker as any).telegram || worker.phone) && (
              <a href={(worker as any).telegram ? `https://t.me/${String((worker as any).telegram).replace(/^@/, '')}` : `https://t.me/+${String(worker.phone).replace(/\D/g, '')}`} target="_blank" rel="noreferrer" onClick={e => e.stopPropagation()} style={{ textDecoration: 'none' }}>
                <Btn style={{ padding: '8px 12px', fontSize: 13 }}>✈</Btn>
              </a>
            )}
          </div>
        </div>
      </>
    )}
  </Card>
);

export const JobCard: React.FC<{ job: Job }> = ({ job }) => (
  <Card>
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
      <Link to={`/jobs/${job.id}`} style={{ flex: 1, display: 'flex', gap: 12 }}>
        {job.specs && job.specs.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4, flexShrink: 0 }}>
            {job.specs.slice(0, 3).map(s => (
              <div key={s} style={{ width: 44, height: 44, borderRadius: 10, background: 'var(--blue-50)', display: 'grid', placeItems: 'center' }}>
                <SpecIcon name={s} size={36} />
              </div>
            ))}
          </div>
        )}
        <div style={{ minWidth: 0, flex: 1 }}>
          <div style={{ fontWeight: 700, fontSize: 15, lineHeight: 1.3 }}>{job.title}</div>
          <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 2 }}>{job.company} · {job.type}</div>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 8 }}>
            {(job.specs || []).map(s => (
              <span key={s} style={{ fontSize: 11, fontWeight: 600, padding: '3px 8px', borderRadius: 999, background: 'var(--blue-50)', color: 'var(--blue)' }}>{s}</span>
            ))}
          </div>
        </div>
      </Link>
      {job.badge && <Badge tone={job.badge === 'New' ? 'green' : job.badge === 'Top' ? 'amber' : job.badge === 'Urgent' ? 'amber' : 'blue'}>{({ New: 'Yangi', Top: '⭐ Eng yaxshi', Verified: 'Tasdiqlangan', Urgent: 'Shoshilinch' } as const)[job.badge]}</Badge>}
    </div>
    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 10 }}>
      <Chip soft>{job.workType}</Chip>
      <Chip soft>📍 {job.district}</Chip>
      {job.experience && <Chip soft>{job.experience}</Chip>}
    </div>
    <div style={{ height: 1, background: 'var(--line)', margin: '14px 0' }} />
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
      <div style={{ fontWeight: 800, fontSize: 16 }}>
        {formatUZS(job.salaryFrom)}–{formatUZS(job.salaryTo)} <span style={{ color: 'var(--muted)', fontWeight: 500, fontSize: 12 }}>so‘m / oy</span>
      </div>
      <Btn style={{ padding: '9px 16px', fontSize: 13 }}>Tezkor ariza</Btn>
    </div>
  </Card>
);

export const EmptyState: React.FC<{ icon: string; title: string; sub: string; ctaLabel?: string; onCta?: () => void }> = ({ icon, title, sub, ctaLabel, onCta }) => (
  <div style={{ textAlign: 'center', padding: '40px 20px' }}>
    <div style={{
      width: 84, height: 84, borderRadius: 24, background: 'var(--blue-50)', color: 'var(--blue)',
      display: 'grid', placeItems: 'center', margin: '0 auto 16px', fontSize: 36,
    }}>{icon}</div>
    <div style={{ fontWeight: 800, fontSize: 18 }}>{title}</div>
    <p style={{ color: 'var(--muted)', fontSize: 14, margin: '6px 0 18px' }}>{sub}</p>
    {ctaLabel && <Btn onClick={onCta}>{ctaLabel}</Btn>}
  </div>
);
