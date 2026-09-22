const { handleRpsButton } = require('../games/rps');

module.exports = {
  name: 'interactionCreate',
  once: false,
  async execute(interaction, client) {
    // ---- Button interactions ----
    if (interaction.isButton()) {
      if (interaction.customId.startsWith('rps:')) {
        try {
          await handleRpsButton(interaction);
        } catch (err) {
          console.error('[rps] button handler error:', err);
          if (!interaction.replied && !interaction.deferred) {
            await interaction
              .reply({ content: '❌ Something went wrong.', ephemeral: true })
              .catch(() => {});
          }
        }
      }
      return;
    }

    // ---- Slash commands ----
    if (!interaction.isChatInputCommand()) return;

    const command = client.commands.get(interaction.commandName);
    if (!command) return;

    try {
      await command.execute(interaction, client);
    } catch (err) {
      console.error(err);
      const reply = {
        content: '❌ There was an error executing that command.',
        ephemeral: true,
      };
      if (interaction.replied || interaction.deferred) {
        await interaction.followUp(reply);
      } else {
        await interaction.reply(reply);
      }
    }
  },
};
