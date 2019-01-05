const snekfetch = require("snekfetch");
const url = "https://cleverbot.io/1.0/";

class CleverbotError extends Error {
  constructor(cleverbot, ...args) {
    super(args);
    this.name = "CleverbotError";
    this.cleverbot = cleverbot;
  }
}

class Cleverbot {
  constructor(user, key, nick) {
    this.user = user;
    this.key = key;
    this.nick = nick;
  }
  async create(nick) {
    this.nick = nick || this.nick;
    let res = await snekfetch.post(url + "create").send({user: this.user, key: this.key, nick: this.nick});
    let data = JSON.parse(res.text);
    if (!["success", "Error: reference name already exists"].includes(data.status))
      throw new CleverbotError(this, data.status);
  }
  async ask(str, nick) {
    this.nick = nick || this.nick;
    let res = await snekfetch.post(url + "ask").send({user: this.user, key: this.key, nick: this.nick, text: str});
    let data = JSON.parse(res.text);
    if (data.status == "success")
      return data.response;
    else throw new CleverbotError(this, data.status);
  }
  async fetch(str, nick) {
    await this.create(nick);
    return this.ask(str, nick);
  }
}

module.exports = Cleverbot;
