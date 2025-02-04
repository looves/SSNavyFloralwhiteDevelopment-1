const { SlashCommandBuilder, ActionRowBuilder, ButtonBuilder } = require('@discordjs/builders');
const { EmbedBuilder, ButtonStyle } = require('discord.js');
const ms = require('ms');
const cron = require('node-cron');
const packs = require('../utils/UtilsPacks');
const User = require('../models/User');
const Inventory = require('../models/Inventory');

const ALLOWED_ROLE_ID = '1076999909770788965';

module.exports = {
  data: new SlashCommandBuilder()
    .setName('gift')
    .setDescription('Crea un regalo de monedas, packs o Bebegoms')
    .addStringOption(option => option.setName('item').setDescription('Especifica los ítems a regalar (ej. 5coins 2pack:pack123 3bebegoms)').setRequired(true))
    .addRoleOption(option => option.setName('rol').setDescription('Rol que puede reclamar el regalo').setRequired(true))
    .addStringOption(option => option.setName('duracion').setDescription('Duración del sorteo (ej. 10m, 1h, 1d)').setRequired(true)),

  async execute(interaction) {
    await interaction.deferReply();

    if (!interaction.member.roles.cache.has(ALLOWED_ROLE_ID)) {
      return interaction.editReply({ content: 'No tienes permiso para crear sorteos.', ephemeral: true });
    }

    const itemString = interaction.options.getString('item');
    const role = interaction.options.getRole('rol');
    const duration = interaction.options.getString('duracion');

    const durationMs = ms(duration);
    if (!durationMs || durationMs <= 0) {
      return interaction.editReply('Por favor, proporciona una duración válida (ejemplo: 10m, 1h, 1d).');
    }

    const expirationTime = Date.now() + durationMs;
    const expirationTimestamp = Math.floor(expirationTime / 1000);

    // Procesar el string de items
    const items = itemString.split(' ').map(item => {
      const coinsMatch = item.match(/(\d+)coins/);
      const bebegomsMatch = item.match(/(\d+)bebegoms/);
      const packMatch = item.match(/(\d+)pack:(\w+)/);

      if (coinsMatch) return { type: 'coins', amount: parseInt(coinsMatch[1]) };
      if (bebegomsMatch) return { type: 'bebegoms', amount: parseInt(bebegomsMatch[1]) };
      if (packMatch) return { type: 'pack', amount: parseInt(packMatch[1]), packId: packMatch[2] };

      return null;
    }).filter(Boolean);

    if (items.length === 0) {
      return interaction.editReply('No se encontraron ítems válidos. Usa el formato correcto (ej. 5coins 2pack:pack123 3bebegoms).');
    }

    // Crear la descripción del embed
    const embedDescription = items.map(item => {
      if (item.type === 'coins') return `${item.amount} coins`;
      if (item.type === 'bebegoms') return `${item.amount} Bebegoms`;
      if (item.type === 'pack') {
        const packInfo = packs.find(pack => pack.id === item.packId);
        return packInfo ? `${item.amount} ${packInfo.name}` : `${item.amount} pack (ID: ${item.packId})`;
      }
    }).join(', ');

    const embed = new EmbedBuilder()
      .setColor('#60a5fa')
      .setTitle("Wonho's Gift")
      .addFields(
        { name: 'Regalo:', value: embedDescription, inline: false },
        { name: 'Rol:', value: `<@&${role.id}>`, inline: true },
        { name: 'Expira en:', value: `<t:${expirationTimestamp}:R>`, inline: true }
      )
      .setFooter({ text: 'Haz clic en el botón para reclamar tu regalo.' });

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId('gift_claim').setStyle(ButtonStyle.Secondary).setEmoji({ id: '1296709132266770432', name: 'stars' })
    );

    const message = await interaction.editReply({ embeds: [embed], components: [row] });

    const usuariosQueReclamaron = new Set();

    const filter = (i) => i.customId === 'gift_claim' && i.member.roles.cache.has(role.id);
    const collector = interaction.channel.createMessageComponentCollector({ filter, time: durationMs });

    collector.on('collect', async (i) => {
      if (!usuariosQueReclamaron.has(i.user.id)) {
        usuariosQueReclamaron.add(i.user.id);

        // Procesar los ítems reclamados
        for (const item of items) {
          if (item.type === 'coins') {
            let user = await User.findOne({ userId: i.user.id });
            if (!user) user = new User({ userId: i.user.id, coins: 0, bebegoms: 0 });
            user.coins += item.amount;
            await user.save();
          } else if (item.type === 'bebegoms') {
            let user = await User.findOne({ userId: i.user.id });
            if (!user) user = new User({ userId: i.user.id, coins: 0, bebegoms: 0 });
            user.bebegoms += item.amount;
            await user.save();
          } else if (item.type === 'pack') {
            let inventory = await Inventory.findOne({ userId: i.user.id });
            if (!inventory) inventory = new Inventory({ userId: i.user.id, packs: {} });

            inventory.packs[item.packId] = (inventory.packs[item.packId] || 0) + item.amount;
            await inventory.save();
          }
        }

        await i.deferUpdate(); // Actualiza la interacción sin modificar el mensaje
        await i.followUp({ content: `Has reclamado exitosamente ${embedDescription}!`, ephemeral: true });
      } else {
        await i.deferUpdate();
        await i.followUp({ content: 'Ya has reclamado este regalo!', ephemeral: true });
      }
    });

    cron.schedule(new Date(expirationTime).toISOString().slice(14, 19) + ' * * * *', async () => {
      if (message.deleted) return;

      const updatedEmbed = EmbedBuilder.from(embed)
        .setTitle(`Wonho's Gift (Finalizado)`)
        .addFields(
          { name: 'Total de participantes:', value: `${usuariosQueReclamaron.size} usuarios.` }
        )
        .setFooter({ text: 'El regalo ha expirado.' });

      await message.edit({ embeds: [updatedEmbed], components: [] });
    }, {
      scheduled: true,
      timezone: "UTC"
    });
  },
};
