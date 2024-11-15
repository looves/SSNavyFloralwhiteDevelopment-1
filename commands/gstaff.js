const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const Card = require('../models/Card');
const DroppedCard = require('../models/DroppedCard');
const User = require('../models/User'); 
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
        .setRequired(true))),

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

    // Verificar si el usuario ya ha usado el comando una vez
    const user = await User.findOne({ userId: interaction.user.id });

    // Si el usuario ya ha usado el comando, no se permite usarlo de nuevo
    if (user && user.GenerateStaff) {
      return interaction.editReply({ content: 'Ya has usado este comando una vez. No puedes volver a usarlo.', ephemeral: true });
    }

    const idol = interaction.options.getString('idol');
    const grupo = interaction.options.getString('group');
    const era = interaction.options.getString('era');
    const rarity = interaction.options.getString('rarity');

    // Función para escapar caracteres especiales en la expresión regular
    const escapeRegExp = (string) => {
      return string.replace(/[.*+?^=!:${}()|\[\]\/\\'"]/g, '\\$&'); // Escapa caracteres especiales, incluyendo apóstrofes y comillas
    };

    try {
      // Buscar la carta en la base de datos utilizando expresiones regulares
      const card = await Card.findOne({
        idol: { $regex: new RegExp(escapeRegExp(idol), 'i') },
        grupo: { $regex: new RegExp(escapeRegExp(grupo), 'i') },
        era: { $regex: new RegExp(escapeRegExp(era), 'i') },
        rarity: rarity,
      });

      if (!card) {
        return interaction.editReply({ content: 'No se encontró ninguna carta que coincida con los criterios proporcionados.', ephemeral: true });
      }

      // Genera el código único basado en los datos de la carta
      const uniqueCode = generateCardCode(card.idol, card.grupo, card.era, card.rarity);

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
        uniqueCode,
        copyNumber,
        command: '/generate staff', // Guardar que fue generado por este comando
      });

      await droppedCard.save();

      // Actualizar el modelo de usuario para marcar que ha usado el comando
      if (!user) {
        // Si el usuario no existe, crear un nuevo registro
        const newUser = new User({
          userId: interaction.user.id,
          GenerateStaff: true,
        });
        await newUser.save();
      } else {
        // Si el usuario existe, actualizar el campo hasUsedGenerate
        user.GenerateStaff = true;
        await user.save();
      }

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
