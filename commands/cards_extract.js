const { SlashCommandBuilder } = require('@discordjs/builders');
const { EmbedBuilder } = require('discord.js');
const DroppedCard = require('../models/DroppedCard'); 
const rarityToEmojis = require('../utils/rarityToEmojis'); 

const BOT_ID = '1273625876961165402'; 
const requiredRoleId = '1076999909770788965'; // ID del rol requerido

module.exports = {
  data: new SlashCommandBuilder()
    .setName('percentage')
    .setDescription('Comando para quitar cartas')
    .addSubcommand(subcommand =>
      subcommand
        .setName('extract')
        .setDescription('Extrae un porcentaje con la información del usuario')
        .addUserOption(option =>
          option
            .setName('user')
            .setDescription('Usuario al que se le aplicará el porcentaje')
            .setRequired(true)
        )
        .addStringOption(option =>
          option
            .setName('cantidad')
            .setDescription('Cantidad de cartas a quitar')
            .setRequired(true)
        )
        .addStringOption(option =>
          option
            .setName('reason')
            .setDescription('Razón del porcentaje')
            .setRequired(true)
        )),

  async execute(interaction) {
    try {
 
      await interaction.deferReply();

      if (interaction.options.getSubcommand() === 'extract') {
        const user = interaction.options.getUser('user');
        const cantidad = parseInt(interaction.options.getString('cantidad'));
        const razon = interaction.options.getString('reason');

        // Validar que la cantidad sea mayor a 0
        if (cantidad <= 0) {
          return interaction.editReply({ content: 'La cantidad debe ser mayor que 0.' });
        }

        // Verificar si el usuario que ejecuta el comando tiene el rol requerido
        const memberRoles = interaction.member.roles.cache;
        if (!memberRoles.has(requiredRoleId)) {
          return interaction.editReply({
            content: 'No tienes permiso para usar este comando.',
            ephemeral: true,
          });
        }

        // Buscar las cartas del usuario
        const droppedCards = await DroppedCard.find({ userId: user.id });

        // Validar que el usuario tenga cartas registradas
        if (droppedCards.length === 0) {
          return interaction.editReply({ content: 'Este usuario no tiene cartas registradas.' });
        }

        // Validar que la cantidad solicitada no sea mayor al total de cartas del usuario
        if (cantidad > droppedCards.length) {
          return interaction.editReply({
            content: `El usuario solo tiene ${droppedCards.length} cartas disponibles para extraer.`,
          });
        }

        // Seleccionar aleatoriamente las cartas a eliminar
        const cardsToRemove = [];
        let remainingQuantity = cantidad;

        while (remainingQuantity > 0) {
          const randomIndex = Math.floor(Math.random() * droppedCards.length);
          const randomCard = droppedCards[randomIndex];
          cardsToRemove.push(randomCard);
          droppedCards.splice(randomIndex, 1);
          remainingQuantity--;
        }

        // Actualizar las cartas seleccionadas para asignarlas al bot
        for (let card of cardsToRemove) {
          await DroppedCard.updateOne(
            { _id: card._id },
            { $set: { userId: BOT_ID } }
          );
        }

        // Crear el embed con la información
        const embed = new EmbedBuilder()
          .setFooter({ text: `${interaction.user.username}`, iconURL: interaction.user.displayAvatarURL() })
          .setColor('#60a5fa')
          .addFields(
            { name: 'User:', value: `<:dot:1296707029087555604> ${user.tag}`, inline: true },
            { name: 'Reason:', value: `<:dot:1296707029087555604> ${razon}`, inline: true },
            {
              name: 'Cards Removed:',
              value: cardsToRemove.map(card => {
                const emoji = rarityToEmojis(card.rarity);
                return `<:dot:1296707029087555604> ${card.idol} **${card.era || card.event}** \`#${card.copyNumber}\`   ${emoji}`;
              }).join('\n'),
            }
          )
          .setTimestamp();

        // Responder con el embed
        await interaction.editReply({ embeds: [embed] });
      }
    } catch (error) {
      console.error('Error en la ejecución del comando:', error);
      await interaction.editReply({ content: 'Hubo un error al ejecutar el comando.' });
    }
  },
};
