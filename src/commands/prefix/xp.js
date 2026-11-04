const { PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const { getUserXp, modifyXp, XP_PER_LEVEL } = require('../../utils/leveling');

module.exports = {
  name: 'xp',
  description: 'Check or modify user XP',
  usage: '!xp [@user] [action] [amount]',

  async execute(message, args) {
    const target = message.mentions.users.first() ?? message.author;
    const action = args[1]?.toLowerCase();
    const amount = parseInt(args[2], 10);

    if (['add', 'subtract', 'set'].includes(action) && !isNaN(amount)) {
      if (!message.member.permissions.has(PermissionFlagsBits.ManageGuild)) {
        return message.reply('❌ You need Manage Server permissions.');
      }

      const { doc, newLevel } = await modifyXp(message.guildId, target.id, action, amount);
      return message.reply(`✅ Successfully modified XP for ${target}. They now have **${doc.xp} XP** (Level ${newLevel}).`);
    }

    const doc = await getUserXp(message.guildId, target.id);
    const level = Math.floor(doc.xp / XP_PER_LEVEL);
    const progress = doc.xp % XP_PER_LEVEL;

    const embed = new EmbedBuilder()
      .setTitle(`📊 XP for ${target.username}`)
      .setColor(0x5865f2)
      .addFields(
        { name: 'Level', value: `${level}`, inline: true },
        { name: 'Total XP', value: `${doc.xp}`, inline: true },
        { name: 'Progress to Next Level', value: `${progress} / ${XP_PER_LEVEL}` }
      );

    await message.reply({ embeds: [embed] });
  },
};
