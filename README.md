# Missionathon Timer – Guide

Projector countdown for Missionathon 2026, with one admin dashboard that controls every screen.

- **Projector screen**: `http://SERVER:3000/` – the big countdown with the logo and rotating backgrounds. At 00:00:00 an envelope opens with the mission message. Open it on as many computers as you like.
- **Admin dashboard**: `http://SERVER:3000/#control` – password protected. Set and run the timer and write what is inside the envelope. Every projector screen follows it within about 2 seconds.

No database, no environment variables, nothing to install except Node.js. The timer is kept in the server's memory and saved to `data/timer.json`, so a restart doesn't lose it.

The projector page shows nothing about the admin side, and the envelope contents are never sent to projector screens before zero. The admin password lives only in `settings.js` on the server and is never sent to browsers.

---

## 1. Set up the server (once)

The "server" is any computer that stays on during the event and that every screen can reach: your own server/VPS, or simply the admin laptop on the venue Wi-Fi.

1. Install **Node.js 20 or newer** from https://nodejs.org (LTS). Check in a terminal: `node -v`.
2. Unzip this folder on the server, e.g. `C:\missionathon-timer` or `/opt/missionathon-timer`.
3. In the folder, copy **`settings.example.js`** to **`settings.js`** and open it in Notepad (or any editor):
   ```js
   export default {
     adminPassword: 'your-admin-password-here',   // at least 8 characters
     port: 3000,
     behindProxy: false,
   };
   ```
   Keep the quotes around the password. Don't share this file.
4. Start the server from a terminal opened in the folder:
   ```
   node server.js
   ```
   It prints the addresses:
   ```
   Missionathon timer running on port 3000
     Projector:     http://localhost:3000/
     Admin control: http://localhost:3000/#control
   ```
   Keep this window open: closing it stops the timer site.

Nothing else to install: the site is already built in `dist/`.

### Reaching it from other computers
- Find the server's address:
  - Windows: run `ipconfig` and look for **IPv4 Address** (e.g. `192.168.1.20`).
  - Linux/Mac: `hostname -I` or `ipconfig getifaddr en0`.
- On other computers on the same network open `http://192.168.1.20:3000/` (projector) and `http://192.168.1.20:3000/#control` (admin).
- On Windows the first run may ask to allow Node.js through the firewall: click **Allow** (private networks).
- On a cloud server/VPS, open port 3000 in its firewall, or put it behind nginx/your domain (then set `behindProxy: true`).

### Changing the password
Edit `adminPassword` in `settings.js`, then stop the server (`Ctrl + C`) and run `node server.js` again. Everyone signed in is signed out.

---

## 2. Run it at the event

1. Projector computers: open `http://SERVER:3000/`, put the window on the projector, press **F11** (full screen).
2. Admin: open `http://SERVER:3000/#control` on any laptop or phone and sign in.
3. Changes appear on every projector screen within about 2 seconds. All screens use the server's clock, so they hit zero together.

Ten wrong passwords from one device lock it out for 15 minutes.

---

## 3. Use the admin dashboard

### Count down for a set time (e.g. 45 minutes)
1. **Step 1 · Timer** → **Run for a set duration** → enter hours, minutes, seconds.
2. Optionally change **Headline above the timer** and **Line at the bottom of the screen**.
3. **Save timer**, then **Start** at the top. **Pause** / **Resume** / **Reset** as needed (screens show "Timer paused" while paused).

### Count down to a clock time (e.g. 2:00 PM)
**Count down to a time** → pick date and time → **Save timer**. It counts straight away.

### Inside the envelope
1. **Step 2**: fill in **Small label**, **Title**, **Message** → **Save envelope text**.
2. Optional image (mission card/poster): **Add image** (PNG, JPEG or WebP; large images are shrunk automatically). **Replace image** / **Remove image** to change it. To show only the image, clear the three text boxes and save.

### Reveal
- **Preview envelope ↗**: see the opened envelope in a new tab without opening it on the projectors.
- The envelope opens **by itself at 00:00:00** on every screen.
- **Open envelope now…**: open it early (asks to confirm).
- **Back to the timer**: close it. A duration timer resets to its full time; for a clock time that has passed, set a new time first.

### Next round
Change the time, headline and envelope text, **Save**, then **Start**.

---

## 4. Offline backup (one computer, no server)

If the server is unavailable, double-click `dist/index.html` on the projector computer, then open the same address with `#control` added in a second window of the **same browser** (e.g. `file:///C:/missionathon-timer/dist/index.html#control`). This only controls windows in that browser, uses that computer's clock, and has no password.

---

## 5. If something goes wrong

| Problem | Fix |
|---|---|
| Projector says "Waiting for the Missionathon server…" | The server isn't reachable: check `node server.js` is still running, the address/port, the Wi-Fi, and the firewall. |
| Admin sign-in says the password is not set up | Set `adminPassword` (8+ characters) in `settings.js` and restart the server. |
| "Too many wrong passwords" | Wait 15 minutes or sign in from another device. |
| Other computers can't open the site | Use the server's IP address (not `localhost`), same network, allow Node.js in the firewall. |
| Image won't save | Use a smaller image and try again. |
| Want to reset everything | Stop the server, delete `data/timer.json`, start it again. |

Tip: run a 10-second test before the event so you've seen the reveal on every screen.

---

## 6. For developers

```
npm install
npm run dev      live-reloading version on the port in settings.js
npm test         timer, password and image checks
npm run build    rebuilds dist/ after changes
npm start        same as node server.js
```

- `server.js`: the server (site + API)
- `settings.example.js`: template for `settings.js` (admin password, port)
- `api/`: API routes (`state`, `time`, `login`, `admin`, `image`)
- `lib/`: settings, timer storage (memory + `data/timer.json`), password check, image check
- `src/Display.jsx`: projector screen · `src/Control.jsx`: admin dashboard · `src/timer.js`: timer rules · `src/store.js`: talking to the server
- `public/projector/`: logo and backgrounds. Replace files with the same names or edit the list in `src/Display.jsx`, then `npm run build`.

The background images are film stills: fine on the event screen, not for promotion.
