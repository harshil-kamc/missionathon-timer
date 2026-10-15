// Control-page requests. The sign-in token is kept in this browser only.
const KEY = 'missionathon-timer-token';

export function getToken() {
  try {
    return localStorage.getItem(KEY);
  } catch {
    return null;
  }
}

export function setToken(t) {
  try {
    if (t) localStorage.setItem(KEY, t);
    else localStorage.removeItem(KEY);
  } catch {
    /* private window: stays signed in until the tab closes */
  }
}

export class SignedOut extends Error {}

export async function api(path, { method = 'GET', body } = {}) {
  const headers = { 'Content-Type': 'application/json' };
  const token = getToken();
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(`/api${path}`, { method, headers, body: body === undefined ? undefined : JSON.stringify(body), cache: 'no-store' });
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
