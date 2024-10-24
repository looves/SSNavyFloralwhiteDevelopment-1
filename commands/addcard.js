const { SlashCommandBuilder } = require('@discordjs/builders');
const { EmbedBuilder } = require('discord.js');
const Card = require('../models/Card');
const getImageExtension = require('../utils/getImageExtension');
const rarityToEmojis = require('../utils/rarityToEmojis');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('add') // El comando principal es '/add'
        .setDescription('Agrega algo al sistema.')
        .addSubcommand(subcommand => 
            subcommand
                .setName('card') // Este es el subcomando '/add card'
                .setDescription('Agrega una nueva carta a la base de datos.')
                .addStringOption(option => 
                    option.setName('idol')
                        .setDescription('Nombre del idol')
                        .setRequired(true))
                .addStringOption(option => 
                    option.setName('group')
                        .setDescription('Nombre del grupo')
                        .setRequired(true))
                .addStringOption(option => 
                    option.setName('era')
                        .setDescription('Era de la carta')
                        .setRequired(true))
                .addStringOption(option => 
                    option.setName('eshort')
                        .setDescription('Era corta de la carta')
                        .setRequired(true))
                .addIntegerOption(option => 
                    option.setName('rarity')
                        .setDescription('Rareza de la carta (1, 2, 3)')
                        .setRequired(true))
                .addStringOption(option => 
                    option.setName('image')
                        .setDescription('URL de la imagen de la carta')
                        .setRequired(true))
                .addStringOption(option => 
                    option.setName('event')
                        .setDescription('Evento de la carta (opcional)')
                        .setRequired(false))
        ),

    async execute(interaction) {
        const requiredRoleId = '1296606575993032798'; // Cambia esto por el ID del rol correcto

        const member = interaction.member;
        if (!member.roles.cache.has(requiredRoleId)) {
            return interaction.reply({ content: 'No tienes permiso para usar este comando.', ephemeral: true });
        }

        try {
            // Defer the reply to avoid interaction expiration
            await interaction.deferReply();

            // Solo ejecutamos la lógica si el subcomando es 'card'
            if (interaction.options.getSubcommand() === 'card') {
                const idol = interaction.options.getString('idol');
                const grupo = interaction.options.getString('group');
                const era = interaction.options.getString('era');
                const eshort = interaction.options.getString('eshort');
                const rarity = interaction.options.getInteger('rarity');
                const event = interaction.options.getString('event'); // Usar como cadena opcional
                const image = interaction.options.getString('image');

                if (rarity < 1 || rarity > 3) {
                    return interaction.editReply('La rareza debe ser 1, 2 o 3.');
                }

                const newCard = new Card({
                    idol,
                    grupo,
                    era,
                    eshort,
                    rarity,
                    event: event || null, // Si event no está definido, será null
                    image
                });

                await newCard.save();

                const newimgUrl = newCard.image;
                const extension = getImageExtension(newimgUrl);
                const fileName = `newcard${extension}`;

                // Crear la descripción del embed dinámicamente, excluyendo "event" si no se especifica
                let description = `<:dot:1296709116231684106>**Idol:** \`${newCard.idol}\`\n` +
                                  `<:dot:1296709116231684106>**Grupo:** \`${newCard.grupo}\`\n` +
                                  `<:dot:1296709116231684106>**Era:** \`${newCard.era}\`\n` +
                                  `<:dot:1296709116231684106>**Eshort:** \`${newCard.eshort}\`\n` +
                                  `<:dot:1296709116231684106>**Rareza:** ${rarityToEmojis(newCard.rarity)}`;

                // Añadir el campo "event" si fue especificado
                if (event) {
                    description += `\n<:dot:1296709116231684106>**Evento:** \`${newCard.event}\``;
                }

                const embed = new EmbedBuilder()
                    .setTitle(`Nueva carta agregada:`)
                    .setColor('#60a5fa')
                    .setDescription(description)
                    .setFooter({ text: `Agregada por ${interaction.user.tag}`, iconURL: interaction.user.displayAvatarURL() });

                // Envía el embed a un canal específico, reemplaza 'ID_DEL_CANAL' con el ID real del canal
                const channelId = '1295041559196340244'; // Cambia esto por el ID del canal donde deseas enviar el mensaje
                const channel = await interaction.client.channels.fetch(channelId);

                if (channel) {
                    await channel.send({ embeds: [embed], files: [{ attachment: newimgUrl, name: fileName }] });
                    await interaction.editReply({ content: `La carta se ha agregado correctamente <#${channelId}>`, ephemeral: true });
                } else {
                    await interaction.editReply({ content: 'No se pudo encontrar el canal para enviar el embed.', ephemeral: true });
                }
            }

        } catch (error) {
            console.error('Error al agregar la carta:', error);
            await interaction.editReply('Ocurrió un error al agregar la carta.');
        }
    }
};
