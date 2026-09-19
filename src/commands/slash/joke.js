const { SlashCommandBuilder, ApplicationIntegrationType, InteractionContextType } = require('discord.js');
const jokes = require('../../jokes.json');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('joke')
    .setDescription('Tells a random joke.')
    .setIntegrationTypes(
      ApplicationIntegrationType.GuildInstall,
      ApplicationIntegrationType.UserInstall
    )
    .setContexts(
      InteractionContextType.Guild,
      InteractionContextType.BotDM,
      InteractionContextType.PrivateChannel
    ),

  async execute(interaction) {
    if (!jokes.length) {
      return interaction.reply({ content: '😔 No jokes available right now.', ephemeral: true });
    }

    const joke = jokes[Math.floor(Math.random() * jokes.length)];
    await interaction.reply(joke);
  },
};
