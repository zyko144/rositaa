function roundRect(ctx, x, y, w, h, r) {
  const radius = typeof r === 'number' ? { tl: r, tr: r, br: r, bl: r } : r;
  ctx.beginPath();
  ctx.moveTo(x + radius.tl, y);
  ctx.lineTo(x + w - radius.tr, y);
  ctx.arcTo(x + w, y, x + w, y + radius.tr, radius.tr);
  ctx.lineTo(x + w, y + h - radius.br);
  ctx.arcTo(x + w, y + h, x + w - radius.br, y + h, radius.br);
  ctx.lineTo(x + radius.bl, y + h);
  ctx.arcTo(x, y + h, x, y + h - radius.bl, radius.bl);
  ctx.lineTo(x, y + radius.tl);
  ctx.arcTo(x, y, x + radius.tl, y, radius.tl);
  ctx.closePath();
}

/** Fond de carte partage : degrade rose riche (4 tons) + deux halos
 * colores en diagonale pour la profondeur. Dessine un rectangle arrondi
 * rempli, pret a recevoir le reste du contenu par dessus. */
function drawCardBackground(ctx, W, H, radius = 24) {
  const bg = ctx.createLinearGradient(0, 0, W, H);
  bg.addColorStop(0, '#2d0b28');
  bg.addColorStop(0.35, '#6e1a52');
  bg.addColorStop(0.7, '#c93d8e');
  bg.addColorStop(1, '#ff6fb0');
  ctx.fillStyle = bg;
  roundRect(ctx, 0, 0, W, H, radius);
  ctx.fill();

  const glowWarm = ctx.createRadialGradient(W * 0.18, H * 0.25, 10, W * 0.18, H * 0.25, W * 0.5);
  glowWarm.addColorStop(0, 'rgba(255,190,225,0.40)');
  glowWarm.addColorStop(1, 'rgba(255,190,225,0)');
  ctx.fillStyle = glowWarm;
  ctx.fillRect(0, 0, W, H);

  const glowCool = ctx.createRadialGradient(W * 0.85, H * 0.85, 10, W * 0.85, H * 0.85, W * 0.45);
  glowCool.addColorStop(0, 'rgba(140,60,180,0.25)');
  glowCool.addColorStop(1, 'rgba(140,60,180,0)');
  ctx.fillStyle = glowCool;
  ctx.fillRect(0, 0, W, H);
}

function clipCircle(ctx, cx, cy, radius) {
  ctx.beginPath();
  ctx.arc(cx, cy, radius, 0, Math.PI * 2);
  ctx.closePath();
  ctx.clip();
}

/** Retire un emoji (et l'espace qui suit) en debut de chaine : les polices
 * texte n'ont pas de glyphes emoji fiables, on affiche l'icone separement. */
function stripLeadingEmoji(str) {
  return str.replace(/^\p{Extended_Pictographic}️?\s*/u, '').trim();
}

/** Tronque un texte a une largeur max en pixels, ajoute "..." si besoin. */
function fitText(ctx, text, maxWidth) {
  if (ctx.measureText(text).width <= maxWidth) return text;
  let truncated = text;
  while (truncated.length > 1 && ctx.measureText(truncated + '…').width > maxWidth) {
    truncated = truncated.slice(0, -1);
  }
  return truncated + '…';
}

module.exports = { roundRect, drawCardBackground, clipCircle, fitText, stripLeadingEmoji };
