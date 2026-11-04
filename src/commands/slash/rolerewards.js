const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const LevelConfig = require('../../models/LevelConfig');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('rolerewards')
    .setDescription('Manage role rewards for leveling')
    .addIntegerOption((opt) =>
      opt.setName('level').setDescription('The level to set a reward for').setMinValue(1).setRequired(false)
    )
    .addRoleOption((opt) =>
      opt.setName('role').setDescription('The role to reward').setRequired(false)
    ),

  async execute(interaction) {
    const level = interaction.options.getInteger('level');
    const role = interaction.options.getRole('role');

    // If no arguments provided, display the list
    if (!level && !role) {
      const config = await LevelConfig.findOne({ guildId: interaction.guildId });
      const rewards = config?.roleRewards || [];

      if (!rewards.length) {
        return interaction.reply({ content: 'No role rewards have been set up yet.', ephemeral: true });
      }

      const embed = new EmbedBuilder()
        .setTitle('🎭 Role Rewards')
        .setColor(0x5865f2);

      // Sort by level
      rewards.sort((a, b) => a.level - b.level);
      const desc = rewards.map((r) => `**Level ${r.level}:** <@&${r.roleId}>`).join('\n');
      embed.setDescription(desc);

      return interaction.reply({ embeds: [embed] });
    }

    // Modifying requires Manage Server
    if (!interaction.memberPermissions.has(PermissionFlagsBits.ManageGuild)) {
      return interaction.reply({ content: '❌ You need Manage Server permissions.', ephemeral: true });
    }

    if (!level || !role) {
      return interaction.reply({ content: '❌ You must provide both a level and a role.', ephemeral: true });
    }

    const config = await LevelConfig.findOneAndUpdate(
      { guildId: interaction.guildId },
      { $pull: { roleRewards: { level } } }, // Remove existing reward for this level
      { new: true, upsert: true }
    );

    config.roleRewards.push({ level, roleId: role.id });
    await config.save();

    return interaction.reply({ content: `✅ Users will now receive ${role} at Level ${level}.` });
  },
};
