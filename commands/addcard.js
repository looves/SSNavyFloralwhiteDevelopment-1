const { SlashCommandBuilder } = require('@discordjs/builders');
const { EmbedBuilder } = require('discord.js');
const Card = require('../models/Card');
const getImageExtension = require('../utils/getImageExtension');
const rarityToEmojis = require('../utils/rarityToEmojis'); // Usamos la misma función para rareza y eventos

function convertImgurUrl(url) {
    const imgurRegex = /https:\/\/imgur\.com\/([a-zA-Z0-9]+)/;
    const match = url.match(imgurRegex);

    if (match) {
        return `https://i.imgur.com/${match[1]}.png`;
    }

    return url; // Retorna la URL original si no coincide con el patrón
}

    module.exports = {
        data: new SlashCommandBuilder()
            .setName('add')
            .setDescription('Agrega algo al sistema.')
            .addSubcommand(subcommand => 
                subcommand
                    .setName('card')
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
            const requiredRoleId = '1296606575993032798';

            const member = interaction.member;
            if (!member.roles.cache.has(requiredRoleId)) {
                return interaction.reply({ content: 'No tienes permiso para usar este comando.', ephemeral: true });
            }

            try {
                // Intentamos diferir la respuesta
                try {
                    await interaction.deferReply();
                } catch (error) {
                    console.error('Error al diferir la respuesta:', error);
                    return;  // Si falla deferReply, simplemente retornamos y no bloqueamos el bot
                }

                if (interaction.options.getSubcommand() === 'card') {
                    const idol = interaction.options.getString('idol');
                    const grupo = interaction.options.getString('group');
                    const era = interaction.options.getString('era');
                    const eshort = interaction.options.getString('eshort');
                    const rarity = interaction.options.getInteger('rarity');
                    const event = interaction.options.getString('event');
                    const image = interaction.options.getString('image');

                    if (event && rarity !== 2) {
                        return interaction.editReply('Si se selecciona un evento, la rareza debe ser 2.');
                    }

                    
                    if (rarity < 1 || rarity > 3) {
                        return interaction.editReply('La rareza debe ser 1, 2 o 3.');
                    }

                    // Convertir la URL de la imagen antes de guardarla en la base de datos
                    const newimgUrl = convertImgurUrl(image);

                    const newCard = new Card({
                        idol,
                        grupo,
                        era,
                        eshort,
                        rarity,
                        event: event || null,
                        image: newimgUrl // Guarda la URL convertida en lugar de la original
                    });

                    await newCard.save();

                    const extension = getImageExtension(newimgUrl);
                    const fileName = `newcard${extension}`;

                    let description = `<:dot:1296709116231684106>**Idol:** \`${newCard.idol}\`\n` +
                                      `<:dot:1296709116231684106>**Grupo:** \`${newCard.grupo}\`\n`;

                    // Si hay evento, se muestra el nombre del evento. Si no, se muestra la era
                    if (newCard.event) {
                        description += `<:dot:1296709116231684106>**Evento:** \`${newCard.event}\`\n`;
                    } else {
                        description += `<:dot:1296709116231684106>**Era:** \`${newCard.era}\`\n`;
                    }

                    description +=`<:dot:1296709116231684106>**Eshort:** \`${newCard.eshort}\`\n`;
                    
                    // Si hay evento, se usa el emoji del evento, si no, se usa el de la rareza
                    description += `<:dot:1296709116231684106>**Rareza:** ${rarityToEmojis(newCard.event || newCard.rarity)}`;



                    const embed = new EmbedBuilder()
                        .setTitle(`Nueva carta agregada:`)
                        .setColor('#60a5fa')
                        .setDescription(description)
                        .setFooter({ text: `Agregada por ${interaction.user.tag}`, iconURL: interaction.user.displayAvatarURL() });

                    const channelId = '1295041559196340244'; 
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

