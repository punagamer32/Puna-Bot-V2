const { PermissionFlagsBits } = require('discord.js');
const {
  setupPanel,
  openSubmissions,
  closeSubmissions,
} = require('../../request/panel');

module.exports = {
  name: 'request',
  description: 'Geometry Dash level request system',
  usage: '!request channel [#channel] | open | close',

  async execute(message, args) {
    const sub = (args[0] ?? '').toLowerCase();
    const guildId = message.guildId;

    if (!guildId) return message.reply('❌ This command is only available in servers.');

    const canManage =
      message.member?.permissions.has(PermissionFlagsBits.ManageGuild) ||
      message.member?.permissions.has(PermissionFlagsBits.Administrator);

    if (sub === 'channel') {
      if (!canManage) {
        return message.reply('❌ You need **Manage Server** or **Administrator** permissions.');
      }

      const target = message.mentions.channels.first() ?? message.channel;
      try {
        await setupPanel(message.client, guildId, target.id);
        return message.reply(`✅ Level request panel created in <#${target.id}>.`);
      } catch (err) {
        console.error('[request] setup error:', err);
        return message.reply(`❌ Failed to set up panel: ${err.message}`);
      }
    }

    if (sub === 'open' || sub === 'close') {
      if (!canManage) {
        return message.reply('❌ You need **Manage Server** or **Administrator** permissions.');
      }
      const fn = sub === 'open' ? openSubmissions : closeSubmissions;
      const ok = await fn(message.client, guildId);
      return message.reply(
        ok
          ? `✅ Level submissions are now **${sub}**.`
          : '❌ No request panel has been set up yet. Use `!request channel` first.'
      );
    }

    return message.reply(
      [
        '**Request Commands**',
        '`!request channel [#channel]` — set up the request panel (defaults to this channel)',
        '`!request open` — open submissions (Manage Server only)',
        '`!request close` — close submissions (Manage Server only)',
      ].join('\n')
    );
  },
};
