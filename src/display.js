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
