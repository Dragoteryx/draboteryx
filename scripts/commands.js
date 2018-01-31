"use strict";

// IMPORTS
function CommandsHandler(prefix) {
	this.prefix = prefix;
	this.owners = [];
	var off = [];
	var commands = new Map();
	this.setCommand = (name, callback, opts) => {
		if (name === undefined)
			throw new Error("MissingParameter: command");
		if (callback === undefined)
			throw new Error("MissingParameter: callback function");
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
		commands.set(name, Object.seal({command: Object.seal(command), active: true}));
		return this;
	}
	this.hasCommand = name => {
		if (name === undefined)
			throw new Error("MissingParameter: command");
		if (name instanceof Command)
			name = name.getName();
		return commands.has(name);
	}
	this.getCommand = name => {
		if (name === undefined)
			throw new Error("MissingParameter: command");
		if (name instanceof Command)
			name = name.getName();
		if (!this.hasCommand(name))
			throw new Error("unknownCommand");
		return commands.get(name).command;
	}
	this.removeCommand = name => {
		if (name === undefined)
			throw new Error("MissingParameter: command");
		if (name instanceof Command)
			name = name.getName();
		if (!this.hasCommand(name))
			throw new Error("unknownCommand");
		commands.delete(name);
		return this;
	}
	this.toggleCommand = name => {
		if (name === undefined)
			throw new Error("MissingParameter: command");
		if (name instanceof Command)
			name = name.getName();
		if (!this.hasCommand(name))
			throw new Error("unknownCommand");
		commands.get(name).active = !commands.get(name).active;
		return this;
	}
	this.isActive = name => {
		if (name === undefined)
			throw new Error("MissingParameter: command");
		if (name instanceof Command)
			name = name.getName();
		if (!this.hasCommand(name))
			throw new Error("unknownCommand");
		return commands.get(name).active;
	}
	this.check = (msg, exec) => {
		if (msg === undefined)
			throw new Error("MissingParameter: message");
		if (exec === undefined)
			exec = true;
		return new Promise((resolve, reject) => {
			try {
				if (!msg.content.startsWith(this.prefix)) {
					resolve({command: null, result: {valid: false, reasons: ["no prefix"]}});
					return;
				}
				let name = msg.content.replace(this.prefix, "").split(" ")[0];
				if (!this.hasCommand(name))
					resolve({command: null, result: {valid: false, reasons: ["unknown command"]}});
				else if (!this.isActive(name))
					resolve({command: null, result: {valid: false, reasons: ["command disabled"]}});
				else {
					let command = this.getCommand(name);
					command.check(msg, exec).then(result => {
						resolve(Object.seal({command: command, result: result}));
					}).catch(reject);
				}
			} catch(err) {
				reject(err);
			}
		});
	}
	this.fetchProps = () => {
		let names = Array.from(commands.keys());
		let props = new Map();
		for (let name of names)
			if (this.getCommand(name).options.props)
				props.set(name, Object.freeze(this.getCommand(name).options.props));
		return props;
	}
	this.setCommandName = (oldName, newName) => {
		if (oldName === undefined)
			throw new Error("MissingParameter: old command name");
		if (oldName instanceof Command)
			oldName = oldName.getName();
		if (newName === undefined)
			throw new Error("MissingParameter: new command name");
		if (!this.hasCommand(oldName))
			throw new Error("unknownCommand");
		let command = this.getCommand(oldName);
		let active = commands.get(oldName).active;
		this.removeCommand(oldName);
		this.setCommand(newName, command.callback, command.options);
		commands.get(newName).active = active;
		return this.getCommand(newName);
	}
	this.isOwner = user => {
		return this.owners.includes(user.id);
	}

	//-----------
	var current = 0;
	this[Symbol.iterator] = () => {
		return {
			next: () => {
				let array = Array.from(commands.values())
				if (current < array.length) {
					current++;
					return {value: array[current-1].command, done: false};
				} else {
					current = 0;
					return {done: true};
				}
			}
		}
	}
	this.toObject = () => {
		let object = {};
		for (let command of this)
			object[name] = command.command;
		return object;
	}
	this.toArray = () => {
		let array = [];
		for (let command of this)
			array.push(command);
		return array;
	}
	this.toMap = () => {
		let map = new Map();
		for (let command of this)
			map.set(command.getName(), command);
		return map;
	}
}

function Command(comName, callback, options, handler) {
	this.callback = callback;
	this.options = options;
	this.getName = () => comName;
	this.setName = newName => handler.setCommandName(comName, newName);
	this.check = (msg, exec) => {
		return new Promise((resolve, reject) => {
			try {
				if (exec === undefined)
					exec = false;
				let nbargs = msg.content.split(" ").slice(1).length;
				let check = {valid: true, nbargs: nbargs};
				if (!msg.content.startsWith(handler.prefix)) {
					check.valid = false;
					if (check.reasons === undefined)
						check.reasons = [];
					check.reasons.push("no prefix");
				}
				let name = msg.content.replace(handler.prefix, "").split(" ")[0];
				if (comName != name) {
					check.valid = false;
					if (check.reasons === undefined)
						check.reasons = [];
					check.reasons.push("wrong name");
				}
				if (msg.channel.type != "text" && !this.options.dms) {
					check.valid = false;
					if (check.reasons === undefined)
						check.reasons = [];
					check.reasons.push("DMs not allowed");
				}
				if (!handler.isOwner(msg.author) && this.options.owner) {
					check.valid = false;
					if (check.reasons === undefined)
						check.reasons = [];
					check.reasons.push("owner only command");
				}
				if (msg.channel.type == "text" && this.options.guilds.length != 0 && !(handler.isOwner(msg.author) && this.options.override)) {
					if (!this.options.guilds.includes(msg.guild.id)) {
						check.valid = false;
						if (check.reasons === undefined)
							check.reasons = [];
						check.reasons.push("ignored guild");
					}
				}
				if (this.options.channels.length != 0 && !(handler.isOwner(msg.author) && this.options.override)) {
					if (!this.options.channels.includes(msg.channel.id)) {
						check.valid = false;
						if (check.reasons === undefined)
							check.reasons = [];
						check.reasons.push("ignored channel");
					}
				}
				if (this.options.users.length != 0 && !(handler.isOwner(msg.author) && this.options.override)) {
					if (!this.options.users.includes(msg.author.id)) {
						check.valid = false;
						if (check.reasons === undefined)
							check.reasons = [];
						check.reasons.push("ignored user");
					}
				}
				if (msg.channel.type == "text" && this.options.permissions.length != 0 && !(handler.isOwner(msg.author) && this.options.override)) {
					if (!msg.member.hasPermission(this.options.permissions, false, true, true)) {
						check.valid = false;
						if (check.reasons === undefined)
							check.reasons = [];
						check.reasons.push("missing permissions");
					}
				}
				if (msg.channel.type == "text" && this.options.rolenames.length != 0 && !(handler.isOwner(msg.author) && this.options.override)) {
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
