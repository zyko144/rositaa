require('./fonts');
const { createCanvas } = require('@napi-rs/canvas');
const { roundRect, drawCardBackground, fitText, stripLeadingEmoji } = require('./draw');
const { getIcon } = require('./icons');
const { encodeFrames } = require('./gif');

const CATEGORY_ICONS = {
  '👑 Rôles Exclusifs': 'crown',
  '🎰 Boosts Casino': 'slotmachine',
  '🎨 Cosmétiques': 'art',
  '🎭 Fun & Spécial': 'gift',
};

const W = 900;
const H = 420;
const FRAMES = 16;
const DELAY = 90;

// Petites roses decoratives qui flottent doucement en fond (position de base
// + amplitude + dephasage pour ne pas toutes bouger pareil).
const FLOATING_ROSES = [
  { x: 70, y: 355, size: 34, amp: 6, phase: 0, alpha: 0.16 },
  { x: 830, y: 90, size: 28, amp: 5, phase: 1.4, alpha: 0.14 },
  { x: 860, y: 340, size: 40, amp: 7, phase: 2.6, alpha: 0.18 },
  { x: 30, y: 120, size: 24, amp: 4, phase: 4.1, alpha: 0.13 },
];

/**
 * @param {object} opts
 * @param {string} opts.category
 * @param {Array}  opts.items jusqu'a 4 items { name, price, desc }
 * @param {number} opts.roses
 * @param {number} opts.page 0-index
 * @param {number} opts.totalPages
 * @returns {Promise<Buffer>} GIF anime (halo neon + roses flottantes)
 */
async function renderShopGif({ category, items, roses, page, totalPages }) {
  const categoryLabel = stripLeadingEmoji(category);
  const [categoryIcon, roseIcon, checkIcon] = await Promise.all([
    getIcon(CATEGORY_ICONS[category] ?? 'gift'),
    getIcon('rose'),
    getIcon('check'),
  ]);

  const cardW = 400;
  const cardH = 130;
  const gap = 20;
  const startX = 40;
  const startY = 100;

  const frames = [];

  for (let f = 0; f < FRAMES; f++) {
    const t = f / FRAMES; // 0..1, boucle complete
    const canvas = createCanvas(W, H);
    const ctx = canvas.getContext('2d');

    drawCardBackground(ctx, W, H, 28);

    // roses flottantes (derriere le contenu)
    for (const rose of FLOATING_ROSES) {
      const dy = Math.sin(t * Math.PI * 2 + rose.phase) * rose.amp;
      ctx.save();
      ctx.globalAlpha = rose.alpha;
      ctx.drawImage(roseIcon, rose.x - rose.size / 2, rose.y + dy - rose.size / 2, rose.size, rose.size);
      ctx.restore();
    }

    // --- Bordure neon pulsante ---
    const pulse = (Math.sin(t * Math.PI * 2) + 1) / 2; // 0..1
    ctx.save();
    ctx.shadowColor = '#ff2fa0';
    ctx.shadowBlur = 14 + pulse * 22;
    ctx.strokeStyle = 'rgba(255,255,255,0.7)';
    ctx.lineWidth = 2.5;
    roundRect(ctx, 6, 6, W - 12, H - 12, 24);
    ctx.stroke();
    ctx.restore();

    // --- En-tete ---
    ctx.drawImage(categoryIcon, 40, 32, 44, 44);
    ctx.fillStyle = '#ffffff';
    ctx.font = '700 30px "Poppins Bold"';
    ctx.fillText('Boutique Rositaa', 96, 55);
    ctx.font = '400 17px "Poppins"';
    ctx.fillStyle = 'rgba(255,255,255,0.8)';
    ctx.fillText(categoryLabel, 96, 78);

    // pill solde
    const pillText = `${roses.toLocaleString('fr-FR')}`;
    ctx.font = '700 20px "Poppins Bold"';
    const pillTextW = ctx.measureText(pillText).width;
    const pillW = pillTextW + 66;
    const pillH = 44;
    const pillX = W - 40 - pillW;
    const pillY = 34;
    ctx.fillStyle = 'rgba(255,255,255,0.15)';
    roundRect(ctx, pillX, pillY, pillW, pillH, 22);
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.3)';
    ctx.lineWidth = 1;
    roundRect(ctx, pillX, pillY, pillW, pillH, 22);
    ctx.stroke();
    ctx.drawImage(roseIcon, pillX + 14, pillY + 10, 24, 24);
    ctx.fillStyle = '#ffffff';
    ctx.fillText(pillText, pillX + 46, pillY + 29);

    // --- Grille 2x2 d'articles ---
    for (let i = 0; i < 4; i++) {
      const item = items[i];
      if (!item) continue;
      const col = i % 2;
      const row = Math.floor(i / 2);
      const x = startX + col * (cardW + gap);
      const y = startY + row * (cardH + gap);
      const affordable = roses >= item.price;

      ctx.fillStyle = 'rgba(255,255,255,0.10)';
      roundRect(ctx, x, y, cardW, cardH, 18);
      ctx.fill();
      ctx.strokeStyle = affordable ? 'rgba(255,255,255,0.35)' : 'rgba(255,255,255,0.15)';
      ctx.lineWidth = 1.5;
      roundRect(ctx, x, y, cardW, cardH, 18);
      ctx.stroke();

      ctx.fillStyle = affordable ? '#ff5ca8' : 'rgba(255,255,255,0.25)';
      roundRect(ctx, x, y, 6, cardH, { tl: 18, bl: 18, tr: 0, br: 0 });
      ctx.fill();

      ctx.fillStyle = '#ffffff';
      ctx.font = '700 19px "Poppins Bold"';
      ctx.fillText(fitText(ctx, stripLeadingEmoji(item.name), cardW - 110), x + 24, y + 32);

      ctx.drawImage(roseIcon, x + cardW - 76, y + 16, 20, 20);
      ctx.font = '700 17px "Poppins Bold"';
      ctx.fillStyle = affordable ? '#ffe3f2' : 'rgba(255,255,255,0.5)';
      ctx.fillText(item.price.toLocaleString('fr-FR'), x + cardW - 52, y + 32);

      ctx.font = '400 14px "Poppins"';
      ctx.fillStyle = 'rgba(255,255,255,0.75)';
      const words = item.desc.split(' ');
      let line = '';
      let lineY = y + 58;
      let linesDrawn = 0;
      for (const word of words) {
        const test = line ? `${line} ${word}` : word;
        if (ctx.measureText(test).width > cardW - 48 && line) {
          ctx.fillText(line, x + 24, lineY);
          line = word;
          lineY += 20;
          linesDrawn++;
          if (linesDrawn === 2) { line = ''; break; }
        } else {
          line = test;
        }
      }
      if (line && linesDrawn < 2) ctx.fillText(fitText(ctx, line, cardW - 48), x + 24, lineY);

      if (affordable) {
        ctx.drawImage(checkIcon, x + cardW - 34, y + cardH - 34, 18, 18);
      }
    }

    ctx.font = '600 13px "Poppins Medium"';
    ctx.fillStyle = 'rgba(255,255,255,0.6)';
    ctx.textAlign = 'center';
    ctx.fillText(`Page ${page + 1} / ${totalPages} • Choisis un article dans le menu ci-dessous`, W / 2, H - 22);
    ctx.textAlign = 'left';

    frames.push(ctx);
  }

  return encodeFrames(frames, { width: W, height: H, delay: DELAY });
}

module.exports = { renderShopGif };
