const {Client} = require("discord.js");
const privates = new WeakMap();
function prv(object) {
	if (!privates.has(object))
		privates.set(object, {});
	return privates.get(object);
}

class DrGClient extends Client {
  constructor(...args) {
    super(args);
    let that = prv(this);
    that.commands = new Map();
    that.properties = new Map();
    that.aliases = new Map();
    that.fetched = false;
    this.prefix = "";
    this.commandsInit = () => undefined;
    this.on("message", async msg => {
      try {
        if (!that.fetched) {
          that.mentions = ["<@" + this.user.id + "> ", "<@!" + this.user.id + ">"];
          that.fetched = true;
        }
        await this.commandsInit(msg);
        if (this.user.id == msg.author.id) return;
        let prefix = await this.fetchPrefix(msg);
        let test1 = await this.testCommands(msg, prefix);
        if (test1.valid) {
          let {command} = test1;
          try {
            this.emit("command", msg, command);
            prv(command).simplifiedTest = true;
            let test2 = await command.test(msg, prefix);
            if (test2.valid) {
              let now = Date.now();
              this.emit("beforeCommand", msg, command, now, null, null);
              let res = await command.run(msg, prefix);
              this.emit("afterCommand", msg, command, now, Date.now(), res);
            } else this.emit("deniedCommand", msg, command, test2.reasons);
          } catch(err) {
            this.emit("commandError", msg, err, command);
          }
        } else this.emit("notCommand", msg);
      } catch(err) {
        this.emit("commandError", msg, err, null);
      }
    });
    this.commandProperty("owner", async (msg, owneronly = false) => {
      if (!owneronly) return true;
      let owner = (await this.fetchApplication()).owner;
      return msg.author.id == owner.id;
    });
    this.commandProperty("admin", (msg, adminonly = false) => !msg.guild || !adminonly || msg.member.hasPermission("ADMINISTRATOR"));
    this.commandProperty("permissions", (msg, permissions = []) => {
      if (!msg.guild) return true;
      for (let permission of permissions)
        if (!msg.member.hasPermission(permission)) return false;
      return true;
    });
    this.commandProperty("bots", (msg, allowbots = false) => allowbots || !msg.author.bot);
    this.commandProperty("nsfw", (msg, isnsfw = false) => !isnsfw || msg.channel.nsfw);
    this.commandProperty("largeguilds", (msg, allowlargeguilds = true) => !msg.guild || allowlargeguilds || !msg.guild.large);
    this.commandProperty("guilds", (msg, allowguilds = true) => allowguilds || msg.channel.type != "text");
    this.commandProperty("dms", (msg, allowdms = true) => allowdms || msg.channel.type != "dm");
    this.commandProperty("groups", (msg, allowgroups = true) => allowgroups || msg.channel.type != "group");
    this.commandProperty("minargs", (msg, minargs = 0) => msg.content.split(/ +/g).slice(1).length >= minargs);
    this.commandProperty("maxargs", (msg, maxargs = Infinity) => msg.content.split(/ +/g).slice(1).length <= maxargs);
  }
  async fetchPrefix(msg) {
    let prefix = this.prefix;
    if (msg.prefix !== undefined) prefix = msg.prefix;
    else if (msg.channel.prefix !== undefined) prefix = msg.channel.prefix;
    else if (msg.guild && msg.guild.prefix !== undefined) prefix = msg.guild.prefix;
    if (prefix instanceof Function) prefix = prefix(msg);
    if (prefix instanceof Promise) prefix = await prefix;
    return prefix;
  }
  setupCommands(prefix, commandsInit) {
    if (prefix !== undefined) this.prefix = prefix;
    if (commandsInit !== undefined) this.commandsInit = commandsInit;
    return this;
  }
  defineCommand(names, callback, properties) {
    let name = names instanceof Array ? names.shift() : names;
    let command = new Command(name, callback, properties, this);
    if (names instanceof Array) names.forEach(alias => command.doAlias(alias));
    prv(this).commands.set(name, command);
    return command;
  }
  getCommand(name) {
    let command = prv(this).commands.get(name);
    if (command !== undefined) return command;
    else return prv(this).aliases.get(name);
  }
  commandExists(name) {
    return this.getCommand(name) !== undefined;
  }
  deleteCommand(name) {
    return prv(this).commands.delete(name);
  }
  async testCommands(msg, prefix) {
    if (prefix === undefined) prefix = await this.fetchPrefix(msg);
    let that = prv(this);
    if (msg.content.length == 0) return {valid: false, reasons: ["0 length"], command: null};
    for (let mention of that.mentions) {
      if (msg.content.startsWith(mention)) {
        msg.content = msg.content.replace(mention, prefix);
        break;
      }
    }
    if (!msg.content.startsWith(prefix)) return {valid: false, reasons: ["no prefix"], command: null};
    let name = msg.content.split(/ +/g)[0].replace(prefix, "");
    if (!this.commandExists(name)) return {valid: false, reasons: ["unknown command"], command: null};
    return {valid: true, reasons: [], command: this.getCommand(name)};
  }
  commandProperty(name, test) {
    let that = prv(this);
    if (test === undefined)
      delete that.properties.delete(name);
    else that.properties.set(name, {
      name: name,
      test: test
    });
  }
  get commandsArray() {
    return Array.from(prv(this).commands.values());
  }
  *[Symbol.iterator]() {
		for (let command of this.array)
			yield command;
	}
}

class Command {
  constructor(name, callback, properties, client) {
    let that = prv(this);
    that.name = name;
    that.simplifiedTest = false;
    this.callback = callback;
    this.properties = properties;
    this.client = client;
    Object.defineProperty(this, "client", {
      configurable: false,
      writable: false
    });
  }
  get name() {
    return prv(this).name;
  }
  set name(newName) {
    this.client.deleteCommand(this.name);
    prv(this).name = newName;
    prv(this.client).commands.set(newName, this);
  }
  doAlias(alias) {
    let clientThat = prv(this.client);
    clientThat.aliases.set(alias, this);
    return this;
  }
  undoAlias(alias) {
    let clientThat = prv(this.client);
    let command = this.client.getCommand(alias);
    if (command.name == this.name) clientThat.aliases.delete(alias);
    return this;
  }
  async test(msg, prefix) {
    if (prefix === undefined) prefix = await this.client.fetchPrefix(msg);
    let that = prv(this);
    if (!that.simplifiedTest) {
      let handlerTest = await this.client.testCommands(msg, prefix);
      if (!handlerTest.valid) return handlerTest;
      else if (handlerTest.command.name != this.name)
        return {valid: false, reasons: ["wrong command"], command: this};
    } else that.simplifiedTest = false;
    let reasons = [];
    let properties = Array.from(prv(this.client).properties.values());
    for (let property of properties) {
      let test = await property.test(msg, this.properties[property.name]);
      if (!test) reasons.push(property.name);
    }
    return {valid: reasons.length == 0, reasons: reasons, command: this};
  }
  async run(msg) {
    let args = msg.content.split(/ +/g).slice(1);
    return this.callback(msg, args, args.join(" "));
  }
}

module.exports = DrGClient;
