require('./fonts');
const { createCanvas, loadImage } = require('@napi-rs/canvas');
const { roundRect, drawCardBackground, clipCircle } = require('./draw');
const { getIcon } = require('./icons');
const { encodeFrames } = require('./gif');

const TIERS = [
  { min: 0, label: 'Débutant', icon: 'seedling' },
  { min: 300, label: 'Actif', icon: 'star' },
  { min: 1000, label: 'VIP', icon: 'gem' },
  { min: 2500, label: 'Premium', icon: 'fire' },
  { min: 5000, label: 'Légende', icon: 'trophy' },
  { min: 10000, label: 'Millionnaire', icon: 'moneybag' },
];

const W = 900;
const H = 320;
const FRAMES = 16;
const DELAY = 90;

const FLOATING_ROSES = [
  { x: 830, y: 60, size: 26, amp: 6, phase: 0, alpha: 0.16 },
  { x: 860, y: 250, size: 32, amp: 7, phase: 2.2, alpha: 0.15 },
  { x: 45, y: 260, size: 20, amp: 4, phase: 4.0, alpha: 0.13 },
];

function getTierInfo(roses) {
  let current = TIERS[0];
  let next = null;
  for (let i = 0; i < TIERS.length; i++) {
    if (roses >= TIERS[i].min) {
      current = TIERS[i];
      next = TIERS[i + 1] ?? null;
    }
  }
  return { current, next };
}

/**
 * @param {object} opts
 * @param {string} opts.username
 * @param {string} opts.avatarURL
 * @param {number} opts.roses
 * @param {number} [opts.rank] position dans le classement (1 = premier)
 * @param {number} [opts.totalMembers]
 * @returns {Promise<Buffer>} GIF anime (halo neon + roses flottantes)
 */
async function renderRosesCard({ username, avatarURL, roses, rank, totalMembers }) {
  const { current: tier, next: nextTier } = getTierInfo(roses);
  const [tierIcon, roseIcon, blossomIcon, avatarImg] = await Promise.all([
    getIcon(tier.icon),
    getIcon('rose'),
    getIcon('blossom'),
    loadImage(avatarURL).catch(() => null),
  ]);

  const avatarX = 100;
  const avatarY = 105;
  const avatarR = 62;
  const boxW = 260;
  const boxH = 84;
  const boxGap = 20;
  const boxY = 172;
  const barX = 40;
  const barY = 280;
  const barW = W - 80;
  const barH = 16;

  const span = nextTier ? nextTier.min - tier.min : 1;
  const progress = nextTier ? Math.min(1, (roses - tier.min) / span) : 1;
  const fillW = Math.max(barH, barW * progress);

  const frames = [];

  for (let f = 0; f < FRAMES; f++) {
    const t = f / FRAMES;
    const canvas = createCanvas(W, H);
    const ctx = canvas.getContext('2d');

    drawCardBackground(ctx, W, H, 28);

    // roses flottantes
    for (const rose of FLOATING_ROSES) {
      const dy = Math.sin(t * Math.PI * 2 + rose.phase) * rose.amp;
      ctx.save();
      ctx.globalAlpha = rose.alpha;
      ctx.drawImage(roseIcon, rose.x - rose.size / 2, rose.y + dy - rose.size / 2, rose.size, rose.size);
      ctx.restore();
    }

    // Bordure neon pulsante
    const pulse = (Math.sin(t * Math.PI * 2) + 1) / 2;
    ctx.save();
    ctx.shadowColor = '#ff2fa0';
    ctx.shadowBlur = 12 + pulse * 20;
    ctx.strokeStyle = 'rgba(255,255,255,0.7)';
    ctx.lineWidth = 2;
    roundRect(ctx, 6, 6, W - 12, H - 12, 24);
    ctx.stroke();
    ctx.restore();

    // --- Avatar avec anneau degrade ---
    ctx.save();
    ctx.beginPath();
    ctx.arc(avatarX, avatarY, avatarR + 7, 0, Math.PI * 2);
    const ring = ctx.createLinearGradient(avatarX - avatarR, avatarY - avatarR, avatarX + avatarR, avatarY + avatarR);
    ring.addColorStop(0, '#ffe3f2');
    ring.addColorStop(1, '#ff5ca8');
    ctx.fillStyle = ring;
    ctx.fill();
    ctx.restore();

    ctx.save();
    clipCircle(ctx, avatarX, avatarY, avatarR);
    if (avatarImg) {
      ctx.drawImage(avatarImg, avatarX - avatarR, avatarY - avatarR, avatarR * 2, avatarR * 2);
    } else {
      ctx.fillStyle = '#ffb6d9';
      ctx.fillRect(avatarX - avatarR, avatarY - avatarR, avatarR * 2, avatarR * 2);
    }
    ctx.restore();

    // petit badge fleur en haut de l'avatar
    const badgeR = 17;
    const badgeX = avatarX;
    const badgeY = avatarY - avatarR - 2;
    ctx.beginPath();
    ctx.arc(badgeX, badgeY, badgeR, 0, Math.PI * 2);
    ctx.fillStyle = '#ff2d78';
    ctx.fill();
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2.5;
    ctx.stroke();
    ctx.drawImage(blossomIcon, badgeX - 12, badgeY - 12, 24, 24);

    // --- Nom + sous-titre ---
    ctx.fillStyle = '#ffffff';
    ctx.font = '600 34px "Poppins SemiBold"';
    ctx.fillText(username, 190, 90);

    ctx.font = '400 19px "Poppins"';
    ctx.fillStyle = 'rgba(255,255,255,0.85)';
    ctx.drawImage(tierIcon, 190, 100, 22, 22);
    ctx.fillText(`Rang ${tier.label} sur Rositaa`, 220, 118);

    // --- Boites de stats ---
    const statBox = (index, label, value, icon) => {
      const x = 40 + index * (boxW + boxGap);
      ctx.fillStyle = 'rgba(255,255,255,0.10)';
      roundRect(ctx, x, boxY, boxW, boxH, 16);
      ctx.fill();
      ctx.strokeStyle = 'rgba(255,255,255,0.20)';
      ctx.lineWidth = 1;
      roundRect(ctx, x, boxY, boxW, boxH, 16);
      ctx.stroke();

      ctx.fillStyle = 'rgba(255,255,255,0.65)';
      ctx.font = '600 12px "Poppins Medium"';
      ctx.fillText(label, x + 18, boxY + 27);

      ctx.fillStyle = '#ffffff';
      ctx.font = '700 25px "Poppins Bold"';
      if (icon) {
        ctx.drawImage(icon, x + 18, boxY + 40, 24, 24);
        ctx.fillText(value, x + 48, boxY + 61);
      } else {
        ctx.fillText(value, x + 18, boxY + 61);
      }
    };

    statBox(0, 'CLASSEMENT', rank ? `#${rank} / ${totalMembers}` : '—', null);
    statBox(1, 'ROSES', roses.toLocaleString('fr-FR'), roseIcon);
    statBox(2, 'PROCHAIN PALIER', nextTier ? nextTier.min.toLocaleString('fr-FR') : 'Max atteint', nextTier ? roseIcon : null);

    // --- Barre de progression ---
    ctx.fillStyle = 'rgba(255,255,255,0.15)';
    roundRect(ctx, barX, barY, barW, barH, 8);
    ctx.fill();

    const barGrad = ctx.createLinearGradient(barX, 0, barX + barW, 0);
    barGrad.addColorStop(0, '#ff5ca8');
    barGrad.addColorStop(1, '#ffe3f2');
    ctx.fillStyle = barGrad;
    roundRect(ctx, barX, barY, fillW, barH, 8);
    ctx.fill();

    ctx.font = '600 13px "Poppins Medium"';
    ctx.fillStyle = 'rgba(255,255,255,0.85)';
    ctx.textAlign = 'right';
    ctx.fillText(`${Math.floor(progress * 100)}%`, barX + barW, barY - 6);
    ctx.textAlign = 'left';

    frames.push(ctx);
  }

  return encodeFrames(frames, { width: W, height: H, delay: DELAY });
}

module.exports = { renderRosesCard, getTierInfo, TIERS };
