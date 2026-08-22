const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, PermissionFlagsBits, AttachmentBuilder } = require('discord.js');
const { readDatabase, writeDatabase } = require('../utils/db');
const { renderShopCard } = require('../utils/cards/shopCard');
const { renderRosesCard } = require('../utils/cards/rosesCard');

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

const ALL_ITEMS = [
    // Page 1 - Roles
    { id: 'role_actif', name: '⭐ Rôle Actif', price: 300, desc: 'Montre que tu es un membre actif', category: '👑 Rôles Exclusifs', emoji: '⭐' },
    { id: 'role_vip', name: '💎 Rôle VIP', price: 1000, desc: 'Accès aux salons VIP exclusifs', category: '👑 Rôles Exclusifs', emoji: '💎' },
    { id: 'role_premium', name: '🔥 Rôle Premium', price: 2500, desc: 'Le statut Premium ultime', category: '👑 Rôles Exclusifs', emoji: '🔥' },
    { id: 'role_legende', name: '🏆 Rôle Légende', price: 5000, desc: 'Pour les membres légendaires', category: '👑 Rôles Exclusifs', emoji: '🏆' },
    // Page 2 - Casino boosts
    { id: 'boost_casino_x2', name: '🎰 Boost Casino x2', price: 500, desc: 'Double tes gains au casino pendant 1h', category: '🎰 Boosts Casino', emoji: '🎰' },
    { id: 'boost_jackpot', name: '💥 Boost Jackpot', price: 1200, desc: 'Multiplie x3 le jackpot slots', category: '🎰 Boosts Casino', emoji: '💥' },
    { id: 'boost_protection', name: '🛡️ Protection Roses', price: 800, desc: 'Protège tes roses du vol pendant 24h', category: '🎰 Boosts Casino', emoji: '🛡️' },
    { id: 'vol_roses', name: '🌹 Vol de Roses', price: 400, desc: 'Tente de voler les roses d\'un membre', category: '🎰 Boosts Casino', emoji: '🌹' },
    // Page 3 - Cosmétiques
    { id: 'couleur_rose', name: '🩷 Couleur Rose', price: 200, desc: 'Un rôle de couleur rose pour ton pseudo', category: '🎨 Cosmétiques', emoji: '🩷' },
    { id: 'couleur_violet', name: '💜 Couleur Violette', price: 200, desc: 'Un rôle de couleur violette', category: '🎨 Cosmétiques', emoji: '💜' },
    { id: 'couleur_bleu', name: '💙 Couleur Bleue', price: 200, desc: 'Un rôle de couleur bleue', category: '🎨 Cosmétiques', emoji: '💙' },
    { id: 'couleur_or', name: '🌟 Couleur Dorée', price: 500, desc: 'Un rôle de couleur or exclusive', category: '🎨 Cosmétiques', emoji: '🌟' },
    // Page 4 - Fun
    { id: 'gif_reaction', name: '🎭 GIF de victoire', price: 150, desc: 'Le bot poste un GIF de victoire pour toi', category: '🎭 Fun & Spécial', emoji: '🎭' },
    { id: 'annonce_vip', name: '📢 Annonce Personnelle', price: 3000, desc: 'Le bot fait une annonce pour toi', category: '🎭 Fun & Spécial', emoji: '📢' },
    { id: 'custom_role', name: '✨ Rôle Personnalisé', price: 15000, desc: 'Un rôle à ton nom et ta couleur !', category: '🎭 Fun & Spécial', emoji: '✨' },
    { id: 'millionnaire', name: '💰 Rôle Millionnaire', price: 10000, desc: 'Tu as prouvé ta richesse !', category: '🎭 Fun & Spécial', emoji: '💰' },
];

const ITEMS_PER_PAGE = 4;
const TOTAL_PAGES = Math.ceil(ALL_ITEMS.length / ITEMS_PER_PAGE);

async function buildShopAttachment(page, userId) {
    const roses = getRoses(userId);
    const start = page * ITEMS_PER_PAGE;
    const items = ALL_ITEMS.slice(start, start + ITEMS_PER_PAGE);

    const buffer = await renderShopCard({
        category: items[0]?.category || '',
        items: items.map(i => ({ name: i.name, price: i.price, desc: i.desc })),
        roses,
        page,
        totalPages: TOTAL_PAGES,
    });

    return new AttachmentBuilder(buffer, { name: 'shop.png' });
}

function buildButtons(page) {
    return new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId(`shop_prev_${page}`)
            .setLabel('◀  Précédent')
            .setStyle(ButtonStyle.Secondary)
            .setDisabled(page === 0),
        new ButtonBuilder()
            .setCustomId(`shop_page_info`)
            .setLabel(`Page ${page + 1} / ${TOTAL_PAGES}`)
            .setStyle(ButtonStyle.Primary)
            .setDisabled(true),
        new ButtonBuilder()
            .setCustomId(`shop_next_${page}`)
            .setLabel('Suivant  ▶')
            .setStyle(ButtonStyle.Secondary)
            .setDisabled(page === TOTAL_PAGES - 1)
    );
}

module.exports = [
    new SlashCommandBuilder()
        .setName('shop')
        .setDescription('🛒 Ouvrir la boutique du serveur !')
        .setDefaultMemberPermissions(null),

    new SlashCommandBuilder()
        .setName('buy')
        .setDescription('💸 Acheter un objet dans la boutique')
        .setDefaultMemberPermissions(null)
        .addStringOption(opt =>
            opt.setName('id')
               .setDescription('L\'ID de l\'objet à acheter (visible dans /shop)')
               .setRequired(true)
        ),

    new SlashCommandBuilder()
        .setName('roses')
        .setDescription('🌹 Voir ton nombre de roses')
        .setDefaultMemberPermissions(null)
        .addUserOption(opt => opt.setName('membre').setDescription('Voir les roses d\'un autre membre').setRequired(false)),

    new SlashCommandBuilder()
        .setName('donner')
        .setDescription('🎁 Donner des roses à un membre')
        .setDefaultMemberPermissions(null)
        .addUserOption(opt => opt.setName('membre').setDescription('Le membre à qui donner').setRequired(true))
        .addIntegerOption(opt => opt.setName('montant').setDescription('Combien de roses ?').setRequired(true).setMinValue(1)),

    new SlashCommandBuilder()
        .setName('top_roses')
        .setDescription('🏆 Classement des membres les plus riches !')
        .setDefaultMemberPermissions(null),
];

module.exports.execute = async (interaction) => {
    const { commandName } = interaction;

    if (commandName === 'shop') {
        await interaction.deferReply();
        const attachment = await buildShopAttachment(0, interaction.user.id);
        const buttons = buildButtons(0);
        return interaction.editReply({ files: [attachment], components: [buttons] });
    }

    if (commandName === 'buy') {
        const itemId = interaction.options.getString('id').toLowerCase().trim();
        const item = ALL_ITEMS.find(i => i.id === itemId);
        if (!item) {
            return interaction.reply({ content: `❌ ID introuvable : \`${itemId}\`. Consulte \`/shop\` pour voir les IDs valides.`, ephemeral: true });
        }
        const roses = getRoses(interaction.user.id);
        if (roses < item.price) {
            return interaction.reply({ content: `❌ Tu n'as que **${roses} 🌹**. Il t'en faut **${item.price - roses}** de plus pour **${item.name}** !`, ephemeral: true });
        }
        addRoses(interaction.user.id, -item.price);
        const embed = new EmbedBuilder()
            .setColor(0xFF69B4)
            .setTitle('🛍️ Achat Confirmé !')
            .setDescription(`Tu viens d'acheter **${item.emoji} ${item.name}** pour **${item.price} 🌹 roses** !\n\n> ${item.desc}\n\n💳 **Solde restant :** \`${roses - item.price} roses\``)
            .setImage('https://i.pinimg.com/originals/18/f7/54/18f754907ec6d8196dbd92ceec70bc6c.gif')
            .setFooter({ text: 'Merci pour ton achat !' });
        return interaction.reply({ embeds: [embed] });
    }

    if (commandName === 'roses') {
        const target = interaction.options.getUser('membre') || interaction.user;
        await interaction.deferReply();

        const db = getDb();
        const roses = db.economy?.[target.id]?.roses || 0;
        const sorted = Object.entries(db.economy || {}).sort(([, a], [, b]) => (b.roses || 0) - (a.roses || 0));
        const rankIndex = sorted.findIndex(([id]) => id === target.id);

        const buffer = await renderRosesCard({
            username: target.username,
            avatarURL: target.displayAvatarURL({ extension: 'png', size: 256 }),
            roses,
            rank: rankIndex === -1 ? undefined : rankIndex + 1,
            totalMembers: sorted.length,
        });
        const attachment = new AttachmentBuilder(buffer, { name: 'roses.png' });
        return interaction.editReply({ files: [attachment] });
    }

    if (commandName === 'donner') {
        const target = interaction.options.getUser('membre');
        const amount = interaction.options.getInteger('montant');
        if (target.id === interaction.user.id) return interaction.reply({ content: '❌ Tu ne peux pas te donner des roses à toi-même !', ephemeral: true });
        const roses = getRoses(interaction.user.id);
        if (roses < amount) return interaction.reply({ content: `❌ Tu n'as que **${roses} 🌹** roses !`, ephemeral: true });
        addRoses(interaction.user.id, -amount);
        addRoses(target.id, amount);
        
        const embed = new EmbedBuilder()
            .setColor(0xFF69B4)
            .setTitle('🎁 Transfert Réussi !')
            .setDescription(`**${interaction.user.username}** vient d'offrir **${amount.toLocaleString()} 🌹 roses** à **${target.username}** !`)
            .setImage('https://i.pinimg.com/originals/c9/28/fc/c928fcce4d93cb0c1ab083c6b2413a1a.gif');
            
        return interaction.reply({ embeds: [embed] });
    }

    if (commandName === 'top_roses') {
        const db = getDb();
        if (!db.economy) return interaction.reply({ content: '❌ Aucune économie enregistrée.', ephemeral: true });
        const sorted = Object.entries(db.economy)
            .sort(([, a], [, b]) => (b.roses || 0) - (a.roses || 0))
            .slice(0, 10);
        const medals = ['🥇', '🥈', '🥉', '🏅', '🏅', '🏅', '🏅', '🏅', '🏅', '🏅'];
        const lines = sorted.map(([id, data], i) =>
            `${medals[i]} <@${id}> ━ 🌹 **${(data.roses || 0).toLocaleString()}** roses`
        ).join('\n\n');
        const embed = new EmbedBuilder()
            .setColor(0xFF69B4)
            .setAuthor({ name: '🏆 CLASSEMENT DES ROSES', iconURL: 'https://i.pinimg.com/originals/79/28/70/792870b991b5c30704944d1bead515e3.gif' })
            .setDescription(`Voici les 10 membres les plus riches du serveur :\n\n${lines || 'Aucun membre encore...'}`)
            .setImage('https://i.pinimg.com/originals/94/d4/72/94d4722513f508a8a48ef48d5d9a91ec.gif')
            .setFooter({ text: 'Chatte pour gagner des roses !' });
        return interaction.reply({ embeds: [embed] });
    }
};

module.exports.handleButton = async (interaction) => {
    if (!interaction.customId.startsWith('shop_')) return;
    if (interaction.customId === 'shop_page_info') return interaction.deferUpdate();

    const parts = interaction.customId.split('_');
    const direction = parts[1];
    let page = parseInt(parts[2]);

    if (direction === 'next') page++;
    else if (direction === 'prev') page--;

    page = Math.max(0, Math.min(TOTAL_PAGES - 1, page));

    await interaction.deferUpdate();
    const attachment = await buildShopAttachment(page, interaction.user.id);
    const buttons = buildButtons(page);
    return interaction.editReply({ files: [attachment], embeds: [], components: [buttons] });
};
