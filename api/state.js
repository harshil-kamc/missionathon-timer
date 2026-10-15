// Public: what the projector screen shows. Cached at Vercel's edge for one
// second so any number of screens cost about one database read per second.
import { loadTimer } from '../lib/store.js';
import { publicView } from '../src/timer.js';
import { send, route } from '../lib/http.js';

export default route(async (req, res) => {
  if (req.method !== 'GET') return send(res, 405, { error: 'Method not allowed' });
  const p = await loadTimer();
  send(res, 200, { timer: publicView(p) }, { 'Cache-Control': 'public, max-age=0, s-maxage=1, stale-while-revalidate=1' });
});
