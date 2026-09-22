const { Schema, model } = require('mongoose');

const rpsGameSchema = new Schema(
  {
    guildId: { type: String, required: true },
    channelId: { type: String, required: true },
    challengerId: { type: String, required: true },
    opponentId: { type: String, required: true },
    status: {
      type: String,
      enum: ['pending', 'choice'],
      default: 'pending',
    },
    challengerChoice: { type: String, default: null },
    opponentChoice: { type: String, default: null },
    currentMessageId: { type: String, default: null },
    expiresAt: { type: Date, required: true },
  },
  { timestamps: true }
);

// Fast lookup of expired games on startup
rpsGameSchema.index({ status: 1, expiresAt: 1 });

module.exports = model('RpsGame', rpsGameSchema);
