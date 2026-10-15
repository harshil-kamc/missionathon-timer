// Control page API (signed in only).
//   GET  → full timer state, including the sealed envelope
//   PUT  → edit timer, headline, tagline or envelope text
//   POST → { action: start | pause | resume | reset | reveal | hide }
import { loadTimer, saveTimer } from '../lib/store.js';
import { clock, applyEdit, applyAction } from '../lib/timer.js';
import { send, route, readBody, requireSignIn } from '../lib/http.js';

const view = (p) => ({ timer: p, clock: clock(p), serverTime: new Date().toISOString() });

export default route(async (req, res) => {
  if (!requireSignIn(req, res)) return;
  const p = await loadTimer();
  if (req.method === 'GET') return send(res, 200, view(p));
  if (req.method === 'PUT') {
    applyEdit(p, await readBody(req, 50_000));
    return send(res, 200, view(await saveTimer(p)));
  }
  if (req.method === 'POST') {
    const { action } = await readBody(req, 10_000);
    applyAction(p, action);
    return send(res, 200, view(await saveTimer(p)));
  }
  send(res, 405, { error: 'Method not allowed' });
});
