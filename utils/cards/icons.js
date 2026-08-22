// Icones emoji en PNG (Twemoji), chargees une fois et mises en cache.
// Necessaire car les polices texte n'ont pas de glyphes emoji fiables sur
// tous les environnements (Render en particulier) : dessiner l'image donne
// un rendu identique partout.
const path = require('path');
const { loadImage } = require('@napi-rs/canvas');

const ICONS_DIR = path.join(__dirname, '..', '..', 'assets', 'icons');
const cache = new Map();

async function getIcon(name) {
  if (cache.has(name)) return cache.get(name);
  const promise = loadImage(path.join(ICONS_DIR, `${name}.png`));
  cache.set(name, promise);
  return promise;
}

module.exports = { getIcon };
