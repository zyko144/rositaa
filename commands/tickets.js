
const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { brandedEmbed, buildBrandedReply, PINK_ALERT } = require('../utils/theme');

module.exports = [
  new SlashCommandBuilder().setName('ticket_add').setDescription('Ajoute un membre au ticket')
    .addUserOption(opt => opt.setName('utilisateur').setDescription('Membre').setRequired(true))
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels),
  new SlashCommandBuilder().setName('ticket_remove').setDescription('Retire un membre du ticket')
    .addUserOption(opt => opt.setName('utilisateur').setDescription('Membre').setRequired(true))
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels),
  new SlashCommandBuilder().setName('ticket_close').setDescription('Ferme et archive le ticket')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels)
];

module.exports.execute = async (interaction) => {
  const { commandName, options, channel } = interaction;
  
  if (!channel.name.startsWith('ticket-')) {
    return interaction.reply({ embeds: [brandedEmbed({ title: '❌ Ce n\'est pas un salon de ticket.', color: PINK_ALERT })], ephemeral: true });
  }

  if (commandName === 'ticket_add') {
    const target = options.getUser('utilisateur');
    await channel.permissionOverwrites.edit(target.id, { ViewChannel: true, SendMessages: true });
    const { embed, files } = await buildBrandedReply({ title: '✅ Membre ajouté', description: `${target} a été ajouté au ticket.`, banner: 'moderation' });
    return interaction.reply({ embeds: [embed], files });
  }

  if (commandName === 'ticket_remove') {
    const target = options.getUser('utilisateur');
    await channel.permissionOverwrites.edit(target.id, { ViewChannel: false });
    return interaction.reply({ embeds: [brandedEmbed({ title: '❌ Membre retiré', description: `${target} a été retiré du ticket.`, color: PINK_ALERT })] });
  }

  if (commandName === 'ticket_close') {
    await interaction.reply({ embeds: [brandedEmbed({ title: '🔒 Fermeture du ticket', description: 'Ce ticket sera fermé dans 5 secondes...', color: PINK_ALERT })] });
    setTimeout(() => {
      channel.delete().catch(() => {});
    }, 5000);
  }
};
