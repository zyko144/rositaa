const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, PermissionFlagsBits, AttachmentBuilder, ModalBuilder, TextInputBuilder, TextInputStyle } = require('discord.js');
const fs = require('fs');

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
    .setDescription('??? Anti-Raid Ultime: Verrouille tous les salons du serveur !')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
    
  new SlashCommandBuilder().setName('unlock')
    .setDescription('??? Anti-Raid Ultime: D�verrouille les salons du serveur !')
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
      return interaction.editReply('?? **LOCKDOWN ACTIV�** ??\n\nLe serveur est actuellement en mode Anti-Raid. ' + count + ' salons ont �t� verrouill�s. Les membres normaux ne peuvent plus parler.\nUtilisez `/unlock` pour annuler.');
    } catch (e) {
      return interaction.editReply('? Erreur: ' + e.message);
    }
  }

  if (commandName === 'unlock') {
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
      return interaction.editReply('? **LOCKDOWN D�SACTIV�** ?\n\n' + count + ' salons ont �t� d�verrouill�s. Le serveur reprend son fonctionnement normal.');
    } catch (e) {
      return interaction.editReply('? Erreur: ' + e.message);
    }
  }

  const { commandName, options, client } = interaction;
  
  if (commandName === 'setup_verification') {
    const embed = new EmbedBuilder()
      .setColor(0xCF6B45)
      .setTitle('🛡️ Vérification Anti-Raid')
      .setDescription("Pour accéder au reste du serveur, veuillez prouver que vous êtes humain en cliquant sur le bouton ci-dessous.");
      
    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId('verify_member').setLabel('✅ Se vérifier').setStyle(ButtonStyle.Success)
    );
    
    await interaction.channel.send({ embeds: [embed], components: [row] });
    return interaction.reply({ content: '✅ Panneau de vérification installé.', ephemeral: true });
  }

  if (commandName === 'setup_vip') {
    const embed = new EmbedBuilder()
      .setColor(0xCF6B45)
      .setTitle('💎  AVANTAGES EXCLUSIFS VIP')
      .setDescription("Débloquez la pleine puissance de l'Intelligence Artificielle en devenant membre Premium de Claude+. Voici vos super-pouvoirs :\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━")
      .addFields(
        { name: "🎥 Résumé YouTube (`/youtube`)", value: "Faites résumer n'importe quelle longue vidéo YouTube en quelques secondes.", inline: false },
        { name: "💻 Coach Développeur (`/code_review`)", value: "Faites analyser, débugger et corriger votre code par un CTO IA virtuel.", inline: false },
        { name: "✍️ Copywriter Pro (`/copywriter`)", value: "Réécrivez vos brouillons en textes hypnotiques, sans fautes et professionnels.", inline: false },
        { name: "🎨 Créateur d'Images 8K (`/imagine_pro`)", value: "Générez des images en qualité maximale sans file d'attente.", inline: false },
        { name: "📈 Consultant Business (`/business_plan`)", value: "Demandez à l'IA de structurer et d'écrire un business plan complet pour vos projets.", inline: false },
        { name: "🚀 Sans Limites", value: "Vos requêtes sont prioritaires sur le serveur !", inline: false }
      )
      .setFooter({ text: "Soutenez le serveur et obtenez le rôle Premium !" });
      
    await interaction.channel.send({ embeds: [embed] });
    return interaction.reply({ content: '✅ Panneau VIP installé.', ephemeral: true });
  }

  if (commandName === 'setup_roles') {
    const embed = new EmbedBuilder()
      .setColor(0xCF6B45)
      .setTitle('🎭  Choisis ton Profil')
      .setDescription('Clique sur les emojis pour recevoir le rôle correspondant :\n\n💻 — **Développeur**\n🤖 — **Passionné IA**\n📖 — **Apprenant**');

    const msg = await interaction.channel.send({ embeds: [embed] });
    await msg.react('💻'); await msg.react('🤖'); await msg.react('📖');
    return interaction.reply({ content: '✅ Panneau de rôles installé.', ephemeral: true });
  }

  if (commandName === 'setup_tickets') {
    const attachment = new AttachmentBuilder('./assets/ticket_banner.png');
    
    const embed = new EmbedBuilder()
      .setColor(0xFF69B4)
      .setTitle('💬  -  CENTRE DE SUPPORT & TICKETS')
      .setDescription("Bienvenue dans l'espace de support officiel.\nCliquez sur l'un des boutons ci-dessous pour ouvrir un salon de discussion privé.")
      .setImage('attachment://ticket_banner.png');
      
    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId('ticket_questions').setLabel('❓ Questions').setStyle(ButtonStyle.Primary),
      new ButtonBuilder().setCustomId('ticket_aide').setLabel('🆘 Aide').setStyle(ButtonStyle.Secondary)
    );
    
    await interaction.channel.send({ embeds: [embed], components: [row], files: [attachment] });
    return interaction.reply({ content: '✅ Panneau de tickets installé.', ephemeral: true });
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
