const Cleverbot = require("cleverbot.io");
const clever = new Cleverbot(process.env.CLEVER_USER, process.env.CLEVER_KEY);
module.exports = msg => {
  return new Promise((resolve, reject) => {
    clever.setNick(msg.channel.id);
    clever.create((err, session) => {
      if (err) reject(err);
      clever.ask(msg.content, (err, res) => {
        if (err) reject(err);
        resolve(res);
      });
    })
  });
}
