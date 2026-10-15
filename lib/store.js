// Where the timer state lives. On Vercel: Upstash Redis (connected from the
// Vercel dashboard, which adds the KV_REST_API_* variables). On this PC
// without Redis: a JSON file in .data/ so local testing needs no account.
import fs from 'node:fs';
import path from 'node:path';
import { Redis } from '@upstash/redis';
import { defaultTimer } from '../src/timer.js';

const KEY = 'missionathon:timer';
const url = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
const token = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;
const redis = url && token ? new Redis({ url, token }) : null;

const LOCAL_FILE = path.join(process.cwd(), '.data', 'timer.json');
const localCounters = new Map();

export class StorageMissing extends Error {}

function local() {
  if (process.env.VERCEL) throw new StorageMissing('Storage is not connected. Add Upstash Redis to this project in Vercel → Storage.');
}

export async function loadTimer() {
  let saved;
  if (redis) saved = await redis.get(KEY);
  else {
    local();
    saved = fs.existsSync(LOCAL_FILE) ? JSON.parse(fs.readFileSync(LOCAL_FILE, 'utf8')) : null;
  }
  // Fill in any fields added after the state was first saved.
  const d = defaultTimer();
  return saved ? { ...d, ...saved, envelope: { ...d.envelope, ...saved.envelope } } : d;
}

export async function saveTimer(p) {
  p.updatedAt = new Date().toISOString();
  if (redis) await redis.set(KEY, p);
  else {
    local();
    fs.mkdirSync(path.dirname(LOCAL_FILE), { recursive: true });
    fs.writeFileSync(LOCAL_FILE, JSON.stringify(p, null, 2));
  }
  return p;
}

// Counts failed sign-ins per IP over a window. Returns the new count.
export async function countFailure(ip, windowSeconds) {
  const key = `missionathon:fail:${ip}`;
  if (redis) {
    const n = await redis.incr(key);
    if (n === 1) await redis.expire(key, windowSeconds);
    return n;
  }
  const now = Date.now();
  const e = localCounters.get(key);
  const next = e && e.until > now ? { n: e.n + 1, until: e.until } : { n: 1, until: now + windowSeconds * 1000 };
  localCounters.set(key, next);
  return next.n;
}

export async function failures(ip) {
  const key = `missionathon:fail:${ip}`;
  if (redis) return Number((await redis.get(key)) || 0);
  const e = localCounters.get(key);
  return e && e.until > Date.now() ? e.n : 0;
}
