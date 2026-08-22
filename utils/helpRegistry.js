// Registre central pour /help : associe chaque commande a une categorie.
// Les noms + descriptions sont lus directement depuis les modules
// commands/*.js (pas de duplication qui pourrait diverger avec le temps) ;
// seule l'appartenance a une categorie est definie ici a la main.
const economyCmds = require('../commands/economy');
const casinoCmds = require('../commands/casino');
const moderationCmds = require('../commands/moderation');
const funCmds = require('../commands/fun');
const premiumCmds = require('../commands/premium');
const ticketsCmds = require('../commands/tickets');
const utilitairesCmds = require('../commands/utilitaires');

const ALL_COMMAND_MODULES = [economyCmds, casinoCmds, moderationCmds, funCmds, premiumCmds, ticketsCmds, utilitairesCmds];

const CATEGORY_ORDER = ['economie', 'casino', 'roue', 'moderation', 'fun', 'tickets', 'admin', 'utilitaires'];

const CATEGORIES = {
  economie: { label: 'Économie', emoji: '🌹', icon: 'rose' },
  casino: { label: 'Casino', emoji: '🎰', icon: 'slotmachine' },
  roue: { label: 'Roue de la Chance', emoji: '🎡', icon: 'gift' },
  moderation: { label: 'Modération', emoji: '🛡️', icon: 'shield' },
  fun: { label: 'Fun', emoji: '🎉', icon: 'star' },
  tickets: { label: 'Tickets', emoji: '🎫', icon: 'check' },
  admin: { label: 'Admin & Setup', emoji: '⚙️', icon: 'crown' },
  utilitaires: { label: 'Utilitaires', emoji: '🧭', icon: 'gem' },
};

const COMMAND_CATEGORY = {
  // Economie
  shop: 'economie', buy: 'economie', roses: 'economie', donner: 'economie', top_roses: 'economie',
  // Casino
  casino: 'casino',
  // Roue de la chance
  roue: 'roue',
  // Moderation
  clear: 'moderation', kick: 'moderation', ban: 'moderation', unban: 'moderation', timeout: 'moderation',
  warn: 'moderation', warnings: 'moderation', clearwarns: 'moderation', lock: 'moderation', unlock: 'moderation',
  slowmode: 'moderation', nuke: 'moderation',
  // Fun
  '8ball': 'fun', coinflip_fun: 'fun', roll: 'fun', joke: 'fun', meme: 'fun', rps: 'fun', lovecalc: 'fun',
  // Tickets
  ticket_add: 'tickets', ticket_remove: 'tickets', ticket_close: 'tickets',
  // Admin & Setup (anti-raid, panneaux d'installation, giveaways)
  lockdown: 'admin', unlockall: 'admin', setup_verification: 'admin', setup_vip: 'admin', setup_roles: 'admin',
  setup_tickets: 'admin', setup_shop_category: 'admin', setup_roue: 'admin', giveaway: 'admin',
  endgiveaway: 'admin', reroll: 'admin', setup_invites: 'admin',
  // Utilitaires
  ping: 'utilitaires', serverinfo: 'utilitaires', userinfo: 'utilitaires', avatar: 'utilitaires',
  botinfo: 'utilitaires', roles: 'utilitaires', sondage: 'utilitaires', say: 'utilitaires',
  invites: 'utilitaires', topinvites: 'utilitaires', invite: 'utilitaires',
};

/** @returns {Map<string, {name: string, description: string}[]>} categorie -> commandes, dans CATEGORY_ORDER */
function buildRegistry() {
  const byCategory = new Map(CATEGORY_ORDER.map(key => [key, []]));
  for (const mod of ALL_COMMAND_MODULES) {
    if (!Array.isArray(mod)) continue;
    for (const builder of mod) {
      const category = COMMAND_CATEGORY[builder.name];
      if (!category || !byCategory.has(category)) continue;
      byCategory.get(category).push({ name: builder.name, description: builder.description });
    }
  }
  return byCategory;
}

module.exports = { CATEGORY_ORDER, CATEGORIES, buildRegistry };
