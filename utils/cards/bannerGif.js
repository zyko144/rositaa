require('./fonts');
const { createCanvas } = require('@napi-rs/canvas');
const { roundRect } = require('./draw');
const { getIcon } = require('./icons');
const { encodeFrames } = require('./gif');

const W = 700;
const H = 200;
const FRAMES = 14;
const DELAY = 90;

const FLOATING_ROSES = [
  { x: 60, y: 40, size: 22, amp: 5, phase: 0, alpha: 0.15 },
  { x: 640, y: 160, size: 26, amp: 6, phase: 2.1, alpha: 0.16 },
  { x: 610, y: 45, size: 18, amp: 4, phase: 3.6, alpha: 0.13 },
];

/**
 * Banniere generique reutilisable pour les embeds : titre + icone, degrade
 * rose, bordure neon pulsante, roses flottantes en fond. Le resultat est
 * deterministe (pas de donnees dynamiques) donc appelable une seule fois et
 * mis en cache par l'appelant.
 * @param {object} opts
 * @param {string} opts.icon cle d'icone (voir assets/icons)
 * @param {string} opts.label ex: "MODERATION"
 * @returns {Promise<Buffer>} GIF anime
 */
async function renderBannerGif({ icon, label }) {
  const [iconImg, roseIcon] = await Promise.all([getIcon(icon), getIcon('rose')]);
  const frames = [];

  for (let f = 0; f < FRAMES; f++) {
    const t = f / FRAMES;
    const canvas = createCanvas(W, H);
    const ctx = canvas.getContext('2d');

    const bg = ctx.createLinearGradient(0, 0, W, H);
    bg.addColorStop(0, '#3a0d2e');
    bg.addColorStop(0.55, '#8a1f5c');
    bg.addColorStop(1, '#e0559f');
    ctx.fillStyle = bg;
    roundRect(ctx, 0, 0, W, H, 22);
    ctx.fill();

    const glow = ctx.createRadialGradient(W / 2, H / 2, 10, W / 2, H / 2, 420);
    glow.addColorStop(0, 'rgba(255,200,225,0.30)');
    glow.addColorStop(1, 'rgba(255,200,225,0)');
    ctx.fillStyle = glow;
    ctx.fillRect(0, 0, W, H);

    for (const rose of FLOATING_ROSES) {
      const dy = Math.sin(t * Math.PI * 2 + rose.phase) * rose.amp;
      ctx.save();
      ctx.globalAlpha = rose.alpha;
      ctx.drawImage(roseIcon, rose.x - rose.size / 2, rose.y + dy - rose.size / 2, rose.size, rose.size);
      ctx.restore();
    }

    const pulse = (Math.sin(t * Math.PI * 2) + 1) / 2;
    ctx.save();
    ctx.shadowColor = '#ff2fa0';
    ctx.shadowBlur = 10 + pulse * 18;
    ctx.strokeStyle = 'rgba(255,255,255,0.65)';
    ctx.lineWidth = 2;
    roundRect(ctx, 5, 5, W - 10, H - 10, 18);
    ctx.stroke();
    ctx.restore();

    const iconSize = 62;
    const bob = Math.sin(t * Math.PI * 2) * 3;
    ctx.drawImage(iconImg, W / 2 - iconSize / 2, 46 + bob - iconSize / 2, iconSize, iconSize);

    ctx.textAlign = 'center';
    ctx.fillStyle = '#ffffff';
    ctx.font = '700 26px "Poppins Bold"';
    ctx.fillText(label, W / 2, 148);
    ctx.font = '400 14px "Poppins"';
    ctx.fillStyle = 'rgba(255,255,255,0.7)';
    ctx.fillText('ROSITAA', W / 2, 172);

    frames.push(ctx);
  }

  return encodeFrames(frames, { width: W, height: H, delay: DELAY });
}

module.exports = { renderBannerGif };
