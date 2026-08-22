const { SlashCommandBuilder, ActionRowBuilder, StringSelectMenuBuilder, AttachmentBuilder } = require('discord.js');
const { CATEGORY_ORDER, CATEGORIES } = require('../utils/helpRegistry');
const { renderHelpGif, renderHelpPng } = require('../utils/cards/helpCard');

const DEFAULT_CATEGORY = CATEGORY_ORDER[0];

function buildCategoryMenu(activeCategory) {
    const menu = new StringSelectMenuBuilder()
        .setCustomId('help_category')
        .setPlaceholder('📂 Choisis une catégorie')
        .addOptions(CATEGORY_ORDER.map(key => ({
            label: CATEGORIES[key].label,
            value: key,
            emoji: CATEGORIES[key].emoji,
            default: key === activeCategory,
        })));
    return new ActionRowBuilder().addComponents(menu);
}

module.exports = [
    new SlashCommandBuilder()
        .setName('help')
        .setDescription('📖 Affiche toutes les commandes du bot, classées par catégorie')
        .setDefaultMemberPermissions(null),
];

module.exports.execute = async (interaction) => {
    if (interaction.commandName !== 'help') return;

    await interaction.deferReply({ ephemeral: true });
    const buffer = await renderHelpGif({ activeCategory: DEFAULT_CATEGORY });
    const attachment = new AttachmentBuilder(buffer, { name: 'help.gif' });
    return interaction.editReply({ files: [attachment], components: [buildCategoryMenu(DEFAULT_CATEGORY)] });
};

module.exports.handleSelectMenu = async (interaction) => {
    if (interaction.customId !== 'help_category') return;

    const category = interaction.values[0];
    await interaction.deferUpdate();
    const buffer = await renderHelpPng({ activeCategory: category });
    const attachment = new AttachmentBuilder(buffer, { name: 'help.png' });
    return interaction.editReply({ files: [attachment], components: [buildCategoryMenu(category)] });
};
