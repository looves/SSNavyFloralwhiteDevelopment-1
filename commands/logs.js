const { SlashCommandBuilder } = require('@discordjs/builders');
const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType } = require('discord.js');
const DroppedCard = require('../models/DroppedCard');
const rarityToEmojis = require('../utils/rarityToEmojis');

// Define el ID del rol permitido
const ALLOWED_ROLE_ID = '1076999909770788965';  // Reemplaza con el ID de tu rol permitido

module.exports = {
  data: new SlashCommandBuilder()
    .setName('logs')
    .setDescription('Muestra los registros de todos los drops y dailys'),

  async execute(interaction) {
    try {
      // Intentar deferir la respuesta
      try {
        await interaction.deferReply();
      } catch (error) {
        // Si hay un error, simplemente retorna y evita que el bot se caiga
        return;
      }

      // Verificar si el usuario tiene el rol necesario
      if (!interaction.member.roles.cache.has(ALLOWED_ROLE_ID)) {
        return interaction.editReply({ content: 'No tienes el rol necesario para ejecutar este comando.', ephemeral: true });
      }

      // Paginación
      const maxFields = 9; // Máximo de campos por página
      let currentPage = 0;

      // Obtiene la cantidad total de registros (para calcular el número de páginas)
      const totalRecords = await DroppedCard.countDocuments();
      const totalPages = Math.ceil(totalRecords / maxFields);

      // Lógica para obtener los registros para la página actual
      const getDroppedCards = async (page) => {
        return await DroppedCard.find()
          .select('idol grupo copyNumber rarity uniqueCode event userId')  // Selecciona solo los campos necesarios
          .skip(page * maxFields)  // Omitir los resultados previos
          .limit(maxFields)  // Limitar a 9 resultados
          .lean();  // Mejor rendimiento al usar lean
      };

      // Generar el embed con los datos de la página actual
      const generateEmbed = (page) => {
        return getDroppedCards(page).then((droppedCards) => {
          const embed = new EmbedBuilder()
            .setTitle('Historial de /drop and /daily')
            .setTimestamp()
            .setColor('#60a5fa')
            .setFooter({ text: `Página ${page + 1} de ${totalPages}` });

          droppedCards.forEach(droppedCard => {
            embed.addFields({
              name: `${droppedCard.idol} ${droppedCard.grupo}<:dot:1296707029087555604> \`#${droppedCard.copyNumber}\``,
              value: `${droppedCard.event} ${rarityToEmojis(droppedCard.rarity)}\n-# ${droppedCard.command}\`\`\`${droppedCard.uniqueCode}\`\`\`<@${droppedCard.userId}>`,
              inline: true,
            });
          });

          return embed;
        });
      };

      // Crear una fila de botones para la paginación
      const getButtonRow = (page) => {
        return new ActionRowBuilder().addComponents(
          new ButtonBuilder()
            .setCustomId('first')
            .setEmoji("<:first:1290467842462060605>")  // Primera página
            .setStyle(ButtonStyle.Secondary)
            .setDisabled(page === 0),
          new ButtonBuilder()
            .setCustomId('previous')
            .setEmoji("<:prev:1290467827739787375>")  // Página anterior
            .setStyle(ButtonStyle.Secondary)
            .setDisabled(page === 0),
          new ButtonBuilder()
            .setCustomId('close')
            .setEmoji("<:close:1290467856437481574>")  // Cerrar el embed
            .setStyle(ButtonStyle.Danger),
          new ButtonBuilder()
            .setCustomId('next')
            .setEmoji("<:next:1290467800065769566>")  // Siguiente página
            .setStyle(ButtonStyle.Secondary)
            .setDisabled(page === totalPages - 1),
          new ButtonBuilder()
            .setCustomId('last')  // Última página
            .setEmoji("<:last:1290467815127519322>")
            .setStyle(ButtonStyle.Secondary)
            .setDisabled(page === totalPages - 1)
        );
      };

      // Enviar el primer embed y los botones
      const message = await interaction.editReply({
        embeds: [await generateEmbed(currentPage)],
        components: [getButtonRow(currentPage)],
        fetchReply: true
      });

      // Crear un collector para manejar las interacciones de los botones
      const collector = message.createMessageComponentCollector({
        componentType: ComponentType.Button,
        time: 600000  // Timeout después de 10 minutos
      });

      collector.on('collect', async i => {
        if (i.user.id !== interaction.user.id) {
          return i.reply({ content: 'No puedes interactuar con este botón.', ephemeral: true });
        }

        // Navegar entre las páginas
        if (i.customId === 'previous' && currentPage > 0) {
          currentPage--;
        } else if (i.customId === 'next' && currentPage < totalPages - 1) {
          currentPage++;
        } else if (i.customId === 'first') {
          currentPage = 0;
        } else if (i.customId === 'last') {
          currentPage = totalPages - 1;
        } else if (i.customId === 'close') {
          await i.update({ content: `**/logs cerrado...**`, embeds: [], components: [] });
          return collector.stop();  // Detener el collector y eliminar los botones
        }

        // Actualizar el embed con la nueva página
        await i.update({ embeds: [await generateEmbed(currentPage)], components: [getButtonRow(currentPage)] });
      });

      collector.on('end', async () => {
        await message.edit({ components: [] });  // Desactivar los botones después de que el collector termine
      });

    } catch (error) {
      console.error('Error al ejecutar el comando /logs drop:', error);
      await interaction.editReply('Ocurrió un error al procesar el comando.');
    }
  },
};
