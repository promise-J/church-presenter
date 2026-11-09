import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Resolve the templates directory relative to the repo layout.
// In dev:  <repo>/assets/templates
// In prod: <resources>/templates (when packaged)
function getTemplatesDir() {
  // Try the dev path first
  const devPath = path.resolve(__dirname, '..', '..', '..', 'assets', 'templates');
  if (fs.existsSync(devPath)) return devPath;

  // Packaged fallback (electron-builder puts extraResources in resourcesPath)
  try {
    const { app } = require('electron');
    return path.join(process.resourcesPath, 'templates');
  } catch {
    return devPath;
  }
}

function loadTemplate(filename) {
  const dir = getTemplatesDir();
  const full = path.join(dir, filename);
  const raw = fs.readFileSync(full, 'utf-8');
  return JSON.parse(raw);
}

export function loadBuiltinTemplates() {
  return [
    loadTemplate('scripture-full.json'),
    loadTemplate('scripture-camera.json'),
    loadTemplate('camera-only.json'),
    loadTemplate('scripture-notes.json'),
    loadTemplate('lower-third.json'),
    loadTemplate('dual-translation.json'),
    loadTemplate('announcement.json'),
    loadTemplate('media-full.json'),
    loadTemplate('media-with-caption.json'),
    loadTemplate('countdown.json'),
  ];
}

// Convenience export for code that wants them synchronously at module load
export const BUILTIN_TEMPLATES = loadBuiltinTemplates();