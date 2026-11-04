const { Schema, model } = require('mongoose');

const levelConfigSchema = new Schema(
  {
    guildId: { type: String, required: true, unique: true },
    roleRewards: [
      {
        level: { type: Number, required: true },
        roleId: { type: String, required: true },
      },
    ],
    levelUpChannelId: { type: String, default: null },
    levelUpMessage: { type: String, default: null },
  },
  { timestamps: true }
);

module.exports = model('LevelConfig', levelConfigSchema);
