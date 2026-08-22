const { SlashCommandBuilder } = require('discord.js');
const { buildBrandedReply } = require('../utils/theme');

module.exports = [
  new SlashCommandBuilder().setName('8ball').setDescription('Pose une question magique')
    .setDefaultMemberPermissions(null)
    .addStringOption(opt => opt.setName('question').setDescription('Question').setRequired(true)),
  new SlashCommandBuilder().setName('coinflip_fun').setDescription('Pile ou face')
    .setDefaultMemberPermissions(null),
  new SlashCommandBuilder().setName('roll').setDescription('Lance un dé de 1 à 100')
    .setDefaultMemberPermissions(null),
  new SlashCommandBuilder().setName('joke').setDescription('Raconte une blague aléatoire')
    .setDefaultMemberPermissions(null),
  new SlashCommandBuilder().setName('meme').setDescription('Affiche un meme (simulé)')
    .setDefaultMemberPermissions(null),
  new SlashCommandBuilder().setName('rps').setDescription('Pierre Feuille Ciseaux')
    .setDefaultMemberPermissions(null)
    .addStringOption(opt => opt.setName('choix').setDescription('pierre / feuille / ciseaux').setRequired(true)),
  new SlashCommandBuilder().setName('lovecalc').setDescription('Calcule l\'amour')
    .setDefaultMemberPermissions(null)
    .addUserOption(opt => opt.setName('user1').setDescription('Personne 1').setRequired(true))
    .addUserOption(opt => opt.setName('user2').setDescription('Personne 2').setRequired(true))
];

module.exports.execute = async (interaction) => {
  const { commandName, options } = interaction;

  if (commandName === '8ball') {
    const responses = ['Oui absolument 🌸', 'Non, jamais', 'Peut-être...', 'C\'est certain !', 'Je ne pense pas', 'Demande plus tard'];
    const r = responses[Math.floor(Math.random() * responses.length)];
    const { embed, files } = await buildBrandedReply({
      title: '🎱 Boule Magique',
      banner: 'fun',
      fields: [
        { name: 'Question', value: options.getString('question') },
        { name: 'Réponse', value: `**${r}**` },
      ],
    });
    return interaction.reply({ embeds: [embed], files });
  }

  if (commandName === 'coinflip_fun') {
    const res = Math.random() < 0.5 ? 'Pile' : 'Face';
    const { embed, files } = await buildBrandedReply({ title: '🪙 Pile ou Face', description: `La pièce est tombée sur : **${res}** !`, banner: 'fun' });
    return interaction.reply({ embeds: [embed], files });
  }

  if (commandName === 'roll') {
    const res = Math.floor(Math.random() * 100) + 1;
    const { embed, files } = await buildBrandedReply({ title: '🎲 Lancer de dé', description: `Tu as obtenu **${res}** (sur 100) !`, banner: 'fun' });
    return interaction.reply({ embeds: [embed], files });
  }

  if (commandName === 'joke') {
    const jokes = [
      'Pourquoi les plongeurs plongent-ils toujours en arrière ? Parce que sinon ils tombent dans le bateau.',
      'Que fait une fraise sur un cheval ? Tagada tagada !',
      "C'est l'histoire d'un pingouin qui respire par les fesses. Un jour il s'assoit et il meurt.",
    ];
    const { embed, files } = await buildBrandedReply({ title: '😂 Blague du jour', description: jokes[Math.floor(Math.random() * jokes.length)], banner: 'fun' });
    return interaction.reply({ embeds: [embed], files });
  }

  if (commandName === 'meme') {
    const { embed, files } = await buildBrandedReply({ title: '🖼️ Meme du jour', description: '*(API de memes à brancher ici)*', banner: 'fun' });
    return interaction.reply({ embeds: [embed], files });
  }

  if (commandName === 'rps') {
    const user = options.getString('choix').toLowerCase();
    const botChoices = ['pierre', 'feuille', 'ciseaux'];
    const botC = botChoices[Math.floor(Math.random() * botChoices.length)];
    let result = 'Égalité !';
    if ((user === 'pierre' && botC === 'ciseaux') || (user === 'feuille' && botC === 'pierre') || (user === 'ciseaux' && botC === 'feuille')) result = 'Tu as gagné ! 🏆';
    else if (user !== botC) result = "J'ai gagné ! 🤖";
    const { embed, files } = await buildBrandedReply({
      title: '✊✋✌️ Pierre Feuille Ciseaux',
      description: `Tu as joué **${user}**, j'ai joué **${botC}**.\n\n**${result}**`,
      banner: 'fun',
    });
    return interaction.reply({ embeds: [embed], files });
  }

  if (commandName === 'lovecalc') {
    const u1 = options.getUser('user1');
    const u2 = options.getUser('user2');
    const score = Math.floor(Math.random() * 101);
    const { embed, files } = await buildBrandedReply({
      title: '💖 Love Calculator',
      description: `Le taux d'amour entre ${u1} et ${u2} est de...\n\n## 💗 ${score}% 💗`,
      banner: 'fun',
    });
    return interaction.reply({ embeds: [embed], files });
  }
};
