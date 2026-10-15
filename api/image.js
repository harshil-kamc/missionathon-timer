// Envelope image (admin only). POST { dataUrl } adds or replaces it,
// DELETE removes it.
import { loadTimer, saveTimer } from '../lib/store.js';
import { clock } from '../src/timer.js';
import { checkImage } from '../lib/image.js';
import { send, route, readBody, requireSignIn } from '../lib/http.js';

const view = (p) => ({ timer: p, clock: clock(p), serverTime: new Date().toISOString() });

export default route(async (req, res) => {
  if (!requireSignIn(req, res)) return;
  if (req.method === 'POST' || req.method === 'DELETE') {
    const image = req.method === 'POST' ? checkImage((await readBody(req)).dataUrl) : null;
    const p = await loadTimer();
    p.envelope.image = image;
    return send(res, 200, view(await saveTimer(p)));
  }
  send(res, 405, { error: 'Method not allowed' });
});
