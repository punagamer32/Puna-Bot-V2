const { handleMessageXp } = require('../utils/leveling'); // 👈 Add import

module.exports = {
  name: 'messageCreate',
  once: false,
  async execute(message, client) {
    if (message.author.bot || !message.guild) return;

    // 1. Grant XP for the message
    await handleMessageXp(message); // 👈 Add this line

    // 2. Handle prefix commands
    if (!message.content.startsWith('!')) return;

    const args = message.content.slice(1).trim().split(/ +/);
    const commandName = args.shift().toLowerCase();

    const command = client.prefixCommands.get(commandName);
    if (!command) return;

    try {
      await command.execute(message, args, client);
    } catch (err) {
      console.error(err);
      await message.reply('❌ There was an error executing that command.');
    }
  },
};
