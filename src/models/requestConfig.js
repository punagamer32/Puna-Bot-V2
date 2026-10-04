const { Schema, model } = require('mongoose');

const levelInfoSchema = new Schema(
  {
    levelId: String,
    name: String,
    author: String,
    description: String,
    difficulty: String,
    stars: Number,
    downloads: Number,
    likes: Number,
    songName: String,
    songAuthor: String,
    songID: String,
  },
  { _id: false }
);

const requestConfigSchema = new Schema(
  {
    guildId: { type: String, required: true, unique: true },
    channelId: { type: String, required: true },
    messageId: { type: String, required: true },
    currentLevel: { type: levelInfoSchema, default: null },
    queue: [
      {
        levelId: { type: String, required: true },
        submittedBy: { type: String, required: true },
        submittedAt: { type: Date, default: Date.now },
      },
    ],
    submissionsOpen: { type: Boolean, default: true },
  },
  { timestamps: true }
);

module.exports = model('RequestConfig', requestConfigSchema);
