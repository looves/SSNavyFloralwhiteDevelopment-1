const { SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, StringSelectMenuBuilder } = require('@discordjs/builders');
const { EmbedBuilder, ButtonStyle } = require('discord.js');
const ms = require('ms');
const { formatDistanceToNow, addMilliseconds } = require('date-fns');
const User = require('../models/User');
const Inventory = require('../models/Inventory');
const packs = require('../utils/UtilsPacks'); // Importa UtilsPacks


const ALLOWED_ROLE_ID = '1076999909770788965';

module.exports = {
  data: new SlashCommandBuilder()
    .setName('gift')
    .setDescription('Crea un regalo de monedas, packs o Bebegoms')
    .addSubcommand(subcommand =>
      subcommand
        .setName('coins')
        .setDescription('Regala monedas')
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
            .setRequired(true)))
    .addSubcommand(subcommand =>
      subcommand
        .setName('packs')
        .setDescription('Regala packs')
        .addStringOption(option =>
          option.setName('pack')
            .setDescription('ID del pack a regalar')
            .setRequired(true))
        .addIntegerOption(option =>
          option.setName('cantidad')
            .setDescription('Cantidad de packs a regalar')
            .setRequired(true))
        .addRoleOption(option =>
          option.setName('rol')
            .setDescription('Rol que puede reclamar el regalo')
            .setRequired(true))
        .addStringOption(option =>
          option.setName('duracion')
            .setDescription('Duración del sorteo (ej. 10m, 1h, 1d)')
            .setRequired(true)))
    .addSubcommand(subcommand =>
      subcommand
        .setName('bebegoms')
        .setDescription('Regala Bebegoms')
        .addIntegerOption(option =>
          option.setName('cantidad')
            .setDescription('Cantidad de Bebegoms a regalar')
            .setRequired(true))
        .addRoleOption(option =>
          option.setName('rol')
            .setDescription('Rol que puede reclamar el regalo')
            .setRequired(true))
        .addStringOption(option =>
          option.setName('duracion')
            .setDescription('Duración del sorteo (ej. 10m, 1h, 1d)')
            .setRequired(true))),

  async execute(interaction) {
    try {
      await interaction.deferReply();
    } catch (error) {
      return interaction.reply({ content: 'Hubo un error al intentar iniciar el sorteo.', ephemeral: true });
    }

    if (!interaction.member.roles.cache.has(ALLOWED_ROLE_ID)) {
      return interaction.editReply({ content: 'No tienes permiso para crear sorteos.', ephemeral: true });
    }

    const subcommand = interaction.options.getSubcommand();

    let embedTitle = "Wonho's Gift";
    let embedDescription = "";
    let giftType = "";

    if (subcommand === 'coins') {
      const coins = interaction.options.getString('coins');
      giftType = "coins";
      embedDescription = `<:dot:1296709116231684106>${coins} coins`;
    } else if (subcommand === 'packs') {
      const packId = interaction.options.getString('pack');
      const quantity = interaction.options.getInteger('cantidad');
      giftType = "packs";
      embedDescription = `${quantity} packs (ID: ${packId})`;
    } else if (subcommand === 'bebegoms') {
      const quantity = interaction.options.getInteger('cantidad');
      giftType = "bebegoms";
      embedDescription = `${quantity} Bebegoms`;
    }

    const role = interaction.options.getRole('rol');
    const duration = interaction.options.getString('duracion');

    const durationMs = ms(duration);
    if (!durationMs || durationMs <= 0) {
      return interaction.editReply('Por favor, proporciona una duración válida (ejemplo: 10m, 1h, 1d).');
    }

    const expirationTime = Date.now() + durationMs;
    const expirationTimestamp = Math.floor(expirationTime / 1000);

    const embed = new EmbedBuilder()
      .setColor('#60a5fa')
      .setTitle(embedTitle)
      .addFields(
        { name: 'Regalo:', value: embedDescription, inline: false },
        { name: 'Rol:', value: `<:dot:1296709116231684106><@&${role.id}>`, inline: true },
        { name: '**Expira en:**', value: `<:dot:1296709116231684106><t:${expirationTimestamp}:R>`, inline: true }
      )
      .setFooter({ text: 'Haz clic en el botón para reclamar tu regalo.' });

    const row = new ActionRowBuilder()
      .addComponents(
        new ButtonBuilder()
          .setCustomId('gift_claim')
          .setStyle(ButtonStyle.Secondary)
          .setEmoji({ id: '1296709132266770432', name: 'stars' })
      );

    const message = await interaction.editReply({
      embeds: [embed],
      components: [row]
    });

    const filter = (i) => i.customId === 'gift_claim' && i.member.roles.cache.has(role.id) && i.message.id === message.id;
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

    async function addPacksToUser(userId, packId, quantity) {
      try {
        let inventory = await Inventory.findOne({ userId });
        if (!inventory) {
          inventory = new Inventory({ userId, packs: new Map() });
        }

        const currentQuantity = inventory.packs.get(packId) || 0;
        inventory.packs.set(packId, currentQuantity + quantity);

        await inventory.save();
        return true;
      } catch (error) {
        console.error(`Error al agregar packs al usuario ${userId}:`, error);
        return false;
      }
    }

    async function addBebegomsToUser(userId, quantity) {
      try {
        let user = await User.findOne({ userId });
        if (!user) {
          user = new User({ userId, bebegoms: 0 });
        }
        user.bebegoms += quantity;
        await user.save();
        return true;
      } catch (error) {
        console.error(`Error al agregar Bebegoms al usuario ${userId}:`, error);
        return false;
      }
    }

collector.on('collect', async (i) => {
  if (!usuariosQueReclamaron.has(i.user.id)) {
    usuariosQueReclamaron.add(i.user.id);
    try {
      let claimMessage = "";
      let packInfo; // Declarar packInfo aquí

      if (giftType === "coins") {
          const coins = interaction.options.getString('coins');
          const success = await addCoinsToUser(i.user.id, coins);
          if (success) {
            claimMessage = `¡Has reclamado exitosamente el regalo de ${coins} monedas!`;
          } else {
            claimMessage = 'Hubo un error al procesar tu regalo. Intenta nuevamente.';
          }
      } else if (giftType === "packs") {
        const packId = interaction.options.getString('pack');
        const quantity = interaction.options.getInteger('cantidad');

        packInfo = packs.find(pack => pack.id === packId); // Asignar valor aquí
        if (!packInfo) {
          await i.update({ content: `No se encontró un pack con el ID '${packId}'.`, embeds: [], components: [] });
          return; // Importante: Detener la ejecución si no se encuentra el pack
        }

        const success = await addPacksToUser(i.user.id, packId, quantity);
        if (success) {
          claimMessage = `¡Has reclamado exitosamente ${quantity} ${packInfo.name}!`; // Usar packInfo aquí
        } else {
          claimMessage = 'Hubo un error al procesar tu regalo. Intenta nuevamente.';
        }
      } else if (giftType === "bebegoms") {
        const quantity = interaction.options.getInteger('cantidad');
        const success = await addBebegomsToUser(i.user.id, quantity);
          if (success) {
            claimMessage = `¡Has reclamado exitosamente ${quantity} Bebegoms!`;
          } else {
            claimMessage = 'Hubo un error al procesar tu regalo. Intenta nuevamente.';
          }
      }

            if (i.replied) { // Comprobar si ya se respondió con i.reply
                await i.followUp({ content: claimMessage, ephemeral: true }); // Usar i.followUp si ya se respondió
            } else {
                await i.reply({ content: claimMessage, ephemeral: true }); // Usar i.reply si es la primera vez
            }

        } catch (error) {
            console.error('Error al procesar la reclamación:', error);
            if (i.replied) {
                await i.followUp({ content: 'Hubo un error al procesar tu solicitud.', ephemeral: true });
            } else {
                await i.reply({ content: 'Hubo un error al procesar tu solicitud.', ephemeral: true });
            }
        }
    } else {
        if (i.replied) {
            await i.followUp({ content: '¡Ya reclamaste este regalo!', ephemeral: true });
        } else {
            await i.reply({ content: '¡Ya reclamaste este regalo!', ephemeral: true });
        }
    }
});

    collector.on('end', async (collected) => {
      if (message.deleted) {
        console.error('El mensaje ha sido eliminado antes de editarlo.');
        return;
      }

      const updatedEmbed = new EmbedBuilder(embed)
        .setTitle(`${embedTitle} (Finalizado)`)
        .addFields(
          { name: 'Total de participantes:', value: `<:dot:1296709116231684106>${usuariosQueReclamaron.size} usuarios.` }
        )
        .setFooter({ text: 'El regalo ha expirado.' });

      try {
        await message.edit({ embeds: [updatedEmbed], components: [] });
      } catch (error) {
        console.error('Error al intentar editar el embed final:', error);
      }
    });
  },
};
