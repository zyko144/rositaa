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

// Systeme de multiplicateur de serie : chaque victoire consecutive augmente
// le multiplicateur applique au prochain gain, jusqu'a x2. Une defaite reset la serie.
const STREAK_STEP = 0.1;
const STREAK_MAX_MULT = 2.0;
function getStreak(userId) {
    const db = getDb();
    return db.casinoStreaks?.[userId] || 0;
}
function streakMultiplier(streak) {
    return Math.min(STREAK_MAX_MULT, 1 + streak * STREAK_STEP);
}
/** Applique le profit (positif ou negatif) et met a jour la serie en une seule ecriture DB. */
function settleRound(userId, { won, profit }) {
    const db = getDb();
    if (!db.economy) db.economy = {};
    if (!db.economy[userId]) db.economy[userId] = { roses: 0 };
    if (!db.casinoStreaks) db.casinoStreaks = {};

    db.economy[userId].roses += profit;
    const newStreak = won ? (db.casinoStreaks[userId] || 0) + 1 : 0;
    db.casinoStreaks[userId] = newStreak;

    saveDb(db);
    return { balance: db.economy[userId].roses, streak: newStreak };
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

    await interaction.deferReply({ ephemeral: true });

    if (subCommand === 'coinflip') {
        const choice = interaction.options.getString('choix');
        const result = Math.random() < 0.5 ? 'pile' : 'face';
        const win = choice === result;

        const streakBefore = getStreak(interaction.user.id);
        const mult = win ? streakMultiplier(streakBefore) : 1;
        const profit = win ? Math.round(bet * mult) : -bet;
        const { balance: newBalance, streak: newStreak } = settleRound(interaction.user.id, { won: win, profit });

        const gif = await renderCoinflipGif({ result });
        const attachment = new AttachmentBuilder(gif, { name: 'coinflip.gif' });

        const streakLine = win
            ? (mult > 1 ? `\n🔥 Série de **${newStreak}** victoires — multiplicateur **x${mult.toFixed(1)}** !` : '')
            : (streakBefore > 0 ? '\n💔 Série brisée.' : '');

        const embed = new EmbedBuilder()
            .setColor(win ? 0x00e5a0 : 0xff1e56)
            .setAuthor({ name: win ? '🪙 COINFLIP - GAGNÉ !' : '🪙 COINFLIP - PERDU !' })
            .setDescription(
                win
                    ? `La pièce est tombée sur **${result.toUpperCase()}** !\n\n🎉 Tu as gagné **${profit} 🌹 roses** !\n💳 Nouveau solde : \`${newBalance} roses\`${streakLine}`
                    : `La pièce est tombée sur **${result.toUpperCase()}** !\n\n💀 Tu as perdu tes **${bet} 🌹 roses**.\n💳 Nouveau solde : \`${newBalance} roses\`${streakLine}`
            )
            .setImage('attachment://coinflip.gif')
            .setFooter({ text: newStreak > 0 ? `Prochaine victoire : x${streakMultiplier(newStreak).toFixed(1)}` : 'Enchaîne les victoires pour multiplier tes gains !' });

        return interaction.editReply({ embeds: [embed], files: [attachment] });
    }

    if (subCommand === 'slots') {
        const spin = () => SLOT_SYMBOLS[Math.floor(Math.random() * SLOT_SYMBOLS.length)];
        const s1 = spin();
        const s2 = spin();
        const s3 = spin();

        let baseMultiplier = 0;
        if (s1.key === s2.key && s2.key === s3.key) {
            baseMultiplier = 5; // Jackpot
        } else if (s1.key === s2.key || s2.key === s3.key || s1.key === s3.key) {
            baseMultiplier = 1.5; // Petite victoire
        }
        const win = baseMultiplier > 0;

        const streakBefore = getStreak(interaction.user.id);
        const mult = win ? streakMultiplier(streakBefore) : 1;
        const baseProfit = win ? Math.floor(bet * baseMultiplier) - bet : -bet;
        const profit = win ? Math.round(baseProfit * mult) : baseProfit;
        const { balance: newBalance, streak: newStreak } = settleRound(interaction.user.id, { won: win, profit });

        const resultLabel = baseMultiplier === 5 ? 'JACKPOT !' : win ? 'GAGNE !' : 'PERDU';
        const gif = await renderSlotsGif({ symbolKeys: [s1.key, s2.key, s3.key], win, resultLabel });
        const attachment = new AttachmentBuilder(gif, { name: 'slots.gif' });

        const streakLine = win
            ? (mult > 1 ? `\n🔥 Série de **${newStreak}** victoires — multiplicateur **x${mult.toFixed(1)}** !` : '')
            : (streakBefore > 0 ? '\n💔 Série brisée.' : '');

        const combo = `${s1.emoji}  ${s2.emoji}  ${s3.emoji}`;
        const embed = new EmbedBuilder()
            .setColor(win ? 0x00e5a0 : 0xff1e56)
            .setAuthor({ name: win ? '🎰 MACHINES À SOUS - GAGNÉ !' : '🎰 MACHINES À SOUS - PERDU !' })
            .setDescription(
                win
                    ? `${combo}\n\n🎉 **VICTOIRE !** Tu gagnes **${profit} 🌹 roses** !\n💳 Nouveau solde : \`${newBalance} roses\`${streakLine}`
                    : `${combo}\n\n💀 **PERDU !** Tu as perdu tes **${bet} 🌹 roses**.\n💳 Nouveau solde : \`${newBalance} roses\`${streakLine}`
            )
            .setImage('attachment://slots.gif')
            .setFooter({ text: newStreak > 0 ? `Prochaine victoire : x${streakMultiplier(newStreak).toFixed(1)}` : 'Enchaîne les victoires pour multiplier tes gains !' });

        return interaction.editReply({ embeds: [embed], files: [attachment] });
    }
};
