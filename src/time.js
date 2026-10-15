import { useEffect, useState } from 'react';

// Uses this computer's clock (no server). Make sure the projector laptop's
// time is set automatically.
export function useNow(intervalMs = 1000) {
  const [t, setT] = useState(Date.now());
  useEffect(() => {
    const iv = setInterval(() => setT(Date.now()), intervalMs);
    return () => clearInterval(iv);
  }, [intervalMs]);
  return t;
}

export function splitDuration(ms) {
  const s = Math.max(0, Math.floor(ms / 1000));
  return { d: Math.floor(s / 86400), h: Math.floor((s % 86400) / 3600), m: Math.floor((s % 3600) / 60), s: s % 60 };
}

export const pad = (n) => String(n).padStart(2, '0');

export function formatClock(ms) {
  const { d, h, m, s } = splitDuration(Math.max(0, ms));
  return `${d ? `${d}d ` : ''}${pad(h)}:${pad(m)}:${pad(s)}`;
}

export function fmtDateTime(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleString(undefined, { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
}

// Value for <input type="datetime-local"> in this computer's timezone.
export function toLocalInput(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
}

export const fromLocalInput = (v) => (v ? new Date(v).toISOString() : null);
