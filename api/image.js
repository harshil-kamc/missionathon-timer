// Envelope image (signed in only). POST { dataUrl } uploads or replaces it,
// DELETE removes it.
import { loadTimer, saveTimer } from '../lib/store.js';
import { clock } from '../lib/timer.js';
import { storeImage, removeImage } from '../lib/image.js';
import { send, route, readBody, requireSignIn } from '../lib/http.js';

const view = (p) => ({ timer: p, clock: clock(p), serverTime: new Date().toISOString() });

export default route(async (req, res) => {
  if (!requireSignIn(req, res)) return;
  if (req.method === 'POST') {
    const { dataUrl } = await readBody(req);
    const url = await storeImage(dataUrl);
    const p = await loadTimer();
    const old = p.envelope.image;
    p.envelope.image = url;
    await saveTimer(p);
    await removeImage(old);
    return send(res, 200, view(p));
  }
  if (req.method === 'DELETE') {
    const p = await loadTimer();
    const old = p.envelope.image;
    p.envelope.image = null;
    await saveTimer(p);
    await removeImage(old);
    return send(res, 200, view(p));
  }
  send(res, 405, { error: 'Method not allowed' });
});
