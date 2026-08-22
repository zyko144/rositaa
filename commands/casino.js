const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const fs = require('fs');
const path = require('path');

const dbPath = path.join(__dirname, '..', 'database.json');

function getDb() {
    if (fs.existsSync(dbPath)) return JSON.parse(fs.readFileSync(dbPath, 'utf8'));
    return { economy: {} };
}

function saveDb(db) {
    fs.writeFileSync(dbPath, JSON.stringify(db, null, 2));
}

function getRoses(userId) {
    const db = getDb();
    if (!db.economy || !db.economy[userId]) return 0;
    return db.economy[userId].roses || 0;
}

function addRoses(userId, amount) {
    const db = getDb();
    if (!db.economy) db.economy = {};
    if (!db.economy[userId]) db.economy[userId] = { roses: 0 };
    db.economy[userId].roses += amount;
    saveDb(db);
}

module.exports = [
    new SlashCommandBuilder().setName('casino')
        .setDescription('?? Jouer au casino avec tes roses !')
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
        return interaction.reply({ content: `? Tu n'as pas assez de roses ! Tu n'en as que **${roses}**.`, ephemeral: true });
    }
    
    if (subCommand === 'coinflip') {
        const choice = interaction.options.getString('choix');
        const result = Math.random() < 0.5 ? 'pile' : 'face';
        
        if (choice === result) {
            addRoses(interaction.user.id, bet);
            return interaction.reply(`?? La pièce tombe sur **${result}**...\n?? Gagné ! Tu remportes **${bet * 2}** roses !`);
        } else {
            addRoses(interaction.user.id, -bet);
            return interaction.reply(`?? La pièce tombe sur **${result}**...\n?? Perdu ! Tu perds tes **${bet}** roses.`);
        }
    }
    
    if (subCommand === 'slots') {
        const emojis = ['??', '??', '??', '??', '??'];
        const slot1 = emojis[Math.floor(Math.random() * emojis.length)];
        const slot2 = emojis[Math.floor(Math.random() * emojis.length)];
        const slot3 = emojis[Math.floor(Math.random() * emojis.length)];
        
        let multiplier = 0;
        if (slot1 === slot2 && slot2 === slot3) {
            multiplier = 5; // Jackpot
        } else if (slot1 === slot2 || slot2 === slot3 || slot1 === slot3) {
            multiplier = 1.5; // Petite victoire
        }
        
        const winAmount = Math.floor(bet * multiplier);
        
        if (multiplier > 0) {
            addRoses(interaction.user.id, winAmount - bet);
            const embed = new EmbedBuilder()
                .setColor(0x00FF00)
                .setTitle('?? Machine à sous ??')
                .setDescription(`[ ${slot1} | ${slot2} | ${slot3} ]\n\n?? **JACKPOT !** Tu gagnes **${winAmount}** roses !`);
            return interaction.reply({ embeds: [embed] });
        } else {
            addRoses(interaction.user.id, -bet);
            const embed = new EmbedBuilder()
                .setColor(0xFF0000)
                .setTitle('?? Machine à sous ??')
                .setDescription(`[ ${slot1} | ${slot2} | ${slot3} ]\n\n?? **PERDU !** Tu as perdu tes **${bet}** roses.`);
            return interaction.reply({ embeds: [embed] });
        }
    }
};
