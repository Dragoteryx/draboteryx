const Cleverbot = require("cleverbot.io");
const clever = new Cleverbot(process.env.CLEVER_USER, process.env.CLEVER_KEY);
module.exports = msg => {
  return new Promise(async (resolve, reject) => {
    if (msg.author.cleverResponding) return null;
    msg.author.cleverResponding = true;
    clever.setNick(msg.channel.id);
    try {
      clever.create((err, session) => {
        if (err) {
          msg.author.cleverResponding = false;
          reject();
        } else {
          try {
            clever.ask(msg.content, (err, res) => {
              msg.author.cleverResponding = false;
              if (err) reject();
              else resolve(res);
            });
          } catch(err) {
            reject(err);
          }
        }
      })
    } catch(err) {
      reject(err);
    }
  });
}
