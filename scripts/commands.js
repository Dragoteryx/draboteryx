"use strict";

const discord = require("discord.js");

const weakmapPrivates = new WeakMap();
function prv(object) {
	if (!weakmapPrivates.has(object))
		weakmapPrivates.set(object, {});
	return weakmapPrivates.get(object);
}

const skey = Math.random();

class CommandsHandler {
	constructor() {
		prv(this).commands = new Map();
		this.defaultPrefix;
		this.owners = [];
	}
	setCommand(name, callback, opts, key) {
		let that = prv(this);
		if (name === undefined)
			throw new Error("parameter 'name' is undefined");
		if (callback === undefined)
			throw new Error("parameter 'callback' is undefined");
		if (callback instanceof Command && callback.name == name && key == skey) {
			that.commands.set(name, callback);
			return;
		}
		if (typeof name != "string")
			throw new TypeError("'name' must be a String");
		if (!(callback instanceof Function))
			throw new TypeError("'callback' must be a Function");
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
		if (options.delay === undefined)
			options.delay = 0;
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
			delay: options.delay,
			function: options.function,
			override: options.override,
		}), this);
		that.commands.set(name, Object.seal(command));
		return this;
	}
	hasCommand(name) {
		if (name === undefined)
			throw new Error("parameter 'command' is undefined");
		if (name instanceof Command)
			name = name.name;
		if (typeof name != "string")
			throw new TypeError("'command' must be a String or a Command");
		return prv(this).commands.has(name);
	}
	getCommand(name) {
		if (name instanceof Command)
			name = name.name;
		if (!this.hasCommand(name))
			throw new Error("unknown command");
		return prv(this).commands.get(name);
	}
	deleteCommand(name) {
		if (name instanceof Command)
			name = name.name;
		if (!this.hasCommand(name))
			throw new Error("unknown command");
		prv(this).commands.delete(name);
		return this;
	}
	check(msg, options) {
		let that = prv(this);
		return new Promise((resolve, reject) => {
			if (msg === undefined)
				throw new Error("parameter 'message' is missing");
			if (!(msg instanceof discord.Message))
				throw new TypeError("'message' must be a Discord Message");
			if (options === undefined)
				options = {};
			if (options.exec === undefined)
				options.exec = true;
			if (options.prefix === undefined)
				options.prefix = this.defaultPrefix;
			let name = msg.content.split(" ").shift().replace(options.prefix, "");
			if (!this.hasCommand(name))
				resolve(Object.freeze({command: undefined, result: {valid: false, reasons: ["unknown command"]}}));
			else {
				let command = this.getCommand(name);
				command.check(msg, options).then(res => {
					resolve({command: command, result: res});
				}).catch(reject);
			}
		});
	}
	get array() {
		return Array.from(prv(this).commands.values());
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
			throw new TypeError("'newName' must be a String");
		let that = prv(this);
		that.handler.deleteCommand(that.name);
		that.name = newn;
		that.handler.setCommand(newn, this, {}, skey);
	}
	check(msg, options) {
		let that = prv(this);
		return new Promise((resolve, reject) => {
			try {
				if (msg === undefined)
					reject(Error("parameter 'message' is missing"));
				else if (!(msg instanceof discord.Message))
					reject(new TypeError("'message' must be a Message"));
				else {
					if (options === undefined)
						options = {};
					if (options.exec === undefined)
						options.exec = true;
					if (options.prefix === undefined)
						options.prefix = that.handler.defaultPrefix;
					let nbargs = msg.content.split(" ").slice(1).length;
					let check = {valid: true, nbargs: nbargs};
					if (!msg.content.startsWith(options.prefix)) {
						check.valid = false;
						if (check.reasons === undefined)
							check.reasons = [];
						check.reasons.push("no prefix");
					}
					let name = msg.content.replace(options.prefix, "").split(" ")[0];
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
					if (options.exec && check.valid) {
						let execute = this.callback(msg, check.reasons);
						if (execute instanceof Promise)
							execute.catch(reject);
					}
					resolve(Object.freeze(check));
				}
			} catch(err) {
				reject(err);
				return;
			}
		});
	}
}

// EXPORTS
module.exports = CommandsHandler;
