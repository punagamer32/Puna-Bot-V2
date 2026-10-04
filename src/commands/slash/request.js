const {
  SlashCommandBuilder,
  ApplicationIntegrationType,
  InteractionContextType,
  PermissionFlagsBits,
  ChannelType,
  MessageFlags,
} = require('discord.js');
const {
  setupPanel,
  openSubmissions,
  closeSubmissions,
  canManage,
} = require('../../request/panel');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('request')
    .setDescription('Geometry Dash level request system')
    .addSubcommand((sub) =>
      sub
        .setName('channel')
        .setDescription('Set up the level request panel (defaults to this channel)')
        .addChannelOption((opt) =>
          opt
            .setName('channel')
            .setDescription('Channel to post the panel in')
            .addChannelTypes(ChannelType.GuildText, ChannelType.GuildAnnouncement)
            .setRequired(false)
        )
    )
    .addSubcommand((sub) =>
      sub.setName('open').setDescription('Open level submissions (Manage Server only)')
    )
    .addSubcommand((sub) =>
      sub.setName('close').setDescription('Close level submissions (Manage Server only)')
    )
    .setIntegrationTypes(
      ApplicationIntegrationType.GuildInstall,
      ApplicationIntegrationType.UserInstall
    )
    .setContexts(InteractionContextType.Guild),

  async execute(interaction) {
    const sub = interaction.options.getSubcommand();

    if (sub === 'channel') {
      if (!canManage(interaction)) {
        return interaction.reply({
          content: '❌ You need **Manage Server** or **Administrator** permissions.',
          flags: MessageFlags.Ephemeral,
        });
      }

      const target = interaction.options.getChannel('channel') ?? interaction.channel;
      await interaction.deferReply({ flags: MessageFlags.Ephemeral });

      try {
        await setupPanel(interaction.client, interaction.guildId, target.id);
        return interaction.editReply({
          content: `✅ Level request panel created in <#${target.id}>.`,
        });
      } catch (err) {
        console.error('[request] setup error:', err);
        return interaction.editReply({ content: `❌ Failed to set up panel: ${err.message}` });
      }
    }

    if (sub === 'open' || sub === 'close') {
      if (!canManage(interaction)) {
        return interaction.reply({
          content: '❌ You need **Manage Server** or **Administrator** permissions.',
          flags: MessageFlags.Ephemeral,
        });
      }

      const fn = sub === 'open' ? openSubmissions : closeSubmissions;
      const ok = await fn(interaction.client, interaction.guildId);

      return interaction.reply({
        content: ok
          ? `✅ Level submissions are now **${sub}**.`
          : '❌ No request panel has been set up yet. Use `/request channel` first.',
        flags: MessageFlags.Ephemeral,
      });
    }
  },
};
