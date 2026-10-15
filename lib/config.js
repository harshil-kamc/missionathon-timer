// Server settings from settings.js next to server.js (see settings.example.js).
// They stay on the server: browsers never receive this file.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const FILE = process.env.MISSIONATHON_SETTINGS || path.join(ROOT, 'settings.js');

let loaded = {};

// Loads settings.js. Called once at start-up (and by tests); restart the
// server after changing the file.
export async function loadSettings() {
  if (!fs.existsSync(FILE)) {
    loaded = {};
    return loaded;
  }
  const mod = await import(`${pathToFileURL(FILE).href}?t=${fs.statSync(FILE).mtimeMs}`);
  loaded = mod.default || {};
  return loaded;
}

export const config = () => loaded;
export const CONFIG_FILE = FILE;
