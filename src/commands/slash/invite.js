const {
  SlashCommandBuilder,
  ApplicationIntegrationType,
  InteractionContextType,
} = require('discord.js');

const INVITE_URL =
  'https://discord.com/oauth2/authorize?client_id=1549871166922039439&permissions=8&integration_type=0&scope=bot';

module.exports = {
  data: new SlashCommandBuilder()
    .setName('invite')
    .setDescription('Get the invite link for Puna Bot')
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
    await interaction.reply(
      `Click [here](${INVITE_URL}) to invite Puna Bot to your server!`
    );
  },
};
