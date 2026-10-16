# Missionathon Live Dashboard

A single-screen, projector-friendly countdown and automatically released classified hint envelope.

## Start

Run `npm install`, then start the API and frontend in separate terminals with `npm run api` and `npm run dev`.

## Mission Configuration

Admin credentials are provided by the server environment using `ADMIN_EMAIL` and `ADMIN_PASSWORD` (at least 12 characters). A local `.env` file is supported by the start scripts and is excluded from version control; never put credentials in frontend code or commit them. For production, set those values in the hosting provider's secret environment configuration. Run `npm run api`, then start the frontend in another terminal with `npm run dev`.

Only a signed-in administrator can update mission settings. The server stores them in `data/mission-settings.json`, shared by all viewers and retained across restarts on a persistent disk. The admin session uses an HttpOnly, SameSite=Strict cookie, expires after eight hours, and sign-in attempts are rate-limited. This built-in file storage and in-memory sessions are intended for one Node.js server instance; sessions end when the server restarts. In production, deploy behind HTTPS, set `NODE_ENV=production`, bind to the host's required interface (often `HOST=0.0.0.0`), and ensure the host provides persistent storage for the `data/` directory. Build with `npm run build`, then run `npm start`.

Viewers can see the countdown and the envelope but cannot update settings. Before the release time, the server does not send the mission title, text, or image to viewer browsers.

`config/dashboardConfig.json` supplies the initial defaults:

- `targetTime`: the exact reveal date and time in ISO 24-hour format (for example, `2026-10-06T22:46:00`). Timestamps are interpreted as IST. In Mission Settings, enter the time in 12-hour format (`hh:mm:ss AM/PM`).
- `missionImage`: the complete mission design shown when the dossier opens. Use a full HTTPS image URL or a public path, such as `/mission-image.jpg`; place local images in `public/`. Add all text and visual design directly to the image.

The mission card is not rendered until the release time. The server keeps mission details out of viewer responses until then. As with any content displayed publicly after release, viewers can inspect or save it once it is revealed.

The timer requests the locally installed `Compacta BT` font and falls back to a condensed system font if it is unavailable. Supply a properly licensed font file if the site needs the exact typeface on every device.
