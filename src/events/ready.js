const { REST, Routes } = require('discord.js');

module.exports = {
  name: 'ready',
  once: true,
  async execute(client) {
    console.log(`Logged in as ${client.user.tag}`);

    const commands = client.commands.map(cmd => cmd.data.toJSON());
    const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);

    try {
      await rest.put(Routes.applicationCommands(client.user.id), { body: commands });
      console.log('✅ Slash commands registered globally (guild + user install)');
    } catch (err) {
      console.error('❌ Failed to register commands:', err);
    }
  },
};
