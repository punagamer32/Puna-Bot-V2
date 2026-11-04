const UserXp = require('../models/UserXp');
const LevelConfig = require('../models/LevelConfig');

const XP_PER_MESSAGE = 50;
const XP_PER_LEVEL = 1000;
const COOLDOWN_MS = 5000; // 5-second cooldown to prevent spam abuse

// In-memory cooldown map: `${guildId}-${userId}` -> timestamp
const cooldowns = new Map();

// ──────────────────────────── Core XP Logic ────────────────────────────

async function getUserXp(guildId, userId) {
  let doc = await UserXp.findOne({ guildId, userId });
  if (!doc) {
    doc = await UserXp.create({ guildId, userId, xp: 0 });
  }
  return doc;
}

async function modifyXp(guildId, userId, action, amount) {
  const doc = await getUserXp(guildId, userId);
  const oldXp = doc.xp;
  let newXp = oldXp;

  if (action === 'add') newXp += amount;
  else if (action === 'subtract') newXp -= amount;
  else if (action === 'set') newXp = amount;

  if (newXp < 0) newXp = 0;

  doc.xp = newXp;
  await doc.save();

  const oldLevel = Math.floor(oldXp / XP_PER_LEVEL);
  const newLevel = Math.floor(newXp / XP_PER_LEVEL);

  return { doc, oldLevel, newLevel };
}

// ──────────────────────────── Message XP Handler ────────────────────────────

async function handleMessageXp(message) {
  if (message.author.bot || !message.guild) return;

  const key = `${message.guildId}-${message.author.id}`;
  const now = Date.now();
  const lastTime = cooldowns.get(key) || 0;

  // 5-second cooldown
  if (now - lastTime < COOLDOWN_MS) return;
  cooldowns.set(key, now);

  const { oldLevel, newLevel } = await modifyXp(
    message.guildId,
    message.author.id,
    'add',
    XP_PER_MESSAGE
  );

  if (newLevel > oldLevel) {
    await handleLevelUp(message.guild, message.member, newLevel);
  }
}

// ──────────────────────────── Level Up Handling ────────────────────────────

async function handleLevelUp(guild, member, newLevel) {
  if (!member) return;

  const config = await LevelConfig.findOne({ guildId: guild.id });

  // 1. Send Level Up Message
  if (config?.levelUpChannelId && config?.levelUpMessage) {
    const channel = guild.channels.cache.get(config.levelUpChannelId);
    if (channel) {
      const msg = config.levelUpMessage
        .replace(/{userping}/g, `<@${member.id}>`)
        .replace(/{level}/g, newLevel);

      await channel.send(msg).catch(() => {});
    }
  }

  // 2. Assign Role Rewards
  if (config?.roleRewards?.length) {
    const rewardsToApply = config.roleRewards.filter((r) => r.level === newLevel);

    for (const reward of rewardsToApply) {
      const role = guild.roles.cache.get(reward.roleId);
      if (role) {
        await member.roles.add(role).catch((err) => {
          console.warn(`[leveling] Failed to add role ${role.name} to ${member.user.tag}:`, err.message);
        });
      }
    }
  }
}

module.exports = {
  getUserXp,
  modifyXp,
  handleMessageXp,
  XP_PER_LEVEL,
};
