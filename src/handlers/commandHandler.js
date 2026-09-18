const fs = require('fs');
const path = require('path');

async function loadCommands(client) {
  const slashDir = path.join(__dirname, '../commands/slash');
  const prefixDir = path.join(__dirname, '../commands/prefix');

  // Load slash commands
  const slashFiles = fs.readdirSync(slashDir).filter(f => f.endsWith('.js'));
  for (const file of slashFiles) {
    const command = require(path.join(slashDir, file));
    if (command.data && command.execute) {
      client.commands.set(command.data.name, command);
    }
  }
  console.log(`Loaded ${client.commands.size} slash commands`);

  // Load prefix commands
  const prefixFiles = fs.readdirSync(prefixDir).filter(f => f.endsWith('.js'));
  for (const file of prefixFiles) {
    const command = require(path.join(prefixDir, file));
    if (command.name && command.execute) {
      client.prefixCommands.set(command.name, command);
    }
  }
  console.log(`Loaded ${client.prefixCommands.size} prefix commands`);
}

module.exports = { loadCommands };
