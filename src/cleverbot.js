const tools = require("./tools.js");

const Cleverbot = require("cleverbot.io");
const clever = new Cleverbot(process.env.CLEVER_USER, process.env.CLEVER_KEY);
module.exports = msg => {
  return new Promise(async (resolve, reject) => {
    if (msg.author.cleverResponding) return null;
    msg.author.cleverResponding = true;
    await tools.sleep(1);
    msg.channel.startTyping(1);
    clever.setNick(msg.channel.id);
    try {
      clever.create((err, session) => {
        if (err) {
          msg.author.cleverResponding = false;
          msg.channel.stopTyping();
          reject("cleverbot error");
        } else {
          try {
            clever.ask(msg.content, (err, res) => {
              msg.author.cleverResponding = false;
              msg.channel.stopTyping();
              if (err) reject("cleverbot error");
              else resolve(res);
            });
          } catch(err) {
            msg.channel.stopTyping();
            reject(err);
          }
        }
      })
    } catch(err) {
      msg.channel.stopTyping();
      reject(err);
    }
  });
}
