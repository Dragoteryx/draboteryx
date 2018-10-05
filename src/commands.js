const discord = require("discord.js");
const privates = new WeakMap();
function prv(object) {
	if (!privates.has(object))
		privates.set(object, {});
	return privates.get(object);
}

class CommandsHandler extends Map {
  set(name, callback, options = {}) {
    options = Object.assign(Command.defaultOptions, options);
    let command = new Command(name, callback, options, this);
    return super.set(name, command);
  }
  rename(oldName, newName) {
    let command = this.get(oldName);
    if (!command) return false;
    this.delete(oldName);
		prv(command).name = newName;
    super.set(newName, command);
    return true;
  }
  async check(msg) {
    if (!msg.content.startsWith(msg.prefix))
      return {command: null, result: {valid: false, reasons: ["no prefix"], returned: null}};
    let name = msg.content.split(" ").shift().replace(msg.prefix, "");
		if (!this.has(name))
      return {command: null, result: {valid: false, reasons: ["unknown command"], returned: null}};
		let command = this.get(name);
    let result = await command.check(msg);
    return {command: command, result: result};
  }
	*[Symbol.iterator]() {
		let commands = Array.from(this.values());
		for (let command of commands)
			yield command;
	}
}

class Command {
  constructor(name, callback = msg => console.dir(msg, {colors: true}), options = {}, handler) {
    prv(this).name = name;
		prv(this).handler = handler;
    this.callback = callback;
    this.options = options;
  }
  get name() {
    return prv(this).name;
  }
  set name(newName) {
    prv(this).handler.rename(prv(this).name, newName);
  }
  async check(msg) {
    let reasons = [];
		let returned = null;
    let options = this.options;
    let args = msg.content.split(" ").slice(1);
		let nbArgs = args.length;
    if (options.owner && !msg.author.owner)
      reasons.push("owner only command");
    if (msg.guild && options.admin && !msg.member.admin)
      reasons.push("admin only command");
    if (msg.guild && options.mod && !msg.member.mod)
      reasons.push("mod only command");
    if (msg.guild && options.dj && !msg.member.dj)
      reasons.push("dj only command");
    if (options.guildonly && !msg.guild)
      reasons.push("guild only command");
    if (msg.guild && options.guilds.length != 0 && !options.guilds.includes(msg.guild.id))
      reasons.push("ignored guild");
    if (options.channels.length != 0 && !options.channels.includes(msg.channel.id))
      reasons.push("ignored channel");
    if (options.users.length != 0 && !options.users.includes(msg.author.id))
      reasons.push("ignored user");
    if (msg.guild && options.nsfw && !msg.channel.nsfw)
      reasons.push("nsfw");
    if (!options.bot && msg.author.bot)
      reasons.push("bot");
    if (nbArgs < options.minargs)
      reasons.push("min arguments: " + this.options.minargs);
    if (nbArgs > options.maxargs)
      reasons.push("max arguments: " + this.options.maxargs);
    if (options.uses == 0)
      reasons.push("uses");
    if (!(await options.function(msg)))
      reasons.push("boolean function");
    let valid = reasons.length == 0;
    if (valid) {
      options.uses -= options.uses > 0 ? 1 : 0;
      returned = await this.callback(msg, args);
    }
    return {valid: valid, reasons: reasons, returned: returned};
  }
  static get defaultOptions() {
    return {
      owner: false,
			admin: false,
			mod: false,
			dj: false,
			guildonly: false,
			guilds: [],
			channels: [],
			users: [],
			permissions: [],
			nsfw: false,
			bots: false,
			minargs: 0,
			maxargs: Infinity,
			uses: -1,
			function: () => true
		};
  }
}

module.exports = CommandsHandler;
