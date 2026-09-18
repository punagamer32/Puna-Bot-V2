const { Schema, model } = require('mongoose');

const guildConfigSchema = new Schema({
  guildId: { type: String, required: true, unique: true },
  prefix: { type: String, default: '!' },
  welcomeChannel: String,
  createdAt: { type: Date, default: Date.now },
});

module.exports = model('GuildConfig', guildConfigSchema);
