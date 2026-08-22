require('./fonts');
const { createCanvas } = require('@napi-rs/canvas');
const { roundRect, fitText, stripLeadingEmoji } = require('./draw');
const { getIcon } = require('./icons');

const CATEGORY_ICONS = {
  '👑 Rôles Exclusifs': 'crown',
  '🎰 Boosts Casino': 'slotmachine',
  '🎨 Cosmétiques': 'art',
  '🎭 Fun & Spécial': 'gift',
};

/**
 * @param {object} opts
 * @param {string} opts.category ex: '👑 Rôles Exclusifs'
 * @param {Array}  opts.items jusqu'a 4 items { name, price, desc }
 * @param {number} opts.roses solde de l'utilisateur
 * @param {number} opts.page 0-index
 * @param {number} opts.totalPages
 * @returns {Promise<Buffer>} PNG
 */
async function renderShopCard({ category, items, roses, page, totalPages }) {
  const W = 900;
  const H = 420;
  const canvas = createCanvas(W, H);
  const ctx = canvas.getContext('2d');

  const categoryLabel = stripLeadingEmoji(category);
  const [categoryIcon, roseIcon, checkIcon] = await Promise.all([
    getIcon(CATEGORY_ICONS[category] ?? 'gift'),
    getIcon('rose'),
    getIcon('check'),
  ]);

  // --- Fond ---
  const bg = ctx.createLinearGradient(0, 0, W, H);
  bg.addColorStop(0, '#3a0d2e');
  bg.addColorStop(0.55, '#8a1f5c');
  bg.addColorStop(1, '#e0559f');
  ctx.fillStyle = bg;
  roundRect(ctx, 0, 0, W, H, 28);
  ctx.fill();

  const glow = ctx.createRadialGradient(W / 2, 0, 10, W / 2, 0, 500);
  glow.addColorStop(0, 'rgba(255,200,225,0.35)');
  glow.addColorStop(1, 'rgba(255,200,225,0)');
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, W, H);

  ctx.strokeStyle = 'rgba(255,255,255,0.35)';
  ctx.lineWidth = 2;
  roundRect(ctx, 6, 6, W - 12, H - 12, 24);
  ctx.stroke();

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
  const cardW = 400;
  const cardH = 130;
  const gap = 20;
  const startX = 40;
  const startY = 100;

  for (let i = 0; i < 4; i++) {
    const item = items[i];
    const col = i % 2;
    const row = Math.floor(i / 2);
    const x = startX + col * (cardW + gap);
    const y = startY + row * (cardH + gap);

    if (!item) continue;
    const affordable = roses >= item.price;

    ctx.fillStyle = 'rgba(255,255,255,0.10)';
    roundRect(ctx, x, y, cardW, cardH, 18);
    ctx.fill();
    ctx.strokeStyle = affordable ? 'rgba(255,255,255,0.35)' : 'rgba(255,255,255,0.15)';
    ctx.lineWidth = 1.5;
    roundRect(ctx, x, y, cardW, cardH, 18);
    ctx.stroke();

    // accent gauche
    ctx.fillStyle = affordable ? '#ff5ca8' : 'rgba(255,255,255,0.25)';
    roundRect(ctx, x, y, 6, cardH, { tl: 18, bl: 18, tr: 0, br: 0 });
    ctx.fill();

    // nom
    ctx.fillStyle = '#ffffff';
    ctx.font = '700 19px "Poppins Bold"';
    ctx.fillText(fitText(ctx, stripLeadingEmoji(item.name), cardW - 110), x + 24, y + 32);

    // prix
    ctx.drawImage(roseIcon, x + cardW - 76, y + 16, 20, 20);
    ctx.font = '700 17px "Poppins Bold"';
    ctx.fillStyle = affordable ? '#ffe3f2' : 'rgba(255,255,255,0.5)';
    ctx.fillText(item.price.toLocaleString('fr-FR'), x + cardW - 52, y + 32);

    // description (2 lignes max)
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

    // statut
    if (affordable) {
      ctx.drawImage(checkIcon, x + cardW - 34, y + cardH - 34, 18, 18);
    }
  }

  // footer pagination
  ctx.font = '600 13px "Poppins Medium"';
  ctx.fillStyle = 'rgba(255,255,255,0.6)';
  ctx.textAlign = 'center';
  ctx.fillText(`Page ${page + 1} / ${totalPages}`, W / 2, H - 22);
  ctx.textAlign = 'left';

  return canvas.encode('png');
}

module.exports = { renderShopCard };
