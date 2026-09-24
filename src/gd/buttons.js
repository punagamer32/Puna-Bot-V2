const { fetchProfile } = require('./api');

function buildBreakdown(title, classic, platformer, tiers) {
  const lines = [`**${title}**`, '', '**Classic**'];
  for (const tier of tiers) {
    lines.push(`${capitalize(tier)}: **${classic?.[tier] ?? 0}**`);
  }
  lines.push('');
  lines.push('**Platformer**');
  for (const tier of tiers) {
    lines.push(`${capitalize(tier)}: **${platformer?.[tier] ?? 0}**`);
  }
  return lines.join('\n');
}

function capitalize(s) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

async function handleGdButton(interaction) {
  const parts = interaction.customId.split(':');
  if (parts[0] !== 'gd') return false;

  const kind = parts[1];                       // 'levels' | 'demons'
  const username = parts.slice(2).join(':');   // rejoin in case username has colons

  await interaction.deferReply({ ephemeral: true });

  try {
    const data = await fetchProfile(username);

    if (!data || !data.username) {
      return interaction.editReply({
        content: `❌ Could not find a profile for **${username}**.`,
      });
    }

    let content;
    if (kind === 'levels') {
      content = buildBreakdown(
        `${data.username} — Levels Completed`,
        data.classicLevelsCompleted,
        data.platformerLevelsCompleted,
        ['auto', 'easy', 'normal', 'hard', 'harder', 'insane']
      );
    } else if (kind === 'demons') {
      content = buildBreakdown(
        `${data.username} — Demons Completed`,
        data.classicDemonsCompleted,
        data.platformerDemonsCompleted,
        ['easy', 'medium', 'hard', 'insane', 'extreme']
      );
    } else {
      return interaction.editReply({ content: '❌ Unknown button.' });
    }

    return interaction.editReply({ content });
  } catch (err) {
    console.error('[gd] button fetch error:', err);
    return interaction.editReply({
      content: `❌ Failed to fetch data: ${err.message}`,
    });
  }
}

module.exports = { handleGdButton };
