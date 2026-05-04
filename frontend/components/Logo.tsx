import React from 'react';

export const Logo: React.FC<{ size?: number }> = ({ size = 28 }) => (
  <span style={{
    display: 'inline-flex', alignItems: 'baseline', fontFamily: 'inherit',
    fontWeight: 800, fontSize: size, lineHeight: 1, letterSpacing: '-0.02em',
  }}>
    <span style={{ color: 'var(--ink)' }}>Rom</span>
    <span style={{
      color: '#fff', background: 'var(--blue)',
      padding: `${size * 0.08}px ${size * 0.18}px`,
      borderRadius: size * 0.22, marginLeft: size * 0.04,
      lineHeight: 1, position: 'relative',
    }}>
      chi
      <span style={{
        position: 'absolute',
        top: -size * 0.18, right: size * 0.18,
        width: size * 0.14, height: size * 0.14,
        borderRadius: '50%', background: 'var(--blue)',
      }} />
    </span>
  </span>
);
