import { PhotonImage, resize, SamplingFilter } from '@cf-wasm/photon';
import { options, geometry, jpegDimensions } from '../src/display.js';
export { options, geometry, jpegDimensions } from '../src/display.js';
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
