import { useCallback, useEffect, useRef, useState } from 'react';
import { useServerNow, splitDuration, remainingMs, pad } from './time.js';
import { api, getToken } from './api.js';

// Projector screen (public, no sign-in). Rotating heist backdrop, logo, huge
// boxless countdown, and a sealed envelope that opens only when the countdown
// reaches zero. The envelope's contents come from the server only then.

const BACKGROUNDS = [
  ...Array.from({ length: 10 }, (_, i) => `/projector/bg${i + 1}.jpg`),
  '/projector/bg-crew.jpg',
  '/projector/bg-planning-room.jpg',
  '/projector/bg-mask.jpg',
];
const LOGO = '/projector/missionathon-logo.png';
const BACKGROUND_MS = 8000;
const POLL_MS = 3000;

export default function Display() {
  const [p, setP] = useState(null);
  const [err, setErr] = useState(false);
  const now = useServerNow(250);
  const preview = usePreviewEnvelope();

  const load = useCallback(
    () =>
      fetch('/api/state')
        .then((r) => (r.ok ? r.json() : Promise.reject()))
        .then((d) => {
          setP(d.timer);
          setErr(false);
        })
        .catch(() => setErr(true)),
    []
  );

  useEffect(() => {
    load();
    const iv = setInterval(load, POLL_MS);
    return () => clearInterval(iv);
  }, [load]);

  // At zero, ask the server straight away (and every second until it agrees)
  // so the envelope opens on time rather than at the next regular poll.
  const left = p ? remainingMs(p, now) : null;
  const atZero = p && !p.revealed && left === 0 && (p.mode === 'target' ? Boolean(p.targetAt) : p.status === 'running');
  const retry = useRef(0);
  useEffect(() => {
    if (!atZero) {
      retry.current = 0;
      return;
    }
    if (retry.current > 20) return;
    const t = setTimeout(() => {
      retry.current += 1;
      load();
    }, retry.current ? 1000 : 50);
    return () => clearTimeout(t);
  }, [atZero, p, load]);

  if (!p) {
    return (
      <div className="pt">
        <Backdrop />
        <div className="pt-loading">{err ? 'Waiting for the Missionathon server…' : 'Synchronizing with the Missionathon server…'}</div>
      </div>
    );
  }

  const envelope = preview || (p.revealed ? p.envelope : null);
  const paused = p.mode === 'duration' && p.status === 'paused';

  return (
    <div className="pt">
      <Backdrop />
      <main className="pt-stage">
        <header className={`pt-brand ${envelope ? 'pt-brand-dim' : ''}`}>
          <img src={LOGO} alt="Missionathon" />
        </header>

        {envelope ? (
          <Envelope key={`${envelope.title}|${envelope.image}`} envelope={envelope} />
        ) : (
          <section className="pt-countdown-stage">
            {p.headline && <div className="pt-phase">{p.headline}</div>}
            <Timer ms={left ?? 0} paused={paused} />
            {paused && <div className="pt-alert">Timer paused</div>}
          </section>
        )}

        <footer className="pt-foot">
          <span className="pt-clock">
            <i /> {new Date(now).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
          </span>
          {p.tagline && <span className="pt-tagline">{p.tagline}</span>}
        </footer>
      </main>
    </div>
  );
}

// Crossfading full-screen backdrop with a warm red tint.
function Backdrop() {
  const [i, setI] = useState(0);
  useEffect(() => {
    const iv = setInterval(() => setI((x) => (x + 1) % BACKGROUNDS.length), BACKGROUND_MS);
    return () => clearInterval(iv);
  }, []);
  useEffect(() => {
    const img = new Image();
    img.src = BACKGROUNDS[(i + 1) % BACKGROUNDS.length];
  }, [i]);
  return (
    <div className="pt-bg" aria-hidden>
      {BACKGROUNDS.map((src, k) => (
        <div key={src} className={`pt-bg-image ${k === i ? 'on' : ''}`} style={{ backgroundImage: `url("${src}")` }} />
      ))}
      <div className="pt-bg-tint" />
    </div>
  );
}

// /?preview lets a signed-in controller rehearse the envelope with its
// current contents before zero (the public never gets them early).
function usePreviewEnvelope() {
  const [env, setEnv] = useState(null);
  useEffect(() => {
    if (!new URLSearchParams(window.location.search).has('preview') || !getToken()) return;
    api('/admin')
      .then(({ timer }) => setEnv(timer.envelope))
      .catch(() => {});
  }, []);
  return env;
}

// Boxless digits with their labels at the lower right.
function Timer({ ms, paused }) {
  const { d, h, m, s } = splitDuration(Math.max(0, ms));
  const groups = [...(d > 0 ? [[d, d === 1 ? 'DAY' : 'DAYS']] : []), [h, 'HR'], [m, 'MIN'], [s, 'SEC']];
  return (
    <div className={`pt-timer ${ms <= 0 ? 'pt-timer-complete' : ''} ${paused ? 'pt-timer-paused' : ''}`} role="timer" aria-label={groups.map(([v, l]) => `${v} ${l}`).join(', ')}>
      {groups.map(([v, l]) => (
        <div key={l} className="pt-group">
          <span className="pt-digits">{pad(v)}</span>
          <span className="pt-label">{l}</span>
        </div>
      ))}
    </div>
  );
}

// Sealed envelope: the flap opens, the dossier card rises and zooms forward.
// Shows the uploaded image (never cropped) and/or the controller's text.
function Envelope({ envelope }) {
  const hasText = Boolean(envelope.kicker || envelope.title || envelope.body);
  return (
    <section className="pt-envelope-stage" aria-live="polite">
      <div className="pt-envelope">
        <div className="pt-env-back">
          <div className="pt-env-pattern" />
        </div>
        <div className="pt-env-flap">
          <div className="pt-env-flap-body" />
          <div className="pt-env-flap-inner" />
        </div>
        <div className={`pt-card ${envelope.image ? 'pt-card-has-image' : ''}`}>
          <div className="pt-card-frame">
            {envelope.image ? (
              <div className="pt-card-image">
                <img src={envelope.image} alt={envelope.title || 'Mission reveal'} />
              </div>
            ) : (
              <div className="pt-card-media" style={{ backgroundImage: 'url("/projector/bg3.jpg")' }} />
            )}
            {hasText && (
              <div className="pt-card-content">
                {!envelope.image && <span className="pt-card-stamp">Declassified</span>}
                {envelope.kicker && <div className="pt-card-kicker">{envelope.kicker}</div>}
                {envelope.title && <h2 className="pt-card-title">{envelope.title}</h2>}
                {envelope.body && <p className="pt-card-body">{envelope.body}</p>}
              </div>
            )}
          </div>
        </div>
        <div className="pt-env-pocket">
          <div className="pt-env-pocket-left" />
          <div className="pt-env-pocket-right" />
          <div className="pt-env-pocket-base" />
        </div>
      </div>
    </section>
  );
}
