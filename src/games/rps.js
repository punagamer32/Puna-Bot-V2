const {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
} = require('discord.js');
const RpsGame = require('../models/RpsGame');

const ACCEPT_TIMEOUT_MS = 5 * 60 * 1000; // 5 minutes
const CHOICE_TIMEOUT_MS = 5 * 60 * 1000; // 5 minutes

const BEATS = { rock: 'scissors', paper: 'rock', scissors: 'paper' };
const EMOJI = { rock: '🪨', paper: '📄', scissors: '✂️' };

// In-memory timers for the current process lifetime.
// On startup, resumeActiveGames() rehydrates from MongoDB.
const timers = new Map();

// ---------- UI builders ----------

function acceptRow(gameId) {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(`rps:accept:${gameId}`)
      .setLabel('Accept')
      .setStyle(ButtonStyle.Success),
    new ButtonBuilder()
      .setCustomId(`rps:decline:${gameId}`)
      .setLabel('Decline')
      .setStyle(ButtonStyle.Danger)
  );
}

function choiceRow(gameId) {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(`rps:rock:${gameId}`)
      .setLabel('Rock')
      .setEmoji('🪨')
      .setStyle(ButtonStyle.Primary),
    new ButtonBuilder()
      .setCustomId(`rps:paper:${gameId}`)
      .setLabel('Paper')
      .setEmoji('📄')
      .setStyle(ButtonStyle.Primary),
    new ButtonBuilder()
      .setCustomId(`rps:scissors:${gameId}`)
      .setLabel('Scissors')
      .setEmoji('✂️')
      .setStyle(ButtonStyle.Primary)
  );
}

// ---------- Timer helpers ----------

function setTimer(gameId, ms, fn) {
  clearTimer(gameId);
  timers.set(gameId, setTimeout(fn, ms));
}

function clearTimer(gameId) {
  const t = timers.get(gameId);
  if (t) {
    clearTimeout(t);
    timers.delete(gameId);
  }
}

async function fetchChannel(client, channelId) {
  return client.channels.fetch(channelId).catch(() => null);
}

async function clearMessageComponents(client, channelId, messageId) {
  if (!messageId) return;
  const channel = await fetchChannel(client, channelId);
  if (!channel) return;
  const msg = await channel.messages.fetch(messageId).catch(() => null);
  if (!msg) return;
  await msg.edit({ components: [] }).catch(() => {});
}

// ---------- Game start ----------

async function startGame({
  client,
  guildId,
  channelId,
  challengerId,
  opponentId,
  sendMessage,
}) {
  // Prevent self-challenge
  if (challengerId === opponentId) {
    const err = new Error('SELF');
    err.code = 'SELF';
    throw err;
  }

  // Prevent duplicate active games between the same two users in the same channel
  const existing = await RpsGame.findOne({
    channelId,
    status: { $in: ['pending', 'choice'] },
    $or: [
      { challengerId, opponentId },
      { challengerId: opponentId, opponentId: challengerId },
    ],
  });
  if (existing) {
    const err = new Error('EXISTS');
    err.code = 'EXISTS';
    throw err;
  }

  const expiresAt = new Date(Date.now() + ACCEPT_TIMEOUT_MS);
  const game = await RpsGame.create({
    guildId,
    channelId,
    challengerId,
    opponentId,
    status: 'pending',
    expiresAt,
  });

  const content =
    `🎮 <@${opponentId}>, <@${challengerId}> has challenged you to **Rock, Paper, Scissors**!\n` +
    `You have **5 minutes** to accept or decline.`;

  const message = await sendMessage({
    content,
    components: [acceptRow(game._id.toString())],
  });

  game.currentMessageId = message.id;
  await game.save();

  setTimer(game._id.toString(), ACCEPT_TIMEOUT_MS, () =>
    onAcceptTimeout(client, game._id.toString())
  );

  return game;
}

// ---------- Timeout handlers ----------

async function onAcceptTimeout(client, gameId) {
  clearTimer(gameId);
  const game = await RpsGame.findById(gameId);
  if (!game || game.status !== 'pending') return;

  await RpsGame.findByIdAndDelete(gameId);
  await clearMessageComponents(client, game.channelId, game.currentMessageId);

  const channel = await fetchChannel(client, game.channelId);
  if (!channel) return;
  await channel
    .send(
      `⏰ The challenge from <@${game.challengerId}> to <@${game.opponentId}> expired — ` +
        `no response within 5 minutes. Game cancelled.`
    )
    .catch(() => {});
}

async function onChoiceTimeout(client, gameId) {
  clearTimer(gameId);
  const game = await RpsGame.findById(gameId);
  if (!game || game.status !== 'choice') return;

  await RpsGame.findByIdAndDelete(gameId);
  await clearMessageComponents(client, game.channelId, game.currentMessageId);

  const channel = await fetchChannel(client, game.channelId);
  if (!channel) return;
  await channel
    .send(
      `⏰ The Rock, Paper, Scissors game between <@${game.challengerId}> and ` +
        `<@${game.opponentId}> expired — not everyone made a choice within 5 minutes. ` +
        `Game cancelled.`
    )
    .catch(() => {});
}

// ---------- Game finish ----------

async function finishGame(client, game) {
  const { challengerId, opponentId, challengerChoice, opponentChoice } = game;

  let resultLine;
  if (challengerChoice === opponentChoice) {
    resultLine = `🤝 It's a **tie**! Both chose ${EMOJI[challengerChoice]} **${challengerChoice}**.`;
  } else if (BEATS[challengerChoice] === opponentChoice) {
    resultLine =
      `🏆 <@${challengerId}> wins! ` +
      `${EMOJI[challengerChoice]} **${challengerChoice}** beats ${EMOJI[opponentChoice]} **${opponentChoice}**.`;
  } else {
    resultLine =
      `🏆 <@${opponentId}> wins! ` +
      `${EMOJI[opponentChoice]} **${opponentChoice}** beats ${EMOJI[challengerChoice]} **${challengerChoice}**.`;
  }

  await RpsGame.findByIdAndDelete(game._id);
  await clearMessageComponents(client, game.channelId, game.currentMessageId);

  const channel = await fetchChannel(client, game.channelId);
  if (!channel) return;

  await channel
    .send(
      [
        `🎮 **Rock, Paper, Scissors — Result**`,
        `<@${challengerId}> chose ${EMOJI[challengerChoice]} **${challengerChoice}**`,
        `<@${opponentId}> chose ${EMOJI[opponentChoice]} **${opponentChoice}**`,
        ``,
        resultLine,
      ].join('\n')
    )
    .catch(() => {});
}

// ---------- Button handler ----------

async function handleRpsButton(interaction) {
  const [prefix, action, gameId] = interaction.customId.split(':');
  if (prefix !== 'rps') return false;

  const game = await RpsGame.findById(gameId);
  if (!game) {
    await interaction
      .reply({ content: '❌ This game no longer exists.', ephemeral: true })
      .catch(() => {});
    return true;
  }

  const userId = interaction.user.id;
  const isChallenger = userId === game.challengerId;
  const isOpponent = userId === game.opponentId;

  if (!isChallenger && !isOpponent) {
    await interaction
      .reply({ content: '❌ You are not part of this game.', ephemeral: true })
      .catch(() => {});
    return true;
  }

  // ----- Accept -----
  if (action === 'accept') {
    if (game.status !== 'pending') {
      await interaction
        .reply({ content: '❌ This challenge is no longer active.', ephemeral: true })
        .catch(() => {});
      return true;
    }
    if (!isOpponent) {
      await interaction
        .reply({ content: '❌ Only the challenged player can accept.', ephemeral: true })
        .catch(() => {});
      return true;
    }

    clearTimer(gameId);
    game.status = 'choice';
    game.expiresAt = new Date(Date.now() + CHOICE_TIMEOUT_MS);
    await game.save();

    // Disable the accept/decline buttons on the original message
    await interaction
      .update({
        content: `✅ <@${game.opponentId}> accepted <@${game.challengerId}>'s challenge!`,
        components: [],
      })
      .catch(() => {});

    // Send a new message with choice buttons
    const choiceMsg = await interaction.channel.send({
      content:
        `🎮 <@${game.challengerId}> vs <@${game.opponentId}> — **Make your choice!**\n` +
        `You have **5 minutes**. Choices stay hidden until both players have picked.`,
      components: [choiceRow(gameId)],
    });

    game.currentMessageId = choiceMsg.id;
    await game.save();

    setTimer(gameId, CHOICE_TIMEOUT_MS, () =>
      onChoiceTimeout(interaction.client, gameId)
    );
    return true;
  }

  // ----- Decline -----
  if (action === 'decline') {
    if (game.status !== 'pending') {
      await interaction
        .reply({ content: '❌ This challenge is no longer active.', ephemeral: true })
        .catch(() => {});
      return true;
    }
    if (!isOpponent) {
      await interaction
        .reply({ content: '❌ Only the challenged player can decline.', ephemeral: true })
        .catch(() => {});
      return true;
    }

    clearTimer(gameId);
    await RpsGame.findByIdAndDelete(gameId);

    await interaction
      .update({
        content: `🚫 <@${game.opponentId}> declined <@${game.challengerId}>'s challenge. Game cancelled.`,
        components: [],
      })
      .catch(() => {});
    return true;
  }

  // ----- Rock / Paper / Scissors -----
  if (['rock', 'paper', 'scissors'].includes(action)) {
    if (game.status !== 'choice') {
      await interaction
        .reply({ content: '❌ This game is not accepting choices.', ephemeral: true })
        .catch(() => {});
      return true;
    }

    const choiceField = isChallenger ? 'challengerChoice' : 'opponentChoice';

    // Atomic update — prevents race conditions if both players click at once
    const updated = await RpsGame.findOneAndUpdate(
      { _id: gameId, status: 'choice', [choiceField]: null },
      { $set: { [choiceField]: action } },
      { new: true }
    );

    if (!updated) {
      await interaction
        .reply({ content: '❌ You already made your choice.', ephemeral: true })
        .catch(() => {});
      return true;
    }

    await interaction
      .reply({ content: `✅ You chose ${EMOJI[action]} **${action}**.`, ephemeral: true })
      .catch(() => {});

    // Update the status message to show who has chosen
    const channel = interaction.channel;
    const msg = await channel.messages.fetch(updated.currentMessageId).catch(() => null);
    if (msg) {
      const cStatus = updated.challengerChoice ? '✅' : '⏳';
      const oStatus = updated.opponentChoice ? '✅' : '⏳';
      await msg
        .edit({
          content:
            `🎮 <@${updated.challengerId}> vs <@${updated.opponentId}> — **Make your choice!**\n\n` +
            `<@${updated.challengerId}>: ${cStatus}\n` +
            `<@${updated.opponentId}>: ${oStatus}`,
        })
        .catch(() => {});
    }

    // Both players have chosen — finish the game
    if (updated.challengerChoice && updated.opponentChoice) {
      clearTimer(gameId);
      await finishGame(interaction.client, updated);
    }
    return true;
  }

  return false;
}

// ---------- Startup resume ----------

async function resumeActiveGames(client) {
  const now = Date.now();
  const games = await RpsGame.find({ status: { $in: ['pending', 'choice'] } });

  for (const game of games) {
    const id = game._id.toString();
    const remaining = new Date(game.expiresAt).getTime() - now;

    if (remaining <= 0) {
      // Game already expired while the bot was offline — clean it up
      if (game.status === 'pending') await onAcceptTimeout(client, id);
      else await onChoiceTimeout(client, id);
    } else {
      const fn =
        game.status === 'pending'
          ? () => onAcceptTimeout(client, id)
          : () => onChoiceTimeout(client, id);
      setTimer(id, remaining, fn);
    }
  }

  if (games.length) {
    console.log(`🔁 Resumed ${games.length} active RPS game(s)`);
  }
}

module.exports = {
  startGame,
  handleRpsButton,
  resumeActiveGames,
};
