const {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  PermissionFlagsBits,
} = require('discord.js');
const RequestConfig = require('../models/requestConfig');
const { fetchLevel } = require('../gd/api');

const EMBED_COLOR = 0x2b6cb0;

// ──────────────────────────── UI builders ────────────────────────────

function formatLevelBlock(level) {
  const lines = [];
  lines.push(`**${level.name}** by **${level.author ?? 'Unknown'}**`);
  lines.push(`Level ID: **${level.levelId}**`);
  lines.push(`Difficulty: **${level.difficulty ?? 'Unknown'}, ${level.stars ?? 0} ⭐**`);
  lines.push(`Downloads: **${level.downloads ?? 0}** • Likes: **${level.likes ?? 0}**`);
  if (level.songName) {
    const author = level.songAuthor ? ` by ${level.songAuthor}` : '';
    lines.push(`Song: **${level.songName}**${author}`);
  }
  return lines.join('\n');
}

function buildPanelEmbed(config) {
  const header = config.submissionsOpen
    ? 'Click **Submit** to request a level!'
    : '🚫 Submissions are currently **closed**.';

  const body = config.currentLevel
    ? `\n\n${formatLevelBlock(config.currentLevel)}`
    : '\n\n*No level is currently being reviewed. Submit one to get started!*';

  const footer = config.queue.length
    ? `${config.queue.length} level${config.queue.length === 1 ? '' : 's'} in queue`
    : '';

  const embed = new EmbedBuilder()
    .setTitle('Level Request')
    .setColor(EMBED_COLOR)
    .setDescription(header + body);

  if (footer) embed.setFooter({ text: footer });
  return embed;
}

function buildPanelButtons(config) {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(`request:submit-btn:${config.guildId}`)
      .setLabel('Submit')
      .setEmoji('⬆️')
      .setStyle(ButtonStyle.Primary)
      .setDisabled(!config.submissionsOpen),
    new ButtonBuilder()
      .setCustomId(`request:next:${config.guildId}`)
      .setLabel('Next Level')
      .setEmoji('▶️')
      .setStyle(ButtonStyle.Success)
  );
}

// ──────────────────────────── Panel management ────────────────────────────

async function refreshPanel(client, guildId) {
  const config = await RequestConfig.findOne({ guildId });
  if (!config) return;

  const channel = await client.channels.fetch(config.channelId).catch(() => null);
  if (!channel) return;

  const message = await channel.messages.fetch(config.messageId).catch(() => null);
  if (!message) return;

  await message
    .edit({
      embeds: [buildPanelEmbed(config)],
      components: [buildPanelButtons(config)],
    })
    .catch(() => {});
}

async function setupPanel(client, guildId, channelId) {
  const existing = await RequestConfig.findOne({ guildId });

  // If moving to a new channel, delete the old panel message
  if (existing && existing.channelId !== channelId) {
    const oldChannel = await client.channels.fetch(existing.channelId).catch(() => null);
    if (oldChannel) {
      const oldMsg = await oldChannel.messages.fetch(existing.messageId).catch(() => null);
      if (oldMsg) await oldMsg.delete().catch(() => {});
    }
    existing.channelId = channelId;
    existing.messageId = '';
    await existing.save();
  }

  const channel = await client.channels.fetch(channelId).catch(() => null);
  if (!channel) throw new Error('Channel not accessible');

  const config =
    existing ??
    (await RequestConfig.create({
      guildId,
      channelId,
      messageId: 'pending',
      currentLevel: null,
      queue: [],
      submissionsOpen: true,
    }));

  const message = await channel.send({
    embeds: [buildPanelEmbed(config)],
    components: [buildPanelButtons(config)],
  });

  config.channelId = channelId;
  config.messageId = message.id;
  await config.save();

  return config;
}

// ──────────────────────────── Permission helper ────────────────────────────

function canManage(interaction) {
  const perms = interaction.memberPermissions;
  if (!perms) return false;
  return (
    perms.has(PermissionFlagsBits.ManageGuild) ||
    perms.has(PermissionFlagsBits.Administrator)
  );
}

// ──────────────────────────── Button handlers ────────────────────────────

async function handleSubmitButton(interaction) {
  const [, , guildId] = interaction.customId.split(':');
  if (guildId !== interaction.guildId) return;

  const config = await RequestConfig.findOne({ guildId });
  if (!config || config.messageId !== interaction.message.id) {
    return interaction.reply({ content: '❌ This panel is no longer active.', ephemeral: true });
  }
  if (!config.submissionsOpen) {
    return interaction.reply({ content: '🚫 Submissions are currently closed.', ephemeral: true });
  }

  const modal = new ModalBuilder()
    .setCustomId(`request:submit-modal:${guildId}`)
    .setTitle('Level Request');

  const input = new TextInputBuilder()
    .setCustomId('levelId')
    .setLabel('Level ID')
    .setStyle(TextInputStyle.Short)
    .setRequired(true)
    .setMaxLength(20);

  modal.addComponents(new ActionRowBuilder().addComponents(input));
  await interaction.showModal(modal);
}

async function handleNextButton(interaction) {
  const [, , guildId] = interaction.customId.split(':');
  if (guildId !== interaction.guildId) return;

  if (!canManage(interaction)) {
    return interaction.reply({
      content: '❌ You need **Manage Server** or **Administrator** permissions.',
      ephemeral: true,
    });
  }

  const config = await RequestConfig.findOne({ guildId });
  if (!config || config.messageId !== interaction.message.id) {
    return interaction.reply({ content: '❌ This panel is no longer active.', ephemeral: true });
  }

  await interaction.deferReply({ ephemeral: true });

  // Pop the next valid level from the queue
  let next = null;
  while (config.queue.length) {
    const entry = config.queue.shift();
    try {
      const data = await fetchLevel(entry.levelId);
      if (data && data.name) {
        next = {
          levelId: entry.levelId,
          name: data.name,
          author: data.author,
          description: data.description,
          difficulty: data.difficulty,
          stars: data.stars,
          downloads: data.downloads,
          likes: data.likes,
          songName: data.songName,
          songAuthor: data.songAuthor,
          songID: data.songID,
        };
        break;
      }
    } catch (err) {
      console.warn(`[request] Skipping invalid queued level ${entry.levelId}:`, err.message);
    }
  }

  config.currentLevel = next;
  await config.save();
  await refreshPanel(interaction.client, guildId);

  await interaction.editReply({
    content: next
      ? `✅ Now showing **${next.name}** (ID ${next.levelId}).`
      : '✅ Queue is empty — no level is now displayed.',
  });
}

async function handleSubmitModal(interaction) {
  const [, , guildId] = interaction.customId.split(':');
  if (guildId !== interaction.guildId) return;

  await interaction.deferReply({ ephemeral: true });

  const rawId = interaction.fields.getTextInputValue('levelId').trim();
  if (!/^\d+$/.test(rawId)) {
    return interaction.editReply({ content: '❌ Level ID must be a number.' });
  }

  const config = await RequestConfig.findOne({ guildId });
  if (!config) {
    return interaction.editReply({ content: '❌ No active request panel found.' });
  }
  if (!config.submissionsOpen) {
    return interaction.editReply({ content: '🚫 Submissions are currently closed.' });
  }

  // Reject duplicates (current or queued)
  if (config.currentLevel?.levelId === rawId) {
    return interaction.editReply({ content: '❌ That level is already being displayed.' });
  }
  if (config.queue.some((q) => q.levelId === rawId)) {
    return interaction.editReply({ content: '❌ That level is already in the queue.' });
  }

  let data;
  try {
    data = await fetchLevel(rawId);
  } catch (err) {
    return interaction.editReply({ content: `❌ Failed to fetch level: ${err.message}` });
  }
  if (!data || !data.name) {
    return interaction.editReply({ content: `❌ No level found with ID **${rawId}**.` });
  }

  const levelInfo = {
    levelId: rawId,
    name: data.name,
    author: data.author,
    description: data.description,
    difficulty: data.difficulty,
    stars: data.stars,
    downloads: data.downloads,
    likes: data.likes,
    songName: data.songName,
    songAuthor: data.songAuthor,
    songID: data.songID,
  };

  // If nothing is being displayed, this becomes the current level
  if (!config.currentLevel) {
    config.currentLevel = levelInfo;
    await config.save();
    await refreshPanel(interaction.client, guildId);
    return interaction.editReply({
      content: `✅ **${data.name}** is now being displayed on the request panel!`,
    });
  }

  // Otherwise it joins the queue
  config.queue.push({ levelId: rawId, submittedBy: interaction.user.id, submittedAt: new Date() });
  await config.save();
  await refreshPanel(interaction.client, guildId);

  return interaction.editReply({
    content: `✅ **${data.name}** was added to the queue! Position: **${config.queue.length}**.`,
  });
}

// ──────────────────────────── Command handlers ────────────────────────────

async function openSubmissions(client, guildId) {
  const config = await RequestConfig.findOne({ guildId });
  if (!config) return false;
  config.submissionsOpen = true;
  await config.save();
  await refreshPanel(client, guildId);
  return true;
}

async function closeSubmissions(client, guildId) {
  const config = await RequestConfig.findOne({ guildId });
  if (!config) return false;
  config.submissionsOpen = false;
  await config.save();
  await refreshPanel(client, guildId);
  return true;
}

module.exports = {
  setupPanel,
  refreshPanel,
  handleSubmitButton,
  handleNextButton,
  handleSubmitModal,
  openSubmissions,
  closeSubmissions,
  canManage,
};
