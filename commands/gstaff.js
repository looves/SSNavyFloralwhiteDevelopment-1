const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const Card = require('../models/Card');
const DroppedCard = require('../models/DroppedCard');
const incrementCardCount = require('../utils/incrementCardCount');
const generateCardCode = require('../utils/generateCardCode');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('staff')
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
      await interaction.deferReply(); // Defers the reply (we are going to edit it later)
    } catch (error) {
      // Si ocurre un error al intentar hacer deferReply, simplemente retornamos
      return; // Esto evita que el bot se caiga y la interacción no se procesa
    }

    const requiredRole = '1076999909770788965'; // ID of the required role
    const memberRoles = interaction.member.roles.cache;

    // Check if the user has the required role
    if (!memberRoles.has(requiredRole)) {
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
      let card;

      // Si el campo 'event' está presente, ignoramos la 'rarity'
      if (event) {
        // Buscar la carta usando todos los filtros excepto 'rarity' cuando 'event' está presente
        card = await Card.findOne({
          idol: { $regex: new RegExp(escapeRegExp(idol), 'i') },
          grupo: { $regex: new RegExp(escapeRegExp(grupo), 'i') },
          era: { $regex: new RegExp(escapeRegExp(era), 'i') },
          event: { $regex: new RegExp(escapeRegExp(event), 'i') },
        });
      } else {
        // Buscar la carta incluyendo la 'rarity' si 'event' no está presente
        card = await Card.findOne({
          idol: { $regex: new RegExp(escapeRegExp(idol), 'i') },
          grupo: { $regex: new RegExp(escapeRegExp(grupo), 'i') },
          era: { $regex: new RegExp(escapeRegExp(era), 'i') },
          rarity: rarity,
        });
      }

      if (!card) {
        return interaction.editReply({ content: 'No se encontró ninguna carta que coincida con los criterios proporcionados.', ephemeral: true });
      }

      // Genera el código único basado en los datos de la carta
      const uniqueCode = generateCardCode(card.idol, card.grupo, card.era, card.rarity, card.event );

      // Incrementar el conteo de la carta y actualizar el inventario del usuario
      const { copyNumber } = await incrementCardCount(interaction.user.id, card._id);

      // Crear la nueva DroppedCard
      const droppedCard = new DroppedCard({
        userId: interaction.user.id,
        cardId: card._id,
        idol: card.idol,
        grupo: card.grupo,
        era: card.era,
        eshort: card.eshort,
        rarity: card.rarity,
        event: card.event,
        uniqueCode,
        copyNumber,
        command: '/generate staff', // Guardar que fue generado por este comando
      });

      await droppedCard.save();

      // Crear el embed para mostrar la carta generada
      const cardEmbed = new EmbedBuilder()
        .setTitle(`Generated card:`)
        .setDescription(`**${card.idol} - ${card.grupo}**\n<:dot:1296709116231684106>**Era:** ${card.era}\n <:dot:1296709116231684106>**Eshort:** \`${card.eshort}\`\n <:dot:1296709116231684106>**Copy:** \`#${droppedCard.copyNumber}\` \n\`\`\`${droppedCard.uniqueCode}\`\`\``)
        .setImage(card.image) // Mostrar la imagen de la carta
        .setColor('#60a5fa');

      // Respondemos con el embed generado
      return interaction.editReply({ embeds: [cardEmbed] });

    } catch (error) {
      console.error('Error al generar la carta:', error);
      // Si hubo un error, responder con un mensaje de error
      return interaction.editReply({ content: 'Hubo un error al generar la carta. Inténtalo de nuevo más tarde.', ephemeral: true });
    }
  },
};
