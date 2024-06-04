module.exports = {
  apps: [
    {
      name: 'taarufin-chatbot-wwebjs',
      script: 'bot.js',
      log: 'bot.log',
      time: true,
    },
    {
      name: 'taarufin-chatbot-api',
      script: 'api.js',
      log: 'api.log',
      time: true,
    }
  ],
};
