const { Client, GatewayIntentBits, Partials, EmbedBuilder, Collection, ActionRowBuilder, ButtonBuilder, ButtonStyle, ChannelType, PermissionFlagsBits, AttachmentBuilder } = require('discord.js');
const express = require('express');
const fs = require('fs');
const discordTranscripts = require('discord-html-transcripts');
require('dotenv').config();
const path = require('path');

const activeTicketCreations = new Set(); // Prevent double-click ticket race conditions

// --- SERVER EXPRESS & SOCKET.IO (Keep-Alive pour Render) ---
const app = express();
const http = require('http');
const { Server } = require('socket.io');

const server = http.createServer(app);
const io = new Server(server);

// Initialiser le Security Bot sur le même serveur


app.get('/api/invites', async (req, res) => {
  console.log("API /api/invites appelee");
  const guild = (client.guilds.cache.get('1529954079260807260') || client.guilds.cache.first());
  if (!guild) {
    console.log("No guild found");
    return res.json({ leaderboard: [], history: [] });
  }
  
  try {
    console.log("Fetching invites...");
    const invites = await guild.invites.fetch();
    console.log(`Fetched ${invites.size} invites`);
    const rawLeaderboard = invites
      .filter(i => i.uses > 0 && i.inviter)
      .map(i => ({ username: i.inviter.username, uses: i.uses }));
      
    const map = new Map();
    for (const item of rawLeaderboard) {
      map.set(item.username, (map.get(item.username) || 0) + item.uses);
    }
    
    const mergedLeaderboard = [];
    map.forEach((uses, username) => mergedLeaderboard.push({ username, uses }));
    mergedLeaderboard.sort((a, b) => b.uses - a.uses);

    console.log("Reading DB...");
    const dbPath = './database.json';
    let history = [];
    if (fs.existsSync(dbPath)) {
       const db = JSON.parse(fs.readFileSync(dbPath, 'utf8'));
       history = db.invite_history || [];
    }
    
    console.log("Sending JSON response");
    res.json({ leaderboard: mergedLeaderboard.slice(0, 10), history: history });
  } catch (err) {
    console.log("Erreur API invites:", err);
    res.status(500).json({ error: err.message });
  }
});

// --- API LOGS ---
app.get('/api/logs', (req, res) => {
  const logFile = require('path').join(__dirname, 'chat_logs.json');
  if (require('fs').existsSync(logFile)) {
    res.setHeader('Content-Type', 'application/json');
    res.send(require('fs').readFileSync(logFile, 'utf8'));
  } else {
    res.json({});
  }
});
app.get('/logs', (req, res) => {
  res.send(require('fs').readFileSync(require('path').join(__dirname, 'dashboard.html'), 'utf8'));
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log('🌍 Serveur web lancé sur le port ' + PORT));

// --- CONFIGURATION DISCORD ---
const TOKEN = process.env.TOKEN;

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMessageReactions,
    GatewayIntentBits.DirectMessages,
    GatewayIntentBits.GuildPresences,
    GatewayIntentBits.GuildInvites
  ],
  partials: [Partials.Message, Partials.Channel, Partials.Reaction]
});
global.mainBotClient = client;
const securityBot = require('./security_bot.js')(app, io, client);

// Load Commands
client.commands = new Collection();
const commandFiles = fs.readdirSync('./commands').filter(file => file.endsWith('.js'));
for (const file of commandFiles) {
    const mod = require('./commands/' + file);
    if (Array.isArray(mod)) {
        for (const cmd of mod) {
            client.commands.set(cmd.name, require('./commands/' + file));
        }
    }
}

// IDs (à ajuster si besoin)
const ROLE_NOUVEAU = '1516710281919729705';
const TICKET_CATEGORY = '1516710473817653320'; // ID de la catégorie "🎫 TICKETS EN COURS" (il faut la récupérer)
// J'utilise le nom de la catégorie pour trouver la bonne plus tard dynamiquement.

const REACTION_ROLES = {
  '💻': '1516710272792920125', // Développeur
  '🤖': '1516710275896836147', // Passionné IA
  '📖': '1516710278723665995'  // Apprenant
};

// Anti-Ping Mots interdits
const BANNED_PINGS = ['1xpj', '1xpj2', '6t2b'];
const dbPath = './database.json';

// --- EVENTS ---

const invitesCache = new Map();

client.once('ready', async () => {
    console.log('Bot connect en tant que ' + client.user.tag + ' !');
    resumeGiveaways();
});


// Autorole is now manual via Verification Button

// Message et Commandes standards
client.on('messageCreate', async (message) => {
  if (message.content === '!reset-top' && message.member && message.member.permissions.has(PermissionFlagsBits.Administrator)) {
      const dbPath = require('path').join(__dirname, 'database.json');
      let db = {};
      if (require('fs').existsSync(dbPath)) db = JSON.parse(require('fs').readFileSync(dbPath, 'utf8'));
      db.invite_history = [];
      db.invite_warns = {};
      require('fs').writeFileSync(dbPath, JSON.stringify(db, null, 2));

      try {
          const invites = await message.guild.invites.fetch();
          let count = 0;
          for (const invite of invites.values()) {
              await invite.delete();
              count++;
          }
          return message.reply(`✅ Classements réinitialisés avec succès ! J'ai supprimé **${count}** liens d'invitation pour forcer la remise à zéro du \`/top\`.`);
      } catch(err) {
          return message.reply("✅ L'historique local a été vidé. Mais ❌ impossible de supprimer les invitations Discord (vérifie ma permission *Gérer le serveur*).");
      }
  }

  if (message.content.startsWith('!reroll') && message.member && message.member.permissions.has(PermissionFlagsBits.Administrator)) {
    const args = message.content.split(' ');
    if (args.length < 2) return message.reply("❌ Usage: `!reroll <ID_MESSAGE>`");
    const msgId = args[1];
    
    try {
      const fetchedMsg = await message.channel.messages.fetch(msgId);
      if (!fetchedMsg) return message.reply("❌ Message introuvable dans ce salon.");
      
      const dbPath = require('path').join(__dirname, 'database.json');
      let db = {};
      if (require('fs').existsSync(dbPath)) db = JSON.parse(require('fs').readFileSync(dbPath, 'utf8'));
      
      let participants = [];
      let prize = "Lot inconnu";
      
      if (db.giveaways_history && db.giveaways_history[msgId]) {
         participants = db.giveaways_history[msgId].participants || [];
         prize = db.giveaways_history[msgId].prize;
      } else {
         const existingEmbed = fetchedMsg.embeds[0];
         if (existingEmbed && existingEmbed.description) {
           const matches = existingEmbed.description.match(/<@(\d+)>/g);
           if (matches) participants = [...new Set(matches.map(m => m.replace('<@', '').replace('>', '')))];
           const prizeMatch = existingEmbed.description.match(/\*\*Lot remporté :\*\* (.*)\n/);
           if (prizeMatch) prize = prizeMatch[1];
           else {
               const pMatch2 = existingEmbed.description.match(/\*\*Lot à gagner :\*\* (.*)\n/);
               if (pMatch2) prize = pMatch2[1];
           }
         }
      }
      
      if (participants.length === 0) return message.reply("❌ Impossible de reroll : aucun participant trouvé dans ce message.");
      
      let currentWinner = null;
      const existingEmbed = fetchedMsg.embeds[0];
      if (existingEmbed && existingEmbed.description) {
         const match = existingEmbed.description.match(/\*\*Gagnant :\*\* <@(\d+)>/);
         if (match) currentWinner = match[1];
      }
      
      let validParticipants = participants.filter(id => id !== currentWinner);
      if (validParticipants.length === 0) validParticipants = participants; 
      
      const crypto = require('crypto');
      const randomIndex = crypto.randomInt(0, validParticipants.length);
      const newWinner = validParticipants[randomIndex];
      
      await message.channel.send(`🎉 REROLL ! Félicitations <@${newWinner}> ! Tu es le NOUVEAU gagnant du giveaway pour : **${prize}** !`);
      
      const { EmbedBuilder } = require('discord.js');
      const endEmbed = EmbedBuilder.from(fetchedMsg.embeds[0])
        .setDescription(`**Lot remporté :** ${prize}\n**Gagnant :** <@${newWinner}> (REROLL)`)
        .setColor(0x00FF00); 
      
      await fetchedMsg.edit({ embeds: [endEmbed] }).catch(()=>{});
      
    } catch(e) {
      console.error(e);
      return message.reply("❌ Erreur lors du reroll. L'ID du message est-il correct et a-t-il été envoyé dans ce salon ?");
    }
    return;
  }



  if (message.author.bot) return;

  // --- BRIDGE TO SECURITY BOT ---
  try {
      if (message.channel.type === ChannelType.DM || (message.channel.name && message.channel.name.includes('ia')) || message.channel.name.includes('ticket')) {
          const logType = message.channel.type === ChannelType.DM ? 'dm' : 'chat';
          securityBot.logToDashboard(logType, {
              author: message.author.tag,
              userId: message.author.id,
              content: message.content,
              channel: message.channel.type === ChannelType.DM ? 'DM ClaudePlus' : message.channel.name,
              time: new Date().toLocaleTimeString()
          });
      }
  } catch(e) {}

  // --- Database Load ---
  let db = { warnings: {}, levels: {} };
  if (fs.existsSync(dbPath)) db = JSON.parse(fs.readFileSync(dbPath, 'utf8'));
  if (!db.warnings) db.warnings = {};
  if (!db.levels) db.levels = {};





  // Anti-Ping Alert & Warn System
  const content = message.content.toLowerCase();
  const containsBanned = BANNED_PINGS.some(word => content.includes(word));
  
  if (containsBanned) {
    await message.delete().catch(() => {});
    
    if (!db.warnings[message.author.id]) db.warnings[message.author.id] = [];
    db.warnings[message.author.id].push({ reason: 'Ping illégal (Anti-Ping System)', by: client.user.tag, date: new Date().toISOString() });
    
    fs.writeFileSync(dbPath, JSON.stringify(db, null, 2));
    
    const warnCount = db.warnings[message.author.id].length;
    let replyMsg = '⚠️ <@' + message.author.id + '>, les pings de type 1xpj/6t2b sont strictement interdits ! Avertissement ' + warnCount + '/3.';
    
    if (warnCount >= 3) {
      replyMsg = '🚫 <@' + message.author.id + '> a atteint 3 avertissements (Pings interdits) et a été exclu (Timeout) pour 7 jours.';
      try {
        await message.member.timeout(7 * 24 * 60 * 60 * 1000, '3 Avertissements: Pings illégaux');
        delete db.warnings[message.author.id]; // Reset warns after timeout
        fs.writeFileSync(dbPath, JSON.stringify(db, null, 2));
      } catch(e) { console.error('Erreur Timeout', e); }
    }
    
    await message.channel.send(replyMsg);
    return; // Stop here if it was a banned message
  }



});

// Slash Commands & Buttons (Interactions)
client.on('interactionCreate', async interaction => {
  // Slash Commands handler
  if (interaction.isChatInputCommand()) {
    const commandMod = client.commands.get(interaction.commandName);
    if (!commandMod) return;

    try {
      await commandMod.execute(interaction);
    } catch (error) {
      console.error("Erreur commande :", error);
      try {
        if(interaction.replied || interaction.deferred) {
            await interaction.followUp({ content: '❌ Erreur lors de l\'exécution de la commande.', ephemeral: true });
        } else {
            await interaction.reply({ content: '❌ Erreur lors de l\'exécution de la commande.', ephemeral: true });
        }
      } catch (innerError) {
        console.error("Impossible de répondre à l'interaction échouée :", innerError.message);
      }
    }
  }
  // Modal Submit handler
  if (interaction.isModalSubmit()) {
    if (interaction.customId === 'giveaway_modal') {
      await interaction.deferReply({ ephemeral: true });
      const prize = interaction.fields.getTextInputValue('giveaway_prize');
      const timeInMinutes = parseInt(interaction.fields.getTextInputValue('giveaway_time')) || 60;
      const condition = interaction.fields.getTextInputValue('giveaway_condition');
      const link = interaction.fields.getTextInputValue('giveaway_link');
      
      const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, AttachmentBuilder } = require('discord.js');
      const banner = new AttachmentBuilder('./shop_giveaway_banner.png');
      
      const embed = new EmbedBuilder()
        .setColor(0xFF69B4)
        .setTitle('🎁 NOUVEAU GIVEAWAY EXCLUSIF 🎁')
        .setDescription(`Un nouveau concours vient d'être lancé ! Participez maintenant pour tenter de remporter la récompense.\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n🏆 **Lot à gagner :** ${prize}\n\n⚠️ **Condition Obligatoire :** ${condition}\n🔗 **Lien du serveur :** ${link}\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n👇 Cliquez sur le bouton "Participer" ci-dessous !\n\n⏱️ **Tirage dans :** ${timeInMinutes} minute(s)\n\n**👥 Participants (0) :**\n*(Soyez le premier à participer !)*`)
        .setImage('attachment://shop_giveaway_banner.png')
        .setTimestamp(Date.now() + timeInMinutes * 60000);
        
      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('join_giveaway').setLabel('🎉 Participer').setStyle(ButtonStyle.Primary)
      );
      
      const giveawayMsg = await interaction.channel.send({ embeds: [embed], components: [row], files: [banner] });
      await interaction.editReply({ content: '✅ Giveaway lancé avec succès !' });
      
      if (!client.giveaways) client.giveaways = {};
      client.giveaways[giveawayMsg.id] = [];
      
      const dbPath = require('path').join(__dirname, 'database.json');
      let db = {};
      if (require('fs').existsSync(dbPath)) db = JSON.parse(require('fs').readFileSync(dbPath, 'utf8'));
      if (!db.active_giveaways) db.active_giveaways = {};
      
      db.active_giveaways[giveawayMsg.id] = {
        prize: prize,
        endTime: Date.now() + timeInMinutes * 60000,
        participants: [],
        channelId: interaction.channel.id,
        hostId: interaction.user.id
      };
      require('fs').writeFileSync(dbPath, JSON.stringify(db, null, 2));
      
      setTimeout(() => endGiveaway(giveawayMsg.id, db.active_giveaways[giveawayMsg.id]), timeInMinutes * 60000);
    }
  }

  // Buttons handler (Tickets, Verification, Giveaways)
  if (interaction.isButton()) {
    try {
      if (interaction.customId === 'join_giveaway') {
        // Vérification de la liste noire du Giveaway
        const dbPath = './database.json';
        if (fs.existsSync(dbPath)) {
          try {
            const db = JSON.parse(fs.readFileSync(dbPath, 'utf8'));
            if (db.giveaway_blacklist && db.giveaway_blacklist.includes(interaction.user.id)) {
              return interaction.reply({ content: '❌ **Accès refusé :** Tu es banni définitivement de la participation aux Giveaways sur ce serveur.', ephemeral: true });
            }
          } catch(e) {}
        }

        if (!client.giveaways) client.giveaways = {};
        if (!client.giveaways[interaction.message.id]) {
          client.giveaways[interaction.message.id] = [];
          
          // Tenter de récupérer les anciens depuis la description (survie au restart !)
          const existingEmbed = interaction.message.embeds[0];
          if (existingEmbed && existingEmbed.description) {
            const matches = existingEmbed.description.match(/<@(\d+)>/g);
            if (matches) {
              const ids = matches.map(m => m.replace('<@', '').replace('>', ''));
              client.giveaways[interaction.message.id] = [...new Set(ids)];
            }
          }
        }
        
        // VÉRIFICATION DU SERVEUR REQUIS (1518644557141643424)
        const requiredGuildId = '1518644557141643424';
        let isMemberOfRequiredGuild = false;
        try {
            // Le bot doit absolument être sur ce serveur pour que ça fonctionne
            const requiredGuild = await client.guilds.fetch(requiredGuildId);
            if (requiredGuild) {
                // Tente de récupérer le membre sur l'autre serveur
                const member = await requiredGuild.members.fetch(interaction.user.id).catch(() => null);
                if (member) {
                    isMemberOfRequiredGuild = true;
                }
            }
        } catch (error) {
            console.error("Erreur serveur requis :", error);
            return interaction.reply({ content: '❌ **Erreur :** Le bot n\'arrive pas à vérifier ta présence sur l\'autre serveur. Assure-toi que le bot a bien été ajouté sur le serveur requis !', ephemeral: true });
        }

        if (!isMemberOfRequiredGuild) {
          return interaction.reply({ content: '❌ **Accès refusé :** Tu dois absolument rejoindre le serveur partenaire pour participer à ce giveaway !\n\n⚠️ **ATTENTION : La création de Doubles Comptes (DC) pour tricher entraîne un BANNISSEMENT DÉFINITIF immédiat par la sécurité.**', ephemeral: true });
        }

        const participants = client.giveaways[interaction.message.id];
        if (!participants.includes(interaction.user.id)) {
          participants.push(interaction.user.id);
          
          const embed = require('discord.js').EmbedBuilder.from(interaction.message.embeds[0]);
          let desc = embed.data.description;
          const baseDescIndex = desc.indexOf('**👥 Participants');
          
          if (baseDescIndex !== -1) {
             const baseDesc = desc.substring(0, baseDescIndex);
             let participantList = participants.map(id => `<@${id}>`).join(', ');
             if (participantList.length > 1000) {
                 participantList = participantList.substring(0, 1000) + '... et bien d\'autres !';
             }
             embed.setDescription(`${baseDesc}**👥 Participants (${participants.length}) :**\n${participantList}\n\n*(Nettoyage auto : seuls les membres du serveur partenaire sont autorisés. ⚠️ Les Doubles Comptes (DC) = BAN DIRECT !)*`);
             await interaction.message.edit({ embeds: [embed] });
          }
          
          // Save DB
          const dbPath2 = require('path').join(__dirname, 'database.json');
          if (require('fs').existsSync(dbPath2)) {
            const db2 = JSON.parse(require('fs').readFileSync(dbPath2, 'utf8'));
            if (db2.active_giveaways && db2.active_giveaways[interaction.message.id]) {
               db2.active_giveaways[interaction.message.id].participants = participants;
               require('fs').writeFileSync(dbPath2, JSON.stringify(db2, null, 2));
            }
          }

          await interaction.reply({ content: '🎉 Tu participes bien au giveaway !', ephemeral: true });
        } else {
          await interaction.reply({ content: 'Tu participes déjà à ce giveaway.', ephemeral: true });
        }
        return;
      }

      if (interaction.customId === 'verify_member') {
        const role = interaction.guild.roles.cache.get(ROLE_NOUVEAU);
        if (role) {
          if (!interaction.member.roles.cache.has(role.id)) {
            await interaction.member.roles.add(role);
            await interaction.reply({ content: '✅ Vérification réussie ! Bienvenue sur le serveur.', ephemeral: true });
          } else {
            await interaction.reply({ content: 'Tu es déjà vérifié.', ephemeral: true });
          }
        }
        return;
      }

    if (interaction.customId.startsWith('ticket_')) {
      const type = interaction.customId.split('_')[1]; // support, booster, premium
      
      const channelName = 'ticket-' + interaction.user.username.toLowerCase();
      
      if (activeTicketCreations.has(interaction.user.id)) {
        return interaction.reply({ content: '⏳ Création en cours... merci de ne pas spammer le bouton.', ephemeral: true });
      }
      activeTicketCreations.add(interaction.user.id);
      
      try {
        const guild = interaction.guild;
        // Chercher la catégorie "🎫 TICKETS EN COURS"
        let category = guild.channels.cache.find(c => c.name === '🎫 TICKETS EN COURS' && c.type === ChannelType.GuildCategory);
        if(!category) category = await guild.channels.create({ name: '🎫 TICKETS EN COURS', type: ChannelType.GuildCategory });
        
        const existingTicket = guild.channels.cache.find(c => c.name === channelName);
        if (existingTicket) {
          activeTicketCreations.delete(interaction.user.id);
          return interaction.reply({ content: `❌ Tu as déjà un ticket d'ouvert ici : <#${existingTicket.id}>. Tu ne peux pas en ouvrir un autre.`, ephemeral: true });
        }
        
        const ticketChannel = await guild.channels.create({
        name: channelName,
        type: ChannelType.GuildText,
        parent: category.id,
        permissionOverwrites: [
          { id: guild.id, deny: [PermissionFlagsBits.ViewChannel] },
          { id: interaction.user.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages] }
        ]
      });
      
      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('close_ticket').setLabel('🔒 Fermer le ticket').setStyle(ButtonStyle.Danger)
      );
      
      const attachment = new AttachmentBuilder('./assets/ticket_banner.png');
      const embed = new EmbedBuilder()
        .setTitle('🎫 Nouveau Ticket : ' + type.toUpperCase())
        .setDescription([
          "**Bienvenue dans votre espace privé !**",
          "Un membre de notre équipe s'occupera de vous dans les plus brefs délais.",
          "",
          "━━━━━━━━━━━━━━━━━━━━━━━━━━━━",
          "",
          "**Comment nous aider à vous répondre plus vite ?**",
          "- Décrivez votre problème avec le plus de détails possible.",
          "- Fournissez des captures d'écran si nécessaire.",
          "- Patientez calmement (inutile de mentionner le staff)."
        ].join('\n'))
        .setColor(0xFF69B4)
        .setImage('attachment://assets/ticket_banner.png')
        .setTimestamp();
        
      await ticketChannel.send({ content: "Bienvenue <@" + interaction.user.id + "> !", embeds: [embed], components: [row], files: [attachment] });
        await interaction.reply({ content: `✅ Ton ticket a été ouvert : ${ticketChannel}`, ephemeral: true }).catch(console.error);
      } catch (error) {
        console.error(error);
        await interaction.reply({ content: "❌ Une erreur est survenue lors de la création du ticket.", ephemeral: true });
      } finally {
        setTimeout(() => activeTicketCreations.delete(interaction.user.id), 3000); // Remove lock after 3 seconds
      }
    }
    
    if (interaction.customId === 'close_ticket') {
      if (!interaction.member.permissions.has(PermissionFlagsBits.ManageChannels)) {
        return interaction.reply({ content: '❌ Seul le staff peut fermer un ticket.', ephemeral: true });
      }
      await interaction.reply({ content: '🔒 Le ticket est en cours de fermeture... Sauvegarde de la conversation.' });
      
      try {
        const attachment = await discordTranscripts.createTranscript(interaction.channel, {
             limit: -1, 
             returnType: 'attachment',
             filename: `transcript-${interaction.channel.name}.html`,
             saveImages: true, 
             poweredBy: false
        });
        
        const members = interaction.channel.members.filter(m => !m.user.bot);
        for (const [id, member] of members) {
            await member.send({
                content: `📁 Voici une copie de ton ticket **${interaction.channel.name}** fermé sur Claude+. Tu peux ouvrir le fichier HTML sur ton navigateur (PC ou Téléphone) pour lire la conversation complète avec le design de Discord.`,
                files: [attachment]
            }).catch(() => {});
        }
      } catch (e) {
        console.error("Erreur lors de la génération du transcript:", e);
      }
      
      setTimeout(() => interaction.channel.delete().catch(() => {}), 5000);
    }
    } catch (e) {
      console.error("Erreur lors du traitement d'un bouton :", e);
    }
  }
});

// Reaction Roles
client.on('messageReactionAdd', async (reaction, user) => {
  if (user.bot) return;
  if (reaction.message.partial) await reaction.message.fetch();
  if (reaction.partial) await reaction.fetch();
  const roleId = REACTION_ROLES[reaction.emoji.name];
  if (roleId) {
    const member = await reaction.message.guild.members.fetch(user.id);
    const role = reaction.message.guild.roles.cache.get(roleId);
    if (role && member) await member.roles.add(role).catch(() => {});
  }
});

client.on('messageReactionRemove', async (reaction, user) => {
  if (user.bot) return;
  if (reaction.message.partial) await reaction.message.fetch();
  if (reaction.partial) await reaction.fetch();
  const roleId = REACTION_ROLES[reaction.emoji.name];
  if (roleId) {
    const member = await reaction.message.guild.members.fetch(user.id);
    const role = reaction.message.guild.roles.cache.get(roleId);
    if (role && member) await member.roles.remove(role).catch(() => {});
  }
});
client.on('inviteCreate', invite => {
  const guildInvites = invitesCache.get(invite.guild.id);
  if (guildInvites) guildInvites.set(invite.code, invite.uses);
});

client.on('inviteDelete', invite => {
  const guildInvites = invitesCache.get(invite.guild.id);
  if (guildInvites) guildInvites.delete(invite.code);
});

client.on('guildMemberAdd', async member => {
  try {
    const newInvites = await member.guild.invites.fetch();
    const oldInvites = invitesCache.get(member.guild.id);
    let usedInvite = null;

    if (oldInvites) {
      usedInvite = newInvites.find(i => i.uses > (oldInvites.get(i.code) || 0));
      newInvites.forEach(invite => oldInvites.set(invite.code, invite.uses));
    }
    
    if (usedInvite && usedInvite.inviter) {
       // --- ANTI-DC SECURITY SCANNER ---
       try {
           const newName = member.user.username.toLowerCase().replace(/[^a-z0-9]/g, '');
           const inviterName = usedInvite.inviter.username.toLowerCase().replace(/[^a-z0-9]/g, '');
           
           if (newName.length > 3 && inviterName.length > 3 && (newName.includes(inviterName) || inviterName.includes(newName))) {
               const alertChannel = member.guild.channels.cache.find(c => c.name.toLowerCase().includes('admin') || c.name.toLowerCase().includes('log'));
               if (alertChannel) {
                   await alertChannel.send(`🚨 **ALERTE SÉCURITÉ ANTI-DC** 🚨\nUn compte suspect (\`${member.user.username}\`) vient de rejoindre via l'invitation de <@${usedInvite.inviter.id}> (\`${usedInvite.inviter.username}\`).\nLeurs pseudos sont **quasiment identiques** (Tricherie détectée pour le Giveaway) !\n\n*Action recommandée : Copiez/collez cette commande pour nettoyer automatiquement :*\n\`!kickdc <@${member.user.id}> <@${usedInvite.inviter.id}>\``);
               }
           }
       } catch(e) {}

       const dbPath = './database.json';
       if (fs.existsSync(dbPath)) {
          const db = JSON.parse(fs.readFileSync(dbPath, 'utf8'));
          if (!db.invite_history) db.invite_history = [];
          db.invite_history.push({
             invitedUsername: member.user.username,
             invitedId: member.user.id,
             inviterUsername: usedInvite.inviter.username,
             inviterId: usedInvite.inviter.id,
             timestamp: Date.now()
          });
          fs.writeFileSync(dbPath, JSON.stringify(db, null, 2));
       }
    }

    let welcomeChannel = member.guild.channels.cache.find(c => c.name.includes('bienvenue') && c.type === ChannelType.GuildText);

    if (welcomeChannel) {
      const inviterText = usedInvite && usedInvite.inviter 
        ? `Invité par **${usedInvite.inviter.username}** (Lien utilisé **${usedInvite.uses}** fois)` 
        : `Impossible de déterminer qui l'a invité`;

      const embed = new EmbedBuilder()
        .setTitle('🎉 Nouveau Membre !')
        .setDescription(`Bienvenue ${member.user.toString()} sur **${member.guild.name}** !\n\n> 🤝 ${inviterText}`)
        .setColor(0xFF69B4)
        .setThumbnail(member.user.displayAvatarURL());

      await welcomeChannel.send({ embeds: [embed] }).catch(() => {});
    }
  } catch (err) {
    console.error("Erreur guildMemberAdd", err);
  }
});
// --- ANNONCE MAINTENANCE AUTOMATIQUE ---
let isShuttingDown = false;
async function announceDowntime() {
    if (isShuttingDown) return;
    isShuttingDown = true;
    try {
        const guild = (client.guilds.cache.get('1529954079260807260') || client.guilds.cache.first());
        if (guild) {
            let channel = guild.channels.cache.find(c => c.name.toLowerCase().includes('annonce'));
            if (!channel) channel = guild.channels.cache.find(c => c.name.toLowerCase().includes('général') || c.name.toLowerCase().includes('general'));
            if (channel) {
                await channel.send('⚠️ **MAINTENANCE AUTO** : Le bot doit redémarrer pour une mise à jour système ou une maintenance côté hébergeur. \n\n*Ne paniquez pas, nous serons de retour dans quelques instants avec encore plus de puissance ! 🚀*').catch(()=>{});
            }
            
            // Force a final DB backup before dying to ensure no data loss
            let dbChannel = guild.channels.cache.find(c => c.name === '💾-database-logs');
            if (dbChannel) {
                let filesToBackup = [];
                if (require('fs').existsSync('./chat_logs.json')) filesToBackup.push('./chat_logs.json');
                if (require('fs').existsSync('./database.json')) filesToBackup.push('./database.json');
                if (filesToBackup.length > 0) {
                    await dbChannel.send({
                        content: `Sauvegarde auto (Arrêt du système) - ${new Date().toLocaleString()}`,
                        files: filesToBackup
                    }).catch(()=>{});
                }
            }
        }
    } catch(e) {}
    process.exit(0);
}

process.on('SIGTERM', announceDowntime); // Render restart
process.on('SIGINT', announceDowntime);  // Local Ctrl+C

client.login(TOKEN);

async function resumeGiveaways() {
  if (!client.giveaways) client.giveaways = {};
  const dbPath = require('path').join(__dirname, 'database.json');
  let db = {};
  if (require('fs').existsSync(dbPath)) db = JSON.parse(require('fs').readFileSync(dbPath, 'utf8'));
  
  if (!db.active_giveaways) return;
  
  const now = Date.now();
  for (const [msgId, data] of Object.entries(db.active_giveaways)) {
    client.giveaways[msgId] = data.participants || [];
    
    const timeRemaining = data.endTime - now;
    if (timeRemaining <= 0) {
      endGiveaway(msgId, data);
    } else {
      setTimeout(() => endGiveaway(msgId, data), timeRemaining);
    }
  }
}

async function endGiveaway(msgId, data) {
  try {
    const channel = await client.channels.fetch(data.channelId).catch(()=>null);
    if (!channel) return;
    const fetchedMsg = await channel.messages.fetch(msgId).catch(()=>null);
    if (!fetchedMsg) return;
    
    const participants = client.giveaways[msgId] || [];
    if (participants.length === 0) {
      await channel.send(`🎉 Le giveaway pour **${data.prize}** est terminé, mais personne n'a participé...`);
    } else {
      const crypto = require('crypto');
      const validParticipants = participants.filter(id => id !== data.hostId);
      const finalPool = validParticipants.length > 0 ? validParticipants : participants;
      
      const randomIndex = crypto.randomInt(0, finalPool.length);
      const winner = finalPool[randomIndex];
      
      await channel.send(`🎉 Félicitations <@${winner}> ! Tu as gagné le giveaway pour : **${data.prize}** !`);
      
      const { EmbedBuilder } = require('discord.js');
      const endEmbed = EmbedBuilder.from(fetchedMsg.embeds[0])
        .setTitle('🎉 GIVEAWAY TERMINÉ 🎉')
        .setDescription(`**Lot remporté :** ${data.prize}\n**Gagnant :** <@${winner}>`)
        .setColor(0x2B2D31);
      
      await fetchedMsg.edit({ embeds: [endEmbed], components: [] }).catch(() => {});
    }
    
    delete client.giveaways[msgId];
    
    const dbPath = require('path').join(__dirname, 'database.json');
    if (require('fs').existsSync(dbPath)) {
      const db = JSON.parse(require('fs').readFileSync(dbPath, 'utf8'));
      if (db.active_giveaways && db.active_giveaways[msgId]) {
        if(!db.giveaways_history) db.giveaways_history = {};
        db.giveaways_history[msgId] = db.active_giveaways[msgId];
        delete db.active_giveaways[msgId];
        require('fs').writeFileSync(dbPath, JSON.stringify(db, null, 2));
      }
    }
  } catch(e) { console.error('EndGiveaway Error', e); }
}

