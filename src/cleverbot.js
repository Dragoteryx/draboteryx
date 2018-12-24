const Cleverbot = require("cleverbot.io");
const clever = new Cleverbot(process.env.CLEVER_USER, process.env.CLEVER_KEY);
module.exports = msg => {
  return new Promise(async (resolve, reject) => {
    if (msg.author.cleverResponding) return null;
    msg.author.cleverResponding = true;
    clever.setNick(msg.channel.id);
    clever.create((err, session) => {
      if (err) {
        msg.author.cleverResponding = false;
        reject(err);
      } else {
        try {
          clever.ask(msg.content, (err, res) => {
            msg.author.cleverResponding = false;
            if (err) reject(err);
            else resolve(res);
          });
        } catch(err) {
          reject(err);
        }        
      }
    })
  });
}
