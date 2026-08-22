require('./fonts');
const { createCanvas } = require('@napi-rs/canvas');
const { roundRect, drawCardBackground, stripLeadingEmoji, fitText } = require('./draw');
const { getIcon } = require('./icons');
const { encodeFrames } = require('./gif');
const { CATEGORY_ORDER, CATEGORIES, buildRegistry } = require('../helpRegistry');

const W = 900;
const MARGIN_X = 44;
const HEADER_H = 92;

const PILL_COLS = 4;
const PILL_GAP = 10;
const PILL_H = 44;
const PILL_ICON = 20;
const PILLS_TO_SECTION_GAP = 30;
const SECTION_TITLE_BLOCK_H = 36;
const DIVIDER_TO_LIST_GAP = 26;

const CMD_LINE_H = 22;
const CMD_NAME_DESC_GAP = 4;
const CMD_GAP = 14;
const CMD_FONT = '400 16px "Poppins"';
const CMD_NAME_FONT = '700 17px "Poppins Bold"';
const FOOTER_H = 46;

const FRAMES = 16;
const DELAY = 90;

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

async function loadIcons() {
  const entries = await Promise.all(
    CATEGORY_ORDER.map(async key => [key, await getIcon(CATEGORIES[key].icon)])
  );
  return Object.fromEntries(entries);
}

function pillGridHeight(count) {
  const rows = Math.ceil(count / PILL_COLS);
  return rows * PILL_H + (rows - 1) * PILL_GAP;
}

/** Mesure les descriptions (deja depourvues d'emoji de tete) pour la categorie active. */
function layoutCommands(mctx, commands) {
  const textMaxWidth = W - MARGIN_X * 2;
  let height = 0;
  const laidOut = commands.map(cmd => {
    mctx.font = CMD_FONT;
    const descLines = wrapText(mctx, stripLeadingEmoji(cmd.description), textMaxWidth);
    height += CMD_LINE_H + CMD_NAME_DESC_GAP + descLines.length * CMD_LINE_H + CMD_GAP;
    return { ...cmd, descLines };
  });
  return { laidOut, height };
}

async function computeLayout(activeCategory) {
  const registry = buildRegistry();
  const commands = registry.get(activeCategory) || [];

  const measureCanvas = createCanvas(W, 100);
  const mctx = measureCanvas.getContext('2d');
  const { laidOut, height: commandsHeight } = layoutCommands(mctx, commands);

  const listStartY = HEADER_H + pillGridHeight(CATEGORY_ORDER.length) + PILLS_TO_SECTION_GAP + SECTION_TITLE_BLOCK_H + DIVIDER_TO_LIST_GAP;
  const H = Math.round(listStartY + commandsHeight + FOOTER_H);

  return { registry, laidOutCommands: laidOut, H };
}

function drawHelpFrame(ctx, { registry, activeCategory, laidOutCommands, H }, icons, t) {
  drawCardBackground(ctx, W, H, 28);

  const pulse = (Math.sin(t * Math.PI * 2) + 1) / 2;
  ctx.save();
  ctx.shadowColor = '#ff2fa0';
  ctx.shadowBlur = 8 + pulse * 14;
  ctx.strokeStyle = 'rgba(255,255,255,0.55)';
  ctx.lineWidth = 2;
  roundRect(ctx, 5, 5, W - 10, H - 10, 24);
  ctx.stroke();
  ctx.restore();

  // En-tete
  ctx.textAlign = 'left';
  ctx.fillStyle = '#ffffff';
  ctx.font = '700 32px "Poppins Bold"';
  ctx.fillText("CENTRE D'AIDE", MARGIN_X, 48);

  const totalCmds = CATEGORY_ORDER.reduce((sum, key) => sum + registry.get(key).length, 0);
  ctx.font = '400 16px "Poppins"';
  ctx.fillStyle = 'rgba(255,255,255,0.7)';
  ctx.fillText(`${totalCmds} commandes disponibles, réparties par catégorie`, MARGIN_X, 74);

  // Grille de pastilles categories
  const pillsY = HEADER_H;
  const pillW = (W - MARGIN_X * 2 - (PILL_COLS - 1) * PILL_GAP) / PILL_COLS;
  CATEGORY_ORDER.forEach((key, i) => {
    const col = i % PILL_COLS;
    const row = Math.floor(i / PILL_COLS);
    const x = MARGIN_X + col * (pillW + PILL_GAP);
    const py = pillsY + row * (PILL_H + PILL_GAP);
    const active = key === activeCategory;

    if (active) {
      const grad = ctx.createLinearGradient(x, py, x + pillW, py + PILL_H);
      grad.addColorStop(0, '#ff2d95');
      grad.addColorStop(1, '#ff6fb0');
      ctx.fillStyle = grad;
      roundRect(ctx, x, py, pillW, PILL_H, 14);
      ctx.fill();
    } else {
      ctx.fillStyle = 'rgba(255,255,255,0.08)';
      roundRect(ctx, x, py, pillW, PILL_H, 14);
      ctx.fill();
      ctx.strokeStyle = 'rgba(255,255,255,0.18)';
      ctx.lineWidth = 1;
      roundRect(ctx, x, py, pillW, PILL_H, 14);
      ctx.stroke();
    }

    ctx.drawImage(icons[key], x + 10, py + (PILL_H - PILL_ICON) / 2, PILL_ICON, PILL_ICON);
    ctx.font = active ? '700 13px "Poppins Bold"' : '600 13px "Poppins Medium"';
    ctx.fillStyle = active ? '#ffffff' : 'rgba(255,255,255,0.75)';
    const label = fitText(ctx, CATEGORIES[key].label, pillW - 40);
    ctx.fillText(label, x + 36, py + PILL_H / 2 + 5);
  });

  // Titre de la categorie active
  let y = pillsY + pillGridHeight(CATEGORY_ORDER.length) + PILLS_TO_SECTION_GAP;
  const cat = CATEGORIES[activeCategory];
  ctx.drawImage(icons[activeCategory], MARGIN_X, y - 22, 28, 28);
  ctx.font = '700 22px "Poppins Bold"';
  ctx.fillStyle = '#ffd3ea';
  ctx.fillText(cat.label.toUpperCase(), MARGIN_X + 38, y);
  y += SECTION_TITLE_BLOCK_H;

  ctx.strokeStyle = 'rgba(255,255,255,0.2)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(MARGIN_X, y);
  ctx.lineTo(W - MARGIN_X, y);
  ctx.stroke();
  y += DIVIDER_TO_LIST_GAP;

  // Liste des commandes de la categorie active
  for (const cmd of laidOutCommands) {
    ctx.font = CMD_NAME_FONT;
    ctx.fillStyle = '#ffffff';
    ctx.fillText(`/${cmd.name}`, MARGIN_X, y);
    y += CMD_LINE_H + CMD_NAME_DESC_GAP;

    ctx.font = CMD_FONT;
    ctx.fillStyle = 'rgba(255,255,255,0.75)';
    cmd.descLines.forEach((line, i) => {
      ctx.fillText(line, MARGIN_X, y + i * CMD_LINE_H);
    });
    y += cmd.descLines.length * CMD_LINE_H + CMD_GAP;
  }

  // Pied de page
  ctx.font = '400 14px "Poppins"';
  ctx.fillStyle = 'rgba(255,255,255,0.55)';
  ctx.textAlign = 'center';
  ctx.fillText('Utilise le menu déroulant ci-dessous pour changer de catégorie', W / 2, H - 20);
  ctx.textAlign = 'left';
}

async function renderHelpGif({ activeCategory }) {
  const icons = await loadIcons();
  const { registry, laidOutCommands, H } = await computeLayout(activeCategory);

  const frames = [];
  for (let f = 0; f < FRAMES; f++) {
    const t = f / FRAMES;
    const canvas = createCanvas(W, H);
    const ctx = canvas.getContext('2d');
    drawHelpFrame(ctx, { registry, activeCategory, laidOutCommands, H }, icons, t);
    frames.push(ctx);
  }
  return encodeFrames(frames, { width: W, height: H, delay: DELAY });
}

async function renderHelpPng({ activeCategory }) {
  const icons = await loadIcons();
  const { registry, laidOutCommands, H } = await computeLayout(activeCategory);

  const canvas = createCanvas(W, H);
  const ctx = canvas.getContext('2d');
  drawHelpFrame(ctx, { registry, activeCategory, laidOutCommands, H }, icons, 0.25);
  return canvas.encode('png');
}

module.exports = { renderHelpGif, renderHelpPng };
