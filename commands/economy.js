const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, PermissionFlagsBits } = require('discord.js');
const fs = require('fs');
const path = require('path');

const dbPath = path.join(__dirname, '..', 'database.json');

function getDb() {
    if (fs.existsSync(dbPath)) try { return JSON.parse(fs.readFileSync(dbPath, 'utf8')); } catch(e) {}
    return { economy: {} };
}
function saveDb(db) { fs.writeFileSync(dbPath, JSON.stringify(db, null, 2)); }
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
    { id: 'role_actif', name: '? Rôle Actif', price: 300, desc: 'Montre que tu es un membre actif', category: '?? Rôles Exclusifs', emoji: '?' },
    { id: 'role_vip', name: '?? Rôle VIP', price: 1000, desc: 'Accès aux salons VIP exclusifs', category: '?? Rôles Exclusifs', emoji: '??' },
    { id: 'role_premium', name: '?? Rôle Premium', price: 2500, desc: 'Le statut Premium ultime', category: '?? Rôles Exclusifs', emoji: '??' },
    { id: 'role_legende', name: '?? Rôle Légende', price: 5000, desc: 'Pour les membres légendaires', category: '?? Rôles Exclusifs', emoji: '??' },
    // Page 2 - Casino boosts
    { id: 'boost_casino_x2', name: '?? Boost Casino x2', price: 500, desc: 'Double tes gains au casino pendant 1h', category: '?? Boosts Casino', emoji: '??' },
    { id: 'boost_jackpot', name: '?? Boost Jackpot', price: 1200, desc: 'Multiplie x3 le jackpot slots', category: '?? Boosts Casino', emoji: '??' },
    { id: 'boost_protection', name: '??? Protection Roses', price: 800, desc: 'Protège tes roses du vol pendant 24h', category: '?? Boosts Casino', emoji: '???' },
    { id: 'vol_roses', name: '?? Vol de Roses', price: 400, desc: 'Tente de voler les roses d\'un membre', category: '?? Boosts Casino', emoji: '??' },
    // Page 3 - Cosmétiques
    { id: 'couleur_rose', name: '?? Couleur Rose', price: 200, desc: 'Un rôle de couleur rose pour ton pseudo', category: '?? Cosmétiques', emoji: '??' },
    { id: 'couleur_violet', name: '?? Couleur Violette', price: 200, desc: 'Un rôle de couleur violette', category: '?? Cosmétiques', emoji: '??' },
    { id: 'couleur_bleu', name: '?? Couleur Bleue', price: 200, desc: 'Un rôle de couleur bleue', category: '?? Cosmétiques', emoji: '??' },
    { id: 'couleur_or', name: '?? Couleur Dorée', price: 500, desc: 'Un rôle de couleur or exclusive', category: '?? Cosmétiques', emoji: '??' },
    // Page 4 - Fun
    { id: 'gif_reaction', name: '?? GIF de victoire', price: 150, desc: 'Le bot poste un GIF de victoire pour toi', category: '?? Fun & Spécial', emoji: '??' },
    { id: 'annonce_vip', name: '?? Annonce Personnelle', price: 3000, desc: 'Le bot fait une annonce pour toi', category: '?? Fun & Spécial', emoji: '??' },
    { id: 'custom_role', name: '? Rôle Personnalisé', price: 15000, desc: 'Un rôle à ton nom et ta couleur !', category: '?? Fun & Spécial', emoji: '?' },
    { id: 'millionnaire', name: '?? Rôle Millionnaire', price: 10000, desc: 'Tu as prouvé ta richesse !', category: '?? Fun & Spécial', emoji: '??' },
];

const ITEMS_PER_PAGE = 4;
const TOTAL_PAGES = Math.ceil(ALL_ITEMS.length / ITEMS_PER_PAGE);

function buildShopEmbed(page, userId) {
    const roses = getRoses(userId);
    const start = page * ITEMS_PER_PAGE;
    const items = ALL_ITEMS.slice(start, start + ITEMS_PER_PAGE);
    
    const embed = new EmbedBuilder()
        .setColor(0xFF69B4)
        .setTitle('?? ????? BOUTIQUE ROSITAA ????? ??')
        .setDescription(`> ?? **Ton solde :** \`${roses} roses\`\n> ?? Utilise \`/buy <id>\` pour acheter un objet\n\`\`\`\n?? Page ${page + 1}/${TOTAL_PAGES} — ${items[0]?.category || ''}\n\`\`\``)
        .setThumbnail('https://i.imgur.com/QqB8Hk8.gif')
        .setFooter({ text: `?? Boutique Rositaa • Gagne des roses en chattant !` })
        .setTimestamp();

    items.forEach((item, i) => {
        const canAfford = roses >= item.price ? '?' : '?';
        embed.addFields({
            name: `${item.emoji} ${item.name} — ?? ${item.price.toLocaleString()} roses ${canAfford}`,
            value: `> ${item.desc}\n> ?? ID: \`${item.id}\``,
            inline: false
        });
    });

    return embed;
}

function buildButtons(page) {
    return new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId(`shop_prev_${page}`)
            .setLabel('?  Précédent')
            .setStyle(ButtonStyle.Secondary)
            .setDisabled(page === 0),
        new ButtonBuilder()
            .setCustomId(`shop_page_info`)
            .setLabel(`Page ${page + 1} / ${TOTAL_PAGES}`)
            .setStyle(ButtonStyle.Primary)
            .setDisabled(true),
        new ButtonBuilder()
            .setCustomId(`shop_next_${page}`)
            .setLabel('Suivant  ?')
            .setStyle(ButtonStyle.Secondary)
            .setDisabled(page === TOTAL_PAGES - 1)
    );
}

module.exports = [
    new SlashCommandBuilder()
        .setName('shop')
        .setDescription('?? Ouvrir la boutique du serveur !')
        .setDefaultMemberPermissions(null),

    new SlashCommandBuilder()
        .setName('buy')
        .setDescription('?? Acheter un objet dans la boutique')
        .setDefaultMemberPermissions(null)
        .addStringOption(opt =>
            opt.setName('id')
               .setDescription('L\'ID de l\'objet à acheter (visible dans /shop)')
               .setRequired(true)
        ),

    new SlashCommandBuilder()
        .setName('roses')
        .setDescription('?? Voir ton nombre de roses')
        .setDefaultMemberPermissions(null)
        .addUserOption(opt => opt.setName('membre').setDescription('Voir les roses d\'un autre membre').setRequired(false)),

    new SlashCommandBuilder()
        .setName('donner')
        .setDescription('?? Donner des roses à un membre')
        .setDefaultMemberPermissions(null)
        .addUserOption(opt => opt.setName('membre').setDescription('Le membre à qui donner').setRequired(true))
        .addIntegerOption(opt => opt.setName('montant').setDescription('Combien de roses ?').setRequired(true).setMinValue(1)),

    new SlashCommandBuilder()
        .setName('top_roses')
        .setDescription('?? Classement des membres les plus riches !')
        .setDefaultMemberPermissions(null),
];

module.exports.execute = async (interaction) => {
    const { commandName } = interaction;

    if (commandName === 'shop') {
        const embed = buildShopEmbed(0, interaction.user.id);
        const buttons = buildButtons(0);
        return interaction.reply({ embeds: [embed], components: [buttons] });
    }

    if (commandName === 'buy') {
        const itemId = interaction.options.getString('id').toLowerCase().trim();
        const item = ALL_ITEMS.find(i => i.id === itemId);
        if (!item) {
            return interaction.reply({ content: `? ID introuvable : \`${itemId}\`. Consulte \`/shop\` pour voir les IDs valides.`, ephemeral: true });
        }
        const roses = getRoses(interaction.user.id);
        if (roses < item.price) {
            return interaction.reply({ content: `? Tu n'as que **${roses} ??**. Il t'en faut **${item.price - roses}** de plus pour **${item.name}** !`, ephemeral: true });
        }
        addRoses(interaction.user.id, -item.price);
        const embed = new EmbedBuilder()
            .setColor(0xFF69B4)
            .setTitle('?? Achat Confirmé !')
            .setDescription(`Tu viens d'acheter **${item.emoji} ${item.name}** pour **${item.price} ?? roses** !\n\n> ${item.desc}\n\n?? Solde restant : **${roses - item.price} roses**`)
            .setFooter({ text: 'Merci pour ton achat !' })
            .setTimestamp();
        return interaction.reply({ embeds: [embed] });
    }

    if (commandName === 'roses') {
        const target = interaction.options.getUser('membre') || interaction.user;
        const roses = getRoses(target.id);
        const rank = (() => {
            if (roses >= 10000) return '?? Millionnaire';
            if (roses >= 5000) return '?? Légende';
            if (roses >= 2500) return '?? Premium';
            if (roses >= 1000) return '?? VIP';
            if (roses >= 300) return '? Actif';
            return '?? Débutant';
        })();
        const embed = new EmbedBuilder()
            .setColor(0xFF69B4)
            .setTitle(`?? Compte de ${target.username}`)
            .setThumbnail(target.displayAvatarURL({ dynamic: true }))
            .addFields(
                { name: '?? Solde', value: `**${roses.toLocaleString()} roses**`, inline: true },
                { name: '?? Rang', value: rank, inline: true }
            )
            .setFooter({ text: 'Gagne des roses en envoyant des messages !' })
            .setTimestamp();
        return interaction.reply({ embeds: [embed] });
    }

    if (commandName === 'donner') {
        const target = interaction.options.getUser('membre');
        const amount = interaction.options.getInteger('montant');
        if (target.id === interaction.user.id) return interaction.reply({ content: '? Tu ne peux pas te donner des roses à toi-même !', ephemeral: true });
        const roses = getRoses(interaction.user.id);
        if (roses < amount) return interaction.reply({ content: `? Tu n'as que **${roses} ??** roses !`, ephemeral: true });
        addRoses(interaction.user.id, -amount);
        addRoses(target.id, amount);
        return interaction.reply(`?? **${interaction.user.username}** vient d'offrir **${amount} ?? roses** à **${target.username}** !`);
    }

    if (commandName === 'top_roses') {
        const db = getDb();
        if (!db.economy) return interaction.reply({ content: '? Aucune économie enregistrée.', ephemeral: true });
        const sorted = Object.entries(db.economy)
            .sort(([, a], [, b]) => (b.roses || 0) - (a.roses || 0))
            .slice(0, 10);
        const medals = ['??', '??', '??'];
        const lines = sorted.map(([id, data], i) =>
            `${medals[i] || `**${i+1}.**`} <@${id}> — **${(data.roses || 0).toLocaleString()} ??**`
        ).join('\n');
        const embed = new EmbedBuilder()
            .setColor(0xFF69B4)
            .setTitle('?? Top 10 des plus riches')
            .setDescription(lines || 'Aucun membre encore...')
            .setFooter({ text: 'Chatte pour gagner des roses !' })
            .setTimestamp();
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
    
    const embed = buildShopEmbed(page, interaction.user.id);
    const buttons = buildButtons(page);
    return interaction.update({ embeds: [embed], components: [buttons] });
};
