const { PermissionFlagsBits } = require('discord.js');
const {
  setChannel,
  getScore,
  postQuestion,
} = require('../../games/trivia');

module.exports = {
  name: 'trivia',
  description: 'Trivia game commands',
  async execute(message, args) {
    const sub = (args[0] ?? '').toLowerCase();
    const guildId = message.guildId;

    if (!guildId) {
      return message.reply('❌ Trivia is only available in servers.');
    }

    // ---- !trivia channel [#channel] ----
    if (sub === 'channel') {
      if (!message.member?.permissions.has(PermissionFlagsBits.ManageGuild)) {
        return message.reply('❌ You need **Manage Server** permissions to change the trivia channel.');
      }

      const target = message.mentions.channels.first() ?? message.channel;
      await setChannel(message.client, guildId, target.id);
      return message.reply(
        `✅ Trivia channel set to <#${target.id}>. Questions will be posted every 30 minutes.`
      );
    }

    // ---- !trivia score [@user] ----
    if (sub === 'score') {
      const target = message.mentions.users.first() ?? message.author;
      const score = await getScore(guildId, target.id);
      return message.reply(
        `🧠 <@${target.id}> has **${score}** trivia point${score === 1 ? '' : 's'}.`
      );
    }

    // ---- !trivia run ----
    if (sub === 'run') {
      if (!message.member?.permissions.has(PermissionFlagsBits.ManageGuild)) {
        return message.reply('❌ You need **Manage Server** permissions to run trivia manually.');
      }

      await postQuestion(message.client, guildId, { force: true });
      return message.reply('✅ Trivia question posted.');
    }

    // ---- Help ----
    return message.reply(
      [
        '**Trivia Commands**',
        '`!trivia channel [#channel]` — set the trivia channel (defaults to this one)',
        '`!trivia score [@user]` — check a user\'s score (defaults to you)',
        '`!trivia run` — force a trivia question now (Manage Server only)',
      ].join('\n')
    );
  },
};
