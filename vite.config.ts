import react from '@vitejs/plugin-react';
import { defineConfig, type Plugin } from 'vite';

function apiPlugin(): Plugin {
  return {
    name: 'missionathon-api',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        if (req.url && req.url.startsWith('/api/')) {
          try {
            const { handleApi } = await import('./apiHandler.mjs');
            const url = new URL(req.url, `http://${req.headers.host || 'localhost:3000'}`);
            await handleApi(req, res, url.pathname);
          } catch (err) {
            console.error('API Error in Vite middleware:', err);
            res.statusCode = 500;
            res.end(JSON.stringify({ error: 'Internal server error' }));
          }
          return;
        }
        next();
      });
    },
  };
}

export default defineConfig({
  plugins: [react(), apiPlugin()],
  server: {
    port: 3000,
    host: '0.0.0.0',
    hmr: process.env.DISABLE_HMR !== 'true',
    watch: process.env.DISABLE_HMR === 'true' ? null : {},
  },
});
