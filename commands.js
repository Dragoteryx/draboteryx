"use strict";

// IMPORTS
module.exports = function(prefix) {
	this.prefix = prefix;
	this.owners = [];
	var off = [];
	var commands = new Map();
	this.setCommand = (name, callback, opts) => {
		if (name === undefined)
			throw new Error("missing parameter: command name");
		if (callback === undefined)
			throw new Error("missing parameter: callback function");
		let options = opts !== undefined ? opts : {};
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
		if (options.nsfw === undefined)
			options.nsfw = false;
			if (options.minargs === undefined)
				options.minargs = -1;
		if (options.maxargs === undefined)
			options.maxargs = -1;
		if (options.uses === undefined)
			options.uses = -1;
		if (options.props === undefined)
			options.props = {};
		if (options.function === undefined)
			options.function = () => {return {valid: true}};
		let command = new Command(name, callback, Object.seal({
			dms: options.dms,
			owner: options.owner,
			guilds: options.guilds,
			channels: options.channels,
			users: options.users,
			permissions: options.permissions,
			nsfw: options.nsfw,
			minargs: Math.floor(options.minargs),
			maxargs: Math.floor(options.maxargs),
			uses: Math.floor(options.uses),
			props: options.props,
			function: options.function
		}), this);
		commands.set(name, Object.seal({command: Object.seal(command), active: true}));
		return this;
	}
	this.hasCommand = name => {
		return commands.has(name);
	}
	this.getCommand = name => {
		if (!this.hasCommand(name))
			throw new Error("unknownCommand");
		return commands.get(name).command;
	}
	this.removeCommand = name => {
		if (!this.hasCommand(name))
			throw new Error("unknownCommand");
		commands.delete(name);
		return this;
	}
	this.toggleCommand = name => {
		if (!this.hasCommand(name))
			throw new Error("unknownCommand");
		commands.get(name).active = !commands.get(name).active;
		return this;
	}
	this.isActive = name => {
		if (!this.hasCommand(name))
			throw new Error("unknownCommand");
		return commands.get(name).active;
	}
	this.check = (msg, exec) => {
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
					let result = command.check(msg, exec);
					resolve(Object.seal({command: command, result: result}));
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
		if (!this.hasCommand(oldName))
			throw new Error("unknownCommand");
		let command = this.getCommand(oldName);
		let active = commands.get(oldName).active;
		this.removeCommand(oldName);
		command._name = newName;
		commands.set(newName, Object.seal({command: Object.seal(command), active: active}));
		return command;
	}
}

function Command(comName, callback, options, handler) {
	this.callback = callback;
	this.options = options;
	this.getName = () => comName;
	this.setName = newName => {
		handler.setCommandName(comName, newName);
		return this;
	}
	this.check = (msg, exec) => {
		if (exec === undefined)
			exec = true;
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
		if (!handler.owners.includes(msg.author.id) && this.options.owner) {
			check.valid = false;
			if (check.reasons === undefined)
				check.reasons = [];
			check.reasons.push("owner only command");
		}
		if (msg.channel.type == "text" && this.options.guilds.length != 0) {
			if (!this.options.guilds.includes(msg.guild.id)) {
				check.valid = false;
				if (check.reasons === undefined)
					check.reasons = [];
				check.reasons.push("ignored guild");
			}
		}
		if (this.options.channels.length != 0) {
			if (!this.options.channels.includes(msg.channel.id)) {
				check.valid = false;
				if (check.reasons === undefined)
					check.reasons = [];
				check.reasons.push("ignored channel");
			}
		}
		if (this.options.users.length != 0) {
			if (!this.options.users.includes(msg.author.id)) {
				check.valid = false;
				if (check.reasons === undefined)
					check.reasons = [];
				check.reasons.push("ignored user");
			}
		}
		if (msg.channel.type == "text" && this.options.permissions.length != 0) {
			if (!msg.member.hasPermissions(this.options.permissions, false, true, true)) {
				check.valid = false;
				if (check.reasons === undefined)
					check.reasons = [];
				check.reasons.push("missing permissions");
			}
		}
		if (msg.channel.type == "text" && !msg.channel.nsfw && this.options.nsfw) {
			check.valid = false;
			if (check.reasons === undefined)
				check.reasons = [];
			check.reasons.push("nsfw");
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
			this.callback(msg);
		}
		return Object.freeze(check);
	}
}
