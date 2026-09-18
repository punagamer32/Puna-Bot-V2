const fs = require('fs');
const path = require('path');

async function loadEvents(client) {
  const eventsDir = path.join(__dirname, '../events');
  const files = fs.readdirSync(eventsDir).filter(f => f.endsWith('.js'));

  for (const file of files) {
    const event = require(path.join(eventsDir, file));
    if (event.once) {
      client.once(event.name, (...args) => event.execute(...args, client));
    } else {
      client.on(event.name, (...args) => event.execute(...args, client));
    }
  }
  console.log(`Loaded ${files.length} events`);
}

module.exports = { loadEvents };
