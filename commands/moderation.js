
const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { readDatabase, writeDatabase } = require('../utils/db');
const { brandedEmbed, PINK_ALERT } = require('../utils/theme');

module.exports = [
  new SlashCommandBuilder().setName('clear').setDescription('Nettoie les messages d\'un salon')
    .addIntegerOption(opt => opt.setName('nombre').setDescription('Nombre de messages à supprimer').setRequired(true))
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages),
  new SlashCommandBuilder().setName('kick').setDescription('Expulse un membre')
    .addUserOption(opt => opt.setName('utilisateur').setDescription('Membre à expulser').setRequired(true))
    .addStringOption(opt => opt.setName('raison').setDescription('Raison'))
    .setDefaultMemberPermissions(PermissionFlagsBits.KickMembers),
  new SlashCommandBuilder().setName('ban').setDescription('Bannit un membre')
    .addUserOption(opt => opt.setName('utilisateur').setDescription('Membre à bannir').setRequired(true))
    .addStringOption(opt => opt.setName('raison').setDescription('Raison'))
    .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers),
  new SlashCommandBuilder().setName('unban').setDescription('Débannit un membre')
    .addStringOption(opt => opt.setName('id').setDescription('ID du membre').setRequired(true))
    .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers),
  new SlashCommandBuilder().setName('timeout').setDescription('Rend muet un membre')
    .addUserOption(opt => opt.setName('utilisateur').setDescription('Membre').setRequired(true))
    .addIntegerOption(opt => opt.setName('minutes').setDescription('Durée en minutes').setRequired(true))
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers),
  new SlashCommandBuilder().setName('warn').setDescription('Avertit un membre')
    .addUserOption(opt => opt.setName('utilisateur').setDescription('Membre').setRequired(true))
    .addStringOption(opt => opt.setName('raison').setDescription('Raison').setRequired(true))
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers),
  new SlashCommandBuilder().setName('warnings').setDescription('Voir les avertissements d\'un membre')
    .addUserOption(opt => opt.setName('utilisateur').setDescription('Membre').setRequired(true))
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers),
  new SlashCommandBuilder().setName('clearwarns').setDescription('Efface les avertissements')
    .addUserOption(opt => opt.setName('utilisateur').setDescription('Membre').setRequired(true))
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers),
  new SlashCommandBuilder().setName('lock').setDescription('Verrouille un salon')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels),
  new SlashCommandBuilder().setName('unlock').setDescription('Déverrouille un salon')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels),
  new SlashCommandBuilder().setName('slowmode').setDescription('Active le mode lent')
    .addIntegerOption(opt => opt.setName('secondes').setDescription('Délai').setRequired(true))
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels),
  new SlashCommandBuilder().setName('nuke').setDescription('Supprime et recrée un salon')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels)
];

module.exports.execute = async (interaction) => {
  const { commandName, options, guild, member } = interaction;

  if (commandName === 'clear') {
    const amount = options.getInteger('nombre');
    const deleted = await interaction.channel.bulkDelete(amount, true).catch(() => null);
    const embed = brandedEmbed({
      title: '🧹 Salon nettoyé',
      description: `**${deleted ? deleted.size : 0}** message(s) supprimé(s).`,
      banner: 'moderation',
    });
    return interaction.reply({ embeds: [embed], ephemeral: true });
  }

  if (commandName === 'kick') {
    const target = options.getMember('utilisateur');
    const reason = options.getString('raison') || 'Aucune raison';
    if (!target) {
      return interaction.reply({ embeds: [brandedEmbed({ title: '❌ Membre introuvable', color: PINK_ALERT })], ephemeral: true });
    }
    await target.kick(reason);
    const embed = brandedEmbed({
      title: '👢 Membre expulsé',
      description: `**${target.user.tag}** a été expulsé du serveur.\n**Raison :** ${reason}`,
      banner: 'moderation',
    });
    return interaction.reply({ embeds: [embed] });
  }

  if (commandName === 'ban') {
    const target = options.getMember('utilisateur');
    const reason = options.getString('raison') || 'Aucune raison';
    if (!target) {
      return interaction.reply({ embeds: [brandedEmbed({ title: '❌ Membre introuvable', color: PINK_ALERT })], ephemeral: true });
    }
    await target.ban({ reason });
    const embed = brandedEmbed({
      title: '🔨 Membre banni',
      description: `**${target.user.tag}** a été banni du serveur.\n**Raison :** ${reason}`,
      banner: 'moderation',
      color: PINK_ALERT,
    });
    return interaction.reply({ embeds: [embed] });
  }

  if (commandName === 'unban') {
    const id = options.getString('id');
    await guild.members.unban(id).catch(() => {});
    const embed = brandedEmbed({
      title: '🔓 Membre débanni',
      description: `L'utilisateur avec l'ID \`${id}\` a été débanni.`,
      banner: 'moderation',
    });
    return interaction.reply({ embeds: [embed] });
  }

  if (commandName === 'timeout') {
    const target = options.getMember('utilisateur');
    const minutes = options.getInteger('minutes');
    if (!target) {
      return interaction.reply({ embeds: [brandedEmbed({ title: '❌ Membre introuvable', color: PINK_ALERT })], ephemeral: true });
    }
    await target.timeout(minutes * 60 * 1000, 'Timeout via bot');
    const embed = brandedEmbed({
      title: '🔇 Membre en sourdine',
      description: `**${target.user.tag}** est en sourdine pour **${minutes} minute(s)**.`,
      banner: 'moderation',
    });
    return interaction.reply({ embeds: [embed] });
  }

  if (commandName === 'lock') {
    await interaction.channel.permissionOverwrites.edit(guild.roles.everyone, { SendMessages: false });
    return interaction.reply({ embeds: [brandedEmbed({ title: '🔒 Salon verrouillé', description: `${interaction.channel} a été verrouillé.`, banner: 'moderation', color: PINK_ALERT })] });
  }

  if (commandName === 'unlock') {
    await interaction.channel.permissionOverwrites.edit(guild.roles.everyone, { SendMessages: null });
    return interaction.reply({ embeds: [brandedEmbed({ title: '🔓 Salon déverrouillé', description: `${interaction.channel} a été déverrouillé.`, banner: 'moderation' })] });
  }

  if (commandName === 'slowmode') {
    const sec = options.getInteger('secondes');
    await interaction.channel.setRateLimitPerUser(sec);
    const embed = brandedEmbed({
      title: '🐢 Mode lent mis à jour',
      description: sec === 0 ? 'Le mode lent a été désactivé.' : `Mode lent réglé sur **${sec}s**.`,
      banner: 'moderation',
    });
    return interaction.reply({ embeds: [embed] });
  }

  if (commandName === 'nuke') {
    const channel = interaction.channel;
    const pos = channel.position;
    const parent = channel.parentId;
    const newChannel = await channel.clone();
    await newChannel.setPosition(pos);
    await newChannel.setParent(parent);
    await channel.delete();
    const embed = brandedEmbed({ title: '💥 Salon nuké', description: 'Ce salon a été supprimé et recréé.', banner: 'moderation' });
    return newChannel.send({ embeds: [embed] });
  }

  // Warnings system
  const db = readDatabase();
  if (!db.warnings) db.warnings = {};

  if (commandName === 'warn') {
    const target = options.getUser('utilisateur');
    const reason = options.getString('raison');
    if (!db.warnings[target.id]) db.warnings[target.id] = [];
    db.warnings[target.id].push({ reason, by: member.user.tag, date: new Date().toISOString() });
    writeDatabase(db);
    const embed = brandedEmbed({
      title: '⚠️ Avertissement donné',
      description: `**${target.tag}** a reçu un avertissement.\n**Raison :** ${reason}\n**Total :** ${db.warnings[target.id].length}`,
      banner: 'moderation',
      color: PINK_ALERT,
    });
    return interaction.reply({ embeds: [embed] });
  }

  if (commandName === 'warnings') {
    const target = options.getUser('utilisateur');
    const warns = db.warnings[target.id] || [];
    if (warns.length === 0) {
      return interaction.reply({ embeds: [brandedEmbed({ title: '✅ Aucun avertissement', description: `${target} n'a aucun avertissement.`, banner: 'moderation' })], ephemeral: true });
    }
    const embed = brandedEmbed({
      title: `⚠️ Avertissements de ${target.tag} (${warns.length})`,
      banner: 'moderation',
      color: PINK_ALERT,
      fields: warns.map((w, i) => ({ name: `#${i + 1} — ${new Date(w.date).toLocaleDateString('fr-FR')}`, value: `**Raison :** ${w.reason}\n**Par :** ${w.by}` })),
    });
    return interaction.reply({ embeds: [embed] });
  }

  if (commandName === 'clearwarns') {
    const target = options.getUser('utilisateur');
    delete db.warnings[target.id];
    writeDatabase(db);
    const embed = brandedEmbed({
      title: '✅ Avertissements effacés',
      description: `Les avertissements de **${target.tag}** ont été effacés.`,
      banner: 'moderation',
    });
    return interaction.reply({ embeds: [embed] });
  }
};
