const { GIFEncoder, quantize, applyPalette } = require('gifenc');

// gifenc n'a pas de dithering integre (cf. sa doc) : sur des degrades lisses,
// sa quantization 256 couleurs cree des "blobs"/ronds visibles au lieu d'une
// transition douce. On applique un dithering ordonne (matrice de Bayer)
// juste avant applyPalette pour casser ces aplats en un grain fin, invisible
// a l'oeil mais qui rend le degrade beaucoup plus lisse.
// eslint-disable-next-line no-multi-spaces
const BAYER_4X4 = [
  0, 8, 2, 10,
  12, 4, 14, 6,
  3, 11, 1, 9,
  15, 7, 13, 5,
];
const BAYER_SIZE = 4;
const DITHER_STRENGTH = 24; // amplitude max de la perturbation (0-255)

function ditheredCopy(data, width, height) {
  const out = new Uint8ClampedArray(data);
  for (let y = 0; y < height; y++) {
    const rowBase = (y % BAYER_SIZE) * BAYER_SIZE;
    for (let x = 0; x < width; x++) {
      const threshold = BAYER_4X4[rowBase + (x % BAYER_SIZE)] / 16 - 0.5; // -0.5..~0.44
      const offset = threshold * DITHER_STRENGTH;
      const i = (y * width + x) * 4;
      out[i] += offset;
      out[i + 1] += offset;
      out[i + 2] += offset;
    }
  }
  return out;
}

function yieldToEventLoop() {
  return new Promise((resolve) => setImmediate(resolve));
}

/**
 * Encode une suite de contextes canvas deja dessines en GIF anime.
 * @param {import('@napi-rs/canvas').SKRSContext2D[]} contexts
 * @param {object} opts
 * @param {number} opts.width
 * @param {number} opts.height
 * @param {number|number[]} opts.delay delai en ms, constant ou par frame
 * @returns {Promise<Buffer>}
 */
async function encodeFrames(contexts, { width, height, delay = 80 }) {
  const gif = GIFEncoder();

  for (let i = 0; i < contexts.length; i++) {
    const { data } = contexts[i].getImageData(0, 0, width, height);
    const palette = quantize(data, 256);
    const index = applyPalette(ditheredCopy(data, width, height), palette);
    const frameDelay = Array.isArray(delay) ? delay[Math.min(i, delay.length - 1)] : delay;
    gif.writeFrame(index, width, height, { palette, delay: frameDelay });
    // Quantization + dithering + LZW par frame sont du calcul pur synchrone :
    // enchainees sans interruption sur 20+ frames, elles peuvent bloquer le
    // thread principal assez longtemps pour retarder le heartbeat du gateway
    // Discord (deconnexion du bot entier) sous charge concurrente (plusieurs
    // membres qui jouent a la roue/au casino en meme temps). On rend la main
    // a la boucle d'evenements entre chaque frame pour laisser passer les
    // heartbeats et les autres interactions en attente.
    await yieldToEventLoop();
  }

  gif.finish();
  return Buffer.from(gif.bytes());
}

function easeOutCubic(t) {
  return 1 - Math.pow(1 - t, 3);
}

module.exports = { encodeFrames, easeOutCubic, yieldToEventLoop };
