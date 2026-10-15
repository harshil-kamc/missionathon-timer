# Missionathon Timer

Projector countdown for Missionathon 2026, with a password-protected control page.

- `/` – projector screen (public, no sign-in). Rotating backgrounds, logo, countdown, and a sealed envelope that opens at 00:00:00.
- `/control` – control page (shared password). Set a target time or a duration, start/pause/resume/reset, edit the headline and bottom line, write the envelope text, upload an envelope image, open the envelope early or go back to the timer.

The envelope's contents are never sent to the projector screen before zero.

## Deploy on Vercel

1. Put this folder in a GitHub repo (private is fine) and import it in Vercel (**Add New → Project**). Vercel detects Vite; keep the defaults.
2. In the Vercel project, **Storage → Upstash (Redis) → Create** (free plan) and connect it to the project. This stores the timer.
3. **Storage → Blob → Create** and connect it to the project. This stores the envelope image.
4. **Settings → Environment Variables**: add `CONTROL_PASSWORD` (at least 8 characters).
5. **Deployments → latest → Redeploy** so the new settings take effect.

Check: `https://<your-project>.vercel.app/api/state` should return JSON with `"timer"`, and `/control` should accept the password.

Optional: in `vercel.json`, add `"regions": ["bom1"]` to run the server in Mumbai (pick a Mumbai Redis region to match).

## Run on your own computer

Needs Node.js 20 or newer.

```
npm install
copy .env.example .env.local     (then put a CONTROL_PASSWORD in .env.local)
npm run dev
```

Open http://localhost:5174 (projector) and http://localhost:5174/control. Without Redis/Blob it saves to a local `.data/` folder.

`npm test` runs the timer and sign-in tests.

## Files

- `src/` – the two pages (`Display.jsx` projector, `Control.jsx` control page) and styles
- `api/` – server routes Vercel runs: `state`, `time`, `login`, `admin`, `image`
- `lib/` – timer rules, storage, sign-in and image handling
- `public/projector/` – logo and background images (film stills: fine for the event screen, not for promotion)
