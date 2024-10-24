const { SlashCommandBuilder, ActionRowBuilder, ButtonBuilder } = require('@discordjs/builders');
const { EmbedBuilder, ButtonStyle } = require('discord.js');
const ms = require('ms');
const { formatDistanceToNow, addMilliseconds } = require('date-fns');
const User = require('../models/User');

const ALLOWED_ROLE_ID = '1076999909770788965'; // Reemplaza con el ID del rol permitido para crear sorteos

module.exports = {
  data: new SlashCommandBuilder()
    .setName('gift')
    .setDescription('Crea un regalo de monedas para un rol específico')
    .addStringOption(option => 
      option.setName('coins')
        .setDescription('Cantidad de monedas a regalar')
        .setRequired(true))
    .addRoleOption(option =>
      option.setName('rol')
        .setDescription('Rol que puede reclamar el regalo')
        .setRequired(true))
    .addStringOption(option =>
      option.setName('duracion')
        .setDescription('Duración del sorteo (ej. 10m, 1h, 1d)')
        .setRequired(true)),

  async execute(interaction) {
    // Verificar si el usuario tiene el rol permitido
    if (!interaction.member.roles.cache.has(ALLOWED_ROLE_ID)) {
      return interaction.reply({ content: 'No tienes permiso para crear sorteos.', ephemeral: true });
    }

    const coins = interaction.options.getString('coins');
    const role = interaction.options.getRole('rol');
    const duration = interaction.options.getString('duracion');

    const durationMs = ms(duration);
    if (!durationMs || durationMs <= 0) {
      return interaction.reply('Por favor, proporciona una duración válida (ejemplo: 10m, 1h, 1d).');
    }

    const expirationTime = Date.now() + durationMs;
    const expirationTimestamp = Math.floor(expirationTime / 1000); // Convertir a segundos
    const formattedExpiration = formatDistanceToNow(addMilliseconds(Date.now(), durationMs), { addSuffix: true });

    const embed = new EmbedBuilder()
      .setColor('#60a5fa')
      .setTitle(`Wonho's Gift`)
      .addFields(
        { name: 'Cantidad:', value: `<:dot:1296709116231684106>${coins} coins`, inline: false },
        { name: 'Rol:', value: `<:dot:1296709116231684106><@&${role.id}>`, inline: true },
        { name: '**Expira en:**', value: `<:dot:1296709116231684106><t:${expirationTimestamp}:R>`, inline: true } // Marca de tiempo
      )
      .setFooter({ text: 'Haz clic en el botón para reclamar tu regalo.' });

    const row = new ActionRowBuilder()
      .addComponents(
        new ButtonBuilder()
          .setCustomId('gift_claim')
          .setStyle(ButtonStyle.Secondary)
          .setEmoji({ id: '1296709132266770432', name: 'stars' }) // Emoji corregido
      );

    await interaction.reply({
      embeds: [embed],
      components: [row]
    });

    const filter = (i) => i.customId === 'gift_claim' && i.member.roles.cache.has(role.id);
    const collector = interaction.channel.createMessageComponentCollector({ filter, time: durationMs });

    const usuariosQueReclamaron = new Set();

    async function addCoinsToUser(userId, coins) {
      try {
        let user = await User.findOne({ userId });
        if (!user) {
          user = new User({ userId, coins: 0 });
        }
        user.coins += parseInt(coins);
        await user.save();
        return true;
      } catch (error) {
        console.error(`Error al agregar monedas al usuario ${userId}:`, error);
        return false;
      }
    }

    collector.on('collect', async (i) => {
      if (!usuariosQueReclamaron.has(i.user.id)) {
        usuariosQueReclamaron.add(i.user.id);
        const success = await addCoinsToUser(i.user.id, coins);
        if (success) {
          await i.reply({ content: `¡Has reclamado exitosamente el regalo de ${coins} monedas!`, ephemeral: true });
        } else {
          await i.reply({ content: 'Hubo un error al procesar tu regalo. Intenta nuevamente.', ephemeral: true });
        }
      } else {
        await i.reply({ content: '¡Ya reclamaste este regalo!', ephemeral: true });
      }
    });

    collector.on('end', async () => {
      const updatedEmbed = new EmbedBuilder(embed)
        .setTitle(`Wonho's Gift (Finalizado)`)
        .addFields(
          { name: 'Total de participantes:', value: `<:dot:1296709116231684106>${usuariosQueReclamaron.size} usuarios.` }
        )
        .setFooter({ text: 'El regalo ha expirado.' }); 

      await interaction.editReply({
        embeds: [updatedEmbed],
        components: []
      });
    });
  },
};
