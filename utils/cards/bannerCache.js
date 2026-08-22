// Bannieres animees partagees par brandedEmbed(). Contenu deterministe (pas
// de donnees par utilisateur) donc generees une seule fois et mises en
// cache en memoire pour le reste de la vie du process.
const { AttachmentBuilder } = require('discord.js');
const { renderBannerGif } = require('./bannerGif');

const SPECS = {
  moderation: { icon: 'shield', label: 'MODÉRATION' },
  fun: { icon: 'star', label: 'FUN' },
  success: { icon: 'check', label: 'SUCCÈS' },
  gift: { icon: 'gift', label: 'CADEAU' },
  leaderboard: { icon: 'trophy', label: 'CLASSEMENT' },
  alert: { icon: 'warning', label: 'ALERTE' },
  profile: { icon: 'blossom', label: 'PROFIL' },
  cosmetic: { icon: 'art', label: 'COSMÉTIQUE' },
};

const bufferCache = new Map();

function getBannerBuffer(key) {
  if (!SPECS[key]) return null;
  if (!bufferCache.has(key)) {
    bufferCache.set(key, renderBannerGif(SPECS[key]));
  }
  return bufferCache.get(key);
}

/** @returns {Promise<AttachmentBuilder[]>} vide si la cle n'est pas une banniere animee connue */
async function bannerFiles(key) {
  const bufferPromise = getBannerBuffer(key);
  if (!bufferPromise) return [];
  const buffer = await bufferPromise;
  return [new AttachmentBuilder(buffer, { name: `banner_${key}.gif` })];
}

module.exports = { SPECS, getBannerBuffer, bannerFiles };
