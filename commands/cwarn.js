const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const User = require('../models/User'); // Modelo de usuario (solo para almacenar datos básicos)
const Warn = require('../models/Warn'); // Modelo de advertencias

module.exports = {
  data: new SlashCommandBuilder()
    .setName('warn')
    .setDescription('Da una advertencia a un usuario.')
    .addUserOption(option =>
      option.setName('user')
        .setDescription('El usuario al que se le dará la advertencia (puedes usar una mención o un ID).')
        .setRequired(true))
    .addStringOption(option =>
      option.setName('reason')
        .setDescription('Razón de la advertencia.')
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

      // Obtener el usuario y la razón de la advertencia
      const targetUser = interaction.options.getUser('user');
      const reason = interaction.options.getString('reason');

      // Verificar si el usuario fue encontrado (puede ocurrir si el ID o mención no es válido)
      if (!targetUser) {
        return interaction.editReply({ content: 'No se pudo encontrar al usuario especificado.', ephemeral: true });
      }

      // Obtener el moderador que está emitiendo la advertencia (usuario que ejecutó el comando)
      const moderator = interaction.user.tag;

      // Verificar si el usuario existe en la base de datos (aunque no se necesite para la advertencia)
      let user = await User.findOne({ userId: targetUser.id });

      if (!user) {
        // Si el usuario no existe en la base de datos, crear un nuevo registro
        user = new User({
          userId: targetUser.id,
        });
        await user.save();
      }

      // Obtener todas las advertencias del usuario
      const userWarnings = await Warn.find({ userId: targetUser.id });

      // Verificar si el usuario ya tiene 3 advertencias
      if (userWarnings.length >= 3) {
        return interaction.editReply({ content: `El usuario ${targetUser.tag} ya tiene 3 advertencias.` });
      }

      // Registrar la nueva advertencia en el modelo Warn
      const warn = new Warn({
        userId: targetUser.id,
        moderatorId: interaction.user.id,
        reason: reason,
      });

      // Guardar la advertencia
      await warn.save();

      // Crear un embed para la advertencia en el canal
      const warnEmbed = new EmbedBuilder()
        .setTitle('Advertencia')
        .setDescription(`**Usuario advertido:** ${targetUser.tag}\n**Motivo:** \n<:dot:1296707029087555604>${reason}`)
        .addFields(
          { name: 'Advertido por:', value: `<:dot:1296707029087555604>${moderator}`, inline: true },
          { name: 'Fecha de advertencia', value: new Date().toLocaleString(), inline: true }
        )
        .setColor('#60a5fa')
        .setTimestamp();

      // Enviar el embed al canal donde se ejecutó el comando
      await interaction.editReply({ content: `Advertencia enviada a ${targetUser.tag}.`, embeds: [warnEmbed] });

      // Enviar un mensaje directo (DM) al usuario advertido
      try {
        const warnDMEmbed = new EmbedBuilder()
          .setTitle('¡Has recibido una advertencia!')
          .setDescription(`**Motivo de la advertencia:**\n<:dot:1296707029087555604>${reason}`)
          .addFields(
            { name: 'Advertido por', value: `<:dot:1296707029087555604>**${moderator}**`, inline: true },
            { name: 'Canal para abrir ticket', value: `<:dot:1296707029087555604><#1248108503973757019>`, inline: true },
          )
          .setColor('#60a5fa')
          .setTimestamp();

        // Intentar enviar el mensaje al DM del usuario
        await targetUser.send({ embeds: [warnDMEmbed] });
      } catch (error) {
        console.error('Error al enviar el DM:', error);

        // Manejo de error cuando el DM no se puede enviar
        if (error.code === 50007) {
          return interaction.editReply({ content: `No se pudo enviar un DM a ${targetUser.username}. Puede ser que tenga los DMs bloqueados. Asegúrate de que el servidor permita recibir DMs del bot.` });
        } else {
          return interaction.editReply({ content: `Hubo un problema al intentar enviar el DM a ${targetUser.username}.` });
        }
      }

    } catch (error) {
      console.error('Error en el comando /warn:', error);
      return interaction.editReply({ content: 'Hubo un error al procesar la advertencia. Inténtalo de nuevo más tarde.', ephemeral: true });
    }
  },
};
