const { Schema, model, mongoose } = require('mongoose');

async function connectDB() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ MongoDB connected');
  } catch (err) {
    console.error('❌ MongoDB connection failed:', err.message);
    process.exit(1);
  }
}

module.exports = { connectDB };

const guildConfigSchema = new Schema({
  guildId: { type: String, required: true, unique: true },
  prefix: { type: String, default: '!' },
  welcomeChannel: String,
  createdAt: { type: Date, default: Date.now },
});

module.exports = model('GuildConfig', guildConfigSchema);

require('dotenv').config();
const { Client, GatewayIntentBits, Collection } = require('discord.js');
const { connectDB } = require('./database');
const { loadCommands } = require('./handlers/commandHandler');
const { loadEvents } = require('./handlers/eventHandler');

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent, // Required for prefix commands
  ],
});

client.commands = new Collection();
client.prefixCommands = new Collection();

(async () => {
  await connectDB();
  await loadCommands(client);
  await loadEvents(client);
  await client.login(process.env.DISCORD_TOKEN);
})();
