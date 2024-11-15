const { SlashCommandBuilder } = require('@discordjs/builders');
const { PermissionFlagsBits, EmbedBuilder } = require('discord.js');

// ID del rol permitido (reemplázalo con el ID del rol que debe tener el usuario)
const ALLOWED_ROLE_ID = '1077366130915672165'; // Reemplaza con el ID del rol permitido
const ROLE_TO_BE_HIGHER_ID = '1077366130915672165'; // ID del rol cuyo nivel debe ser inferior

// Estructura temporal para guardar los roles creados por los usuarios (esto es solo un ejemplo).
// En una implementación real, usarías una base de datos para esto.
const userRoles = new Map();  // Guarda los roles creados por usuario (usando el ID del rol)

module.exports = {
  data: new SlashCommandBuilder()
    .setName('rol')
    .setDescription('Crea o edita roles personalizados.')
    .addSubcommand(subcommand =>
      subcommand
        .setName('booster')
        .setDescription('Crea o edita un rol personalizado con nombre, color y emoji.')
        .addStringOption(option =>
          option.setName('name')
            .setDescription('Nombre del rol')
            .setRequired(true) // Este campo será obligatorio
        )
        .addStringOption(option =>
          option.setName('hex')
            .setDescription('Color del rol en formato hexadecimal (ej. #FF5733)')
            .setRequired(false)
        )
        .addStringOption(option =>
          option.setName('emoji')
            .setDescription('Emoji del rol (puede ser un emoji estándar o una URL de imagen)')
            .setRequired(false)
        )),

  async execute(interaction) {
    // Verificar si el usuario tiene el rol permitido
    if (!interaction.member.roles.cache.has(ALLOWED_ROLE_ID)) {
      return interaction.reply({ content: 'No tienes el rol necesario para usar este comando.', ephemeral: true });
    }

    // Obtener los valores de las opciones
    const subcommand = interaction.options.getSubcommand();
    const roleName = interaction.options.getString('name');
    const roleColorHex = interaction.options.getString('hex');
    const roleEmoji = interaction.options.getString('emoji');

    // Validar el formato del color hexadecimal
    const hexRegex = /^#([0-9A-F]{3}){1,2}$/i;
    if (roleColorHex && !hexRegex.test(roleColorHex)) {
      return interaction.reply({ content: 'El formato del color no es válido. Asegúrate de usar un formato hexadecimal (ej. #FF5733).', ephemeral: true });
    }

    let emojiURL = null;
    let emojiName = null;

    // Verificar si el emoji es un emoji estándar de Discord
    if (roleEmoji && roleEmoji.match(/^(:[a-zA-Z0-9_]+:)+$/)) {
      // Este es un emoji estándar
      emojiName = roleEmoji;  // Guardamos el emoji como texto (sin URL)
    }
    // Verificar si el emoji es un emoji personalizado
    else if (roleEmoji && roleEmoji.match(/^<a?:(\w+):(\d+)>$/)) {
      // Obtener el ID del emoji
      const emojiID = roleEmoji.match(/^<a?:(\w+):(\d+)>$/);
      emojiURL = `https://cdn.discordapp.com/emojis/${emojiID[2]}.png`;
    }
    // Verificar si el emoji es una URL de imagen
    else if (roleEmoji && (roleEmoji.startsWith('http://') || roleEmoji.startsWith('https://'))) {
      // Aquí validamos si la URL es una imagen (esto es opcional y se puede mejorar)
      if (roleEmoji.match(/\.(jpeg|jpg|gif|png)$/i)) {
        emojiURL = roleEmoji;  // Es una URL válida para una imagen
      } else {
        return interaction.reply({ content: 'La URL proporcionada no es válida. Asegúrate de usar una URL de imagen (jpg, png, gif).', ephemeral: true });
      }
    } else {
      return interaction.reply({ content: 'El emoji proporcionado no es válido. Asegúrate de usar un emoji estándar de Discord o una URL de imagen.', ephemeral: true });
    }

    try {
      // Obtener el rol cuyo nivel debe ser inferior
      const roleToBeHigher = interaction.guild.roles.cache.get(ROLE_TO_BE_HIGHER_ID);

      // Si no se encuentra el rol con el ID dado
      if (!roleToBeHigher) {
        return interaction.reply({ content: 'No se pudo encontrar el rol de referencia con el ID proporcionado.', ephemeral: true });
      }

      // Crear el rol con los parámetros dados, asegurando que su jerarquía sea superior al rol de referencia
      const newRole = await interaction.guild.roles.create({
        name: roleName,  // Nombre del rol
        color: roleColorHex || '#FFFFFF',  // Usar blanco como color predeterminado si no se especifica
        reason: `Rol creado o editado por ${interaction.user.tag}`,
        icon: emojiURL ? emojiURL : null,  // Usar la URL generada como icono del rol
        position: roleToBeHigher.position + 1 // Aseguramos que el nuevo rol esté por encima del rol de referencia
      });

      // Asignar el rol al usuario solo si es nuevo
      await interaction.member.roles.add(newRole);

      // Guardar el ID del rol para el usuario (usamos el ID, no el nombre)
      if (!userRoles.has(interaction.user.id)) {
        userRoles.set(interaction.user.id, []);
      }
      userRoles.get(interaction.user.id).push(newRole.id);

      // Crear el embed con la información del nuevo rol usando EmbedBuilder
      const embed = new EmbedBuilder()
        .setColor(roleColorHex || '#FFFFFF') // Color del rol
        .setTitle('Congrats! You claimed your custom role') // Título del embed
        .setDescription(`You claimed your custom role ( <@&${newRole.id}> ) <:stars:1296707011500838932>`) // Descripción del rol creado
        .setThumbnail(emojiURL || 'https://example.com/default_thumbnail.png') // Usar el icono del rol o un valor por defecto
        .addFields(
          { name: '<:dot:1296707029087555604>Name', value: `\`\`${newRole.name}\`\``, inline: true },
          { name: '<:dot:1296707029087555604>Color', value: `\`\`${newRole.hexColor}\`\``, inline: true },
          {
            name: '<:dot:1296707029087555604>Icon',
            value: emojiURL ? `[icon role](${emojiURL})` : emojiName ? emojiName : '**No icon role**', // Si hay icono, mostrar el enlace, sino mostrar "No icon role"
            inline: true
          }
        )
        .setFooter({ text: `Role created by ${interaction.user.tag}`, iconURL: interaction.user.avatarURL() });

      // Enviar el embed al usuario
      return interaction.reply({ embeds: [embed], ephemeral: false });
    } catch (error) {
      console.error('Error al crear o editar el rol:', error);
      return interaction.reply({ content: 'Hubo un error al crear o editar el rol. Por favor, intenta nuevamente más tarde.', ephemeral: true });
    }
  },
};
