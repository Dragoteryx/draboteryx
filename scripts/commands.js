"use strict";

const discord = require("discord.js");

const weakmapPrivates = new WeakMap();
function prv(object) {
	if (!weakmapPrivates.has(object))
		weakmapPrivates.set(object, {});
	return weakmapPrivates.get(object);
}

class CommandsHandler extends Map {
	constructor(prefix) {
		super();
		this.prefix = prefix;
		this.owners = [];
	}
	set(name, callback, opts) {
		if (name === undefined)
			throw new Error("parameter 'name' is missing");
		if (callback === undefined)
			throw new Error("parameter 'callback' is missing");
		if (callback instanceof Command && callback.name == name) {
			super.set(name, callback);
			return;
		}
		if (typeof name != "string")
			throw new TypeError("parameter 'name' must be a String");
		if (!(callback instanceof Function))
			throw new TypeError("parameter 'callback' must be a Function");
		let options = opts !== undefined ? opts : {};
		if (options.override === undefined)
			options.override = false;
		if (options.dms === undefined)
			options.dms = true;
		if (options.owner === undefined)
			options.owner = false;
		if (options.guilds === undefined)
			options.guilds = [];
		if (options.channels === undefined)
			options.channels = [];
		if (options.users === undefined)
			options.users = [];
		if (options.permissions === undefined)
			options.permissions = [];
		if (options.rolenames === undefined)
			options.rolenames = [];
		if (options.nsfw === undefined)
			options.nsfw = false;
		if (options.bots === undefined)
			options.bots = false;
		if (options.minargs === undefined)
			options.minargs = -1;
		if (options.maxargs === undefined)
			options.maxargs = -1;
		if (options.uses === undefined)
			options.uses = -1;
		if (options.props === undefined)
			options.props = {};
		if (options.function === undefined)
			options.function = () => true;
		let command = new Command(name, callback, Object.seal({
			dms: options.dms,
			owner: options.owner,
			guilds: options.guilds,
			channels: options.channels,
			users: options.users,
			permissions: options.permissions,
			rolenames: options.rolenames,
			nsfw: options.nsfw,
			bots: options.bots,
			minargs: Math.round(Number(options.minargs)),
			maxargs: Math.round(Number(options.maxargs)),
			uses: Math.round(Number(options.uses)),
			props: options.props,
			function: options.function,
			override: options.override,
		}), this);
		super.set(name, Object.seal(command));
		return this;
	}
	has(name) {
		if (name === undefined)
			throw new Error("parameter 'command' is missing");
		if (name instanceof Command)
			name = name.name;
		if (typeof name != "string")
			throw new TypeError("parameter 'command' must be a String or a Command");
		return super.has(name);
	}
	get(name) {
		if (name === undefined)
			throw new Error("parameter 'command' is missing");
		if (name instanceof Command)
			name = name.name;
		if (typeof name != "string")
			throw new TypeError("parameter 'command' must be a String or a Command");
		if (!this.has(name))
			throw new Error("unknownCommand");
		return super.get(name);
	}
	delete(name) {
		if (name === undefined)
			throw new Error("parameter 'command' is missing");
		if (name instanceof Command)
			name = name.name;
		if (typeof name != "string")
			throw new TypeError("parameter 'command' must be a String or a Command");
		if (!this.has(name))
			throw new Error("unknownCommand");
		super.delete(name);
		return this;
	}
	check(msg, exec) {
		return new Promise((resolve, reject) => {
			try {
				if (msg === undefined)
					throw new Error("parameter 'message' is missing");
				if (!(msg instanceof discord.Message))
					throw new TypeError("parameter 'message' must be a Message");
				if (exec === undefined)
					exec = true;
				if (typeof exec != "boolean")
					throw new TypeError("parameter 'execute' must be a Boolean");
				if (!msg.content.startsWith(this.prefix)) {
					resolve({command: null, result: {valid: false, reasons: ["no prefix"]}});
					return;
				}
				let name = msg.content.replace(this.prefix, "").split(" ")[0];
				if (!this.has(name))
					resolve({command: null, result: {valid: false, reasons: ["unknown command"]}});
				else {
					let command = this.get(name);
					command.check(msg, exec).then(result => {
						resolve(Object.seal({command: command, result: result}));
					}).catch(reject);
				}
			} catch(err) {
				reject(err);
			}
		});
	}
}

class Command {
	constructor(name, callback, options, handler) {
		this.callback = callback;
		this.options = options;
		this.active = true;
		prv(this).name = name;
		prv(this).handler = handler;
	}
	get name() {
		return prv(this).name;
	}
	set name(newn) {
		if (newn === undefined)
			throw new Error("parameter 'newName' is missing");
		if (typeof newn != "string")
			throw new TypeError("parameter 'newName' must be a String");
		let that = prv(this);
		let handler = that.handler;
		let handlerThat = prv(handler);
		handler.delete(that.name);
		that.name = newn;
		handler.set(newn, this);
	}
	check(msg, exec) {
		let that = prv(this);
		return new Promise((resolve, reject) => {
			try {
				if (msg === undefined)
					throw new Error("parameter 'message' is missing");
				if (!(msg instanceof discord.Message))
					throw new TypeError("parameter 'message' must be a Message");
				if (exec === undefined)
					exec = true;
				if (typeof exec != "boolean")
					throw new TypeError("parameter 'execute' must be a Boolean");
				if (exec === undefined)
					exec = false;
				let nbargs = msg.content.split(" ").slice(1).length;
				let check = {valid: true, nbargs: nbargs};
				if (!msg.content.startsWith(that.handler.prefix)) {
					check.valid = false;
					if (check.reasons === undefined)
						check.reasons = [];
					check.reasons.push("no prefix");
				}
				let name = msg.content.replace(that.handler.prefix, "").split(" ")[0];
				if (that.name != name) {
					check.valid = false;
					if (check.reasons === undefined)
						check.reasons = [];
					check.reasons.push("wrong name");
				}
				if (!this.active) {
					check.valid = false;
					if (check.reasons === undefined)
						check.reasons = [];
					check.reasons.push("command disabled");
				}
				if (msg.channel.type != "text" && !this.options.dms) {
					check.valid = false;
					if (check.reasons === undefined)
						check.reasons = [];
					check.reasons.push("DMs not allowed");
				}
				if (!that.handler.owners.includes(msg.author.id) && this.options.owner) {
					check.valid = false;
					if (check.reasons === undefined)
						check.reasons = [];
					check.reasons.push("owner only command");
				}
				if (msg.channel.type == "text" && this.options.guilds.length != 0 && !(that.handler.owners.includes(msg.author.id) && this.options.override)) {
					if (!this.options.guilds.includes(msg.guild.id)) {
						check.valid = false;
						if (check.reasons === undefined)
							check.reasons = [];
						check.reasons.push("ignored guild");
					}
				}
				if (this.options.channels.length != 0 && !(that.handler.owners.includes(msg.author.id) && this.options.override)) {
					if (!this.options.channels.includes(msg.channel.id)) {
						check.valid = false;
						if (check.reasons === undefined)
							check.reasons = [];
						check.reasons.push("ignored channel");
					}
				}
				if (this.options.users.length != 0 && !(that.handler.owners.includes(msg.author.id) && this.options.override)) {
					if (!this.options.users.includes(msg.author.id)) {
						check.valid = false;
						if (check.reasons === undefined)
							check.reasons = [];
						check.reasons.push("ignored user");
					}
				}
				if (msg.channel.type == "text" && this.options.permissions.length != 0 && !(that.handler.owners.includes(msg.author.id) && this.options.override)) {
					if (!msg.member.hasPermission(this.options.permissions, false, true, true)) {
						check.valid = false;
						if (check.reasons === undefined)
							check.reasons = [];
						check.reasons.push("missing permissions");
					}
				}
				if (msg.channel.type == "text" && this.options.rolenames.length != 0 && !(that.handler.owners.includes(msg.author.id) && this.options.override)) {
					if (!player.rolenames.some(role => this.options.rolenames.includes(role.name.toLowerCase()))) {
						check.valid = false;
						if (check.reasons === undefined)
							check.reasons = [];
						check.reasons.push("missing role");
					}
				}
				if (msg.channel.type == "text" && !msg.channel.nsfw && this.options.nsfw) {
					check.valid = false;
					if (check.reasons === undefined)
						check.reasons = [];
					check.reasons.push("nsfw");
				}
				if (msg.author.bot && !this.options.bots) {
					check.valid = false;
					if (check.reasons === undefined)
						check.reasons = [];
					check.reasons.push("bot user");
				}
				if (this.options.minargs > 0 && nbargs < this.options.minargs) {
					check.valid = false;
					if (check.reasons === undefined)
						check.reasons = [];
					check.reasons.push("min arguments: " + this.options.minargs);
				}
				if (this.options.maxargs >= 0 && nbargs > this.options.maxargs) {
					check.valid = false;
					if (check.reasons === undefined)
						check.reasons = [];
					check.reasons.push("max arguments: " + this.options.maxargs);
				}
				if (this.options.uses == 0) {
					check.valid = false;
					if (check.reasons === undefined)
						check.reasons = [];
					check.reasons.push("uses");
				}
				if (!this.options.function(msg)) {
					check.valid = false;
					if (check.reasons === undefined)
						check.reasons = [];
					check.reasons.push("boolean function");
				}
				if (exec && check.valid) {
					if (this.options.uses > 0)
						this.options.uses--;
					let called = this.callback(msg);
					if (called instanceof Promise)
						called.catch(reject);
				}
				resolve(Object.freeze(check));
			} catch(err) {
				reject(err);
				return;
			}
		});
	}
}

// EXPORTS
module.exports = CommandsHandler;
