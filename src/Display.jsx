import { useEffect, useState } from 'react';
import { useNow, splitDuration, pad } from './time.js';
import { useTimer } from './store.js';
import { publicView } from './timer.js';

// Projector screen. Rotating heist backdrop, logo, huge boxless countdown,
// and a sealed envelope that opens when the countdown reaches zero. Everything
// runs in this browser; the control panel (#control) in another window of the
// same browser drives it.

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
  const timer = useTimer();
  const now = useNow(250);
  const p = publicView(timer, now);
  const left = p.remainingSeconds === null ? 0 : remainingMs(p, now);
  const envelope = preview ? timer.envelope : p.envelope;
  const paused = p.mode === 'duration' && p.status === 'paused';
  const noTime = p.mode === 'target' && !p.targetAt;

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
            {noTime && <div className="pt-alert">Set the time in the control panel</div>}
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

// Exact time left in ms (publicView rounds to whole seconds).
function remainingMs(p, now) {
  if (p.mode === 'target') return Math.max(0, Date.parse(p.targetAt) - now);
  if (p.status === 'running') return Math.max(0, Date.parse(p.endsAt) - now);
  return p.remainingSeconds * 1000;
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
