const { ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { fetchProfile, fetchLevel } = require('../../gd/api');
const { formatProfile, formatLevel } = require('../../gd/format');

module.exports = {
  name: 'gd',
  description: 'Geometry Dash lookups',
  async execute(message, args) {
    const sub = (args[0] ?? '').toLowerCase();

    // ---- !gd profile <username> ----
    if (sub === 'profile') {
      const username = args.slice(1).join(' ').trim();
      if (!username) {
        return message.reply('❌ Usage: `!gd profile <username>`');
      }

      try {
        const data = await fetchProfile(username);
        if (!data || !data.username) {
          return message.reply(`❌ No Geometry Dash profile found for **${username}**.`);
        }

        const row = new ActionRowBuilder().addComponents(
          new ButtonBuilder()
            .setCustomId(`gd:levels:${username}`)
            .setLabel('Levels')
            .setStyle(ButtonStyle.Primary),
          new ButtonBuilder()
            .setCustomId(`gd:demons:${username}`)
            .setLabel('Demons')
            .setStyle(ButtonStyle.Primary)
        );

        return message.reply({
          content: formatProfile(data),
          components: [row],
        });
      } catch (err) {
        console.error('[gd] profile error:', err);
        return message.reply(`❌ Failed to fetch profile: ${err.message}`);
      }
    }

    // ---- !gd level <levelid> ----
    if (sub === 'level') {
      const levelId = args[1];
      if (!levelId) {
        return message.reply('❌ Usage: `!gd level <levelid>`');
      }

      try {
        const data = await fetchLevel(levelId);
        if (!data || !data.name) {
          return message.reply(`❌ No Geometry Dash level found with ID **${levelId}**.`);
        }
        return message.reply(formatLevel(data));
      } catch (err) {
        console.error('[gd] level error:', err);
        return message.reply(`❌ Failed to fetch level: ${err.message}`);
      }
    }

    // ---- Help ----
    return message.reply(
      [
        '**GD Commands**',
        '`!gd profile <username>` — Get a player profile',
        '`!gd level <levelid>` — Get info about a level',
      ].join('\n')
    );
  },
};
