// Envelope image. On Vercel it goes to Vercel Blob under a long random name,
// and that address is only given to the public after the envelope opens. On
// this PC without Blob it is kept inline in the local state file.
import crypto from 'node:crypto';
import { put, del } from '@vercel/blob';
import { InputError } from './timer.js';
import { StorageMissing } from './store.js';

export const MAX_IMAGE_BYTES = 3 * 1024 * 1024;
const TYPES = {
  png: { mime: 'image/png', magic: (b) => b.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) },
  jpg: { mime: 'image/jpeg', magic: (b) => b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff },
  webp: { mime: 'image/webp', magic: (b) => b.subarray(0, 4).toString('latin1') === 'RIFF' && b.subarray(8, 12).toString('latin1') === 'WEBP' },
};
const useBlob = () => Boolean(process.env.BLOB_READ_WRITE_TOKEN);

// Accepts a data URL from the control page and returns the image address.
export async function storeImage(dataUrl) {
  const m = /^data:image\/(png|jpeg|jpg|webp);base64,([A-Za-z0-9+/=]+)$/.exec(String(dataUrl || ''));
  if (!m) throw new InputError('Upload a PNG, JPEG or WebP image');
  const ext = m[1] === 'jpeg' ? 'jpg' : m[1];
  const buf = Buffer.from(m[2], 'base64');
  if (!buf.length) throw new InputError('The image is empty');
  if (buf.length > MAX_IMAGE_BYTES) throw new InputError('The image is larger than 3 MB');
  // Trust the file's own bytes, not the claimed type.
  if (!TYPES[ext].magic(buf)) throw new InputError('That file is not a valid image');

  if (useBlob()) {
    const name = `envelope/${crypto.randomBytes(16).toString('hex')}.${ext}`;
    const blob = await put(name, buf, { access: 'public', contentType: TYPES[ext].mime, addRandomSuffix: true });
    return blob.url;
  }
  if (process.env.VERCEL) throw new StorageMissing('Image storage is not connected. Add Vercel Blob to this project in Vercel → Storage.');
  return `data:${TYPES[ext].mime};base64,${buf.toString('base64')}`;
}

export async function removeImage(url) {
  if (!url || url.startsWith('data:') || !useBlob()) return;
  try {
    await del(url);
  } catch (e) {
    console.error('Could not delete old envelope image', e.message);
  }
}
