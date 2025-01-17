const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const Card = require('../models/Card');
const DroppedCard = require('../models/DroppedCard');
const incrementCardCount = require('../utils/incrementCardCount');
const generateCardCode = require('../utils/generateCardCode');
const User = require('../models/User'); // Para manejar los límites mensuales

module.exports = {
  data: new SlashCommandBuilder()
    .setName('wonho')
    .setDescription('Genera una carta específica.')
    .addSubcommand(subcommand =>
      subcommand
        .setName('generate')
        .setDescription('solo para ko-fi o patreo members.')
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
      await interaction.deferReply(); // Defers the reply (we are going to edit it later)
    } catch (error) {
      return;
    }

    // IDs de roles permitidos y sus límites
    const roleLimits = {
      '1281839512829558844': 1, // Rol 1: puede generar 1 carta al mes
      '1327386590758309959': 2, // Rol 2: puede generar 2 cartas al mes
    };
    const memberRoles = interaction.member.roles.cache;

    // Determinar el límite basado en el rol
    let monthlyLimit = 0;
    for (const [roleId, limit] of Object.entries(roleLimits)) {
      if (memberRoles.has(roleId)) {
        monthlyLimit = Math.max(monthlyLimit, limit); // Asignar el límite más alto del rol
      }
    }

    if (monthlyLimit === 0) {
      return interaction.editReply({ content: 'No tienes el permiso necesario para usar este comando.', ephemeral: true });
    }

    const idol = interaction.options.getString('idol');
    const grupo = interaction.options.getString('group');
    const era = interaction.options.getString('era');
    const rarity = interaction.options.getString('rarity');
    const event = interaction.options.getString('event'); // Obtener el valor del evento

    // Función para escapar caracteres especiales en la expresión regular
    const escapeRegExp = (string) => {
      return string.replace(/[.*+?^=!:${}()|\[\]\/\\'"]/g, '\\$&'); // Escapa caracteres especiales, incluyendo apóstrofes y comillas
    };

    try {
      const userId = interaction.user.id;

      // Obtener o crear el usuario en la base de datos
      const user = await User.findOneAndUpdate(
        { userId },
        {
          $setOnInsert: { userId, generatedCards: 0, lastReset: new Date() },
        },
        { upsert: true, new: true }
      );

      // Comprobar si es necesario resetear el conteo mensual
      const currentMonth = new Date().getMonth();
      const lastResetMonth = user.lastReset.getMonth();

      if (currentMonth !== lastResetMonth) {
        user.generatedCards = 0; // Resetear el conteo de cartas generadas
        user.lastReset = new Date(); // Actualizar la fecha de reinicio
        await user.save();
      }

      // Comprobar si el usuario ya alcanzó su límite mensual
      if (user.generatedCards >= monthlyLimit) {
        return interaction.editReply({
          content: `Has alcanzado tu límite mensual de ${monthlyLimit} carta(s).`,
          ephemeral: true,
        });
      }

      // Buscar la carta en la base de datos
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

      // Generar el código único y actualizar la base de datos
      const uniqueCode = generateCardCode(card.idol, card.grupo, card.era, card.rarity, card.event);
      const { copyNumber } = await incrementCardCount(interaction.user.id, card._id);

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
        command: '/generate wonho',
      });

      await droppedCard.save();

      // Incrementar el contador mensual del usuario
      user.generatedCards += 1;
      await user.save();

      // Crear el embed de la carta generada
      const cardEmbed = new EmbedBuilder()
        .setTitle(`Generated card:`)
        .setDescription(`**${card.idol} - ${card.grupo}**\n<:dot:1296709116231684106>**Era:** ${card.era}\n<:dot:1296709116231684106>**Eshort:** \`${card.eshort}\`\n<:dot:1296709116231684106>**Copy:** \`#${droppedCard.copyNumber}\`\n\`\`\`${droppedCard.uniqueCode}\`\`\``)
        .setImage(card.image) // Mostrar la imagen de la carta
        .setColor('#60a5fa');

      return interaction.editReply({ embeds: [cardEmbed] });

    } catch (error) {
      console.error('Error al generar la carta:', error);
      return interaction.editReply({ content: 'Hubo un error al generar la carta. Inténtalo de nuevo más tarde.', ephemeral: true });
    }
  },
};
