import { useEffect, useState } from 'react';
import { defaultTimer } from './timer.js';

// The timer lives in this browser only (no server). The control window and
// the projector window on the same computer share it through localStorage;
// a change in one shows up in the other straight away.
const KEY = 'missionathon-timer-state';

export function loadTimer() {
  const d = defaultTimer();
  try {
    const saved = JSON.parse(localStorage.getItem(KEY) || 'null');
    return saved ? { ...d, ...saved, envelope: { ...d.envelope, ...saved.envelope } } : d;
  } catch {
    return d;
  }
}

// Throws if the browser refuses to save (for example an image that is too big).
export function saveTimer(p) {
  const next = { ...p, updatedAt: new Date().toISOString() };
  try {
    localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    throw new Error('This browser could not save the change. If you added an image, try a smaller one.');
  }
  window.dispatchEvent(new CustomEvent('timer-saved'));
  return next;
}

// Current timer, kept up to date when the other window changes it.
export function useTimer() {
  const [p, setP] = useState(loadTimer);
  useEffect(() => {
    const refresh = () => setP(loadTimer());
    const onStorage = (e) => e.key === KEY && refresh();
    window.addEventListener('storage', onStorage);
    window.addEventListener('timer-saved', refresh);
    return () => {
      window.removeEventListener('storage', onStorage);
      window.removeEventListener('timer-saved', refresh);
    };
  }, []);
  return p;
}
