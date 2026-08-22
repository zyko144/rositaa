const { SlashCommandBuilder, EmbedBuilder, AttachmentBuilder } = require('discord.js');
const { readDatabase, writeDatabase } = require('../utils/db');
const { renderCoinflipGif } = require('../utils/cards/coinflipGif');
const { renderSlotsGif } = require('../utils/cards/slotsGif');

const SLOT_SYMBOLS = [
    { emoji: '🍒', key: 'cherry' },
    { emoji: '🍋', key: 'lemon' },
    { emoji: '🔔', key: 'bell' },
    { emoji: '💎', key: 'gem' },
    { emoji: '🎰', key: 'slotmachine' },
];

function getDb() {
    const db = readDatabase();
    if (!db.economy) db.economy = {};
    return db;
}
function saveDb(db) { writeDatabase(db); }
function getRoses(userId) { const db = getDb(); return db.economy?.[userId]?.roses || 0; }
function addRoses(userId, amount) {
    const db = getDb();
    if (!db.economy) db.economy = {};
    if (!db.economy[userId]) db.economy[userId] = { roses: 0 };
    db.economy[userId].roses += amount;
    saveDb(db);
}

module.exports = [
    new SlashCommandBuilder().setName('casino')
        .setDescription('🎰 Jouer au casino avec tes roses !')
        .setDefaultMemberPermissions(null)
        .addSubcommand(sub => 
            sub.setName('coinflip')
               .setDescription('Jouer à Pile ou Face')
               .addIntegerOption(opt => opt.setName('mise').setDescription('Combien de roses miser ?').setRequired(true).setMinValue(1))
               .addStringOption(opt => opt.setName('choix').setDescription('Pile ou Face ?').setRequired(true).addChoices({name: 'Pile', value: 'pile'}, {name: 'Face', value: 'face'}))
        )
        .addSubcommand(sub => 
            sub.setName('slots')
               .setDescription('Jouer aux machines à sous')
               .addIntegerOption(opt => opt.setName('mise').setDescription('Combien de roses miser ?').setRequired(true).setMinValue(1))
        )
];

module.exports.execute = async (interaction) => {
    const { commandName } = interaction;
    if (commandName !== 'casino') return;
    
    const subCommand = interaction.options.getSubcommand();
    const bet = interaction.options.getInteger('mise');
    const roses = getRoses(interaction.user.id);
    
    if (roses < bet) {
        return interaction.reply({ content: `❌ Tu n'as pas assez de roses ! Tu n'en as que **${roses}**.`, ephemeral: true });
    }

    await interaction.deferReply();

    if (subCommand === 'coinflip') {
        const choice = interaction.options.getString('choix');
        const result = Math.random() < 0.5 ? 'pile' : 'face';
        const win = choice === result;
        const newBalance = roses + (win ? bet : -bet);
        addRoses(interaction.user.id, win ? bet : -bet);

        const gif = await renderCoinflipGif({ result });
        const attachment = new AttachmentBuilder(gif, { name: 'coinflip.gif' });

        const embed = new EmbedBuilder()
            .setColor(win ? 0x00e5a0 : 0xff1e56)
            .setAuthor({ name: win ? '🪙 COINFLIP - GAGNÉ !' : '🪙 COINFLIP - PERDU !' })
            .setDescription(
                win
                    ? `La pièce est tombée sur **${result.toUpperCase()}** !\n\n🎉 Tu as gagné **${bet} 🌹 roses** !\n💳 Nouveau solde : \`${newBalance} roses\``
                    : `La pièce est tombée sur **${result.toUpperCase()}** !\n\n💀 Tu as perdu tes **${bet} 🌹 roses**.\n💳 Nouveau solde : \`${newBalance} roses\``
            )
            .setImage('attachment://coinflip.gif');

        return interaction.editReply({ embeds: [embed], files: [attachment] });
    }

    if (subCommand === 'slots') {
        const spin = () => SLOT_SYMBOLS[Math.floor(Math.random() * SLOT_SYMBOLS.length)];
        const s1 = spin();
        const s2 = spin();
        const s3 = spin();

        let multiplier = 0;
        if (s1.key === s2.key && s2.key === s3.key) {
            multiplier = 5; // Jackpot
        } else if (s1.key === s2.key || s2.key === s3.key || s1.key === s3.key) {
            multiplier = 1.5; // Petite victoire
        }

        const winAmount = Math.floor(bet * multiplier);
        const win = multiplier > 0;
        const newBalance = roses + (win ? winAmount - bet : -bet);
        addRoses(interaction.user.id, win ? winAmount - bet : -bet);

        const resultLabel = multiplier === 5 ? 'JACKPOT !' : win ? 'GAGNE !' : 'PERDU';
        const gif = await renderSlotsGif({ symbolKeys: [s1.key, s2.key, s3.key], win, resultLabel });
        const attachment = new AttachmentBuilder(gif, { name: 'slots.gif' });

        const combo = `${s1.emoji}  ${s2.emoji}  ${s3.emoji}`;
        const embed = new EmbedBuilder()
            .setColor(win ? 0x00e5a0 : 0xff1e56)
            .setAuthor({ name: win ? '🎰 MACHINES À SOUS - GAGNÉ !' : '🎰 MACHINES À SOUS - PERDU !' })
            .setDescription(
                win
                    ? `${combo}\n\n🎉 **VICTOIRE !** Tu gagnes **${winAmount} 🌹 roses** !\n💳 Nouveau solde : \`${newBalance} roses\``
                    : `${combo}\n\n💀 **PERDU !** Tu as perdu tes **${bet} 🌹 roses**.\n💳 Nouveau solde : \`${newBalance} roses\``
            )
            .setImage('attachment://slots.gif');

        return interaction.editReply({ embeds: [embed], files: [attachment] });
    }
};
