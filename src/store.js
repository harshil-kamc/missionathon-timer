import { useCallback, useEffect, useRef, useState } from 'react';
import { defaultTimer, publicView, applyEdit, applyAction } from './timer.js';
import { now, useNow, syncClock } from './time.js';

// Two ways to run:
// - ONLINE (opened from the website): the timer lives on the server. Every
//   projector screen, anywhere, follows it; only the signed-in admin changes it.
// - OFFLINE (index.html opened from disk): the timer lives in this browser and
//   the control panel drives projector windows on this computer only.
export const ONLINE = window.location.protocol !== 'file:';

const LOCAL_KEY = 'missionathon-timer-state';
const TOKEN_KEY = 'missionathon-timer-token';
const PROJECTOR_POLL_MS = 2000;
const ADMIN_POLL_MS = 4000;

/* ---------- Offline: this browser only ---------- */
function loadLocal() {
  const d = defaultTimer();
  try {
    const saved = JSON.parse(localStorage.getItem(LOCAL_KEY) || 'null');
    return saved ? { ...d, ...saved, envelope: { ...d.envelope, ...saved.envelope } } : d;
  } catch {
    return d;
  }
}

function saveLocal(p) {
  const next = { ...p, updatedAt: new Date().toISOString() };
  try {
    localStorage.setItem(LOCAL_KEY, JSON.stringify(next));
  } catch {
    throw new Error('This browser could not save the change. If you added an image, try a smaller one.');
  }
  window.dispatchEvent(new CustomEvent('timer-saved'));
  return next;
}

function useLocalTimer() {
  const [p, setP] = useState(loadLocal);
  useEffect(() => {
    const refresh = () => setP(loadLocal());
    const onStorage = (e) => e.key === LOCAL_KEY && refresh();
    window.addEventListener('storage', onStorage);
    window.addEventListener('timer-saved', refresh);
    return () => {
      window.removeEventListener('storage', onStorage);
      window.removeEventListener('timer-saved', refresh);
    };
  }, []);
  return p;
}

/* ---------- Online: requests to the server ---------- */
export function getToken() {
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

export function setToken(t) {
  try {
    if (t) localStorage.setItem(TOKEN_KEY, t);
    else localStorage.removeItem(TOKEN_KEY);
  } catch {
    /* private window */
  }
}

export class SignedOut extends Error {}

export async function api(path, { method = 'GET', body } = {}) {
  const headers = { 'Content-Type': 'application/json' };
  const token = getToken();
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(`api${path}`, { method, headers, body: body === undefined ? undefined : JSON.stringify(body), cache: 'no-store' });
  let data = {};
  try {
    data = await res.json();
  } catch {
    /* empty or non-JSON reply */
  }
  if (res.status === 401 && path !== '/login') {
    setToken(null);
    throw new SignedOut(data.error || 'Please sign in again');
  }
  if (!res.ok) throw new Error(data.error || (res.status === 413 ? 'The image is too large' : `Request failed (${res.status})`));
  return data;
}

/* ---------- Projector screen ---------- */
// Returns { view, error }: what the projector should show right now.
export function useProjector() {
  const t = useNow(250);
  const local = useLocalTimer();
  const [remote, setRemote] = useState(null);
  const [error, setError] = useState(false);

  const load = useCallback(
    () =>
      fetch('api/state', { cache: 'no-store' })
        .then((r) => (r.ok ? r.json() : Promise.reject()))
        .then((d) => {
          setRemote(d.timer);
          setError(false);
        })
        .catch(() => setError(true)),
    []
  );

  useEffect(() => {
    if (!ONLINE) return;
    syncClock();
    load();
    const iv = setInterval(load, PROJECTOR_POLL_MS);
    const clockIv = setInterval(syncClock, 5 * 60_000);
    return () => {
      clearInterval(iv);
      clearInterval(clockIv);
    };
  }, [load]);

  // At zero, ask the server straight away (and every second until it agrees)
  // so the envelope opens on time rather than at the next regular poll.
  const atZero = ONLINE && remote && !remote.revealed && remainingMs(remote, t) === 0 && (remote.mode === 'target' ? Boolean(remote.targetAt) : remote.status === 'running');
  const retry = useRef(0);
  useEffect(() => {
    if (!atZero) {
      retry.current = 0;
      return;
    }
    if (retry.current > 20) return;
    const id = setTimeout(() => {
      retry.current += 1;
      load();
    }, retry.current ? 1000 : 50);
    return () => clearTimeout(id);
  }, [atZero, remote, load]);

  if (!ONLINE) return { view: publicView(local, t), now: t, error: false };
  return { view: remote, now: t, error };
}

// Exact time left in ms for a public view.
export function remainingMs(p, t) {
  if (p.mode === 'target') return p.targetAt ? Math.max(0, Date.parse(p.targetAt) - t) : 0;
  if (p.status === 'running' && p.endsAt) return Math.max(0, Date.parse(p.endsAt) - t);
  return (p.remainingSeconds ?? 0) * 1000;
}

/* ---------- Control panel ---------- */
// The full timer (including the sealed envelope) plus functions to change it.
// Online these go to the server and need the admin sign-in.
export function useAdminTimer({ onSignedOut }) {
  const local = useLocalTimer();
  const [remote, setRemote] = useState(null);
  const [loadError, setLoadError] = useState('');

  const load = useCallback(
    () =>
      api('/admin')
        .then((d) => {
          setRemote(d.timer);
          setLoadError('');
        })
        .catch((e) => (e instanceof SignedOut ? onSignedOut(e.message) : setLoadError(e.message))),
    [onSignedOut]
  );

  useEffect(() => {
    if (!ONLINE) return;
    syncClock();
    load();
    const iv = setInterval(load, ADMIN_POLL_MS);
    return () => clearInterval(iv);
  }, [load]);

  const send = async (path, method, body) => {
    try {
      const d = await api(path, { method, body });
      setRemote(d.timer);
    } catch (e) {
      if (e instanceof SignedOut) onSignedOut(e.message);
      throw e;
    }
  };

  const ops = ONLINE
    ? {
        edit: (body) => send('/admin', 'PUT', body),
        action: (action) => send('/admin', 'POST', { action }),
        setImage: (dataUrl) => (dataUrl ? send('/image', 'POST', { dataUrl }) : send('/image', 'DELETE')),
      }
    : {
        edit: async (body) => saveLocal(applyEdit(loadLocal(), body)),
        action: async (action) => saveLocal(applyAction(loadLocal(), action, now())),
        setImage: async (dataUrl) => {
          const p = loadLocal();
          p.envelope.image = dataUrl;
          saveLocal(p);
        },
      };

  return { timer: ONLINE ? remote : local, loadError, reload: load, ...ops };
}
