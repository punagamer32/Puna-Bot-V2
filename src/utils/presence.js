const { ActivityType } = require('discord.js');

const GITHUB_REPO = 'punagamer32/Puna-Bot-V2';
const COMMITS_URL = `https://api.github.com/repos/${GITHUB_REPO}/commits?per_page=1`;

/**
 * Fetches the total number of commits for a repository using the Link header.
 * Falls back to 1 if the API is unreachable or returns no pagination.
 */
async function fetchCommitCount() {
  try {
    const res = await fetch(COMMITS_URL, {
      headers: {
        Accept: 'application/vnd.github+json',
        'User-Agent': 'PunaBot/1.0',
      },
    });

    if (!res.ok) {
      console.warn(`[presence] GitHub API responded with ${res.status}`);
      return null;
    }

    const linkHeader = res.headers.get('link');
    if (!linkHeader) {
      // Only one page means one commit (or the repo is brand new)
      return 1;
    }

    // Example header: <...&page=2>; rel="next", <...&page=42>; rel="last"
    const lastMatch = linkHeader.match(/<[^>]*[?&]page=(\d+)[^>]*>;\s*rel="last"/);
    if (lastMatch) {
      return parseInt(lastMatch[1], 10);
    }

    return 1;
  } catch (err) {
    console.warn('[presence] Failed to fetch commit count:', err.message);
    return null;
  }
}

/**
 * Updates the bot's rich presence.
 * If the API call fails, uses a sensible fallback.
 */
async function updatePresence(client) {
  const count = await fetchCommitCount();
  const version = count !== null ? `V2.${count}` : 'V2';

  const activity = {
    name: `${version}, made by Puna`,
    type: ActivityType.Playing,
  };

  try {
    client.user.setActivity(activity);
    console.log(`✅ Presence set to: ${activity.name}`);
  } catch (err) {
    console.error('[presence] Failed to set activity:', err);
  }
}

module.exports = { updatePresence, fetchCommitCount };
