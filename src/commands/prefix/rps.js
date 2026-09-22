const { startGame } = require('../../games/rps');

module.exports = {
  name: 'rps',
  description: 'Challenge someone to Rock, Paper, Scissors.',
  async execute(message, args, client) {
    const opponent = message.mentions.users.first();

    if (!opponent) {
      return message.reply('❌ You must mention a user. Usage: `!rps @user`');
    }
    if (opponent.bot) {
      return message.reply('❌ You cannot challenge a bot.');
    }
    if (opponent.id === message.author.id) {
      return message.reply('❌ You cannot challenge yourself.');
    }

    try {
      await startGame({
        client,
        guildId: message.guildId ?? 'DM',
        channelId: message.channelId,
        challengerId: message.author.id,
        opponentId: opponent.id,
        sendMessage: (payload) => message.reply(payload),
      });
    } catch (err) {
      if (err.code === 'EXISTS') {
        return message.reply(
          '❌ There is already an active game between you two in this channel.'
        );
      }
      console.error('[rps] start failed:', err);
      await message.reply('❌ Failed to start the game.');
    }
  },
};
