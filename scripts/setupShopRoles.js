// Usage : node scripts/setupShopRoles.js
//
// Cree immediatement sur le serveur tous les roles vendus en boutique (voir
// ROLE_ITEMS dans commands/economy.js), au lieu d'attendre le premier achat
// de chacun. Idempotent : ignore les roles deja presents (par nom). Reutilise
// ensureRole() d'economy.js pour garantir un comportement identique a celui
// utilise lors d'un achat reel (meme positionnement dans la hierarchie).
require('dotenv').config();
const { Client, GatewayIntentBits } = require('discord.js');
const { ROLE_ITEMS, ensureRole } = require('../commands/economy');

const TOKEN = process.env.TOKEN;
const GUILD_ID = process.env.GUILD_ID;

async function main() {
  if (!TOKEN || !GUILD_ID) {
    console.error('❌ TOKEN ou GUILD_ID manquant dans .env');
    process.exit(1);
  }

  const client = new Client({ intents: [GatewayIntentBits.Guilds] });
  await client.login(TOKEN);
  await new Promise(resolve => client.once('ready', resolve));

  const guild = await client.guilds.fetch(GUILD_ID);
  await guild.roles.fetch();

  let created = 0;
  let existing = 0;
  for (const roleConfig of Object.values(ROLE_ITEMS)) {
    const before = guild.roles.cache.find(r => r.name === roleConfig.name);
    const role = await ensureRole(guild, roleConfig);
    if (before) {
      existing++;
      console.log(`ℹ️  Déjà présent : ${roleConfig.name}`);
    } else {
      created++;
      console.log(`✅ Créé : ${roleConfig.name} (${role.id})`);
    }
  }

  console.log(`\n${created} rôle(s) créé(s), ${existing} déjà présent(s).`);
  client.destroy();
  process.exit(0);
}

main().catch(e => {
  console.error('❌ Erreur setupShopRoles:', e);
  process.exit(1);
});
