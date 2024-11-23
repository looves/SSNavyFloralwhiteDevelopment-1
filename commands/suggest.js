const { SlashCommandBuilder } = require('@discordjs/builders');
const { EmbedBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('suggest')
        .setDescription('Envía una sugerencia o idea')
        .addStringOption(option =>
            option.setName('idea')
                .setDescription('Escribe tu idea o sugerencia')
                .setRequired(true)
        ),

    async execute(interaction) {

        const idea = interaction.options.getString('idea');
        const user = interaction.user;

        // ID del canal donde se enviarán las sugerencias (cambia este valor por el ID del canal)
        const suggestionChannelId = '1248115686463766559'; 

        // Obtener el canal por su ID
        const suggestionChannel = interaction.guild.channels.cache.get(suggestionChannelId);

        if (!suggestionChannel) {
            return interaction.reply({ content: 'No se pudo encontrar el canal de sugerencias.', ephemeral: true });
        }

        // Defer the reply to give the bot time to process the suggestion
        await interaction.deferReply({ ephemeral: true });

        // Crear un embed con la sugerencia
        const suggestEmbed = new EmbedBuilder()
            .setTitle('Nueva sugerencia:')
            .setDescription(`<:dot:1296709116231684106> ${idea}`)
            .setColor("#60a5fa")
            .setAuthor({ name: `Sugerencia de ${user.tag}:`, iconURL: user.displayAvatarURL() });

        try {
            // Enviar el embed en el canal específico
            const message = await suggestionChannel.send({ embeds: [suggestEmbed] });

            // Agregar las reacciones "check" y "equis"
            await message.react('<:check:1296709540494053407>');  // Check
            await message.react('<:cross:1296709493089894432>');  // Equís

            // Responder a quien sugirió de forma efímera usando followUp
            await interaction.followUp({ content: `**¡Gracias por tu sugerencia!** Ha sido enviada al canal de <#${suggestionChannelId}>.`, ephemeral: true });
        } catch (error) {
            console.error('Error al enviar la sugerencia:', error);
            await interaction.followUp({ content: 'Ocurrió un error al procesar tu sugerencia.', ephemeral: true });
        }
    },

};
