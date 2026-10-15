// Public: what the projector screen shows. Never includes the envelope
// contents before zero.
import { loadTimer } from '../lib/store.js';
import { publicView } from '../src/timer.js';
import { send, route } from '../lib/http.js';

export default route(async (req, res) => {
  if (req.method !== 'GET') return send(res, 405, { error: 'Method not allowed' });
  const p = await loadTimer();
  send(res, 200, { timer: publicView(p) }, { 'Cache-Control': 'no-store' });
});
