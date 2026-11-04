const { SlashCommandBuilder, PermissionFlagsBits, ChannelType } = require('discord.js');
const LevelConfig = require('../../models/LevelConfig');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('xpmsg')
    .setDescription('Set up level up messages')
    .addChannelOption((opt) =>
      opt.setName('channel').setDescription('Channel to send the message').addChannelTypes(ChannelType.GuildText).setRequired(true)
    )
    .addStringOption((opt) =>
      opt.setName('message').setDescription('Use {userping} and {level} as placeholders').setRequired(true)
    ),

  async execute(interaction) {
    if (!interaction.memberPermissions.has(PermissionFlagsBits.ManageGuild)) {
      return interaction.reply({ content: '❌ You need Manage Server permissions.', ephemeral: true });
    }

    const channel = interaction.options.getChannel('channel');
    const message = interaction.options.getString('message');

    await LevelConfig.findOneAndUpdate(
      { guildId: interaction.guildId },
      { $set: { levelUpChannelId: channel.id, levelUpMessage: message } },
      { upsert: true }
    );

    return interaction.reply({
      content: `✅ Level up messages will now be sent to ${channel}.\n**Preview:**\n${message.replace(/{userping}/g, `<@${interaction.user.id}>`).replace(/{level}/g, '5')}`,
    });
  },
};
