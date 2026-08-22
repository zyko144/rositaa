const { GIFEncoder, quantize, applyPalette } = require('gifenc');

/**
 * Encode une suite de contextes canvas deja dessines en GIF anime.
 * @param {import('@napi-rs/canvas').SKRSContext2D[]} contexts
 * @param {object} opts
 * @param {number} opts.width
 * @param {number} opts.height
 * @param {number|number[]} opts.delay delai en ms, constant ou par frame
 * @returns {Buffer}
 */
function encodeFrames(contexts, { width, height, delay = 80 }) {
  const gif = GIFEncoder();

  contexts.forEach((ctx, i) => {
    const { data } = ctx.getImageData(0, 0, width, height);
    const palette = quantize(data, 256);
    const index = applyPalette(data, palette);
    const frameDelay = Array.isArray(delay) ? delay[Math.min(i, delay.length - 1)] : delay;
    gif.writeFrame(index, width, height, { palette, delay: frameDelay });
  });

  gif.finish();
  return Buffer.from(gif.bytes());
}

function easeOutCubic(t) {
  return 1 - Math.pow(1 - t, 3);
}

module.exports = { encodeFrames, easeOutCubic };
