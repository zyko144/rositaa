require('./fonts');
const { createCanvas } = require('@napi-rs/canvas');
const { roundRect, drawCardBackground } = require('./draw');
const { getIcon } = require('./icons');

const W = 1000;
const MARGIN_X = 50;
const HEADER_H = 130;
const DATE_HEADER_GAP = 44;
const LINE_H = 28;
const ENTRY_GAP = 14;
const ENTRY_FONT = '400 19px "Poppins"';
const ENTRY_ICON_SPACE = 24;
const BOTTOM_PADDING = 44;
const MAX_ENTRIES = 60;

const RED_NEW = '#ff3b3b';
const RED_NEW_DOT = '#ff2626';

// Titre de version/section (ex: "# FIX ERROR 1.1.0") : bien plus grand,
// coche verte devant, couleur fixe (pas liee au surlignage rouge "nouveau").
const HEADING_LINE_H = 38;
const HEADING_GAP = 22;
const HEADING_FONT = '700 30px "Poppins Bold"';
const HEADING_ICON_SPACE = 40;
const HEADING_ICON_SIZE = 30;

function wrapText(ctx, text, maxWidth) {
  const words = text.split(' ');
  const lines = [];
  let current = '';
  for (const word of words) {
    const test = current ? `${current} ${word}` : word;
    if (current && ctx.measureText(test).width > maxWidth) {
      lines.push(current);
      current = word;
    } else {
      current = test;
    }
  }
  if (current) lines.push(current);
  return lines;
}

function groupByDate(entries) {
  const groups = [];
  const byDate = new Map();
  for (const entry of entries) {
    if (!byDate.has(entry.date)) {
      const group = { date: entry.date, items: [] };
      byDate.set(entry.date, group);
      groups.push(group);
    }
    byDate.get(entry.date).items.push(entry);
  }
  return groups;
}

/**
 * Genere l'image PNG listant l'historique des mises a jour du bot, groupees
 * par date (la plus recente en premier). Les entrees appartenant au dernier
 * lot ajoute (meme `batch`) sont affichees en rouge, tout le reste en blanc.
 * Une entree avec `heading: true` est un titre de version/section : rendue
 * bien plus grande, avec une coche verte devant (couleur fixe, independante
 * du surlignage rouge des nouveautes).
 * @param {{text: string, date: string, batch: string, heading?: boolean}[]} entries
 * @returns {Promise<Buffer>} PNG
 */
async function renderChangelogPng(entries) {
  const checkIcon = await getIcon('check');

  if (!entries || entries.length === 0) {
    const H = 220;
    const canvas = createCanvas(W, H);
    const ctx = canvas.getContext('2d');
    drawCardBackground(ctx, W, H, 28);
    ctx.drawImage(checkIcon, MARGIN_X, 38, 44, 44);
    ctx.fillStyle = '#ffffff';
    ctx.font = '700 34px "Poppins Bold"';
    ctx.fillText('UPDATES & FIX', MARGIN_X + 58, 70);
    ctx.font = '400 18px "Poppins"';
    ctx.fillStyle = 'rgba(255,255,255,0.75)';
    ctx.fillText('Aucune mise à jour enregistrée pour le moment...', MARGIN_X, 150);
    return canvas.encode('png');
  }

  const sorted = [...entries].sort((a, b) => new Date(b.batch) - new Date(a.batch));
  const latestBatch = sorted[0].batch;
  const shown = sorted.slice(0, MAX_ENTRIES);
  const truncatedCount = sorted.length - shown.length;
  const groups = groupByDate(shown);

  // Canvas jetable pour mesurer le texte avant de connaitre la hauteur finale.
  const measureCanvas = createCanvas(W, 100);
  const mctx = measureCanvas.getContext('2d');

  let contentHeight = 0;
  const layoutGroups = groups.map(group => {
    contentHeight += DATE_HEADER_GAP;
    const items = group.items.map(item => {
      const iconSpace = item.heading ? HEADING_ICON_SPACE : ENTRY_ICON_SPACE;
      const lineH = item.heading ? HEADING_LINE_H : LINE_H;
      const gap = item.heading ? HEADING_GAP : ENTRY_GAP;
      mctx.font = item.heading ? HEADING_FONT : ENTRY_FONT;
      const lines = wrapText(mctx, item.text, W - MARGIN_X * 2 - iconSpace);
      contentHeight += lines.length * lineH + gap;
      return { ...item, lines, iconSpace, lineH, gap };
    });
    return { date: group.date, items };
  });

  const H = Math.round(HEADER_H + contentHeight + BOTTOM_PADDING + (truncatedCount > 0 ? 28 : 0));

  const canvas = createCanvas(W, H);
  const ctx = canvas.getContext('2d');
  drawCardBackground(ctx, W, H, 28);

  ctx.textAlign = 'left';
  ctx.drawImage(checkIcon, MARGIN_X, 38, 44, 44);
  ctx.fillStyle = '#ffffff';
  ctx.font = '700 34px "Poppins Bold"';
  ctx.fillText('UPDATES & FIX', MARGIN_X + 58, 70);

  ctx.font = '400 16px "Poppins"';
  ctx.fillStyle = 'rgba(255,255,255,0.7)';
  ctx.fillText('Historique des nouveautés de Rositaa', MARGIN_X + 58, 96);

  ctx.strokeStyle = 'rgba(255,255,255,0.25)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(MARGIN_X, HEADER_H - 14);
  ctx.lineTo(W - MARGIN_X, HEADER_H - 14);
  ctx.stroke();

  let y = HEADER_H + 16;
  for (const group of layoutGroups) {
    ctx.font = '700 23px "Poppins Bold"';
    ctx.fillStyle = '#ffd3ea';
    ctx.fillText(group.date.toUpperCase(), MARGIN_X, y);
    y += DATE_HEADER_GAP;

    for (const item of group.items) {
      if (item.heading) {
        ctx.drawImage(checkIcon, MARGIN_X, y - HEADING_ICON_SIZE + 6, HEADING_ICON_SIZE, HEADING_ICON_SIZE);
        ctx.font = HEADING_FONT;
        ctx.fillStyle = '#ffffff';
        item.lines.forEach((line, i) => {
          ctx.fillText(line, MARGIN_X + item.iconSpace, y + i * item.lineH);
        });
        y += item.lines.length * item.lineH + item.gap;
        continue;
      }

      const isNew = item.batch === latestBatch;
      const dotColor = isNew ? RED_NEW_DOT : 'rgba(255,255,255,0.45)';
      const textColor = isNew ? RED_NEW : 'rgba(255,255,255,0.92)';

      ctx.beginPath();
      ctx.arc(MARGIN_X + 5, y - 7, 5, 0, Math.PI * 2);
      ctx.fillStyle = dotColor;
      ctx.fill();

      ctx.font = ENTRY_FONT;
      ctx.fillStyle = textColor;
      item.lines.forEach((line, i) => {
        ctx.fillText(line, MARGIN_X + item.iconSpace, y + i * item.lineH);
      });
      y += item.lines.length * item.lineH + item.gap;
    }
  }

  if (truncatedCount > 0) {
    ctx.font = '400 15px "Poppins"';
    ctx.fillStyle = 'rgba(255,255,255,0.55)';
    ctx.fillText(`+ ${truncatedCount} mise(s) à jour plus ancienne(s)…`, MARGIN_X, y + 8);
  }

  return canvas.encode('png');
}

module.exports = { renderChangelogPng };
