const PROFILE_BASE = 'https://gdbrowser.com/api/profile/';
const LEVEL_BASE = 'https://gdbrowser.com/api/level/';

async function fetchJSON(url) {
  const res = await fetch(url, {
    headers: {
      Accept: 'application/json',
      'User-Agent': 'PunaBot/1.0 (+https://github.com/punagamer32/Puna-Bot-V2)',
    },
  });

  const text = await res.text();

  if (!res.ok) {
    throw new Error(`GD API responded with ${res.status}`);
  }

  try {
    return JSON.parse(text);
  } catch {
    // gdbrowser returns plain text like "-1" for unknown users, or HTML on some errors
    throw new Error('GD API did not return valid JSON');
  }
}

async function fetchProfile(username) {
  return fetchJSON(PROFILE_BASE + encodeURIComponent(username));
}

async function fetchLevel(levelId) {
  return fetchJSON(LEVEL_BASE + encodeURIComponent(levelId));
}

module.exports = { fetchProfile, fetchLevel };
