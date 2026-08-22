const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, PermissionFlagsBits, AttachmentBuilder, ModalBuilder, TextInputBuilder, TextInputStyle, ChannelType } = require('discord.js');
const fs = require('fs');
const { brandedEmbed, buildBrandedReply, PINK_ALERT } = require('../utils/theme');
const { SEGMENTS } = require('../utils/cards/wheelGif');

let rawKeys = process.env.GEMINI_API_KEYS || '';
let apiKeys = rawKeys.split(',').map(k => k.trim()).filter(k => k.length > 0);

async function callVIPAI(prompt, systemInstruction) {
  if (apiKeys.length === 0) return "Désolé, les clés VIP ne sont pas configurées.";
  
  let lastError;
  
  // Boucle rigoureuse sur TOUTES les clés
  let startIndex = Math.floor(Math.random() * apiKeys.length);
  for (let i = 0; i < apiKeys.length; i++) {
    const keyIndex = (startIndex + i) % apiKeys.length;
    try {
      const genAI = new GoogleGenerativeAI(apiKeys[keyIndex]);
      const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash", systemInstruction });
      const result = await model.generateContent(prompt);
      return result.response.text();
    } catch (e) {
      lastError = e;
      // On attend un peu pour ne pas spammer si Google est capricieux
      await new Promise(r => setTimeout(r, 500));
    }
  }
  
  console.error("VIP AI Error: Toutes les clés ont échoué.", lastError);
  throw new Error("Toutes les clés API sont actuellement épuisées ou surchargées. Raison : " + (lastError ? lastError.message : 'Inconnue'));
}

function checkVIP(interaction) {
  const member = interaction.member;
  if (!member) return false;
  return member.roles.cache.some(role => 
    role.name.toLowerCase().includes('premium') || 
    role.name.toLowerCase().includes('vip')
  );
}

module.exports = [

  new SlashCommandBuilder().setName('lockdown')
    .setDescription('🛡️ Anti-Raid Ultime : verrouille tous les salons du serveur !')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  new SlashCommandBuilder().setName('unlockall')
    .setDescription('🛡️ Anti-Raid Ultime : déverrouille tous les salons du serveur !')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  new SlashCommandBuilder().setName('setup_verification')
    .setDescription('Installe le bouton de vérification (Anti-Raid)')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
    
  new SlashCommandBuilder().setName('setup_vip')
    .setDescription('Affiche le panneau des avantages VIP')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
    
  new SlashCommandBuilder().setName('setup_roles')
    .setDescription('Installe le panneau de rôles')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
    
  new SlashCommandBuilder().setName('setup_tickets')
    .setDescription('Installe le panneau des tickets')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  new SlashCommandBuilder().setName('setup_shop_category')
    .setDescription('🌸 Crée la catégorie Boutique & Jeux avec ses salons explicatifs')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  new SlashCommandBuilder().setName('setup_roue')
    .setDescription('🎡 Crée le salon de la roue de la chance')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  new SlashCommandBuilder().setName('giveaway')
    .setDescription('Ouvre le formulaire pour créer un giveaway')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
    
  new SlashCommandBuilder().setName('endgiveaway')
    .setDescription('Termine manuellement un giveaway et tire un gagnant')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addStringOption(opt => opt.setName('message_id').setDescription('ID du message du giveaway').setRequired(true)),
    
  new SlashCommandBuilder().setName('reroll')
    .setDescription('Tire un nouveau gagnant pour un giveaway terminé')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addStringOption(opt => opt.setName('message_id').setDescription('ID du message du giveaway').setRequired(true)),
    
];

module.exports.execute = async (interaction) => {
  const { commandName, options, client } = interaction;

  if (commandName === 'lockdown') {
    await interaction.deferReply({ ephemeral: false });
    try {
      const channels = await interaction.guild.channels.fetch();
      let count = 0;
      for (const [id, channel] of channels) {
        if (channel && channel.type === 0) { // 0 = GuildText
          await channel.permissionOverwrites.edit(interaction.guild.roles.everyone.id, { SendMessages: false }).catch(()=>{});
          count++;
        }
      }
      interaction.client.isLockdownActive = true;
      const { embed, files } = await buildBrandedReply({
        title: '🚨 LOCKDOWN ACTIVÉ',
        description: `Le serveur est en mode Anti-Raid. **${count}** salons ont été verrouillés.\nLes membres normaux ne peuvent plus parler.\nUtilisez \`/unlockall\` pour annuler.`,
        banner: 'alert',
        color: PINK_ALERT,
      });
      return interaction.editReply({ embeds: [embed], files });
    } catch (e) {
      return interaction.editReply({ embeds: [brandedEmbed({ title: '❌ Erreur', description: e.message, color: PINK_ALERT })] });
    }
  }

  if (commandName === 'unlockall') {
    await interaction.deferReply({ ephemeral: false });
    try {
      const channels = await interaction.guild.channels.fetch();
      let count = 0;
      for (const [id, channel] of channels) {
        if (channel && channel.type === 0) { // 0 = GuildText
          await channel.permissionOverwrites.edit(interaction.guild.roles.everyone.id, { SendMessages: null }).catch(()=>{});
          count++;
        }
      }
      interaction.client.isLockdownActive = false;
      const { embed, files } = await buildBrandedReply({
        title: '✅ LOCKDOWN DÉSACTIVÉ',
        description: `**${count}** salons ont été déverrouillés. Le serveur reprend son fonctionnement normal.`,
        banner: 'success',
      });
      return interaction.editReply({ embeds: [embed], files });
    } catch (e) {
      return interaction.editReply({ embeds: [brandedEmbed({ title: '❌ Erreur', description: e.message, color: PINK_ALERT })] });
    }
  }

  if (commandName === 'setup_verification') {
    const { embed, files } = await buildBrandedReply({
      title: '🛡️ Vérification Anti-Raid',
      description: 'Pour accéder au reste du serveur, prouve que tu es humain en cliquant sur le bouton ci-dessous.',
      banner: 'success',
    });

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId('verify_member').setLabel('Se vérifier').setEmoji('✅').setStyle(ButtonStyle.Success)
    );

    await interaction.channel.send({ embeds: [embed], files, components: [row] });
    return interaction.reply({ content: '✅ Panneau de vérification installé.', ephemeral: true });
  }

  if (commandName === 'setup_vip') {
    const { embed, files } = await buildBrandedReply({
      title: '💎 AVANTAGES EXCLUSIFS VIP',
      description: "Débloque des super-pouvoirs en devenant membre Premium de Rositaa 🌸\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━",
      banner: 'cosmetic',
      fields: [
        { name: '🎥 Résumé YouTube (`/youtube`)', value: "Fais résumer n'importe quelle longue vidéo YouTube en quelques secondes.", inline: false },
        { name: '💻 Coach Développeur (`/code_review`)', value: 'Fais analyser, débugger et corriger ton code par un CTO IA virtuel.', inline: false },
        { name: '✍️ Copywriter Pro (`/copywriter`)', value: 'Réécris tes brouillons en textes hypnotiques, sans fautes et professionnels.', inline: false },
        { name: "🎨 Créateur d'Images 8K (`/imagine_pro`)", value: "Génère des images en qualité maximale sans file d'attente.", inline: false },
        { name: '📈 Consultant Business (`/business_plan`)', value: "Demande à l'IA de structurer et d'écrire un business plan complet.", inline: false },
        { name: '🚀 Sans Limites', value: 'Tes requêtes sont prioritaires sur le serveur !', inline: false },
      ],
    });
    embed.setFooter({ text: 'Soutiens le serveur et obtiens le rôle Premium ! 🌸' });

    await interaction.channel.send({ embeds: [embed], files });
    return interaction.reply({ content: '✅ Panneau VIP installé.', ephemeral: true });
  }

  if (commandName === 'setup_roles') {
    const { embed, files } = await buildBrandedReply({
      title: '🎭 Choisis ton Profil',
      description: 'Clique sur les emojis pour recevoir le rôle correspondant :\n\n💻 — **Développeur**\n🤖 — **Passionné IA**\n📖 — **Apprenant**',
      banner: 'fun',
    });

    const msg = await interaction.channel.send({ embeds: [embed], files });
    await msg.react('💻'); await msg.react('🤖'); await msg.react('📖');
    return interaction.reply({ content: '✅ Panneau de rôles installé.', ephemeral: true });
  }

  if (commandName === 'setup_tickets') {
    const attachment = new AttachmentBuilder('./assets/ticket_banner.png');

    const embed = brandedEmbed({
      title: '🎫 CENTRE DE SUPPORT & TICKETS',
      description: "Bienvenue dans l'espace de support officiel de Rositaa 🌸\nClique sur l'un des boutons ci-dessous pour ouvrir un salon de discussion privé avec l'équipe.",
      banner: 'attachment://ticket_banner.png',
    });

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId('ticket_questions').setLabel('Questions').setEmoji('❓').setStyle(ButtonStyle.Primary),
      new ButtonBuilder().setCustomId('ticket_aide').setLabel('Aide').setEmoji('🆘').setStyle(ButtonStyle.Secondary)
    );

    await interaction.channel.send({ embeds: [embed], components: [row], files: [attachment] });
    return interaction.reply({ content: '✅ Panneau de tickets installé.', ephemeral: true });
  }

  if (commandName === 'setup_shop_category') {
    await interaction.deferReply({ ephemeral: true });
    const { guild } = interaction;

    let category = guild.channels.cache.find(c => c.type === ChannelType.GuildCategory && c.name === '🌸 BOUTIQUE & JEUX');
    if (!category) {
      category = await guild.channels.create({ name: '🌸 BOUTIQUE & JEUX', type: ChannelType.GuildCategory });
    }

    async function ensureChannel(name) {
      let channel = guild.channels.cache.find(c => c.parentId === category.id && c.name === name);
      if (!channel) {
        channel = await guild.channels.create({ name, type: ChannelType.GuildText, parent: category.id });
      }
      return channel;
    }

    const HOW_TO_EARN = "💬 Tu gagnes **1 à 3 🌹 roses** à chaque message envoyé sur le serveur (cooldown d'1 minute pour éviter le spam). Tu peux aussi en recevoir avec `/donner`.";

    const boutiqueChannel = await ensureChannel('🛍️-boutique');
    const { embed: boutiqueEmbed, files: boutiqueFiles } = await buildBrandedReply({
      title: '🛍️ Bienvenue dans la Boutique !',
      banner: 'cosmetic',
      description:
        `Tape \`/shop\` pour parcourir la boutique et acheter directement depuis le menu déroulant.\n\n` +
        `**Ce que tu peux acheter avec tes roses :**\n` +
        `👑 Des rôles exclusifs (Actif, VIP, Premium, Légende)\n` +
        `🎨 Des couleurs de pseudo personnalisées\n` +
        `🎰 Des boosts pour le casino\n` +
        `✨ Un rôle 100% personnalisé (nom + couleur de ton choix)\n\n` +
        `**💰 Comment avoir des roses ?**\n${HOW_TO_EARN}`,
    });
    await boutiqueChannel.send({ embeds: [boutiqueEmbed], files: boutiqueFiles });

    const casinoChannel = await ensureChannel('🎰-casino');
    const { embed: casinoEmbed, files: casinoFiles } = await buildBrandedReply({
      title: '🎰 Bienvenue au Casino !',
      banner: 'fun',
      description:
        `Mise tes roses et tente ta chance :\n\n` +
        `**🪙 \`/casino coinflip <mise> <pile|face>\`**\n` +
        `Pile ou face classique : devine juste et tu doubles ta mise.\n\n` +
        `**🎰 \`/casino slots <mise>\`**\n` +
        `3 symboles identiques = jackpot x5 • 2 identiques = x1.5 • sinon tu perds ta mise.\n\n` +
        `**💰 Comment avoir des roses ?**\n${HOW_TO_EARN}\n\n` +
        `⚠️ Joue de manière responsable, ce ne sont que des roses virtuelles pour s'amuser !`,
    });
    await casinoChannel.send({ embeds: [casinoEmbed], files: casinoFiles });

    const giftChannel = await ensureChannel('🎁-gift');
    const { embed: giftEmbed, files: giftFiles } = await buildBrandedReply({
      title: '🎁 Bienvenue dans les Cadeaux !',
      banner: 'gift',
      description:
        `Ici sont annoncés les giveaways organisés par le staff.\n\n` +
        `**Comment participer ?**\n` +
        `Clique simplement sur le bouton **🎉 Participer** sous l'annonce. Certains giveaways demandent une condition (ex : rejoindre un serveur partenaire) — lis bien le message avant de participer !\n\n` +
        `🚫 **Anti-triche :** la création de doubles comptes pour participer plusieurs fois entraîne une exclusion immédiate et un possible bannissement.`,
    });
    await giftChannel.send({ embeds: [giftEmbed], files: giftFiles });

    const explicationsChannel = await ensureChannel('📖-explications');
    const { embed: explicationsEmbed, files: explicationsFiles } = await buildBrandedReply({
      title: '📖 Tout comprendre sur Rositaa 🌸',
      banner: 'success',
      description: "Le guide complet du serveur, section par section 👇",
      fields: [
        { name: '🌹 Les roses', value: HOW_TO_EARN + '\nConsulte ton solde avec `/roses` et le classement avec `/top_roses`.' },
        { name: '🛍️ La boutique', value: `\`/shop\` pour acheter des rôles, couleurs et boosts avec tes roses. Voir ${boutiqueChannel}.` },
        { name: '🎰 Le casino', value: `\`/casino coinflip\` et \`/casino slots\` pour miser tes roses. Voir ${casinoChannel}.` },
        { name: '🎁 Les cadeaux', value: `Giveaways organisés par le staff, un bouton pour participer. Voir ${giftChannel}.` },
        { name: '🎫 Le support', value: "Besoin d'aide ? Ouvre un ticket privé avec l'équipe depuis le panneau de tickets." },
        { name: '📨 Les invitations', value: "Invite tes amis pour grimper au classement des recruteurs — panneau dédié avec ton lien personnel." },
      ],
    });
    await explicationsChannel.send({ embeds: [explicationsEmbed], files: explicationsFiles });

    return interaction.editReply({ content: `✅ Catégorie et salons créés : ${boutiqueChannel}, ${casinoChannel}, ${giftChannel}, ${explicationsChannel}` });
  }

  if (commandName === 'setup_roue') {
    await interaction.deferReply({ ephemeral: true });
    const { guild } = interaction;

    let category = guild.channels.cache.find(c => c.type === ChannelType.GuildCategory && c.name === '🌸 BOUTIQUE & JEUX');
    if (!category) {
      category = await guild.channels.create({ name: '🌸 BOUTIQUE & JEUX', type: ChannelType.GuildCategory });
    }

    let roueChannel = guild.channels.cache.find(c => c.parentId === category.id && c.name === '🎡-roue');
    if (!roueChannel) {
      roueChannel = await guild.channels.create({ name: '🎡-roue', type: ChannelType.GuildText, parent: category.id });
    }

    const oddsText = SEGMENTS.map(s => `**${s.value} 🌹** — ${s.weight}% de chances`).join('\n');

    const { embed, files } = await buildBrandedReply({
      title: '🎡 Bienvenue sur la Roue de la Chance !',
      banner: 'fun',
      description:
        `Tape \`/roue\` pour la faire tourner et gagner des roses **gratuitement**, aucune mise requise !\n\n` +
        `**🎯 Chances de gain :**\n${oddsText}\n\n` +
        `**⏳ Cooldown :** 1 tour par heure.\n\n` +
        `Reviens régulièrement tenter ta chance ! 🌹`,
    });
    await roueChannel.send({ embeds: [embed], files });

    return interaction.editReply({ content: `✅ Salon de la roue créé : ${roueChannel}` });
  }

  if (commandName === 'giveaway') {
    const modal = new ModalBuilder()
      .setCustomId('giveaway_modal')
      .setTitle('Créer un Giveaway Exclusif');

    const prizeInput = new TextInputBuilder()
      .setCustomId('giveaway_prize')
      .setLabel('Lot à gagner')
      .setPlaceholder('Ex: Nitro 1 Mois, Compte Netflix...')
      .setStyle(TextInputStyle.Short)
      .setRequired(true);

    const timeInput = new TextInputBuilder()
      .setCustomId('giveaway_time')
      .setLabel('Temps en minutes')
      .setPlaceholder('Ex: 60')
      .setStyle(TextInputStyle.Short)
      .setRequired(true);

    const conditionInput = new TextInputBuilder()
      .setCustomId('giveaway_condition')
      .setLabel('Condition Obligatoire')
      .setPlaceholder('Ex: Rejoindre le serveur partenaire')
      .setStyle(TextInputStyle.Short)
      .setRequired(true);

    const linkInput = new TextInputBuilder()
      .setCustomId('giveaway_link')
      .setLabel('Lien du serveur partenaire')
      .setPlaceholder('Ex: https://discord.gg/XXX')
      .setStyle(TextInputStyle.Short)
      .setRequired(true);

    modal.addComponents(
      new ActionRowBuilder().addComponents(prizeInput),
      new ActionRowBuilder().addComponents(timeInput),
      new ActionRowBuilder().addComponents(conditionInput),
      new ActionRowBuilder().addComponents(linkInput)
    );

    await interaction.showModal(modal);
  }

  if (commandName === 'endgiveaway' || commandName === 'reroll') {
    await interaction.deferReply({ ephemeral: true });
    const msgId = options.getString('message_id');
    try {
      const fetchedMsg = await interaction.channel.messages.fetch(msgId);
      let participants = (client.giveaways && client.giveaways[msgId]) ? client.giveaways[msgId] : [];
      
      // Fallback : si le bot a redémarré, on récupère les participants depuis la description du message
      if (participants.length === 0) {
        const existingEmbed = fetchedMsg.embeds[0];
        if (existingEmbed && existingEmbed.description) {
          const matches = existingEmbed.description.match(/<@(\d+)>/g);
          if (matches) {
            participants = [...new Set(matches.map(m => m.replace('<@', '').replace('>', '')))];
          }
        }
      }

      if (participants.length === 0) {
        await interaction.editReply({ content: '❌ Impossible de procéder au tirage : Aucun participant trouvé.' });
        return;
      }

      const validParticipants = participants.filter(id => id !== interaction.user.id);
      const finalPool = validParticipants.length > 0 ? validParticipants : participants;
      const winner = finalPool[Math.floor(Math.random() * finalPool.length)];
      
      if (commandName === 'reroll') {
        await interaction.channel.send(`🎉 REROLL ! Félicitations <@${winner}> ! Tu es le nouveau gagnant du giveaway !`);
      } else {
        await interaction.channel.send(`🎉 Félicitations <@${winner}> ! Tu as gagné le giveaway (tirage officiel) !`);
      }
      
      const endEmbed = EmbedBuilder.from(fetchedMsg.embeds[0])
        .setTitle('🎉 GIVEAWAY TERMINÉ 🎉')
        .setDescription(`**Gagnant :** <@${winner}>\n\n*(Tirage 100% sécurisé : seules les personnes avec ≥ 1 invitation ont été prises en compte)*`)
        .setColor(0x2B2D31);
      
      await fetchedMsg.edit({ embeds: [endEmbed], components: [] }).catch(() => {});
      if (client.giveaways && client.giveaways[msgId]) delete client.giveaways[msgId];
      
      await interaction.editReply({ content: `✅ ${commandName === 'reroll' ? 'Reroll effectué' : 'Giveaway terminé'} avec succès.` });
    } catch(e) {
      await interaction.editReply({ content: '❌ Erreur: ' + e.message });
    }
  }

  // --- COMMANDES VIP IA ---


};

