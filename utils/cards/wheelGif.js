require('./fonts');
const { createCanvas } = require('@napi-rs/canvas');
const { drawCardBackground } = require('./draw');
const { getIcon } = require('./icons');
const { encodeFrames, easeOutCubic } = require('./gif');

// Taux degressifs : plus le gain est gros, plus il est rare. Somme = 100.
const SEGMENTS = [
  { value: 0, weight: 20 },
  { value: 5, weight: 25 },
  { value: 10, weight: 20 },
  { value: 15, weight: 12 },
  { value: 20, weight: 10 },
  { value: 30, weight: 7 },
  { value: 40, weight: 4 },
  { value: 50, weight: 2 },
];

const COLORS = ['#ff2d95', '#ff5ca8'];

const W = 520;
const H = 580;
const SPIN_FRAMES = 30;
const HOLD_FRAMES = 6;
const FULL_SPINS = 5;

function pickWeightedIndex() {
  const total = SEGMENTS.reduce((sum, seg) => sum + seg.weight, 0);
  let r = Math.random() * total;
  for (let i = 0; i < SEGMENTS.length; i++) {
    r -= SEGMENTS[i].weight;
    if (r <= 0) return i;
  }
  return SEGMENTS.length - 1;
}

/**
 * @param {object} [opts]
 * @param {number} [opts.forcedIndex] force un segment (tests uniquement)
 * @returns {Promise<{ buffer: Buffer, winValue: number }>}
 */
async function renderWheelGif(opts = {}) {
  const roseIcon = await getIcon('rose');
  const winIndex = opts.forcedIndex ?? pickWeightedIndex();
  const winValue = SEGMENTS[winIndex].value;

  const N = SEGMENTS.length;
  const segAngle = (2 * Math.PI) / N;
  const centerAngle = winIndex * segAngle + segAngle / 2;
  const pointerAngle = -Math.PI / 2; // 12h

  let targetMod = pointerAngle - centerAngle;
  targetMod = ((targetMod % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI);
  const finalRotation = targetMod + FULL_SPINS * 2 * Math.PI;

  const cx = W / 2;
  const cy = 280;
  const radius = 200;

  const frames = [];
  const delays = [];
  const totalFrames = SPIN_FRAMES + HOLD_FRAMES;

  for (let i = 0; i < totalFrames; i++) {
    const canvas = createCanvas(W, H);
    const ctx = canvas.getContext('2d');

    drawCardBackground(ctx, W, H, 28);

    ctx.textAlign = 'center';
    ctx.fillStyle = '#ffffff';
    ctx.font = '700 26px "Poppins Bold"';
    ctx.fillText('ROUE DE LA CHANCE', W / 2, 46);

    const spinT = Math.min(1, i / SPIN_FRAMES);
    const rotation = finalRotation * easeOutCubic(spinT);

    // ombre
    ctx.beginPath();
    ctx.ellipse(cx, cy + radius + 16, radius * 0.7, 14, 0, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(0,0,0,0.25)';
    ctx.fill();

    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(rotation);

    for (let s = 0; s < N; s++) {
      const start = s * segAngle;
      const end = start + segAngle;
      const isJackpot = SEGMENTS[s].value === 50;

      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.arc(0, 0, radius, start, end);
      ctx.closePath();
      ctx.fillStyle = isJackpot ? '#ffd700' : COLORS[s % 2];
      ctx.fill();
      ctx.strokeStyle = 'rgba(255,255,255,0.6)';
      ctx.lineWidth = 2;
      ctx.stroke();

      const mid = start + segAngle / 2;
      ctx.save();
      ctx.rotate(mid);
      ctx.textAlign = 'center';
      ctx.fillStyle = isJackpot ? '#7a1854' : '#ffffff';
      ctx.font = '700 22px "Poppins Bold"';
      ctx.fillText(`${SEGMENTS[s].value}`, radius * 0.68, 8);
      ctx.restore();
    }

    // moyeu central
    ctx.beginPath();
    ctx.arc(0, 0, 34, 0, Math.PI * 2);
    ctx.fillStyle = '#ffffff';
    ctx.fill();
    ctx.drawImage(roseIcon, -18, -18, 36, 36);

    ctx.restore();

    // contour exterieur
    ctx.beginPath();
    ctx.arc(cx, cy, radius, 0, Math.PI * 2);
    ctx.lineWidth = 6;
    ctx.strokeStyle = '#ffffff';
    ctx.stroke();

    // pointeur fixe (ne tourne pas)
    ctx.beginPath();
    ctx.moveTo(cx - 18, cy - radius - 6);
    ctx.lineTo(cx + 18, cy - radius - 6);
    ctx.lineTo(cx, cy - radius + 24);
    ctx.closePath();
    ctx.fillStyle = '#ffffff';
    ctx.fill();
    ctx.strokeStyle = '#ff2d95';
    ctx.lineWidth = 2;
    ctx.stroke();

    if (i >= SPIN_FRAMES) {
      ctx.font = '700 26px "Poppins Bold"';
      ctx.fillStyle = '#ffffff';
      ctx.textAlign = 'center';
      ctx.fillText(
        winValue > 0 ? `Tu as gagné ${winValue} roses !` : 'Pas de chance, réessaie plus tard...',
        W / 2,
        H - 26
      );
    }

    frames.push(ctx);
    delays.push(i < SPIN_FRAMES ? 25 + Math.floor(easeOutCubic(spinT) * 70) : 900);
  }

  const buffer = await encodeFrames(frames, { width: W, height: H, delay: delays });
  return { buffer, winValue };
}

module.exports = { renderWheelGif, SEGMENTS, pickWeightedIndex };
