// Theme visuel partage par toutes les commandes du bot : rose, moderne,
// avec bannieres GIF animees (halo neon + roses flottantes, voir
// utils/cards/bannerGif.js) generees localement au lieu de dependre
// d'images externes.
const { EmbedBuilder } = require('discord.js');
const { SPECS: ANIMATED_BANNERS, bannerFiles } = require('./cards/bannerCache');

const PINK = 0xFF69B4;
const PINK_ALERT = 0xFF1E56;
const PINK_SUCCESS = 0x00E5A0;

// Cles sans banniere animee locale : on garde les GIF externes existants.
const BANNERS = {
  shop: 'https://i.pinimg.com/originals/a0/0b/4f/a00b4f8d9b13926838a05c30fb576ef2.gif',
  casino: 'https://i.pinimg.com/originals/24/09/b3/2409b36d0db3b4cf7f29a00778c18bd2.gif',
};

const AUTHOR_ICON = 'https://i.pinimg.com/originals/79/28/70/792870b991b5c30704944d1bead515e3.gif';
const FOOTER = { text: 'Rositaa 🌸', iconURL: AUTHOR_ICON };

/**
 * @param {object} opts
 * @param {string} [opts.title]
 * @param {string} [opts.description]
 * @param {number} [opts.color] defaut : rose
 * @param {Array}  [opts.fields]
 * @param {string} [opts.banner] cle de banniere animee (ANIMATED_BANNERS/BANNERS), ou URL directe
 * @param {string} [opts.thumbnail] petite image en haut a droite
 * @param {boolean} [opts.footer] defaut true
 */
function brandedEmbed({ title, description, color, fields, banner, thumbnail, footer = true } = {}) {
  const embed = new EmbedBuilder().setColor(color ?? PINK).setTimestamp();
  if (title) embed.setTitle(title);
  if (description) embed.setDescription(description);
  if (fields?.length) embed.addFields(fields);
  if (banner) {
    const image = ANIMATED_BANNERS[banner] ? `attachment://banner_${banner}.gif` : (BANNERS[banner] ?? banner);
    embed.setImage(image);
  }
  if (thumbnail) embed.setThumbnail(thumbnail);
  if (footer) embed.setFooter(FOOTER);
  return embed;
}

/**
 * Construit l'embed ET le fichier a joindre pour que sa banniere animee
 * s'affiche (attachment:// a besoin du fichier dans le meme message).
 * @param {Parameters<typeof brandedEmbed>[0]} opts
 * @returns {Promise<{ embed: EmbedBuilder, files: import('discord.js').AttachmentBuilder[] }>}
 */
async function buildBrandedReply(opts) {
  const embed = brandedEmbed(opts);
  const files = opts?.banner ? await bannerFiles(opts.banner) : [];
  return { embed, files };
}

module.exports = { PINK, PINK_ALERT, PINK_SUCCESS, BANNERS, AUTHOR_ICON, FOOTER, brandedEmbed, buildBrandedReply };
