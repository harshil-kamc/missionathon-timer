// Envelope image. The control panel shrinks it first; it is stored with the
// timer as a data URL, so no separate file storage is needed. The public
// projector view only includes it after the envelope opens.
import { InputError } from '../src/timer.js';

export const MAX_IMAGE_BYTES = 1.5 * 1024 * 1024;
const MAGIC = {
  png: (b) => b.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])),
  jpeg: (b) => b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff,
  webp: (b) => b.subarray(0, 4).toString('latin1') === 'RIFF' && b.subarray(8, 12).toString('latin1') === 'WEBP',
};

// Checks a data URL from the control panel and returns it in a clean form.
export function checkImage(dataUrl) {
  const m = /^data:image\/(png|jpeg|jpg|webp);base64,([A-Za-z0-9+/=]+)$/.exec(String(dataUrl || ''));
  if (!m) throw new InputError('Upload a PNG, JPEG or WebP image');
  const type = m[1] === 'jpg' ? 'jpeg' : m[1];
  const buf = Buffer.from(m[2], 'base64');
  if (!buf.length) throw new InputError('The image is empty');
  if (buf.length > MAX_IMAGE_BYTES) throw new InputError('The image is larger than 1.5 MB');
  // Trust the file's own bytes, not the claimed type.
  if (!MAGIC[type](buf)) throw new InputError('That file is not a valid image');
  return `data:image/${type};base64,${buf.toString('base64')}`;
}
