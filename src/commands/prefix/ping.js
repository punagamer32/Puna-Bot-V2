module.exports = {
  name: 'ping',
  description: 'Replies with Pong!',
  async execute(message, args, client) {
    await message.reply('🏓 Pong!');
  },
};
