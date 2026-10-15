// Timer state and rules. The projector shows one countdown. When it reaches
// zero (or the controller opens it early) the envelope is revealed.

export function defaultTimer() {
  return {
    mode: 'duration', // 'target' = count down to a date/time; 'duration' = run for a set time
    targetAt: null,
    durationSeconds: 45 * 60,
    status: 'idle', // duration mode only: idle | running | paused
    endsAt: null,
    remainingSeconds: null,
    forceReveal: false,
    headline: 'The heist begins in',
    tagline: 'The vault is secure. Until your crew takes on the challenge.',
    envelope: { kicker: 'Mission briefing', title: 'The vault is open', body: 'Check your team dashboard for the brief.', image: null },
    updatedAt: null,
  };
}

export function clock(p, t = Date.now()) {
  let remainingMs;
  let running;
  if (p.mode === 'duration') {
    running = p.status === 'running';
    remainingMs = running ? Date.parse(p.endsAt) - t : p.status === 'paused' ? p.remainingSeconds * 1000 : p.durationSeconds * 1000;
  } else {
    running = Boolean(p.targetAt);
    remainingMs = p.targetAt ? Date.parse(p.targetAt) - t : null;
  }
  const reachedZero = running && remainingMs !== null && remainingMs <= 0;
  return { running, remainingMs: remainingMs === null ? null : Math.max(0, remainingMs), revealed: Boolean(p.forceReveal) || reachedZero };
}

// What the public projector page may see. Envelope content only after reveal.
export function publicView(p, t = Date.now()) {
  const c = clock(p, t);
  return {
    mode: p.mode,
    status: p.mode === 'duration' ? p.status : c.running ? 'running' : 'idle',
    headline: p.headline,
    tagline: p.tagline,
    targetAt: p.mode === 'target' ? p.targetAt : null,
    endsAt: p.mode === 'duration' && p.status === 'running' ? p.endsAt : null,
    remainingSeconds: c.remainingMs === null ? null : Math.ceil(c.remainingMs / 1000),
    revealed: c.revealed,
    envelope: c.revealed ? { kicker: p.envelope.kicker, title: p.envelope.title, body: p.envelope.body, image: p.envelope.image } : null,
  };
}

export class InputError extends Error {}
const need = (ok, msg) => {
  if (!ok) throw new InputError(msg);
};

// Applies an edit from the control page. Throws InputError on bad input.
export function applyEdit(p, b = {}) {
  if (b.mode !== undefined) {
    need(['target', 'duration'].includes(b.mode), 'Mode must be target or duration');
    if (b.mode !== p.mode) Object.assign(p, { mode: b.mode, status: 'idle', endsAt: null, remainingSeconds: null, forceReveal: false });
  }
  if (b.targetAt !== undefined) {
    need(b.targetAt && !Number.isNaN(Date.parse(b.targetAt)), 'Pick a valid date and time');
    p.targetAt = new Date(b.targetAt).toISOString();
    p.forceReveal = false;
  }
  if (b.durationSeconds !== undefined) {
    const s = Math.round(Number(b.durationSeconds));
    need(Number.isFinite(s) && s >= 1 && s <= 7 * 24 * 3600, 'Duration must be between 1 second and 7 days');
    p.durationSeconds = s;
    if (p.status !== 'running') Object.assign(p, { status: 'idle', remainingSeconds: null });
  }
  if (b.headline !== undefined) p.headline = String(b.headline).slice(0, 80);
  if (b.tagline !== undefined) p.tagline = String(b.tagline).slice(0, 120);
  if (b.envelope) {
    for (const k of ['kicker', 'title', 'body']) if (b.envelope[k] !== undefined) p.envelope[k] = String(b.envelope[k]).slice(0, k === 'body' ? 400 : 120);
  }
  return p;
}

// Start, pause, resume, reset, reveal (open now) and hide (back to the timer).
export function applyAction(p, action, t = Date.now()) {
  const durationOnly = ['start', 'pause', 'resume', 'reset'];
  need(!(durationOnly.includes(action) && p.mode !== 'duration'), 'Start, pause and reset are for duration mode');
  if (action === 'start') Object.assign(p, { status: 'running', endsAt: new Date(t + p.durationSeconds * 1000).toISOString(), remainingSeconds: null, forceReveal: false });
  else if (action === 'pause') {
    need(p.status === 'running', 'The timer is not running');
    Object.assign(p, { status: 'paused', remainingSeconds: Math.max(0, Math.ceil((Date.parse(p.endsAt) - t) / 1000)), endsAt: null });
  } else if (action === 'resume') {
    need(p.status === 'paused', 'The timer is not paused');
    Object.assign(p, { status: 'running', endsAt: new Date(t + p.remainingSeconds * 1000).toISOString(), remainingSeconds: null });
  } else if (action === 'reset') Object.assign(p, { status: 'idle', endsAt: null, remainingSeconds: null, forceReveal: false });
  else if (action === 'reveal') p.forceReveal = true;
  else if (action === 'hide') {
    p.forceReveal = false;
    // A finished duration timer goes back to its start; a past date needs a new date.
    if (p.mode === 'duration' && clock(p, t).revealed) Object.assign(p, { status: 'idle', endsAt: null, remainingSeconds: null });
  } else throw new InputError('Unknown action');
  return p;
}
