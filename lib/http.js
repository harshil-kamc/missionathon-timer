// Small helpers so the same route files run on Vercel and on the local dev
// server, plus the control-page sign-in check.
import crypto from 'node:crypto';
import { InputError } from './timer.js';
import { StorageMissing } from './store.js';

export function send(res, status, body, headers = {}) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  if (!headers['Cache-Control']) res.setHeader('Cache-Control', 'no-store');
  for (const [k, v] of Object.entries(headers)) res.setHeader(k, v);
  res.end(JSON.stringify(body));
}

// Vercel parses JSON bodies already; the local server leaves the raw stream.
export async function readBody(req, limit = 4.4 * 1024 * 1024) {
  if (req.body !== undefined && typeof req.body !== 'string') return req.body || {};
  if (typeof req.body === 'string') return JSON.parse(req.body || '{}');
  const chunks = [];
  let size = 0;
  for await (const c of req) {
    size += c.length;
    if (size > limit) throw new InputError('The request is too large');
    chunks.push(c);
  }
  const text = Buffer.concat(chunks).toString('utf8');
  try {
    return text ? JSON.parse(text) : {};
  } catch {
    throw new InputError('Invalid request');
  }
}

export function clientIp(req) {
  return String(req.headers['x-forwarded-for'] || req.socket?.remoteAddress || 'unknown').split(',')[0].trim();
}

// Wraps a route: turns known errors into clear messages.
export function route(handler) {
  return async (req, res) => {
    try {
      await handler(req, res);
    } catch (e) {
      if (e instanceof InputError) return send(res, 400, { error: e.message });
      if (e instanceof StorageMissing) return send(res, 503, { error: e.message });
      console.error(e);
      send(res, 500, { error: 'Something went wrong on the server' });
    }
  };
}

/* ---------- Control-page sign-in ----------
   One shared password (CONTROL_PASSWORD in Vercel's environment variables).
   Sign-in returns a signed token valid for 12 hours. Changing the password
   signs everyone out, because the signing key is derived from it. */
const TOKEN_HOURS = 12;

const password = () => process.env.CONTROL_PASSWORD || '';
const signingKey = () => crypto.createHash('sha256').update(`missionathon-timer:${password()}`).digest();
const sign = (data) => crypto.createHmac('sha256', signingKey()).update(data).digest('base64url');

export const passwordConfigured = () => password().length >= 8;

export function checkPassword(given) {
  const a = crypto.createHash('sha256').update(String(given || '')).digest();
  const b = crypto.createHash('sha256').update(password()).digest();
  return passwordConfigured() && crypto.timingSafeEqual(a, b);
}

export function issueToken() {
  const data = Buffer.from(JSON.stringify({ exp: Date.now() + TOKEN_HOURS * 3600_000 })).toString('base64url');
  return `${data}.${sign(data)}`;
}

export function signedIn(req) {
  if (!passwordConfigured()) return false;
  const m = /^Bearer ([\w-]+)\.([\w-]+)$/.exec(req.headers.authorization || '');
  if (!m) return false;
  const expected = Buffer.from(sign(m[1]));
  const given = Buffer.from(m[2]);
  if (expected.length !== given.length || !crypto.timingSafeEqual(expected, given)) return false;
  try {
    return JSON.parse(Buffer.from(m[1], 'base64url').toString()).exp > Date.now();
  } catch {
    return false;
  }
}

export function requireSignIn(req, res) {
  if (signedIn(req)) return true;
  send(res, 401, { error: 'Please sign in again' });
  return false;
}
