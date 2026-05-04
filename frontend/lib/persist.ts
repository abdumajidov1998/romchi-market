'use client';
import React from 'react';

// Filter state'ni localStorage'da saqlaydi — sahifaga qaytganda yo'qolmasin.
export function usePersistedState<T>(key: string, initial: T): [T, React.Dispatch<React.SetStateAction<T>>] {
  const [state, setState] = React.useState<T>(() => {
    if (typeof window === 'undefined') return initial;
    try {
      const v = localStorage.getItem(key);
      if (v == null) return initial;
      return JSON.parse(v);
    } catch { return initial; }
  });
  React.useEffect(() => {
    try { localStorage.setItem(key, JSON.stringify(state)); } catch {}
  }, [key, state]);
  return [state, setState];
}
