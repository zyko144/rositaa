require('./fonts');
const { createCanvas, loadImage } = require('@napi-rs/canvas');
const { roundRect, drawCardBackground, clipCircle } = require('./draw');
const { getIcon } = require('./icons');
const { encodeFrames } = require('./gif');

const W = 900;
const H = 340;
const FRAMES = 16;
const DELAY = 90;

const AVATAR_X = 128;
const AVATAR_Y = 128;
const AVATAR_R = 72;
const TEXT_X = 230;

const BOX_Y = 232;
const BOX_H = 84;
const BOX_GAP = 24;
const BOX_MARGIN_X = 40;
const BOX_W = (W - BOX_MARGIN_X * 2 - BOX_GAP) / 2;

/**
 * Carte affichee quand un membre rejoint via un lien d'invitation : met en
 * avant celui qui a invite (avatar, total d'invitations, rang). Design
 * epure : un seul point focal (avatar + nom), deux blocs de stats larges
 * et bien espaces, pas de decoration superflue autour.
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

  const frames = [];

  for (let f = 0; f < FRAMES; f++) {
    const t = f / FRAMES;
    const canvas = createCanvas(W, H);
    const ctx = canvas.getContext('2d');

    drawCardBackground(ctx, W, H, 28);

    const pulse = (Math.sin(t * Math.PI * 2) + 1) / 2;
    ctx.save();
    ctx.shadowColor = '#ff2fa0';
    ctx.shadowBlur = 10 + pulse * 16;
    ctx.strokeStyle = 'rgba(255,255,255,0.6)';
    ctx.lineWidth = 2;
    roundRect(ctx, 6, 6, W - 12, H - 12, 24);
    ctx.stroke();
    ctx.restore();

    // Avatar avec anneau degrade
    ctx.save();
    ctx.beginPath();
    ctx.arc(AVATAR_X, AVATAR_Y, AVATAR_R + 8, 0, Math.PI * 2);
    const ring = ctx.createLinearGradient(AVATAR_X - AVATAR_R, AVATAR_Y - AVATAR_R, AVATAR_X + AVATAR_R, AVATAR_Y + AVATAR_R);
    ring.addColorStop(0, '#ffe3f2');
    ring.addColorStop(1, '#ff5ca8');
    ctx.fillStyle = ring;
    ctx.fill();
    ctx.restore();

    ctx.save();
    clipCircle(ctx, AVATAR_X, AVATAR_Y, AVATAR_R);
    if (avatarImg) {
      ctx.drawImage(avatarImg, AVATAR_X - AVATAR_R, AVATAR_Y - AVATAR_R, AVATAR_R * 2, AVATAR_R * 2);
    } else {
      ctx.fillStyle = '#ffb6d9';
      ctx.fillRect(AVATAR_X - AVATAR_R, AVATAR_Y - AVATAR_R, AVATAR_R * 2, AVATAR_R * 2);
    }
    ctx.restore();

    const badgeCx = AVATAR_X + AVATAR_R * 0.72;
    const badgeCy = AVATAR_Y + AVATAR_R * 0.72;
    const badgeR = 19;
    ctx.beginPath();
    ctx.arc(badgeCx, badgeCy, badgeR, 0, Math.PI * 2);
    ctx.fillStyle = '#ff2d78';
    ctx.fill();
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 3;
    ctx.stroke();
    ctx.drawImage(blossomIcon, badgeCx - 13, badgeCy - 13, 26, 26);

    // Nom + sous-titre : une seule colonne de texte, bien espacee verticalement
    ctx.textAlign = 'left';
    ctx.fillStyle = 'rgba(255,255,255,0.65)';
    ctx.font = '600 15px "Poppins Medium"';
    ctx.fillText('NOUVELLE INVITATION', TEXT_X, 76);

    ctx.fillStyle = '#ffffff';
    ctx.font = '700 38px "Poppins Bold"';
    ctx.fillText(inviterUsername, TEXT_X, 120);

    ctx.font = '400 20px "Poppins"';
    ctx.fillStyle = 'rgba(255,255,255,0.85)';
    ctx.fillText(`vient d'inviter ${newMemberUsername} !`, TEXT_X, 154);

    // Deux blocs de stats larges, repartis sur toute la largeur de la carte
    const statBox = (index, label, value, icon) => {
      const x = BOX_MARGIN_X + index * (BOX_W + BOX_GAP);
      ctx.fillStyle = 'rgba(255,255,255,0.10)';
      roundRect(ctx, x, BOX_Y, BOX_W, BOX_H, 18);
      ctx.fill();
      ctx.strokeStyle = 'rgba(255,255,255,0.20)';
      ctx.lineWidth = 1;
      roundRect(ctx, x, BOX_Y, BOX_W, BOX_H, 18);
      ctx.stroke();

      ctx.textAlign = 'left';
      ctx.fillStyle = 'rgba(255,255,255,0.65)';
      ctx.font = '600 14px "Poppins Medium"';
      ctx.fillText(label, x + 24, BOX_Y + 30);

      ctx.fillStyle = '#ffffff';
      ctx.font = '700 30px "Poppins Bold"';
      if (icon) {
        ctx.drawImage(icon, x + 24, BOX_Y + 42, 28, 28);
        ctx.fillText(value, x + 60, BOX_Y + 66);
      } else {
        ctx.fillText(value, x + 24, BOX_Y + 66);
      }
    };

    statBox(0, 'TOTAL INVITATIONS', `${totalInvites}`, giftIcon);
    statBox(1, 'CLASSEMENT', rank ? `#${rank} / ${totalInviters}` : '—', rank ? trophyIcon : null);

    frames.push(ctx);
  }

  return encodeFrames(frames, { width: W, height: H, delay: DELAY });
}

module.exports = { renderInviteCard };
