// src/models/Vote.js
const mongoose = require('mongoose');

const voteSchema = new mongoose.Schema({
  userId: { type: String, required: true, unique: true },
  voteCount: { type: Number, default: 0 },
  lastVoteAt: { type: Date, default: null },
});

module.exports = mongoose.model('Vote', voteSchema);
