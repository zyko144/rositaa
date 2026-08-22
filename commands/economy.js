const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');
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

const shopItems = [
    { id: 'role_vip', name: 'R�le VIP', price: 1000, desc: 'Obtiens le r�le VIP exclusif', roleId: '123456789' },
    { id: 'role_millionaire', name: 'R�le Millionnaire', price: 10000, desc: 'Prouve ta richesse', roleId: '987654321' }
];

module.exports = [
    new SlashCommandBuilder().setName('roses')
        .setDescription('?? Voir ton nombre de roses (ton argent) !').setDefaultMemberPermissions(null)
        .addUserOption(opt => opt.setName('membre').setDescription('Voir les roses d\'un autre membre').setRequired(false)),
        
    new SlashCommandBuilder().setName('shop')
        .setDescription('?? Afficher la boutique du serveur !').setDefaultMemberPermissions(null),
        
    new SlashCommandBuilder().setName('buy')
        .setDescription('?? Acheter un objet dans la boutique').setDefaultMemberPermissions(null)
        .addStringOption(opt => 
            opt.setName('item_id')
               .setDescription('L\'ID de l\'objet � acheter')
               .setRequired(true)
               .addChoices(
                   { name: 'R�le VIP (1000 roses)', value: 'role_vip' },
                   { name: 'R�le Millionnaire (10000 roses)', value: 'role_millionaire' }
               )
        )
];

module.exports.execute = async (interaction) => {
    const { commandName } = interaction;
    
    if (commandName === 'roses') {
        const target = interaction.options.getUser('membre') || interaction.user;
        const roses = getRoses(target.id);
        const embed = new EmbedBuilder()
            .setColor(0xFF69B4)
            .setTitle(`?? Compte en banque de ${target.username}`)
            .setDescription(`Ce membre poss�de actuellement **${roses} Roses** !`);
        return interaction.reply({ embeds: [embed] });
    }
    
    if (commandName === 'shop') {
        const embed = new EmbedBuilder()
            .setColor(0xFF69B4)
            .setTitle('?? Boutique Officielle')
            .setDescription('Voici les objets que tu peux acheter avec tes roses. Utilise `/buy <id>` !');
            
        shopItems.forEach(item => {
            embed.addFields({ name: `${item.name} - ?? ${item.price} roses`, value: `*ID: ${item.id}*\n${item.desc}` });
        });
        
        return interaction.reply({ embeds: [embed] });
    }
    
    if (commandName === 'buy') {
        const itemId = interaction.options.getString('item_id');
        const item = shopItems.find(i => i.id === itemId);
        
        if (!item) return interaction.reply({ content: '? Objet introuvable !', ephemeral: true });
        
        const roses = getRoses(interaction.user.id);
        if (roses < item.price) {
            return interaction.reply({ content: `? Tu n'as pas assez de roses ! Il t'en manque **${item.price - roses}**.`, ephemeral: true });
        }
        
        addRoses(interaction.user.id, -item.price);
        
        const role = interaction.guild.roles.cache.get(item.roleId);
        if (role) {
            await interaction.member.roles.add(role).catch(() => {});
        }
        
        return interaction.reply(`?? F�licitations ! Tu viens d'acheter **${item.name}** pour ${item.price} roses !`);
    }
};
