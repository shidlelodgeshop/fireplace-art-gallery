import { PhotonImage, resize, SamplingFilter } from '@cf-wasm/photon';
export function options(input) {
  const mode = input.mode ?? 'fit', brightness = input.brightness ?? 70, background = input.background ?? '#000000';
  if (!['fit', 'fill'].includes(mode) || !Number.isInteger(brightness) || brightness < 10 || brightness > 100 || !['#000000', '#24211e', '#77716a'].includes(background)) throw new Error('Invalid display settings.');
  return { mode, brightness, background };
}
export function geometry(width, height, mode) {
  const scale = (mode === 'fill' ? Math.max : Math.min)(1920 / width, 1080 / height);
  return { width: Math.max(1, Math.round(width * scale)), height: Math.max(1, Math.round(height * scale)) };
}
// Validate JPEG dimensions BEFORE decoding to protect the Worker memory budget.
export function jpegDimensions(bytes) {
  if (bytes[0] !== 255 || bytes[1] !== 216) throw new Error('Museum image is not a JPEG.');
  let i = 2;
  while (i + 8 < bytes.length) {
    if (bytes[i++] !== 255) throw new Error('Invalid JPEG.');
    let marker = bytes[i++];
    while (marker === 255) marker = bytes[i++];
    if (marker === 217 || marker === 218) break;
    if (marker === 1 || (marker >= 208 && marker <= 215)) continue;
    const length = bytes[i] * 256 + bytes[i + 1];
    if (length < 2) break;
    if ([192, 193, 194].includes(marker)) return { width: bytes[i + 5] * 256 + bytes[i + 6], height: bytes[i + 3] * 256 + bytes[i + 4] };
    i += length;
  }
  throw new Error('Cannot read JPEG dimensions.');
}
export function format(bytes, input) {
  const settings = options(input), d = jpegDimensions(bytes);
  if (!d.width || !d.height || d.width * d.height > 5000000) throw new Error('Museum image exceeds the safe processing size; choose another painting.');
  const size = geometry(d.width, d.height, settings.mode);
  if (size.width * size.height > 6000000) throw new Error('This unusually narrow painting cannot safely fill the screen. Use Fit.');
  let original, scaled, output;
  try {
    original = PhotonImage.new_from_byteslice(bytes);
    scaled = resize(original, size.width, size.height, SamplingFilter.Lanczos3);
    const pixels = scaled.get_raw_pixels(), canvas = new Uint8Array(1920 * 1080 * 4);
    const rgb = settings.background.match(/[a-f0-9]{2}/g).map(v => parseInt(v, 16));
    const left = Math.floor((1920 - size.width) / 2), top = Math.floor((1080 - size.height) / 2), dim = settings.brightness / 100;
    for (let y = 0; y < 1080; y++) for (let x = 0; x < 1920; x++) {
      const p = (y * 1920 + x) * 4, sx = x - left, sy = y - top;
      const inside = sx >= 0 && sx < size.width && sy >= 0 && sy < size.height;
      const s = (sy * size.width + sx) * 4;
      for (let c = 0; c < 3; c++) canvas[p + c] = Math.round((inside ? pixels[s + c] : rgb[c]) * dim);
      canvas[p + 3] = 255;
    }
    output = new PhotonImage(canvas, 1920, 1080);
    return output.get_bytes_jpeg(92);
  } finally { output?.free(); scaled?.free(); original?.free(); }
}
