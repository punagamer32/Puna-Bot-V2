// src/webhook.js
const express = require('express');
const Topgg = require('@top-gg/sdk');
const Vote = require('./models/Vote');

const app = express();

// The secret must match the "Webhook Authorization" in your top.gg bot settings.
const webhook = new Topgg.Webhook(process.env.TOPGG_WEBHOOK_AUTH);

app.post('/dblwebhook', webhook.listener(async (vote) => {
  const userId = vote.user; // Discord ID of the voter
  console.log(`[top.gg] Received vote from ${userId}`);

  await Vote.findOneAndUpdate(
    { userId },
    { $inc: { voteCount: 1 }, $set: { lastVoteAt: new Date() } },
    { upsert: true }
  );

  // Throwing an error tells top.gg to retry the webhook later.
  // return Promise.reject(new Error('Retry'));
}));

function startWebhookServer() {
  const PORT = process.env.WEBHOOK_PORT || 3000;
  app.listen(PORT, () => {
    console.log(`[top.gg] Webhook server listening on port ${PORT}`);
  });
}

module.exports = { startWebhookServer };
