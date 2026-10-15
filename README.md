# Missionathon Timer – Guide

The projector countdown for Missionathon 2026.

- **Projector screen** (`/`): big countdown, logo and rotating backgrounds. At 00:00:00 an envelope opens and shows the mission message.
- **Admin control panel** (`/#control`): set and run the timer and write what is inside the envelope.

It runs two ways:

| | **Online (website)** | **Offline backup (from disk)** |
|---|---|---|
| Open | `https://<your-site>.vercel.app` | double-click `dist/index.html` |
| Who controls | the admin, signed in with the password, from any device | the control panel in the same browser on the same computer |
| Which screens follow | **every** projector screen opened from the link, anywhere | only windows in that browser |
| Needs internet | yes | no |

---

## 1. Put it online (Vercel)

1. Put this folder in a GitHub repo (private is fine). In Vercel: **Add New → Project**, import the repo, click **Deploy** (it detects Vite; keep the defaults).
2. In the Vercel project: **Storage → Create → Upstash (Redis)** on the free plan (choose a Mumbai region if offered) and **connect it to the project**. This is where the timer is kept so every screen sees the same thing.
3. **Settings → Environment Variables**: add `CONTROL_PASSWORD` = the admin password (at least 8 characters).
4. **Deployments → latest → ⋯ → Redeploy**.
5. Check: `https://<your-site>.vercel.app/api/state` shows text starting with `{"timer":`. If it says "Storage is not connected", step 2 isn't connected to this project yet.

Without step 2 the projector shows "Waiting for the Missionathon server…"; without step 3 the admin sign-in says no password is set.

---

## 2. Run it at the event (online)

1. On the projector laptop, open `https://<your-site>.vercel.app`, put the window on the projector and press **F11** (full screen). Open the same link on as many other screens as you like.
2. On the admin's laptop or phone, open `https://<your-site>.vercel.app/#control` and sign in with the admin password.
3. Every change the admin makes appears on all projector screens within about 2 seconds. All screens use the server's clock, so they hit zero together.

Security: only someone with the password can change the timer. Ten wrong passwords from one device lock it out for 15 minutes. Changing `CONTROL_PASSWORD` in Vercel (and redeploying) signs everyone out. The envelope contents are not sent to projector screens before zero.

---

## 3. Use the control panel

### Count down for a set time (e.g. 45 minutes)
1. In **Step 1 · Timer**, choose **Run for a set duration**, enter hours, minutes, seconds.
2. Optionally change **Headline above the timer** (e.g. "Mission 2 unlocks in") and **Line at the bottom of the screen**.
3. Click **Save timer**, then **Start** at the top.
   - **Pause** freezes it (screens show "Timer paused"), **Resume** continues, **Reset** goes back to the full duration.

### Count down to a clock time (e.g. 2:00 PM)
1. Choose **Count down to a time**, pick the date and time, click **Save timer**. It counts straight away.

### Inside the envelope
1. In **Step 2**, fill in **Small label**, **Title** and **Message**, click **Save envelope text**.
2. Optional image (mission card or poster): **Add image** (PNG, JPEG or WebP; large images are shrunk automatically). **Replace image** / **Remove image** to change it. To show only the image, clear the three text boxes and save.

### Reveal
- **Preview envelope ↗** shows the opened envelope in a new window without opening it on the projectors.
- The envelope opens **by itself at 00:00:00** on every screen.
- **Open envelope now…** opens it early (asks to confirm).
- **Back to the timer** closes it. A duration timer goes back to its full time; for a clock time that has passed, set a new time first.

### Next round
Change the time, headline and envelope text, **Save**, then **Start** (duration mode).

---

## 4. Offline backup (no internet)

If the internet fails, unzip the project and double-click `dist/index.html` (projector), then open the same address with `#control` added in a second window of the **same browser** (e.g. `file:///C:/Users/you/Desktop/timer-2/dist/index.html#control`). No password is needed offline. It uses the computer's clock, so keep Windows' "Set time automatically" on, and don't use an incognito window.

---

## 5. If something goes wrong

| Problem | Fix |
|---|---|
| Projector says "Waiting for the Missionathon server…" | Check the internet. On Vercel, check Upstash Redis is connected (section 1, step 2) and redeployed. Or switch to the offline backup. |
| Admin sign-in says no password is set | Add `CONTROL_PASSWORD` in Vercel and redeploy. |
| "Too many wrong passwords" | Wait 15 minutes, or sign in from another device. |
| Offline: projector doesn't follow the panel | Both windows must be in the same browser, not incognito. Press F5 on the projector window. |
| Image won't save | Use a smaller image and try again. |
| "Set the time in the control panel" on screen | "Count down to a time" was chosen without a time. Pick one and save. |

Tip: run a 10-second test before the event so you've seen the reveal.

---

## 6. Change the design or code (developers)

Needs Node.js 20 or newer.

```
npm install
copy .env.example .env.local     (then set CONTROL_PASSWORD in .env.local)
npm run dev      http://localhost:5174  and  http://localhost:5174/#control
npm test         timer, password and image checks
npm run build    rebuilds dist/ (one self-contained index.html + projector images)
```

Without Redis, local testing saves the timer to a `.data/` folder.

- `src/Display.jsx`: projector screen (logo, backgrounds list, countdown, envelope)
- `src/Control.jsx`: admin control panel and sign-in
- `src/timer.js`: timer rules and default text
- `src/store.js`: online/offline switch, talking to the server, browser storage
- `api/`: server routes Vercel runs (`state`, `time`, `login`, `admin`, `image`)
- `lib/`: storage (Redis), password check, image check
- `src/styles.css`: colours, fonts and layout
- `public/projector/`: logo and backgrounds (`bg1.jpg` … `bg10.jpg`, `bg-crew.jpg`, `bg-mask.jpg`, `bg-planning-room.jpg`). Replace files with the same names or edit the list at the top of `src/Display.jsx`, then `npm run build`.

The background images are film stills: fine on the event screen, not for promotion.
