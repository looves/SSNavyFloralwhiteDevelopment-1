const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const User = require('../models/User'); // Modelo de usuario para almacenar datos
const Ban = require('../models/Ban'); // Nuevo modelo de baneo

module.exports = {
  data: new SlashCommandBuilder()
    .setName('ban')
    .setDescription('Banea a un usuario y le impide usar los comandos del bot de cartas.')
    .addUserOption(option =>
      option.setName('user')
        .setDescription('El usuario que será baneado (ID o mención).')
        .setRequired(true))
    .addStringOption(option =>
      option.setName('reason')
        .setDescription('Razón del baneo.')
        .setRequired(true)),

  async execute(interaction) {
    try {
      await interaction.deferReply(); // Deferred reply

      const requiredRole = '1076999909770788965'; // Reemplaza con el ID del rol que puede usar el comando
      const memberRoles = interaction.member.roles.cache;

      // Verificar si el usuario tiene el rol necesario
      if (!memberRoles.has(requiredRole)) {
        return interaction.editReply({ content: 'No tienes permiso para usar este comando.', ephemeral: true });
      }

      // Obtener el usuario y la razón del baneo
      const targetUser = interaction.options.getUser('user');
      const reason = interaction.options.getString('reason');

      // Verificar si el usuario fue encontrado (puede ocurrir si el ID o mención no es válido)
      if (!targetUser) {
        return interaction.editReply({ content: 'No se pudo encontrar al usuario especificado.', ephemeral: true });
      }

      // Obtener el moderador que está emitiendo el baneo
      const moderator = interaction.user.tag;

      // Verificar si el usuario ya está baneado en la base de datos
      const existingBan = await Ban.findOne({ userId: targetUser.id });
      if (existingBan) {
        return interaction.editReply({ content: `El usuario ${targetUser.tag} ya está baneado.` });
      }

      // Crear un nuevo registro de baneo
      const ban = new Ban({
        userId: targetUser.id,
        moderatorId: interaction.user.id,
        reason: reason,
        timestamp: new Date().toISOString(),
      });

      // Guardar el baneo
      await ban.save();

      // Bloquear al usuario para que no use los comandos de cartas
      let user = await User.findOne({ userId: targetUser.id });

      if (!user) {
        // Si el usuario no existe en la base de datos, crear un nuevo registro
        user = new User({
          userId: targetUser.id,
          isBanned: true, // Campo que marca si el usuario está baneado
        });
      } else {
        user.isBanned = true; // Actualizar el campo de baneado
      }

      // Guardar la actualización
      await user.save();

      // Crear un embed para la notificación en el canal
      const banEmbed = new EmbedBuilder()
        .setTitle('Usuario baneado')
        .setDescription(`**Usuario baneado:** ${targetUser.tag}\n**Razón:** ${reason}`)
        .addFields(
          { name: 'Baneado por:', value: moderator, inline: true },
          { name: 'Fecha del baneo', value: new Date().toLocaleString(), inline: true }
        )
        .setColor('#FF0000')
        .setTimestamp();

      // Enviar el embed al canal donde se ejecutó el comando
      await interaction.editReply({ content: `El usuario ${targetUser.tag} ha sido baneado.`, embeds: [banEmbed] });

      // Enviar un mensaje directo (DM) al usuario baneado
      try {
        const banDMEmbed = new EmbedBuilder()
          .setTitle('¡Has sido baneado!')
          .setDescription(`**Razón del baneo:**\n${reason}`)
          .addFields(
            { name: 'Baneado por:', value: `${moderator}`, inline: true },
            { name: `Wonho's House`, value: `[server](https://discord.gg/wonho)`, inline: true },
            { name: 'Canal para abrir ticket', value: `<#1248108503973757019>`, inline: true },
          )
          .setColor('#FF0000')
          .setTimestamp();

        // Intentar enviar el mensaje al DM del usuario
        await targetUser.send({ embeds: [banDMEmbed] });
      } catch (error) {
        console.error('Error al enviar el DM:', error);
        // Si no se puede enviar el DM, se puede omitir o mostrar un mensaje de advertencia
      }

    } catch (error) {
      console.error('Error en el comando /ban:', error);
      return interaction.editReply({ content: 'Hubo un error al procesar el baneo. Inténtalo de nuevo más tarde.', ephemeral: true });
    }
  },
};
