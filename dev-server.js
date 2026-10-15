// Local testing only (Vercel runs the api/ files itself). Serves the site
// through Vite and the api/ routes from the same port, like Vercel does.
import http from 'node:http';
import { createServer as createVite } from 'vite';

const PORT = Number(process.env.PORT) || 5174;
const routes = {
  '/api/state': () => import('./api/state.js'),
  '/api/time': () => import('./api/time.js'),
  '/api/login': () => import('./api/login.js'),
  '/api/admin': () => import('./api/admin.js'),
  '/api/image': () => import('./api/image.js'),
};

const vite = await createVite({ server: { middlewareMode: true }, appType: 'spa' });

http
  .createServer(async (req, res) => {
    const path = req.url.split('?')[0];
    if (path.startsWith('/api/')) {
      const load = routes[path];
      if (!load) {
        res.statusCode = 404;
        return res.end('{"error":"Not found"}');
      }
      return (await load()).default(req, res);
    }
    vite.middlewares(req, res);
  })
  .listen(PORT, () => console.log(`Missionathon timer on http://localhost:${PORT}  (control page: /control)`));
