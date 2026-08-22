
const { SlashCommandBuilder, ChannelType, PermissionFlagsBits, ActionRowBuilder, StringSelectMenuBuilder } = require('discord.js');
const { brandedEmbed } = require('../utils/theme');

async function buildInviteLinkEmbed(interaction) {
  const { guild } = interaction;
  let channel = interaction.channel;
  if (!channel || channel.type !== ChannelType.GuildText) {
    channel = guild.channels.cache.find(c => c.type === ChannelType.GuildText);
  }

  let inviteUrl = '';
  if (channel) {
    const invite = await channel.createInvite({
      maxAge: 0,
      maxUses: 0,
      unique: true,
      reason: `Créé par ${interaction.user.tag} via le panneau d'invitations`,
    }).catch(() => null);
    if (invite) inviteUrl = invite.url;
  }

  return brandedEmbed({
    title: '📨 Ton lien d\'invitation',
    banner: 'gift',
    description: `Pour inviter des amis et participer au concours d'invitations :\n\n` +
      `**1. Crée ton propre lien d'invitation :**\n` +
      (inviteUrl ? `👉 Voici ton lien personnel : **${inviteUrl}**\n` : `👉 Utilise l'interface Discord : clic droit sur le serveur → **Inviter des gens**.\n`) +
      `\n**2. ⚠️ Règle importante :**\n` +
      `Pour que tes invitations soient comptabilisées, **tu dois partager ton propre lien**. Si tes amis utilisent un autre lien, ton score n'augmentera pas.\n` +
      `\n**3. 🚫 Doubles comptes interdits :**\n` +
      `Notre système de sécurité détecte et exclut automatiquement les doubles comptes (comptes récents ou suspects). Tricher entraîne une exclusion immédiate des Giveaways et un possible bannissement.`,
  });
}

async function buildMyInvitesEmbed(interaction, target) {
  const { guild } = interaction;
  const invites = await guild.invites.fetch();
  const userInvites = invites.filter(i => i.inviter && i.inviter.id === target.id);
  const totalUses = userInvites.reduce((sum, i) => sum + (i.uses || 0), 0);

  return brandedEmbed({
    title: `📊 Invitations de ${target.username}`,
    description: `${target.toString()} a invité **${totalUses}** membre(s) sur le serveur.`,
    thumbnail: target.displayAvatarURL(),
    banner: 'gift',
  });
}

async function buildTopInvitesEmbed(interaction) {
  const { guild } = interaction;
  const invites = await guild.invites.fetch();
  const members = await guild.members.fetch();

  const inviteCounts = new Map();
  members.forEach(member => {
    if (!member.user.bot) inviteCounts.set(member.user.id, { uses: 0, user: member.user });
  });
  invites.forEach(invite => {
    if (invite.inviter && !invite.inviter.bot) {
      const inviterId = invite.inviter.id;
      const current = inviteCounts.get(inviterId) || { uses: 0, user: invite.inviter };
      current.uses += invite.uses || 0;
      inviteCounts.set(inviterId, current);
    }
  });

  const sorted = Array.from(inviteCounts.values()).sort((a, b) => b.uses - a.uses).slice(0, 15);
  if (sorted.length === 0) {
    return brandedEmbed({ title: 'Aucun membre trouvé.', banner: 'leaderboard' });
  }

  const description = sorted
    .map((inv, index) => {
      const medal = index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : '🔹';
      return `${medal} **${inv.user.username}** — ${inv.uses} invitation(s)`;
    })
    .join('\n');

  return brandedEmbed({ title: '🏆 Classement des Recruteurs', description, thumbnail: guild.iconURL(), banner: 'leaderboard' });
}

function buildInvitesPanelRow() {
  const menu = new StringSelectMenuBuilder()
    .setCustomId('invites_panel')
    .setPlaceholder('📨 Choisis une option')
    .addOptions(
      { label: 'Mon lien d\'invitation', description: 'Récupère ton lien personnel à partager', value: 'link', emoji: '🔗' },
      { label: 'Mes invitations', description: 'Combien de membres as-tu invité ?', value: 'mine', emoji: '📊' },
      { label: 'Classement', description: 'Top des meilleurs recruteurs du serveur', value: 'top', emoji: '🏆' },
    );
  return new ActionRowBuilder().addComponents(menu);
}

module.exports = [
  new SlashCommandBuilder().setName('ping').setDescription('Affiche la latence du bot'),
  new SlashCommandBuilder().setName('serverinfo').setDescription('Stats et infos du serveur'),
  new SlashCommandBuilder().setName('userinfo').setDescription('Infos sur un membre').addUserOption(opt => opt.setName('utilisateur').setDescription('Membre').setRequired(false)),
  new SlashCommandBuilder().setName('avatar').setDescription('Affiche la photo de profil').addUserOption(opt => opt.setName('utilisateur').setDescription('Membre').setRequired(false)),
  new SlashCommandBuilder().setName('botinfo').setDescription('Stats du bot'),
  new SlashCommandBuilder().setName('roles').setDescription('Liste tous les rôles du serveur'),
  new SlashCommandBuilder()
    .setName('sondage')
    .setDescription('Crée un sondage à choix multiples')
    .addStringOption(opt => opt.setName('question').setDescription('La question du sondage').setRequired(true))
    .addStringOption(opt => opt.setName('choix1').setDescription('Premier choix').setRequired(true))
    .addStringOption(opt => opt.setName('choix2').setDescription('Deuxième choix').setRequired(true))
    .addStringOption(opt => opt.setName('choix3').setDescription('Troisième choix').setRequired(false))
    .addStringOption(opt => opt.setName('choix4').setDescription('Quatrième choix').setRequired(false))
    .addStringOption(opt => opt.setName('choix5').setDescription('Cinquième choix').setRequired(false)),
  new SlashCommandBuilder().setName('say').setDescription('Fait parler le bot').addStringOption(opt => opt.setName('message').setDescription('Message').setRequired(true)),
  new SlashCommandBuilder().setName('invites').setDescription('Affiche le nombre d\'invitations d\'un membre').addUserOption(opt => opt.setName('utilisateur').setDescription('Membre ciblé (laisser vide pour voir ses propres stats)').setRequired(false)),
  new SlashCommandBuilder().setName('topinvites').setDescription('Affiche le classement des meilleurs recruteurs du serveur'),
  new SlashCommandBuilder().setName('invite').setDescription('Affiche votre lien d\'invitation et explique comment inviter'),
  new SlashCommandBuilder()
    .setName('setup_invites')
    .setDescription('📨 Installe le panneau d\'invitations (lien / stats / classement)')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
];

module.exports.execute = async (interaction) => {
  const { commandName, options, guild, client } = interaction;

  if (commandName === 'ping') {
    const embed = brandedEmbed({ title: '🏓 Pong !', description: `Latence de l'API : **${client.ws.ping}ms**`, banner: 'fun' });
    return interaction.reply({ embeds: [embed] });
  }

  if (commandName === 'serverinfo') {
    const embed = brandedEmbed({
      title: `🌸 ${guild.name}`,
      thumbnail: guild.iconURL(),
      banner: 'fun',
      fields: [
        { name: '👥 Membres', value: `${guild.memberCount}`, inline: true },
        { name: '📅 Créé le', value: `<t:${Math.floor(guild.createdTimestamp / 1000)}:R>`, inline: true },
      ],
    });
    return interaction.reply({ embeds: [embed] });
  }

  if (commandName === 'userinfo') {
    const target = options.getMember('utilisateur') || interaction.member;
    const embed = brandedEmbed({
      title: `🌸 ${target.user.tag}`,
      thumbnail: target.user.displayAvatarURL(),
      banner: 'profile',
      fields: [
        { name: '📥 Rejoint le serveur', value: `<t:${Math.floor(target.joinedTimestamp / 1000)}:R>`, inline: true },
        { name: '🐣 Compte créé', value: `<t:${Math.floor(target.user.createdTimestamp / 1000)}:R>`, inline: true },
      ],
    });
    return interaction.reply({ embeds: [embed] });
  }

  if (commandName === 'avatar') {
    const target = options.getUser('utilisateur') || interaction.user;
    const embed = brandedEmbed({ title: `🖼️ Avatar de ${target.tag}`, banner: target.displayAvatarURL({ size: 1024 }) });
    return interaction.reply({ embeds: [embed] });
  }

  if (commandName === 'botinfo') {
    const embed = brandedEmbed({
      title: '🤖 Statistiques de Rositaa',
      banner: 'fun',
      fields: [
        { name: '⏱️ Uptime', value: `${Math.floor(process.uptime() / 60)} minutes`, inline: true },
        { name: '💾 Mémoire', value: `${Math.round(process.memoryUsage().rss / 1024 / 1024)} MB`, inline: true },
      ],
    });
    return interaction.reply({ embeds: [embed] });
  }

  if (commandName === 'roles') {
    const roles = guild.roles.cache.map(r => r.toString()).join(', ');
    const embed = brandedEmbed({ title: '🎭 Rôles du serveur', description: roles.substring(0, 3900), banner: 'fun' });
    return interaction.reply({ embeds: [embed] });
  }

  if (commandName === 'sondage') {
    const question = options.getString('question');
    const choices = [];
    for (let i = 1; i <= 5; i++) {
      const choice = options.getString(`choix${i}`);
      if (choice) choices.push(choice);
    }

    const emojis = ['1️⃣', '2️⃣', '3️⃣', '4️⃣', '5️⃣'];
    const description = choices.map((choice, index) => `${emojis[index]} ${choice}`).join('\n\n');

    const embed = brandedEmbed({
      title: `📊 ${question}`,
      description,
      banner: 'fun',
    }).setFooter({ text: `Sondage créé par ${interaction.user.tag}`, iconURL: interaction.user.displayAvatarURL() });

    const msg = await interaction.reply({ embeds: [embed], fetchReply: true });
    for (let i = 0; i < choices.length; i++) {
      await msg.react(emojis[i]);
    }
    return;
  }

  if (commandName === 'say') {
    const msg = options.getString('message');
    if (!interaction.member.permissions.has('ManageMessages')) {
      return interaction.reply({ embeds: [brandedEmbed({ title: '❌ Non autorisé', color: 0xFF1E56 })], ephemeral: true });
    }
    await interaction.channel.send(msg);
    return interaction.reply({ embeds: [brandedEmbed({ title: '✅ Message envoyé', banner: 'success' })], ephemeral: true });
  }

  if (commandName === 'invites') {
    const target = options.getUser('utilisateur') || interaction.user;
    try {
      const embed = await buildMyInvitesEmbed(interaction, target);
      return interaction.reply({ embeds: [embed] });
    } catch (err) {
      console.error(err);
      return interaction.reply({ embeds: [brandedEmbed({ title: '❌ Erreur', description: `Impossible de récupérer les données : \`${err.message}\``, color: 0xFF1E56 })], ephemeral: true });
    }
  }

  if (commandName === 'topinvites') {
    try {
      const embed = await buildTopInvitesEmbed(interaction);
      return interaction.reply({ embeds: [embed] });
    } catch (err) {
      console.error(err);
      return interaction.reply({ embeds: [brandedEmbed({ title: '❌ Erreur', description: `Impossible de récupérer les données : \`${err.message}\``, color: 0xFF1E56 })], ephemeral: true });
    }
  }

  if (commandName === 'invite') {
    try {
      const embed = await buildInviteLinkEmbed(interaction);
      return interaction.reply({ embeds: [embed] });
    } catch (err) {
      console.error(err);
      return interaction.reply({ embeds: [brandedEmbed({ title: '❌ Erreur', description: 'Assure-toi que le bot a la permission "Gérer le serveur" et "Créer une invitation".', color: 0xFF1E56 })], ephemeral: true });
    }
  }

  if (commandName === 'setup_invites') {
    const embed = brandedEmbed({
      title: '📨 Centre d\'invitations Rositaa',
      banner: 'gift',
      description:
        'Invite tes amis sur le serveur et grimpe dans le classement des recruteurs !\n\n' +
        '**🔗 Mon lien d\'invitation** — génère ton lien personnel à partager\n' +
        '**📊 Mes invitations** — combien de membres as-tu invité ?\n' +
        '**🏆 Classement** — qui sont les meilleurs recruteurs du serveur ?\n\n' +
        'Choisis une option dans le menu ci-dessous 👇',
    });
    await interaction.channel.send({ embeds: [embed], components: [buildInvitesPanelRow()] });
    return interaction.reply({ content: '✅ Panneau d\'invitations installé.', ephemeral: true });
  }
};

module.exports.handleSelectMenu = async (interaction) => {
  if (interaction.customId !== 'invites_panel') return;

  await interaction.deferReply({ ephemeral: true });
  const choice = interaction.values[0];

  try {
    let embed;
    if (choice === 'link') embed = await buildInviteLinkEmbed(interaction);
    else if (choice === 'mine') embed = await buildMyInvitesEmbed(interaction, interaction.user);
    else embed = await buildTopInvitesEmbed(interaction);

    return interaction.editReply({ embeds: [embed] });
  } catch (err) {
    console.error(err);
    return interaction.editReply({ embeds: [brandedEmbed({ title: '❌ Erreur', description: `Impossible de récupérer les données : \`${err.message}\``, color: 0xFF1E56 })] });
  }
};
