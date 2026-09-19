const jokes = require('../../jokes.json');

module.exports = {
  name: 'joke',
  description: 'Tells a random joke.',
  async execute(message) {
    if (!jokes.length) {
      return message.reply('😔 No jokes available right now.');
    }

    const joke = jokes[Math.floor(Math.random() * jokes.length)];
    await message.reply(joke);
  },
};
