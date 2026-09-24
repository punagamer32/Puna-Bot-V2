const INTERVAL_MS = 30 * 60 * 1000;        // 30 minutes between questions
const QUESTION_TIMEOUT_MS = 5 * 60 * 1000; // 5 minutes to answer

const timers = new Map();         // guildId -> interval timer
const questionTimers = new Map(); // guildId -> per-question timeout
const crypto = require('crypto');
const {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
} = require('discord.js');
const TriviaConfig = require('../models/TriviaConfig');
const TriviaScore = require('../models/TriviaScore');
const questions = require('../trivia.json');

const INTERVAL_MS = 30 * 60 * 1000; // 30 minutes
const timers = new Map(); // guildId -> Timeout

// ---------- Helpers ----------

function pickQuestion() {
  return questions[Math.floor(Math.random() * questions.length)];
}

function normalize(str) {
  return String(str)
    .trim()
    .toLowerCase()
    .replace(/[.!?,;:'"]+$/g, '')
    .replace(/\s+/g, ' ');
}

function answerRow(guildId, questionId, disabled = false) {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(`trivia:answer:${guildId}:${questionId}`)
      .setLabel('Answer Trivia')
      .setStyle(ButtonStyle.Primary)
      .setDisabled(disabled)
  );
}

async function fetchChannel(client, channelId) {
  return client.channels.fetch(channelId).catch(() => null);
}

function clearQuestionTimer(guildId) {
  const t = questionTimers.get(guildId);
  if (t) {
    clearTimeout(t);
    questionTimers.delete(guildId);
  }
}

async function onQuestionTimeout(client, guildId, questionId) {
  clearQuestionTimer(guildId);

  const config = await TriviaConfig.findOne({ guildId });
  if (!config) return;
  if (config.activeQuestion?.questionId !== questionId) return; // replaced or already answered
  if (config.activeQuestion?.answeredAt) return;               // already answered

  await disableActiveButton(client, config);

  const channel = await fetchChannel(client, config.channelId);
  if (channel) {
    await channel
      .send(
        `⌛ Nobody answered the trivia question in time! ` +
          `The answer was **${config.activeQuestion.answer}**.`
      )
      .catch(() => {});
  }

  config.activeQuestion = {
    questionId: null,
    question: null,
    answer: null,
    messageId: null,
    startedAt: null,
    answeredAt: null,
  };
  await config.save();
}

// ---------- Core: post a question ----------

async function postQuestion(client, guildId, { force = false } = {}) {
  const config = await TriviaConfig.findOne({ guildId });
  if (!config || !config.channelId) return;

  // Skip if a question is already active and unanswered (unless forced by !trivia run)
  const aq = config.activeQuestion;
  const isActive = aq?.messageId && aq?.answer && !aq?.answeredAt;
  if (isActive && !force) return;

  // Disable any previously active button before posting a new one
  if (aq?.messageId) {
    await disableActiveButton(client, config);
  }

  const channel = await fetchChannel(client, config.channelId);
  if (!channel) {
    console.warn(`[trivia] Channel ${config.channelId} not accessible (guild ${guildId})`);
    return;
  }

  const q = pickQuestion();
  const questionId = crypto.randomBytes(4).toString('hex');

  const message = await channel
    .send({
      content: `🧠 **Trivia Time!**\n\n**${q.question}**\n\nClick the button below to answer.`,
      components: [answerRow(guildId, questionId)],
    })
    .catch((err) => {
      console.error('[trivia] send failed:', err);
      return null;
    });

  if (!message) return;

  config.activeQuestion = {
    questionId,
    question: q.question,
    answer: q.answer,
    messageId: message.id,
    startedAt: new Date(),
    answeredAt: null,
  };
  await config.save();
}

async function disableActiveButton(client, config) {
  const aq = config.activeQuestion;
  if (!aq?.messageId || !aq?.questionId) return;
  const channel = await fetchChannel(client, config.channelId);
  if (!channel) return;
  const msg = await channel.messages.fetch(aq.messageId).catch(() => null);
  if (!msg) return;
  await msg
    .edit({ components: [answerRow(config.guildId, aq.questionId, true)] })
    .catch(() => {});
}

// ---------- Button handler: open modal ----------

async function handleTriviaButton(interaction) {
  const parts = interaction.customId.split(':');
  // trivia : answer : guildId : questionId
  if (parts[0] !== 'trivia' || parts[1] !== 'answer') return false;

  const [, , guildId, questionId] = parts;
  const config = await TriviaConfig.findOne({ guildId });

  if (
    !config?.activeQuestion?.questionId ||
    config.activeQuestion.questionId !== questionId ||
    config.activeQuestion.answeredAt
  ) {
    await interaction
      .reply({ content: '❌ This trivia question is no longer active.', ephemeral: true })
      .catch(() => {});
    return true;
  }

  const modal = new ModalBuilder()
    .setCustomId(`trivia:submit:${guildId}:${questionId}`)
    .setTitle('Trivia Answer');

  const input = new TextInputBuilder()
    .setCustomId('answer')
    .setLabel('Your answer')
    .setStyle(TextInputStyle.Short)
    .setRequired(true)
    .setMaxLength(150);

  modal.addComponents(new ActionRowBuilder().addComponents(input));
  await interaction.showModal(modal);
  return true;
}

// ---------- Modal handler: evaluate answer ----------

async function handleTriviaModal(interaction) {
  const parts = interaction.customId.split(':');
  // trivia : submit : guildId : questionId
  if (parts[0] !== 'trivia' || parts[1] !== 'submit') return false;

  const [, , guildId, questionId] = parts;
  const config = await TriviaConfig.findOne({ guildId });

  if (
    !config?.activeQuestion?.questionId ||
    config.activeQuestion.questionId !== questionId ||
    config.activeQuestion.answeredAt
  ) {
    await interaction
      .reply({ content: '❌ This trivia question is no longer active.', ephemeral: true })
      .catch(() => {});
    return true;
  }

  const submitted = interaction.fields.getTextInputValue('answer');
  const correct = normalize(submitted) === normalize(config.activeQuestion.answer);

  if (!correct) {
    await interaction
      .reply({
        content: `❌ Sorry, **"${submitted}"** is not correct. Try again!`,
        ephemeral: true,
      })
      .catch(() => {});
    return true;
  }

  // Atomically claim the win — prevents two users getting credit if both submit at once
  const claimed = await TriviaConfig.findOneAndUpdate(
    {
      guildId,
      'activeQuestion.questionId': questionId,
      'activeQuestion.answeredAt': null,
    },
    { $set: { 'activeQuestion.answeredAt': new Date() } },
    { new: true }
  );

  if (!claimed) {
    await interaction
      .reply({ content: '❌ Someone already answered this question!', ephemeral: true })
      .catch(() => {});
    return true;
  }

  // Award point
  await TriviaScore.findOneAndUpdate(
    { guildId, userId: interaction.user.id },
    { $inc: { score: 1 } },
    { upsert: true }
  );

  // Public announcement
  await interaction
    .reply({
      content:
        `🎉 <@${interaction.user.id}> answered correctly! ` +
        `The answer was **${claimed.activeQuestion.answer}**.`,
    })
    .catch(() => {});

  // Disable the button on the original question message
  const channel = await fetchChannel(interaction.client, claimed.channelId);
  if (channel && claimed.activeQuestion.messageId) {
    const msg = await channel.messages.fetch(claimed.activeQuestion.messageId).catch(() => null);
    if (msg) {
      await msg
        .edit({ components: [answerRow(guildId, questionId, true)] })
        .catch(() => {});
    }
  }

  return true;
}

// ---------- Scheduling ----------

function clearGuildTimer(guildId) {
  const t = timers.get(guildId);
  if (t) {
    clearTimeout(t);
    timers.delete(guildId);
  }
}

async function scheduleGuild(client, guildId) {
  clearGuildTimer(guildId);
  const timer = setTimeout(async () => {
    try {
      await postQuestion(client, guildId);
    } catch (err) {
      console.error(`[trivia] tick error for guild ${guildId}:`, err);
    }
    scheduleGuild(client, guildId);
  }, INTERVAL_MS);
  timers.set(guildId, timer);
}

async function startTriviaScheduler(client) {
  const configs = await TriviaConfig.find({ channelId: { $ne: null } });

  for (const config of configs) {
    // Post immediately on boot per spec
    try {
      await postQuestion(client, config.guildId, { force: true });
    } catch (err) {
      console.error(`[trivia] boot post failed for ${config.guildId}:`, err);
    }
    await scheduleGuild(client, config.guildId);
  }

  console.log(`🧠 Trivia scheduler started for ${configs.length} guild(s)`);
}

// ---------- Config / score commands ----------

async function setChannel(client, guildId, channelId) {
  const config = await TriviaConfig.findOneAndUpdate(
    { guildId },
    { $set: { channelId } },
    { upsert: true, new: true }
  );

  // If a question is still active in the old channel, disable its button
  if (config.activeQuestion?.messageId) {
    await disableActiveButton(client, config);
  }

  // Start (or restart) the schedule for this guild
  await scheduleGuild(client, guildId);
  return config;
}

async function getScore(guildId, userId) {
  const doc = await TriviaScore.findOne({ guildId, userId });
  return doc?.score ?? 0;
}

module.exports = {
  startTriviaScheduler,
  postQuestion,
  handleTriviaButton,
  handleTriviaModal,
  setChannel,
  getScore,
};
