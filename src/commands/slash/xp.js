const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const { getUserXp, modifyXp, XP_PER_LEVEL } = require('../../utils/leveling');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('xp')
    .setDescription('Check or modify user XP')
    .addUserOption((opt) =>
      opt.setName('user').setDescription('The user to check').setRequired(false)
    )
    .addStringOption((opt) =>
      opt
        .setName('action')
        .setDescription('Modify XP (Requires Manage Server)')
        .addChoices(
          { name: 'Add', value: 'add' },
          { name: 'Subtract', value: 'subtract' },
          { name: 'Set', value: 'set' }
        )
        .setRequired(false)
    )
    .addIntegerOption((opt) =>
      opt.setName('amount').setDescription('The amount of XP').setMinValue(1).setRequired(false)
    ),

  async execute(interaction) {
    const target = interaction.options.getUser('user') ?? interaction.user;
    const action = interaction.options.getString('action');
    const amount = interaction.options.getInteger('amount');

    // If an action is provided, modify XP
    if (action && amount) {
      if (!interaction.memberPermissions.has(PermissionFlagsBits.ManageGuild)) {
        return interaction.reply({ content: '❌ You need Manage Server permissions.', ephemeral: true });
      }

      const { doc, newLevel } = await modifyXp(interaction.guildId, target.id, action, amount);
      
      return interaction.reply({
        content: `✅ Successfully modified XP for ${target}. They now have **${doc.xp} XP** (Level ${newLevel}).`,
      });
    }

    // Otherwise, display XP
    const doc = await getUserXp(interaction.guildId, target.id);
    const level = Math.floor(doc.xp / XP_PER_LEVEL);
    const nextLevelXp = (level + 1) * XP_PER_LEVEL;
    const progress = doc.xp % XP_PER_LEVEL;

    const embed = new EmbedBuilder()
      .setTitle(`📊 XP for ${target.username}`)
      .setColor(0x5865f2)
      .addFields(
        { name: 'Level', value: `${level}`, inline: true },
        { name: 'Total XP', value: `${doc.xp}`, inline: true },
        { name: 'Progress to Next Level', value: `${progress} / ${XP_PER_LEVEL}` }
      );

    await interaction.reply({ embeds: [embed] });
  },
};
