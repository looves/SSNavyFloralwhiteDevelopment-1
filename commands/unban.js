const { SlashCommandBuilder } = require('discord.js');
const User = require('../models/User');
const Ban = require('../models/Ban');  // Asegúrate de que el modelo Ban esté importado

module.exports = {
  data: new SlashCommandBuilder()
    .setName('unban')
    .setDescription('Desbanea a un usuario, permitiéndole usar los comandos del bot.')
    .addUserOption(option =>
      option.setName('user')
        .setDescription('Usuario a desbanear')
        .setRequired(true)),

  async execute(interaction) {
    try {
      const requiredRole = '1076999909770788965'; // Cambia esto por el ID del rol que puede desbanear
      if (!interaction.member.roles.cache.has(requiredRole)) {
        return interaction.reply({ content: 'No tienes permiso para usar este comando.', ephemeral: true });
      }

      const targetUser = interaction.options.getUser('user');

      // Buscar al usuario en la base de datos
      let user = await User.findOne({ userId: targetUser.id });

      if (!user) {
        return interaction.reply({ content: 'Este usuario no existe en la base de datos.', ephemeral: true });
      }

      // Desbanear al usuario (eliminamos el "ban" del modelo User)
      user.isBanned = false;
      await user.save();

      // Eliminar el registro de baneo en el modelo Ban
      let banRecord = await Ban.findOne({ userId: targetUser.id });
      if (banRecord) {
        await Ban.deleteOne({ userId: targetUser.id });  // Eliminar el registro de baneo
      }

      return interaction.reply({
        content: `El usuario **${targetUser.tag}** ha sido desbaneado y ahora puede usar los comandos del bot.`,
        ephemeral: true,
      });
    } catch (error) {
      console.error('Error al ejecutar el comando /unban:', error);
      return interaction.reply({ content: 'Hubo un error al procesar el desbaneo.', ephemeral: true });
    }
  },
};
