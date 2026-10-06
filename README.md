# Missionathon Live Dashboard

A single-screen, projector-friendly countdown and automatically released classified hint envelope.

## Start

Run `npm install`, then `npm run dev` from this folder.

## Mission Configuration

Use the gear button in the lower-right corner to update the live mission settings. Changes are saved in this browser and persist after refresh. `src/config/dashboardConfig.ts` supplies the initial defaults:

- `targetTime`: the exact reveal date and time. Timestamps without a timezone offset are interpreted as IST.
- `missionTitle` and `missionText`: content shown when the dossier opens.
- `missionImage`: optional full image URL or public path, such as `/mission-image.jpg`; place local images in `public/`.

The mission card is not rendered until the release time. This is a visual reveal only: values included in a frontend build can be inspected by visitors, so do not put confidential information here. `src/config/timerConfig.ts` remains a legacy-compatible re-export.

The timer requests the locally installed `Compacta BT` font and falls back to a condensed system font if it is unavailable. Supply a properly licensed font file if the site needs the exact typeface on every device.
