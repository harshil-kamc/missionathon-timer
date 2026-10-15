// Control-page sign-in with the shared password. Ten wrong tries from one
// address locks that address out for 15 minutes.
import { countFailure, failures } from '../lib/store.js';
import { send, route, readBody, clientIp, checkPassword, issueToken, passwordConfigured } from '../lib/http.js';

const MAX_FAILS = 10;
const WINDOW_SECONDS = 15 * 60;

export default route(async (req, res) => {
  if (req.method !== 'POST') return send(res, 405, { error: 'Method not allowed' });
  if (!passwordConfigured()) return send(res, 503, { error: 'No control password is set. Add CONTROL_PASSWORD (8+ characters) in Vercel → Settings → Environment Variables, then redeploy.' });
  const ip = clientIp(req);
  if ((await failures(ip)) >= MAX_FAILS) return send(res, 429, { error: 'Too many wrong passwords. Try again in 15 minutes.' });
  const { password } = await readBody(req, 10_000);
  if (!checkPassword(password)) {
    await countFailure(ip, WINDOW_SECONDS);
    return send(res, 401, { error: 'Wrong password' });
  }
  send(res, 200, { token: issueToken() });
});
