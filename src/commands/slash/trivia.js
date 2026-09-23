const {
  SlashCommandBuilder,
  ApplicationIntegrationType,
  InteractionContextType,
  PermissionFlagsBits,
  ChannelType,
  MessageFlags,
} = require('discord.js');
const {
  setChannel,
  getScore,
  postQuestion,
} = require('../../games/trivia');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('trivia')
    .setDescription('Trivia game commands')
    .addSubcommand((sub) =>
      sub
        .setName('channel')
        .setDescription('Set the trivia channel (defaults to the current channel)')
        .addChannelOption((opt) =>
          opt
            .setName('channel')
            .setDescription('The channel where trivia will be posted')
            .addChannelTypes(ChannelType.GuildText, ChannelType.GuildAnnouncement)
            .setRequired(false)
        )
    )
    .addSubcommand((sub) =>
      sub
        .setName('score')
        .setDescription('Check trivia score (defaults to you)')
        .addUserOption((opt) =>
          opt.setName('user').setDescription('User to check').setRequired(false)
        )
    )
    .addSubcommand((sub) =>
      sub.setName('run').setDescription('Force a trivia question now (Manage Server only)')
    )
    .setIntegrationTypes(
      ApplicationIntegrationType.GuildInstall,
      ApplicationIntegrationType.UserInstall
    )
    .setContexts(InteractionContextType.Guild),

  async execute(interaction) {
    const sub = interaction.options.getSubcommand();

    // ---- /trivia channel ----
    if (sub === 'channel') {
      if (!interaction.memberPermissions?.has(PermissionFlagsBits.ManageGuild)) {
        return interaction.reply({
          content: '❌ You need **Manage Server** permissions to change the trivia channel.',
          flags: MessageFlags.Ephemeral,
        });
      }

      const target = interaction.options.getChannel('channel') ?? interaction.channel;
      await setChannel(interaction.client, interaction.guildId, target.id);

      return interaction.reply({
        content: `✅ Trivia channel set to <#${target.id}>. Questions will be posted every 30 minutes.`,
        flags: MessageFlags.Ephemeral,
      });
    }

    // ---- /trivia score ----
    if (sub === 'score') {
      const target = interaction.options.getUser('user') ?? interaction.user;
      const score = await getScore(interaction.guildId, target.id);
      return interaction.reply({
        content: `🧠 <@${target.id}> has **${score}** trivia point${score === 1 ? '' : 's'}.`,
      });
    }

    // ---- /trivia run ----
    if (sub === 'run') {
      if (!interaction.memberPermissions?.has(PermissionFlagsBits.ManageGuild)) {
        return interaction.reply({
          content: '❌ You need **Manage Server** permissions to run trivia manually.',
          flags: MessageFlags.Ephemeral,
        });
      }

      await interaction.deferReply({ flags: MessageFlags.Ephemeral });
      await postQuestion(interaction.client, interaction.guildId, { force: true });
      return interaction.editReply({ content: '✅ Trivia question posted.' });
    }
  },
};
