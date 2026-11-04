const { Schema, model } = require('mongoose');

const userXpSchema = new Schema(
  {
    guildId: { type: String, required: true },
    userId: { type: String, required: true },
    xp: { type: Number, default: 0 },
  },
  { timestamps: true }
);

userXpSchema.index({ guildId: 1, userId: 1 }, { unique: true });

module.exports = model('UserXp', userXpSchema);
