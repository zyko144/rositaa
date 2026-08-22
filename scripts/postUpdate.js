// Usage : node scripts/postUpdate.js "Nouvelle fonctionnalité X" ["Autre ligne" ...]
//
// Met a jour le salon "Updates & Fix" du serveur : cree le salon au premier
// lancement (avec un historique de depart), ajoute les nouvelles entrees
// passees en argument (affichees en rouge sur l'image), puis regenere le PNG
// et EDITE le message existant a la place d'en renvoyer un nouveau a chaque
// fois. A lancer manuellement apres chaque nouvelle fonctionnalite livree.
require('dotenv').config();
const { REST, Routes, ChannelType } = require('discord.js');
const { readChangelogData, writeChangelogData } = require('../utils/changelogStore');
const { renderChangelogPng } = require('../utils/cards/changelogCard');

const TOKEN = process.env.TOKEN;
const GUILD_ID = process.env.GUILD_ID;
const CHANNEL_NAME = '🛠️-update-fix';

const SEED_ITEMS = [
  "Système de roses (monnaie du serveur) gagnées en discutant, boutique animée /shop avec achat par menu déroulant",
  "Rôles achetés attribués automatiquement (couleur + nom), positionnement fiable dans la hiérarchie du serveur",
  "/roses (carte animée), /donner, /top_roses",
  "Casino animé /casino coinflip et /casino slots, réponses privées",
  "Multiplicateur de série au casino : les victoires enchaînées augmentent les gains, jusqu'à x2",
  "Roue de la chance /roue : 0 à 50 roses gratuites, taux pondérés, cooldown 24h",
  "Carte animée d'invitation postée dans le salon dédié + envoyée en message privé à l'inviteur",
  "Panneau /invites : lien personnel, statistiques, classement des recruteurs",
  "Système de claim/unclaim des tickets par menu déroulant pour le staff",
  "Anti-raid instantané : /lockdown et /unlockall parallélisés, verrouillage automatique si trop d'arrivées",
  "Vérification anti-bot à l'entrée du serveur",
  "Catégorie Boutique & Jeux avec salons explicatifs (/setup_shop_category, /setup_roue)",
  "Tous les embeds du bot en thème rose avec bannières GIF animées",
  "Base de données persistante sur Supabase : survit aux redémarrages et redéploiements",
];

function frenchDate(d = new Date()) {
  return new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' }).format(d);
}

async function main() {
  if (!TOKEN || !GUILD_ID) {
    console.error('❌ TOKEN ou GUILD_ID manquant dans .env');
    process.exit(1);
  }

  const newEntries = process.argv.slice(2);
  const rest = new REST({ version: '10' }).setToken(TOKEN);

  const data = await readChangelogData();
  if (!data.changelog) data.changelog = [];

  if (data.changelog.length === 0) {
    const seedDate = frenchDate();
    const seedBatch = new Date().toISOString();
    data.changelog.push(...SEED_ITEMS.map(text => ({ text, date: seedDate, batch: seedBatch })));
    console.log(`ℹ️  Historique initialisé avec ${SEED_ITEMS.length} entrées.`);
  }

  if (newEntries.length > 0) {
    const date = frenchDate();
    const batch = new Date().toISOString();
    for (const text of newEntries) data.changelog.push({ text, date, batch });
    console.log(`ℹ️  ${newEntries.length} nouvelle(s) entrée(s) ajoutée(s).`);
  }

  // Salon : cherche par nom d'abord (au cas ou l'ID stocke serait perime),
  // le cree seulement s'il n'existe vraiment pas.
  if (!data.channelId) {
    const channels = await rest.get(Routes.guildChannels(GUILD_ID));
    const existing = channels.find(c => c.name === CHANNEL_NAME && c.type === ChannelType.GuildText);
    if (existing) {
      data.channelId = existing.id;
      console.log(`ℹ️  Salon existant retrouvé : ${CHANNEL_NAME} (${existing.id})`);
    } else {
      const created = await rest.post(Routes.guildChannels(GUILD_ID), {
        body: { name: CHANNEL_NAME, type: ChannelType.GuildText },
      });
      data.channelId = created.id;
      data.messageId = null;
      console.log(`✅ Salon créé : ${CHANNEL_NAME} (${created.id})`);
    }
  }

  const buffer = await renderChangelogPng(data.changelog);

  if (data.messageId) {
    try {
      await rest.patch(Routes.channelMessage(data.channelId, data.messageId), {
        body: { attachments: [] },
        files: [{ name: 'changelog.png', data: buffer }],
      });
      console.log('✅ Image du changelog mise à jour.');
    } catch (e) {
      console.error("⚠️  Message existant introuvable, envoi d'un nouveau message.", e.message);
      data.messageId = null;
    }
  }

  if (!data.messageId) {
    const msg = await rest.post(Routes.channelMessages(data.channelId), {
      body: {},
      files: [{ name: 'changelog.png', data: buffer }],
    });
    data.messageId = msg.id;
    console.log('✅ Nouveau message de changelog envoyé.');
  }

  await writeChangelogData(data);
  console.log(`\nTotal : ${data.changelog.length} entrée(s) dans l'historique.`);
}

main().catch(e => {
  console.error('❌ Erreur postUpdate:', e);
  process.exit(1);
});
