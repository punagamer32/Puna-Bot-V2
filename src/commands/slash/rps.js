const {
  SlashCommandBuilder,
  ApplicationIntegrationType,
  InteractionContextType,
} = require('discord.js');
const { startGame } = require('../../games/rps');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('rps')
    .setDescription('Challenge someone to Rock, Paper, Scissors.')
    .addUserOption((opt) =>
      opt
        .setName('opponent')
        .setDescription('The user you want to challenge')
        .setRequired(true)
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
    const opponent = interaction.options.getUser('opponent');
    const challenger = interaction.user;

    if (opponent.bot) {
      return interaction.reply({ content: '❌ You cannot challenge a bot.', ephemeral: true });
    }
    if (opponent.id === challenger.id) {
      return interaction.reply({ content: '❌ You cannot challenge yourself.', ephemeral: true });
    }

    await interaction.deferReply();

    try {
      await startGame({
        client: interaction.client,
        guildId: interaction.guildId ?? 'DM',
        channelId: interaction.channelId,
        challengerId: challenger.id,
        opponentId: opponent.id,
        sendMessage: async (payload) => {
          await interaction.editReply(payload);
          return interaction.fetchReply();
        },
      });
    } catch (err) {
      if (err.code === 'EXISTS') {
        return interaction.editReply({
          content: '❌ There is already an active game between you two in this channel.',
        });
      }
      console.error('[rps] start failed:', err);
      await interaction.editReply({ content: '❌ Failed to start the game.' });
    }
  },
};
