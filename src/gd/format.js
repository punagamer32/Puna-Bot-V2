function formatProfile(data) {
  const lines = [];

  lines.push(`Stats for **${data.username}**:`);
  lines.push('');
  lines.push(`Stars: **${data.stars ?? 0}**`);
  lines.push(`Moons: **${data.moons ?? 0}**`);
  lines.push(`Secret Coins: **${data.coins ?? 0}**`);
  lines.push(`User Coins: **${data.userCoins ?? 0}**`);
  lines.push(`Demons: **${data.demons ?? 0}**`);
  lines.push(`Creator Points: **${data.cp ?? 0}**`);

  // Optional: only show if non-null / non-empty
  if (data.discord) lines.push(`Discord Username: **${data.discord}**`);

  const socials = [
    ['YouTube', data.youtubeURL],
    ['Twitter', data.twitter],
    ['Twitch', data.twitch],
    ['Instagram', data.instagram],
    ['TikTok', data.tiktok],
  ].filter(([, url]) => url);

  if (socials.length) {
    lines.push('');
    for (const [label, url] of socials) {
      lines.push(`[${label}](${url})`);
    }
  }

  return lines.join('\n');
}

function formatLevel(data) {
  const lines = [];

  lines.push(`**${data.name}** by **${data.author ?? 'Unknown'}**`);
  lines.push('');

  if (data.description && data.description.trim()) {
    lines.push(`Description: **${data.description}**`);
  }

  const stars = data.stars ?? 0;
  lines.push(`Difficulty: **${data.difficulty ?? 'Unknown'}, ${stars} Star(s)**`);
  lines.push(`Downloads: **${data.downloads ?? 0}**`);
  lines.push(`Likes: **${data.likes ?? 0}**`);

  if (data.songName) {
    const author = data.songAuthor ? ` by ${data.songAuthor}` : '';
    const id = data.songID ? ` (${data.songID})` : '';
    lines.push(`Song: **${data.songName}${author}**${id}`);
  }

  return lines.join('\n');
}

module.exports = { formatProfile, formatLevel };
