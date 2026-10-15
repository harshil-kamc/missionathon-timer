import { useCallback, useEffect, useState } from 'react';
import { useNow, formatClock, fmtDateTime, toLocalInput, fromLocalInput } from './time.js';
import { ONLINE, api, getToken, setToken, useAdminTimer, SignedOut } from './store.js';
import { clock } from './timer.js';

// Control panel (#control). Online: admin sign-in, and every projector screen
// opened from the website follows it. Opened from disk: no sign-in, and it
// drives projector windows in this browser only.

const MAX_IMAGE_SIDE = 1920;

export default function Control() {
  const [signedIn, setSignedIn] = useState(!ONLINE || Boolean(getToken()));
  const [toasts, setToasts] = useState([]);
  const toast = useCallback((text, tone = 'ok') => {
    const id = Math.random();
    setToasts((t) => [...t, { id, text, tone }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 4000);
  }, []);
  const signOut = useCallback(
    (msg) => {
      setToken(null);
      setSignedIn(false);
      if (msg) toast(msg, 'error');
    },
    [toast]
  );

  return (
    <div className="ctl">
      <header className="ctl-top">
        <img src="projector/missionathon-logo.png" alt="Missionathon" className="ctl-logo" />
        <div className="ctl-top-right">
          <span className="kicker">{ONLINE ? 'Admin control' : 'Projector control · offline'}</span>
          {ONLINE && signedIn && (
            <button type="button" className="btn btn-sm btn-ghost" onClick={() => signOut()}>
              Sign out
            </button>
          )}
        </div>
      </header>
      <main className="ctl-main">{signedIn ? <Panel toast={toast} signOut={signOut} /> : <SignIn onDone={() => setSignedIn(true)} />}</main>
      <div className="toasts" role="status">
        {toasts.map((t) => (
          <div key={t.id} className={`toast ${t.tone === 'error' ? 'toast-error' : ''}`}>
            {t.text}
          </div>
        ))}
      </div>
    </div>
  );
}

function SignIn({ onDone }) {
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      const { token } = await api('/login', { method: 'POST', body: { password } });
      setToken(token);
      onDone();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <form className="panel ctl-signin" onSubmit={submit}>
      <div className="kicker">Restricted access</div>
      <h1 className="panel-title">Admin sign-in</h1>
      <p className="muted">Enter the admin password to control every Missionathon timer screen.</p>
      <label className="field">
        <span className="field-label">Password</span>
        <input type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} autoFocus />
      </label>
      {error && <p className="field-msg">{error}</p>}
      <button className="btn btn-primary btn-block" disabled={busy || !password}>
        {busy ? 'Checking…' : 'Enter the vault'}
      </button>
      <a className="ctl-link" href="#">
        Open the projector screen →
      </a>
    </form>
  );
}

function Panel({ toast, signOut }) {
  const { timer: p, loadError, reload, ...ops } = useAdminTimer({ onSignedOut: signOut });
  const now = useNow(250);

  // Runs a change and reports the result.
  const run = useCallback(
    async (fn, msg) => {
      try {
        await fn();
        if (msg) toast(msg);
        return true;
      } catch (e) {
        if (!(e instanceof SignedOut)) toast(e.message, 'error');
        return false;
      }
    },
    [toast]
  );

  if (!p) {
    return loadError ? (
      <div className="panel">
        <p className="note note-red">{loadError}</p>
        <button type="button" className="btn" onClick={reload}>
          Try again
        </button>
      </div>
    ) : (
      <div className="panel muted">Loading…</div>
    );
  }

  const c = clock(p, now);
  const left = c.remainingMs ?? 0;
  const open = c.revealed;
  const control = (action, msg) => run(() => ops.action(action), msg);
  const state = open ? ['Envelope open', 'green'] : p.mode === 'duration' ? { idle: ['Not started', 'muted'], running: ['Counting down', 'blue'], paused: ['Paused', 'amber'] }[p.status] : p.targetAt ? ['Counting down', 'blue'] : ['No time set', 'muted'];

  return (
    <div className="stack-lg">
      {loadError && <p className="note note-amber">Connection problem: {loadError}. Retrying…</p>}
      <p className="note">
        {ONLINE
          ? 'Every projector screen opened from this website follows these controls, on any device. Open it on the projector and press F11 for full screen.'
          : 'Offline mode: this panel controls projector windows in this browser on this computer only. Drag the projector window to the projector and press F11.'}
      </p>
      <section className="panel">
        <div className="panel-head">
          <div>
            <div className="kicker">Live on the projector</div>
            <h2 className="panel-title">{open ? 'Envelope is open' : 'Countdown'}</h2>
          </div>
          <div className="panel-actions">
            <a className="btn btn-sm btn-ghost" href="#" target="_blank" rel="noopener">
              Open projector ↗
            </a>
            <a className="btn btn-sm btn-ghost" href="#preview" target="_blank" rel="noopener">
              Preview envelope ↗
            </a>
          </div>
        </div>
        <div className="proj-live">
          <div className={`proj-clock ${open ? 'is-open' : ''}`}>{formatClock(left)}</div>
          <span className={`badge badge-${state[1]}`}>{state[0]}</span>
        </div>
        <p className="muted small">
          {p.mode === 'target' ? (p.targetAt ? `Counts down to ${fmtDateTime(p.targetAt)}.` : 'Set the time below.') : `Runs for ${formatClock(p.durationSeconds * 1000)} once started.`} The envelope opens by itself at 00:00:00.
        </p>
        <div className="row wrap">
          {p.mode === 'duration' && !open && (
            <>
              {p.status === 'idle' && (
                <button type="button" className="btn btn-primary" onClick={() => control('start', 'Timer started')}>
                  Start
                </button>
              )}
              {p.status === 'running' && (
                <button type="button" className="btn" onClick={() => control('pause', 'Timer paused')}>
                  Pause
                </button>
              )}
              {p.status === 'paused' && (
                <button type="button" className="btn btn-primary" onClick={() => control('resume', 'Timer resumed')}>
                  Resume
                </button>
              )}
              {p.status !== 'idle' && (
                <button type="button" className="btn btn-ghost" onClick={() => window.confirm('Reset the timer to its full duration?') && control('reset', 'Timer reset')}>
                  Reset
                </button>
              )}
            </>
          )}
          {open ? (
            <button type="button" className="btn" onClick={() => control('hide', 'Back to the countdown')}>
              Back to the timer
            </button>
          ) : (
            <button type="button" className="btn btn-danger-ghost" onClick={() => window.confirm('Open the envelope on the projector now, before the countdown ends?') && control('reveal', 'Envelope opened')}>
              Open envelope now…
            </button>
          )}
        </div>
        {open && p.mode === 'target' && Date.parse(p.targetAt) <= now && <p className="note note-amber mt">The countdown time has passed. To show the timer again, set a new time below.</p>}
      </section>

      <TimerSettings p={p} run={run} ops={ops} />
      <EnvelopeSettings p={p} run={run} ops={ops} toast={toast} />
    </div>
  );
}

function TimerSettings({ p, run, ops }) {
  const [mode, setMode] = useState(p.mode);
  const [target, setTarget] = useState(toLocalInput(p.targetAt));
  const [dur, setDur] = useState(() => splitHms(p.durationSeconds));
  const [headline, setHeadline] = useState(p.headline);
  const [tagline, setTagline] = useState(p.tagline);
  useEffect(() => setMode(p.mode), [p.mode]);

  const seconds = Number(dur.h || 0) * 3600 + Number(dur.m || 0) * 60 + Number(dur.s || 0);
  function save() {
    const body = { mode, headline, tagline, ...(mode === 'target' ? { targetAt: fromLocalInput(target) } : { durationSeconds: seconds }) };
    run(() => ops.edit(body), 'Timer saved');
  }

  return (
    <section className="panel">
      <div className="kicker">Step 1</div>
      <h2 className="panel-title mb">Timer</h2>
      <div className="segmented" role="radiogroup" aria-label="Timer type">
        <button type="button" role="radio" aria-checked={mode === 'duration'} className={mode === 'duration' ? 'on' : ''} onClick={() => setMode('duration')}>
          Run for a set duration
        </button>
        <button type="button" role="radio" aria-checked={mode === 'target'} className={mode === 'target' ? 'on' : ''} onClick={() => setMode('target')}>
          Count down to a time
        </button>
      </div>

      <div className="form-grid">
        {mode === 'target' ? (
          <label className="field">
            <span className="field-label">Envelope opens at</span>
            <input type="datetime-local" value={target} onChange={(e) => setTarget(e.target.value)} />
            <span className="field-hint">In this device's time zone.</span>
          </label>
        ) : (
          <div className="field">
            <span className="field-label">Duration (hours : minutes : seconds)</span>
            <div className="hms">
              {['h', 'm', 's'].map((k) => (
                <input key={k} type="number" min="0" max={k === 'h' ? 168 : 59} aria-label={{ h: 'Hours', m: 'Minutes', s: 'Seconds' }[k]} value={dur[k]} onChange={(e) => setDur({ ...dur, [k]: e.target.value })} />
              ))}
            </div>
            <span className="field-hint">Save, then press Start above.</span>
          </div>
        )}
        <label className="field">
          <span className="field-label">Headline above the timer</span>
          <input value={headline} maxLength={80} onChange={(e) => setHeadline(e.target.value)} />
          <span className="field-hint">e.g. The heist begins in · Mission 2 unlocks in</span>
        </label>
        <label className="field field-wide">
          <span className="field-label">Line at the bottom of the screen</span>
          <input value={tagline} maxLength={120} onChange={(e) => setTagline(e.target.value)} />
        </label>
      </div>
      <button type="button" className="btn btn-primary" disabled={(mode === 'duration' && seconds < 1) || (mode === 'target' && !target)} onClick={save}>
        Save timer
      </button>
      {mode !== p.mode && <p className="muted small mt-sm">Save to switch the projector to this timer type.</p>}
    </section>
  );
}

function EnvelopeSettings({ p, run, ops, toast }) {
  const [env, setEnv] = useState({ kicker: p.envelope.kicker, title: p.envelope.title, body: p.envelope.body });
  const [busy, setBusy] = useState(false);

  async function upload(file) {
    if (!file) return;
    if (!/^image\/(png|jpeg|webp)$/.test(file.type)) return toast('Choose a PNG, JPEG or WebP image', 'error');
    setBusy(true);
    try {
      const dataUrl = await shrinkImage(file);
      await run(() => ops.setImage(dataUrl), 'Image added');
    } catch (e) {
      toast(e.message, 'error');
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="panel">
      <div className="kicker">Step 2 · shown when the envelope opens</div>
      <h2 className="panel-title mb">Inside the envelope</h2>
      <div className="form-grid one">
        <label className="field">
          <span className="field-label">Small label</span>
          <input value={env.kicker} maxLength={120} onChange={(e) => setEnv({ ...env, kicker: e.target.value })} />
          <span className="field-hint">e.g. Mission 02 · Classified briefing</span>
        </label>
        <label className="field">
          <span className="field-label">Title</span>
          <input value={env.title} maxLength={120} onChange={(e) => setEnv({ ...env, title: e.target.value })} />
        </label>
        <label className="field">
          <span className="field-label">Message</span>
          <textarea rows={3} maxLength={400} value={env.body} onChange={(e) => setEnv({ ...env, body: e.target.value })} />
        </label>
      </div>
      <button type="button" className="btn btn-primary" onClick={() => run(() => ops.edit({ envelope: env }), 'Envelope saved')}>
        Save envelope text
      </button>

      <div className="divider" />
      <div className="kicker">Image (optional)</div>
      <p className="muted small">A designed mission card or poster shown whole inside the envelope. PNG, JPEG or WebP. Large images are shrunk automatically. Leave the text empty to show only the image.</p>
      {p.envelope.image && (
        <div className="proj-image-preview">
          <img src={p.envelope.image} alt="Envelope image" />
        </div>
      )}
      <div className="row wrap">
        <label className={`btn btn-sm ${busy ? 'btn-disabled' : ''}`}>
          {busy ? 'Adding…' : p.envelope.image ? 'Replace image' : 'Add image'}
          <input type="file" accept="image/png,image/jpeg,image/webp" hidden disabled={busy} onChange={(e) => (upload(e.target.files[0]), (e.target.value = ''))} />
        </label>
        {p.envelope.image && (
          <button type="button" className="btn btn-sm btn-danger-ghost" onClick={() => window.confirm('Remove the envelope image?') && run(() => ops.setImage(null), 'Image removed')}>
            Remove image
          </button>
        )}
      </div>
    </section>
  );
}

// Fits the image within 1920px and compresses it so it can be saved in the
// browser (which allows only a few MB).
async function shrinkImage(file) {
  const src = URL.createObjectURL(file);
  try {
    const img = await new Promise((resolve, reject) => {
      const i = new Image();
      i.onload = () => resolve(i);
      i.onerror = () => reject(new Error('That file is not a valid image'));
      i.src = src;
    });
    const scale = Math.min(1, MAX_IMAGE_SIDE / Math.max(img.naturalWidth, img.naturalHeight));
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(img.naturalWidth * scale);
    canvas.height = Math.round(img.naturalHeight * scale);
    canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);
    // WebP keeps transparency; JPEG is the fallback for browsers without it.
    const webp = canvas.toDataURL('image/webp', 0.88);
    return webp.startsWith('data:image/webp') ? webp : canvas.toDataURL('image/jpeg', 0.88);
  } finally {
    URL.revokeObjectURL(src);
  }
}

function splitHms(total) {
  return { h: Math.floor(total / 3600), m: Math.floor((total % 3600) / 60), s: total % 60 };
}
