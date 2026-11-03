import { screenSuitable } from './museums.js';
import { options, geometry, jpegDimensions } from './display.js';
// The phone computes one JPEG, then hands it off. It never hosts the TV artwork.
export async function prepareJPEG(url, input) {
  const settings = options(input);
  const r = await fetch(url, { signal: AbortSignal.timeout(25000) });
  if (!r.ok) throw new Error('The museum image could not be retrieved. Reload the controller if your sign-in has expired.');
  const reader = r.body.getReader(), chunks = []; let size = 0;
  while (true) { const { value, done } = await reader.read(); if (done) break; size += value.length; if (size > 12000000) { await reader.cancel(); throw new Error('Museum image too large for safe preparation.'); } chunks.push(value); }
  const blob = new Blob(chunks, { type: 'image/jpeg' });
  const dimensions = jpegDimensions(new Uint8Array(await blob.arrayBuffer()));
  if (!dimensions.width || !dimensions.height || dimensions.width * dimensions.height > 6000000) throw new Error('Museum image is too large to prepare safely. Choose another painting.');
  if (!screenSuitable(dimensions)) throw new Error('This painting has invalid image dimensions. Choose another painting.');
  const objectURL = URL.createObjectURL(blob), image = new Image();
  try {
    image.src = objectURL; await image.decode();
    const canvas = document.createElement('canvas'); canvas.width = 1920; canvas.height = 1080;
    const context = canvas.getContext('2d');
    if (!context) throw new Error('Image preparation is unavailable in this browser.');
    context.fillStyle = settings.background; context.fillRect(0, 0, 1920, 1080);
    const size = geometry(image.naturalWidth, image.naturalHeight, settings.mode);
    context.imageSmoothingEnabled = true; context.imageSmoothingQuality = 'high';
    context.drawImage(image, Math.floor((1920-size.width)/2), Math.floor((1080-size.height)/2), size.width, size.height);
    // A black alpha layer multiplies brightness and also works in older Safari.
    context.fillStyle = `rgba(0,0,0,${1-settings.brightness/100})`; context.fillRect(0,0,1920,1080);
    const jpeg = await new Promise(resolve => canvas.toBlob(resolve, 'image/jpeg', .92));
    canvas.width = canvas.height = 1;
    if (!jpeg || jpeg.size > 2000000) throw new Error('Prepared image is too large. Try another painting.');
    return jpeg;
  } finally { URL.revokeObjectURL(objectURL); }
}
