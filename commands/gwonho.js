const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const Card = require('../models/Card');
const DroppedCard = require('../models/DroppedCard');
const incrementCardCount = require('../utils/incrementCardCount');
const generateCardCode = require('../utils/generateCardCode');
const User = require('../models/User'); // Importamos el modelo User

module.exports = {
  data: new SlashCommandBuilder()
    .setName('wonho')
    .setDescription('Genera una carta específica.')
    .addSubcommand(subcommand =>
      subcommand
        .setName('generate')
        .setDescription('solo para staff.')
        .addStringOption(option =>
          option.setName('idol')
            .setDescription('Nombre del idol.')
            .setRequired(true))
        .addStringOption(option =>
          option.setName('group')
            .setDescription('Nombre del grupo.')
            .setRequired(true))
        .addStringOption(option =>
          option.setName('era')
            .setDescription('Nombre de la era.')
            .setRequired(true))
        .addStringOption(option =>
          option.setName('rarity')
            .setDescription('Rareza de la carta (1, 2 o 3).')
            .setRequired(true))
        .addStringOption(option =>
          option.setName('event')
            .setDescription('Nombre del evento (opcional).')
            .setRequired(false))),
  
  async execute(interaction) {
    try {
      await interaction.deferReply();

      const firstRole = 'ROL_ID_1'; // Reemplaza con el ID del primer rol
      const secondRole = 'ROL_ID_2'; // Reemplaza con el ID del segundo rol
      const memberRoles = interaction.member.roles.cache;
      const userId = interaction.user.id;

      // Validamos si el usuario tiene algún rol válido
      if (!memberRoles.has(firstRole) && !memberRoles.has(secondRole)) {
        return interaction.editReply({ content: 'No tienes el permiso necesario para usar este comando.', ephemeral: true });
      }

      const user = await User.findOne({ userId });
      const currentMonth = new Date().toISOString().slice(0, 7); // Obtiene el mes actual en formato YYYY-MM

      // Si no existe el usuario, lo inicializamos
      if (!user) {
        await User.create({
          userId,
          generateWonhoCount: 0,
          generateResetMonth: currentMonth,
        });
      }

      // Resetear el contador si estamos en un nuevo mes
      if (user.generateResetMonth !== currentMonth) {
        user.generateWonhoCount = 0;
        user.generateResetMonth = currentMonth;
      }

      // Lógica para límites según roles
      const maxUses = memberRoles.has(secondRole) ? 2 : 1; // Segundo rol puede generar 2 veces al mes, primero solo 1

      if (user.generateWonhoCount >= maxUses) {
        return interaction.editReply({
          content: `Has alcanzado el límite de generates permitidas este mes (${maxUses} veces).`,
          ephemeral: true,
        });
      }

      // Incrementamos el contador de generación
      user.generateWonhoCount += 1;
      await user.save();

      const idol = interaction.options.getString('idol');
      const grupo = interaction.options.getString('group');
      const era = interaction.options.getString('era');
      const rarity = interaction.options.getString('rarity');
      const event = interaction.options.getString('event');

      const escapeRegExp = (string) => {
        return string.replace(/[.*+?^=!:${}()|\[\]\/\\'"]/g, '\\$&');
      };

      let card;

      if (event) {
        card = await Card.findOne({
          idol: { $regex: new RegExp(escapeRegExp(idol), 'i') },
          grupo: { $regex: new RegExp(escapeRegExp(grupo), 'i') },
          era: { $regex: new RegExp(escapeRegExp(era), 'i') },
          event: { $regex: new RegExp(escapeRegExp(event), 'i') },
        });
      } else {
        card = await Card.findOne({
          idol: { $regex: new RegExp(escapeRegExp(idol), 'i') },
          grupo: { $regex: new RegExp(escapeRegExp(grupo), 'i') },
          era: { $regex: new RegExp(escapeRegExp(era), 'i') },
          rarity,
        });
      }

      if (!card) {
        return interaction.editReply({ content: 'No se encontró ninguna carta que coincida con los criterios proporcionados.', ephemeral: true });
      }

      const uniqueCode = generateCardCode(card.idol, card.grupo, card.era, card.rarity, card.event);
      const { copyNumber } = await incrementCardCount(userId, card._id);

      const droppedCard = new DroppedCard({
        userId,
        cardId: card._id,
        idol: card.idol,
        grupo: card.grupo,
        era: card.era,
        eshort: card.eshort,
        rarity: card.rarity,
        event: card.event,
        uniqueCode,
        copyNumber,
        command: '/wonho gen',
      });

      await droppedCard.save();

      const cardEmbed = new EmbedBuilder()
        .setTitle('Generated card:')
        .setDescription(
          `**${card.idol} - ${card.grupo}**\n<:dot:1296709116231684106>**Era:** ${card.era}\n<:dot:1296709116231684106>**Eshort:** \`${card.eshort}\`\n<:dot:1296709116231684106>**Copy:** \`#${copyNumber}\`\n\`\`\`${uniqueCode}\`\`\``
        )
        .setImage(card.image)
        .setColor('#60a5fa');

      return interaction.editReply({ embeds: [cardEmbed] });

    } catch (error) {
      console.error('Error al generar la carta:', error);
      return interaction.editReply({ content: 'Hubo un error al generar la carta. Inténtalo de nuevo más tarde.', ephemeral: true });
    }
  },
};
