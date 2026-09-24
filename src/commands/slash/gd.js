const {
  SlashCommandBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ApplicationIntegrationType,
  InteractionContextType,
  MessageFlags,
} = require('discord.js');
const { fetchProfile, fetchLevel } = require('../../gd/api');
const { formatProfile, formatLevel } = require('../../gd/format');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('gd')
    .setDescription('Geometry Dash lookups')
    .addSubcommand((sub) =>
      sub
        .setName('profile')
        .setDescription('Get a Geometry Dash player profile')
        .addStringOption((opt) =>
          opt
            .setName('username')
            .setDescription('Geometry Dash username')
            .setRequired(true)
        )
    )
    .addSubcommand((sub) =>
      sub
        .setName('level')
        .setDescription('Get information about a Geometry Dash level')
        .addStringOption((opt) =>
          opt.setName('levelid').setDescription('Level ID').setRequired(true)
        )
    )
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
    const sub = interaction.options.getSubcommand();

    if (sub === 'profile') {
      const username = interaction.options.getString('username');
      await interaction.deferReply();

      try {
        const data = await fetchProfile(username);
        if (!data || !data.username) {
          return interaction.editReply({
            content: `❌ No Geometry Dash profile found for **${username}**.`,
          });
        }

        const row = new ActionRowBuilder().addComponents(
          new ButtonBuilder()
            .setCustomId(`gd:levels:${username}`)
            .setLabel('Levels')
            .setStyle(ButtonStyle.Primary),
          new ButtonBuilder()
            .setCustomId(`gd:demons:${username}`)
            .setLabel('Demons')
            .setStyle(ButtonStyle.Primary)
        );

        return interaction.editReply({
          content: formatProfile(data),
          components: [row],
        });
      } catch (err) {
        console.error('[gd] profile error:', err);
        return interaction.editReply({
          content: `❌ Failed to fetch profile: ${err.message}`,
        });
      }
    }

    if (sub === 'level') {
      const levelId = interaction.options.getString('levelid');
      await interaction.deferReply();

      try {
        const data = await fetchLevel(levelId);
        if (!data || !data.name) {
          return interaction.editReply({
            content: `❌ No Geometry Dash level found with ID **${levelId}**.`,
          });
        }
        return interaction.editReply({ content: formatLevel(data) });
      } catch (err) {
        console.error('[gd] level error:', err);
        return interaction.editReply({
          content: `❌ Failed to fetch level: ${err.message}`,
        });
      }
    }
  },
};
