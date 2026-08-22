require('./fonts');
const { createCanvas } = require('@napi-rs/canvas');
const { roundRect } = require('./draw');
const { encodeFrames, easeOutCubic } = require('./gif');

const W = 480;
const H = 320;
const SPIN_FRAMES = 20;
const HOLD_FRAMES = 4;
const TOTAL_ROTATIONS = 5;

/**
 * @param {object} opts
 * @param {'pile'|'face'} opts.result
 * @returns {Promise<Buffer>} GIF anime
 */
async function renderCoinflipGif({ result }) {
  const other = result === 'pile' ? 'face' : 'pile';
  const centerX = W / 2;
  const centerY = 150;
  const radius = 66;

  const frames = [];
  const delays = [];

  const totalFrames = SPIN_FRAMES + HOLD_FRAMES;
  for (let i = 0; i < totalFrames; i++) {
    const canvas = createCanvas(W, H);
    const ctx = canvas.getContext('2d');

    // Fond
    const bg = ctx.createLinearGradient(0, 0, W, H);
    bg.addColorStop(0, '#3a0d2e');
    bg.addColorStop(1, '#c23a86');
    ctx.fillStyle = bg;
    roundRect(ctx, 0, 0, W, H, 24);
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.3)';
    ctx.lineWidth = 2;
    roundRect(ctx, 5, 5, W - 10, H - 10, 20);
    ctx.stroke();

    ctx.textAlign = 'center';
    ctx.fillStyle = '#ffffff';
    ctx.font = '700 24px "Poppins Bold"';
    ctx.fillText('PILE OU FACE', W / 2, 46);

    const spinT = Math.min(1, i / SPIN_FRAMES);
    // Part d'un angle "sur la tranche" (cos = 0, piece fine) plutot que de 0
    // (cos = 1, piece a plat) : sinon la 1ere frame semble deja immobile.
    const angleStart = Math.PI / 2;
    const angleEnd = TOTAL_ROTATIONS * Math.PI * 2;
    const angle = angleStart + (angleEnd - angleStart) * easeOutCubic(spinT);
    const scaleX = Math.cos(angle);
    const showingResult = scaleX >= 0;
    const label = showingResult ? result : other;
    const coinW = Math.max(8, Math.abs(scaleX) * radius * 2);

    // ombre
    ctx.beginPath();
    ctx.ellipse(centerX, centerY + radius + 22, radius * 0.75, 10, 0, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(0,0,0,0.25)';
    ctx.fill();

    // piece
    ctx.save();
    ctx.translate(centerX, centerY);
    ctx.beginPath();
    ctx.ellipse(0, 0, coinW / 2, radius, 0, 0, Math.PI * 2);
    const coinGrad = ctx.createLinearGradient(-coinW / 2, -radius, coinW / 2, radius);
    coinGrad.addColorStop(0, '#ffe3f2');
    coinGrad.addColorStop(1, '#ff5ca8');
    ctx.fillStyle = coinGrad;
    ctx.fill();
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 4;
    ctx.stroke();

    if (Math.abs(scaleX) > 0.3) {
      ctx.fillStyle = '#7a1854';
      ctx.font = '700 20px "Poppins Bold"';
      ctx.textAlign = 'center';
      ctx.fillText(label === 'pile' ? 'PILE' : 'FACE', 0, 7);
    }
    ctx.restore();

    // resultat final
    if (i >= SPIN_FRAMES) {
      ctx.font = '700 30px "Poppins Bold"';
      ctx.fillStyle = '#ffffff';
      ctx.fillText(`${result === 'pile' ? 'PILE' : 'FACE'} !`, W / 2, 270);
    }

    frames.push(ctx);
    delays.push(i < SPIN_FRAMES ? 30 + Math.floor(easeOutCubic(spinT) * 90) : 900);
  }

  return encodeFrames(frames, { width: W, height: H, delay: delays });
}

module.exports = { renderCoinflipGif };
