const {
  SlashCommandBuilder,
  EmbedBuilder,
  ApplicationIntegrationType,
  InteractionContextType,
} = require('discord.js');
const { buildHelpFields } = require('../../utils/helpBuilder');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('help')
    .setDescription('Show all available commands')
    .setIntegrationTypes(
      ApplicationIntegrationType.GuildInstall,
      ApplicationIntegrationType.UserInstall
    )
    .setContexts(
      InteractionContextType.Guild,
      InteractionContextType.BotDM,
      InteractionContextType.PrivateChannel
    ),

  async execute(interaction, client) {
    const fields = buildHelpFields(client, { prefix: '!' });

    const embed = new EmbedBuilder()
      .setTitle('📖 Puna Bot — Commands')
      .setDescription('Use `/` for slash commands or `!` for prefix commands.')
      .setColor(0x5865f2)
      .addFields(fields);

    await interaction.reply({ embeds: [embed] });
  },
};
