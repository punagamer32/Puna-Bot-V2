const { EmbedBuilder } = require('discord.js');
const { buildHelpFields } = require('../../utils/helpBuilder');

module.exports = {
  name: 'help',
  description: 'Show all available commands',

  async execute(message, args, client) {
    const fields = buildHelpFields(client, { prefix: '!' });

    const embed = new EmbedBuilder()
      .setTitle('📖 Puna Bot — Commands')
      .setDescription('Use `/` for slash commands or `!` for prefix commands.')
      .setColor(0x5865f2)
      .addFields(fields);

    await message.reply({ embeds: [embed] });
  },
};
