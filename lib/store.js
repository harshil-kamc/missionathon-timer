// The timer lives in this server's memory and is copied to data/timer.json
// after every change, so a restart picks up where it left off. No database.
import fs from 'node:fs';
import path from 'node:path';
import { defaultTimer } from '../src/timer.js';
import { ROOT } from './config.js';

const FILE = process.env.MISSIONATHON_DATA || path.join(ROOT, 'data', 'timer.json');
let current = null;
const failuresByIp = new Map();

export class StorageMissing extends Error {}

function fromDisk() {
  const d = defaultTimer();
  try {
    const saved = JSON.parse(fs.readFileSync(FILE, 'utf8'));
    return { ...d, ...saved, envelope: { ...d.envelope, ...saved.envelope } };
  } catch {
    return d;
  }
}

// Returns a copy, so a failed edit never half-changes the live timer.
export async function loadTimer() {
  current ||= fromDisk();
  return structuredClone(current);
}

export async function saveTimer(p) {
  p.updatedAt = new Date().toISOString();
  current = structuredClone(p);
  fs.mkdirSync(path.dirname(FILE), { recursive: true });
  const tmp = `${FILE}.tmp`;
  fs.writeFileSync(tmp, JSON.stringify(current));
  fs.renameSync(tmp, FILE);
  return p;
}

// Counts failed sign-ins per IP over a window. Returns the new count.
export async function countFailure(ip, windowSeconds) {
  const now = Date.now();
  const e = failuresByIp.get(ip);
  const next = e && e.until > now ? { n: e.n + 1, until: e.until } : { n: 1, until: now + windowSeconds * 1000 };
  failuresByIp.set(ip, next);
  return next.n;
}

export async function failures(ip) {
  const e = failuresByIp.get(ip);
  return e && e.until > Date.now() ? e.n : 0;
}
