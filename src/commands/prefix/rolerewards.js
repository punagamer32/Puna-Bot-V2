const { PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const LevelConfig = require('../../models/LevelConfig');

module.exports = {
  name: 'rolerewards',
  description: 'Manage role rewards for leveling',
  usage: '!rolerewards [level] [@role]',

  async execute(message, args) {
    const level = parseInt(args[0], 10);
    const role = message.mentions.roles.first();

    if (isNaN(level) && !role) {
      const config = await LevelConfig.findOne({ guildId: message.guildId });
      const rewards = config?.roleRewards || [];

      if (!rewards.length) return message.reply('No role rewards have been set up yet.');

      rewards.sort((a, b) => a.level - b.level);
      const desc = rewards.map((r) => `**Level ${r.level}:** <@&${r.roleId}>`).join('\n');

      const embed = new EmbedBuilder()
        .setTitle('🎭 Role Rewards')
        .setDescription(desc)
        .setColor(0x5865f2);

      return message.reply({ embeds: [embed] });
    }

    if (!message.member.permissions.has(PermissionFlagsBits.ManageGuild)) {
      return message.reply('❌ You need Manage Server permissions.');
    }

    if (isNaN(level) || !role) {
      return message.reply('❌ Usage: `!rolerewards [level] [@role]`');
    }

    const config = await LevelConfig.findOneAndUpdate(
      { guildId: message.guildId },
      { $pull: { roleRewards: { level } } },
      { new: true, upsert: true }
    );

    config.roleRewards.push({ level, roleId: role.id });
    await config.save();

    return message.reply(`✅ Users will now receive ${role} at Level ${level}.`);
  },
};
