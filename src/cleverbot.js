const Cleverbot = require("cleverbot.io");
const clever = new Cleverbot(process.env.CLEVER_USER, process.env.CLEVER_KEY);
module.exports = msg => {
  return new Promise(async (resolve, reject) => {
    if (msg.author.cleverResponsing) return null;
    msg.author.cleverResponsing = true;
    clever.setNick(msg.channel.id);
    clever.create((err, session) => {
      if (err) {
        msg.author.cleverResponsing = false;
        reject(err);
      } else {
        clever.ask(msg.content, (err, res) => {
          msg.author.cleverResponsing = false;
          if (err) reject(err);
          else resolve(res);
        });
      }
    })
  });
}
