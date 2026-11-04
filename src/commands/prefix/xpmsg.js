const { PermissionFlagsBits } = require('discord.js');
const LevelConfig = require('../../models/LevelConfig');

module.exports = {
  name: 'xpmsg',
  description: 'Set up level up messages',
  usage: '!xpmsg [#channel] [message]',

  async execute(message, args) {
    if (!message.member.permissions.has(PermissionFlagsBits.ManageGuild)) {
      return message.reply('❌ You need Manage Server permissions.');
    }

    const channel = message.mentions.channels.first();
    const msg = args.slice(1).join(' ');

    if (!channel || !msg) {
      return message.reply('❌ Usage: `!xpmsg [#channel] [message]` (Use `{userping}` and `{level}` as placeholders)');
    }

    await LevelConfig.findOneAndUpdate(
      { guildId: message.guildId },
      { $set: { levelUpChannelId: channel.id, levelUpMessage: msg } },
      { upsert: true }
    );

    return message.reply({
      content: `✅ Level up messages will now be sent to ${channel}.\n**Preview:**\n${msg.replace(/{userping}/g, `<@${message.author.id}>`).replace(/{level}/g, '5')}`,
    });
  },
};
