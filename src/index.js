require('dotenv').config();
const { Client, GatewayIntentBits, Collection } = require('discord.js');
const { connectDB } = require('./database');
const { loadCommands } = require('./handlers/commandHandler');
const { loadEvents } = require('./handlers/eventHandler');
const { startInstanceWake } = require('./instanceWake');
const { resumeActiveGames } = require('./games/rps');
const { startTriviaScheduler } = require('./games/trivia');

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
});

client.commands = new Collection();
client.prefixCommands = new Collection();

(async () => {
  await connectDB();
  await loadCommands(client);
  await loadEvents(client);
  await client.login(process.env.DISCORD_TOKEN);

  await resumeActiveGames(client);
  await startTriviaScheduler(client);

  startInstanceWake();
})();
