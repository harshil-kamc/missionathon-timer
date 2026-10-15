# Missionathon Timer – Guide

The projector countdown for Missionathon 2026. It runs entirely in the browser: no internet, no server, no login, nothing to install to use it.

The site has two views:
- **Projector screen**: the big countdown with the logo and rotating backgrounds. When the countdown reaches 00:00:00, an envelope opens and shows the mission message.
- **Control panel**: where you set and run the timer and write what is inside the envelope.

---

## 1. Start it (no installation needed)

1. Unzip the folder anywhere (Desktop is fine). Keep the files together.
2. Open the `dist` folder and double-click **`index.html`**. It opens in your browser (Chrome or Edge recommended). This is the **projector screen**.
3. Open the **control panel** in a second window of the **same browser**:
   - Press `Ctrl + N` for a new window.
   - Copy the address of the projector window into it and add `#control` at the end, for example
     `file:///C:/Users/you/Desktop/timer-2/dist/index.html#control`
   - Or click **Open projector ↗** from the control panel later to get a fresh projector window.
4. Drag the **projector window** onto the projector screen and press **F11** for full screen (F11 again to exit).
5. Keep the **control panel** on the laptop screen.

Important:
- Both windows must be in the **same browser on the same computer**. The timer is saved in that browser, so the control panel cannot drive a projector on another computer or phone.
- The countdown uses the computer's clock. In Windows, check **Settings → Time & language → Date & time → Set time automatically** is ON.
- Don't use a private/incognito window: it forgets the timer when closed.

---

## 2. Edit and run the timer (control panel)

### Count down for a set time (e.g. 45 minutes)
1. In **Step 1 · Timer**, choose **Run for a set duration**.
2. Enter hours, minutes, seconds.
3. Optionally change **Headline above the timer** (e.g. "Mission 2 unlocks in") and **Line at the bottom of the screen**.
4. Click **Save timer**.
5. At the top, click **Start**. The projector starts counting.
   - **Pause** freezes it (the projector shows "Timer paused").
   - **Resume** continues from where it paused.
   - **Reset** goes back to the full duration.

### Count down to a clock time (e.g. 2:00 PM)
1. In **Step 1 · Timer**, choose **Count down to a time**.
2. Pick the date and time in **Envelope opens at**.
3. Click **Save timer**. It starts counting straight away; no Start button needed.

### What appears inside the envelope
1. In **Step 2 · Inside the envelope**, fill in:
   - **Small label** (e.g. "Mission 02 · Classified briefing")
   - **Title** (e.g. "The vault is open")
   - **Message** (a short line or two)
2. Click **Save envelope text**.
3. Optional image (a mission card or poster): click **Add image** and pick a PNG, JPEG or WebP. It is shown whole inside the envelope. Large images are shrunk automatically. Use **Replace image** or **Remove image** to change it. To show only the image, clear the three text boxes and save.

### Check it before the reveal
- Click **Preview envelope ↗** to see the opened envelope in a separate window. This does **not** open it on the projector.

### During the reveal
- The envelope opens **by itself at 00:00:00**.
- **Open envelope now…** opens it early (asks you to confirm).
- **Back to the timer** closes the envelope and shows the countdown again. For a duration timer this resets it to the full time; for a clock time that has passed, set a new time first.

### Next round
Change the duration or time, update the headline and envelope text, click **Save**, then **Start** (duration mode).

---

## 3. If something goes wrong

| Problem | Fix |
|---|---|
| Projector doesn't change when I edit | Make sure both windows are in the same browser (both Chrome or both Edge), not incognito. Reload the projector window (F5). |
| Time is off by a few seconds/minutes | Turn on "Set time automatically" in Windows date & time settings. |
| Image won't save | Use a smaller image (under ~2 MB) and try again. |
| Projector shows "Set the time in the control panel" | You chose "Count down to a time" without a time. Pick one and Save. |
| Want to start completely fresh | In the projector window press F12 → Console, type `localStorage.clear()` and Enter, then reload both windows. |

Tip: open both windows once before the event and run a short 10-second test so you've seen the reveal.

---

## 4. Put it online (optional)

The `dist` folder is a complete website. Any of these work:
- **Vercel**: put this whole folder in a GitHub repo, then in Vercel choose **Add New → Project**, import the repo and click **Deploy** (it detects Vite; no settings, storage or passwords needed). The control panel is then `https://your-site.vercel.app/#control`.
- **Any static host** (Netlify drop, GitHub Pages, etc.): upload the contents of `dist`.

Even online, the control panel still only controls the projector in the same browser on the same computer.

---

## 5. Change the design or code (for developers)

Needs Node.js 20 or newer (nodejs.org).

```
npm install
npm run dev      opens on http://localhost:5174  (control: http://localhost:5174/#control)
npm test         checks the timer rules
npm run build    rebuilds the dist folder after changes
```

Where things are:
- `src/Display.jsx`: projector screen (logo, backgrounds list, countdown, envelope)
- `src/Control.jsx`: control panel
- `src/timer.js`: timer rules and default text (headline, bottom line, envelope)
- `src/store.js`: saves the timer in the browser and keeps both windows in sync
- `src/styles.css`: colours, fonts and layout
- `public/projector/`: logo (`missionathon-logo.png`) and backgrounds (`bg1.jpg` … `bg10.jpg`, `bg-crew.jpg`, `bg-mask.jpg`, `bg-planning-room.jpg`). To change backgrounds, replace the files with the same names or edit the list at the top of `src/Display.jsx`, then `npm run build`.

The background images are film stills: fine on the event screen, not for promotion.
