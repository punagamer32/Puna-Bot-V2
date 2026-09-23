const { Schema, model } = require('mongoose');

const triviaScoreSchema = new Schema(
  {
    guildId: { type: String, required: true },
    userId: { type: String, required: true },
    score: { type: Number, default: 0 },
  },
  { timestamps: true }
);

triviaScoreSchema.index({ guildId: 1, userId: 1 }, { unique: true });

module.exports = model('TriviaScore', triviaScoreSchema);
