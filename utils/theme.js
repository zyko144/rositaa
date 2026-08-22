// Theme visuel partage par toutes les commandes du bot : rose, moderne,
// avec bannieres GIF larges. Reutilise les memes GIF deja en place dans
// economy.js/casino.js pour que tout le bot soit visuellement coherent.
const { EmbedBuilder } = require('discord.js');

const PINK = 0xFF69B4;
const PINK_ALERT = 0xFF1E56;
const PINK_SUCCESS = 0x00E5A0;

const BANNERS = {
  shop: 'https://i.pinimg.com/originals/a0/0b/4f/a00b4f8d9b13926838a05c30fb576ef2.gif',
  casino: 'https://i.pinimg.com/originals/24/09/b3/2409b36d0db3b4cf7f29a00778c18bd2.gif',
  cosmetic: 'https://i.pinimg.com/originals/7e/ea/8f/7eea8f0d5718df26c8b98b9e69f88c83.gif',
  fun: 'https://i.pinimg.com/originals/66/c1/9d/66c19dd40d7c71ba8243bd22d8ec042e.gif',
  success: 'https://i.pinimg.com/originals/18/f7/54/18f754907ec6d8196dbd92ceec70bc6c.gif',
  profile: 'https://i.pinimg.com/originals/24/49/a0/2449a0c0a876a4ba23be3d489115fdf8.gif',
  gift: 'https://i.pinimg.com/originals/c9/28/fc/c928fcce4d93cb0c1ab083c6b2413a1a.gif',
  leaderboard: 'https://i.pinimg.com/originals/94/d4/72/94d4722513f508a8a48ef48d5d9a91ec.gif',
  moderation: 'https://i.pinimg.com/originals/24/09/b3/2409b36d0db3b4cf7f29a00778c18bd2.gif',
  alert: 'https://i.pinimg.com/originals/18/f7/54/18f754907ec6d8196dbd92ceec70bc6c.gif',
};

const AUTHOR_ICON = 'https://i.pinimg.com/originals/79/28/70/792870b991b5c30704944d1bead515e3.gif';
const FOOTER = { text: 'Rositaa 🌸', iconURL: AUTHOR_ICON };

/**
 * @param {object} opts
 * @param {string} [opts.title]
 * @param {string} [opts.description]
 * @param {number} [opts.color] defaut : rose
 * @param {Array}  [opts.fields]
 * @param {string} [opts.banner] cle de BANNERS, ou URL directe (grande image en bas d'embed)
 * @param {string} [opts.thumbnail] petite image en haut a droite
 * @param {boolean} [opts.footer] defaut true
 */
function brandedEmbed({ title, description, color, fields, banner, thumbnail, footer = true } = {}) {
  const embed = new EmbedBuilder().setColor(color ?? PINK).setTimestamp();
  if (title) embed.setTitle(title);
  if (description) embed.setDescription(description);
  if (fields?.length) embed.addFields(fields);
  if (banner) embed.setImage(BANNERS[banner] ?? banner);
  if (thumbnail) embed.setThumbnail(thumbnail);
  if (footer) embed.setFooter(FOOTER);
  return embed;
}

module.exports = { PINK, PINK_ALERT, PINK_SUCCESS, BANNERS, AUTHOR_ICON, FOOTER, brandedEmbed };
