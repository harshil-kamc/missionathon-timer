import { useEffect, useState } from 'react';
import { splitDuration, pad } from './time.js';
import { ONLINE, api, getToken, remainingMs, useProjector } from './store.js';
import { defaultTimer } from './timer.js';

// Projector screen. Rotating heist backdrop, logo, huge boxless countdown,
// and a sealed envelope that opens when the countdown reaches zero. Online it
// follows the admin's control panel from anywhere; opened from disk it
// follows the control panel in this browser.

const BACKGROUNDS = [
  ...Array.from({ length: 10 }, (_, i) => `projector/bg${i + 1}.jpg`),
  'projector/bg-crew.jpg',
  'projector/bg-planning-room.jpg',
  'projector/bg-mask.jpg',
];
const LOGO = 'projector/missionathon-logo.png';
const BACKGROUND_MS = 8000;

// preview: show the envelope as it will look, without changing the timer.
export default function Display({ preview }) {
  const { view: p, now, error } = useProjector();
  const previewEnvelope = usePreviewEnvelope(preview);

  if (!p) {
    return (
      <div className="pt">
        <Backdrop />
        <div className="pt-loading">{error ? 'Waiting for the Missionathon server…' : 'Synchronizing with the Missionathon server…'}</div>
      </div>
    );
  }

  const left = remainingMs(p, now);
  const envelope = previewEnvelope || (p.revealed ? p.envelope : null);
  const paused = p.mode === 'duration' && p.status === 'paused';

  return (
    <div className="pt">
      <Backdrop />
      <main className="pt-stage">
        <header className={`pt-brand ${envelope ? 'pt-brand-dim' : ''}`}>
          <img src={LOGO} alt="Missionathon" />
        </header>

        {envelope ? (
          <Envelope key={`${envelope.title}|${envelope.image ? envelope.image.length : 0}`} envelope={envelope} />
        ) : (
          <section className="pt-countdown-stage">
            {p.headline && <div className="pt-phase">{p.headline}</div>}
            <Timer ms={left} paused={paused} />
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

// #preview shows the envelope's current contents without opening it on the
// projectors. Online this needs the admin sign-in, since the public never
// gets the contents before zero.
function usePreviewEnvelope(preview) {
  const [env, setEnv] = useState(null);
  useEffect(() => {
    if (!preview) return setEnv(null);
    if (!ONLINE) {
      try {
        setEnv(JSON.parse(localStorage.getItem('missionathon-timer-state') || 'null')?.envelope || defaultTimer().envelope);
      } catch {
        /* nothing saved yet */
      }
      return;
    }
    if (!getToken()) return;
    api('/admin')
      .then(({ timer }) => setEnv(timer.envelope))
      .catch(() => {});
  }, [preview]);
  return env;
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
              <div className="pt-card-media" style={{ backgroundImage: 'url("projector/bg3.jpg")' }} />
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
