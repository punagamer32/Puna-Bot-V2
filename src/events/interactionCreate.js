const { handleRpsButton } = require('../games/rps');
const { handleTriviaButton, handleTriviaModal } = require('../games/trivia');
const { handleGdButton } = require('../gd/buttons');

module.exports = {
  name: 'interactionCreate',
  once: false,
  async execute(interaction, client) {
    // ---- Buttons ----
    if (interaction.isButton()) {
      try {
        if (interaction.customId.startsWith('rps:')) {
          await handleRpsButton(interaction);
        } else if (interaction.customId.startsWith('trivia:answer:')) {
          await handleTriviaButton(interaction);
        } else if (interaction.customId.startsWith('gd:')) {
          await handleGdButton(interaction);
        }
      } catch (err) {
        console.error('[button] handler error:', err);
        if (!interaction.replied && !interaction.deferred) {
          await interaction
            .reply({ content: '❌ Something went wrong.', ephemeral: true })
            .catch(() => {});
        }
      }
      return;
    }

    // ---- Modals ----
    if (interaction.isModalSubmit()) {
      try {
        if (interaction.customId.startsWith('trivia:submit:')) {
          await handleTriviaModal(interaction);
        }
      } catch (err) {
        console.error('[modal] handler error:', err);
        if (!interaction.replied && !interaction.deferred) {
          await interaction
            .reply({ content: '❌ Something went wrong.', ephemeral: true })
            .catch(() => {});
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
