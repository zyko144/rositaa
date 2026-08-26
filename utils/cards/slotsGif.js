require('./fonts');
const { createCanvas } = require('@napi-rs/canvas');
const { roundRect, drawCardBackground } = require('./draw');
const { getIcon } = require('./icons');
const { encodeFrames, yieldToEventLoop } = require('./gif');

const SYMBOLS = ['cherry', 'lemon', 'bell', 'gem', 'slotmachine'];

const W = 640;
const H = 360;
const REEL_W = 150;
const REEL_H = 150;
const REEL_GAP = 30;
const REEL_Y = 130;

const HOLD_FRAMES = 8;
// Chaque rouleau s'arrete a un moment different (effet cascade classique).
// Volontairement peu de frames (chaque frame = un rendu canvas + dithering
// synchrones qui bloquent la boucle d'evenements) : sous charge concurrente
// (plusieurs membres qui jouent en meme temps), un rendu trop long peut
// retarder l'accuse de reception d'une AUTRE interaction au-dela des 3s
// tolerees par Discord ("This interaction failed"). Le delai par frame est
// augmente en compensation pour garder une duree d'animation similaire.
const STOP_FRAMES = [10, 14, 18];
const TOTAL_FRAMES = STOP_FRAMES[STOP_FRAMES.length - 1] + HOLD_FRAMES;

function reelSymbolIndex(reelIndex, frame) {
  const stop = STOP_FRAMES[reelIndex];
  if (frame >= stop) return null; // null = symbole final fige, dessine a part
  const slowdownStart = stop - 6;
  if (frame < slowdownStart) {
    return (frame * 7 + reelIndex * 3) % SYMBOLS.length;
  }
  const slowStep = Math.floor((frame - slowdownStart) / 2);
  return (slowdownStart * 7 + reelIndex * 3 + slowStep) % SYMBOLS.length;
}

/**
 * @param {object} opts
 * @param {[string,string,string]} opts.symbolKeys ex: ['cherry','cherry','gem'] - resultat final des 3 rouleaux
 * @param {boolean} opts.win
 * @param {string} opts.resultLabel ex: "JACKPOT !" ou "PERDU"
 * @returns {Promise<Buffer>} GIF anime
 */
async function renderSlotsGif({ symbolKeys, win, resultLabel }) {
  const icons = {};
  for (const key of new Set(SYMBOLS)) icons[key] = await getIcon(key);

  const totalReelsW = REEL_W * 3 + REEL_GAP * 2;
  const startX = (W - totalReelsW) / 2;

  const frames = [];
  const delays = [];

  for (let i = 0; i < TOTAL_FRAMES; i++) {
    const canvas = createCanvas(W, H);
    const ctx = canvas.getContext('2d');

    drawCardBackground(ctx, W, H, 24);
    ctx.strokeStyle = 'rgba(255,255,255,0.3)';
    ctx.lineWidth = 2;
    roundRect(ctx, 5, 5, W - 10, H - 10, 20);
    ctx.stroke();

    ctx.textAlign = 'center';
    ctx.fillStyle = '#ffffff';
    ctx.font = '700 26px "Poppins Bold"';
    ctx.fillText('MACHINE A SOUS', W / 2, 48);

    for (let r = 0; r < 3; r++) {
      const x = startX + r * (REEL_W + REEL_GAP);
      const justLanded = i === STOP_FRAMES[r];
      const pop = justLanded ? 1.12 : 1;

      ctx.fillStyle = 'rgba(255,255,255,0.12)';
      roundRect(ctx, x, REEL_Y, REEL_W, REEL_H, 16);
      ctx.fill();
      ctx.strokeStyle = i >= STOP_FRAMES[r] ? 'rgba(255,255,255,0.5)' : 'rgba(255,255,255,0.2)';
      ctx.lineWidth = 2;
      roundRect(ctx, x, REEL_Y, REEL_W, REEL_H, 16);
      ctx.stroke();

      const idx = reelSymbolIndex(r, i);
      const key = idx === null ? symbolKeys[r] : SYMBOLS[idx];
      const icon = icons[key];
      const size = 76 * pop;
      ctx.drawImage(icon, x + REEL_W / 2 - size / 2, REEL_Y + REEL_H / 2 - size / 2, size, size);
    }

    // ligne de paiement
    ctx.strokeStyle = 'rgba(255,255,255,0.35)';
    ctx.lineWidth = 2;
    ctx.setLineDash([8, 6]);
    ctx.beginPath();
    ctx.moveTo(40, REEL_Y + REEL_H / 2);
    ctx.lineTo(W - 40, REEL_Y + REEL_H / 2);
    ctx.stroke();
    ctx.setLineDash([]);

    const allStopped = i >= STOP_FRAMES[2];
    if (allStopped) {
      ctx.font = '700 30px "Poppins Bold"';
      ctx.fillStyle = win ? '#8dffc0' : '#ffffff';
      ctx.fillText(resultLabel, W / 2, REEL_Y + REEL_H + 50);
    }

    frames.push(ctx);
    const isSpinning = i < STOP_FRAMES[2];
    delays.push(isSpinning ? 65 : 900);
    // Voir gif.js : chaque frame dessinee est du calcul synchrone qui peut
    // bloquer le thread principal sous charge concurrente.
    await yieldToEventLoop();
  }

  return encodeFrames(frames, { width: W, height: H, delay: delays });
}

module.exports = { renderSlotsGif };
