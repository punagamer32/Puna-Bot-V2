const INVITE_URL =
  'https://discord.com/oauth2/authorize?client_id=1549871166922039439&permissions=8&integration_type=0&scope=bot';

module.exports = {
  name: 'invite',
  description: 'Get the invite link for Puna Bot',

  async execute(message) {
    await message.reply(
      `Click [here](${INVITE_URL}) to invite Puna Bot to your server!`
    );
  },
};
