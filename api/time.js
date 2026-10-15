// Public: the server clock, never cached, so every screen counts down in step
// even if its own clock is wrong.
import { send } from '../lib/http.js';

export default function handler(req, res) {
  send(res, 200, { serverTime: new Date().toISOString() });
}
