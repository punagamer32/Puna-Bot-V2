const { Schema, model } = require('mongoose');

const triviaConfigSchema = new Schema(
  {
    guildId: { type: String, required: true, unique: true },
    channelId: { type: String, default: null },
    activeQuestion: {
      questionId: { type: String, default: null },
      question: { type: String, default: null },
      answer: { type: String, default: null },
      messageId: { type: String, default: null },
      startedAt: { type: Date, default: null },
      answeredAt: { type: Date, default: null },
    },
  },
  { timestamps: true }
);

module.exports = model('TriviaConfig', triviaConfigSchema);
