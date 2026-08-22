require('./fonts');
const { createCanvas, loadImage } = require('@napi-rs/canvas');
const { roundRect, drawCardBackground, clipCircle } = require('./draw');
const { getIcon } = require('./icons');
const { encodeFrames } = require('./gif');

const W = 900;
const H = 320;
const FRAMES = 16;
const DELAY = 90;

const FLOATING_ROSES = [
  { x: 830, y: 60, size: 26, amp: 6, phase: 0, alpha: 0.16 },
  { x: 860, y: 250, size: 32, amp: 7, phase: 2.2, alpha: 0.15 },
  { x: 45, y: 260, size: 20, amp: 4, phase: 4.0, alpha: 0.13 },
];

/**
 * Carte affichee quand un membre rejoint via un lien d'invitation : met en
 * avant celui qui a invite (avatar, total d'invitations, rang).
 * @param {object} opts
 * @param {string} opts.inviterUsername
 * @param {string} opts.inviterAvatarURL
 * @param {string} opts.newMemberUsername
 * @param {number} opts.totalInvites
 * @param {number} [opts.rank]
 * @param {number} [opts.totalInviters]
 * @returns {Promise<Buffer>} GIF anime
 */
async function renderInviteCard({ inviterUsername, inviterAvatarURL, newMemberUsername, totalInvites, rank, totalInviters }) {
  const [giftIcon, trophyIcon, blossomIcon, avatarImg] = await Promise.all([
    getIcon('gift'),
    getIcon('trophy'),
    getIcon('blossom'),
    loadImage(inviterAvatarURL).catch(() => null),
  ]);

  const avatarX = 100;
  const avatarY = 105;
  const avatarR = 62;
  const boxW = 260;
  const boxH = 84;
  const boxGap = 20;
  const boxY = 172;

  const frames = [];

  for (let f = 0; f < FRAMES; f++) {
    const t = f / FRAMES;
    const canvas = createCanvas(W, H);
    const ctx = canvas.getContext('2d');

    drawCardBackground(ctx, W, H, 28);

    for (const rose of FLOATING_ROSES) {
      const dy = Math.sin(t * Math.PI * 2 + rose.phase) * rose.amp;
      ctx.save();
      ctx.globalAlpha = rose.alpha;
      ctx.drawImage(giftIcon, rose.x - rose.size / 2, rose.y + dy - rose.size / 2, rose.size, rose.size);
      ctx.restore();
    }

    const pulse = (Math.sin(t * Math.PI * 2) + 1) / 2;
    ctx.save();
    ctx.shadowColor = '#ff2fa0';
    ctx.shadowBlur = 12 + pulse * 20;
    ctx.strokeStyle = 'rgba(255,255,255,0.7)';
    ctx.lineWidth = 2;
    roundRect(ctx, 6, 6, W - 12, H - 12, 24);
    ctx.stroke();
    ctx.restore();

    // Avatar avec anneau
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

    const badgeR = 17;
    ctx.beginPath();
    ctx.arc(avatarX, avatarY - avatarR - 2, badgeR, 0, Math.PI * 2);
    ctx.fillStyle = '#ff2d78';
    ctx.fill();
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2.5;
    ctx.stroke();
    ctx.drawImage(blossomIcon, avatarX - 12, avatarY - avatarR - 2 - 12, 24, 24);

    // Nom + sous-titre
    ctx.fillStyle = '#ffffff';
    ctx.font = '600 32px "Poppins SemiBold"';
    ctx.fillText(inviterUsername, 190, 88);

    ctx.font = '400 18px "Poppins"';
    ctx.fillStyle = 'rgba(255,255,255,0.85)';
    ctx.drawImage(giftIcon, 190, 100, 20, 20);
    ctx.fillText(`vient d'inviter ${newMemberUsername} !`, 216, 118);

    // Boites de stats
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

    statBox(0, 'TOTAL INVITATIONS', `${totalInvites}`, giftIcon);
    statBox(1, 'CLASSEMENT', rank ? `#${rank} / ${totalInviters}` : '—', rank ? trophyIcon : null);

    frames.push(ctx);
  }

  return encodeFrames(frames, { width: W, height: H, delay: DELAY });
}

module.exports = { renderInviteCard };
