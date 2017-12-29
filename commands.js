/* jshint node:true, evil:true, asi:true, esversion:6*/
"use strict";

// IMPORTS
exports.CommandsHandler = function() {
	this.prefixes = [];
	this.owners = [];
	var off = [];
	var commands = new Map();
	this.setCommand = (name, callback, options2) => {
		if (name === undefined)
			throw new Error("missing parameter: name");
		if (callback === undefined)
			throw new Error("missing parameter: callback function");
		let options = options2 !== undefined ? options2 : {};
		if (options.allowDMs === undefined)
			options.allowDMs = true;
		if (options.ownerOnly === undefined)
			options.ownerOnly = false;
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
		if (options.arguments === undefined)
			options.arguments = "both";
		if (options.uses === undefined)
			options.uses = -1;
		if (options.props === undefined)
			options.props = {};
		if (options.function === undefined)
			options.function = () => {return {valid: true}};
		let command = new Command(name, callback, Object.seal({
			allowDMs: options.allowDMs,
			ownerOnly: options.ownerOnly,
			guilds: options.guilds,
			channels: options.channels,
			users: options.users,
			permissions: options.permissions,
			nsfw: options.nsfw,
			arguments: options.arguments,
			uses: options.uses,
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
	this.isToggled = name => {
		if (!this.hasCommand(name))
			throw new Error("unknownCommand");
		return commands.get(name).active;
	}
	this.check = (msg, options) => {
		if (options === undefined)
			options = {};
		if (options.decount === undefined)
			options.decount = false;
		if (options.debug === undefined)
			options.debug = false;
		if (options.debug)
			console.log("message content: '" + msg.content + "'");
		return new Promise((resolve, reject) => {
			try {
				let prefixed = false;
				let usedPrefix = "";
				for (let prefix of this.prefixes) {
					if (options.debug)
						console.log("testing prefix: " + prefix)
					if (msg.content.startsWith(prefix) && !prefixed) {
						prefixed = true;
						usedPrefix = prefix;
						if (options.debug)
							console.log("used prefix: " + prefix)
					}
				}
				if (!prefixed) {
					if (options.debug)
						console.log("no prefix");
					resolve({command: null, result: {valid: false, reasons: ["missing prefix"]}});
					return;
				}
				let name = msg.content.replace(usedPrefix, "").split(" ")[0];
				if (options.debug)
					console.log("searching command name: '" + name + "'");
				if (!this.hasCommand(name)) {
					if (options.debug)
						console.log("command doesn't exist");
					resolve({command: null, result: {valid: false, reasons: ["wrong/not command"]}});
					return;
				}
				if (options.debug)
					console.log("command exists");
				if (!this.isToggled(name)) {
					if (options.debug)
						console.log("command is disabled");
					resolve({command: null, result: {valid: false, reasons: ["command disabled"]}});
					return;
				}
				if (options.debug)
					console.log("checking command '" + name + "'");
				let command = this.getCommand(name);
				resolve(Object.seal({command: command, result: command.check(msg, options.dec)}));
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
	this.changeCommandName = (oldName, newName) => {
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

function Command(name, callback, options, handler) {
	this._name = name;
	this.callback = callback;
	this.options = options;
	this.check = (msg, dec) => {
		let check = {valid: true};
		let prefixed = false;
		let usedPrefix = "";
		for (let prefix of handler.prefixes) {
			if (msg.content.startsWith(prefix) && !prefixed) {
				prefixed = true;
				usedPrefix = prefix;
			}
		}
		if (!prefixed) {
			check.valid = false;
			if (check.reasons === undefined)
				check.reasons = [];
			check.reasons.push("missing prefix");
		}
		let name = msg.content.replace(usedPrefix, "").split(" ")[0];
		if (this._name != name) {
			check.valid = false;
			if (check.reasons === undefined)
				check.reasons = [];
			check.reasons.push("wrong name");
		}
		if (msg.channel.type != "text" && !this.options.allowDMs) {
			check.valid = false;
			if (check.reasons === undefined)
				check.reasons = [];
			check.reasons.push("DMs not allowed");
		}
		if (!handler.owners.includes(msg.author.id) && this.options.ownerOnly) {
			check.valid = false;
			if (check.reasons === undefined)
				check.reasons = [];
			check.reasons.push("ownerOnly");
		}
		if (this.options.guilds.length != 0) {
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
		if (this.options.permissions.length != 0) {
			if (!msg.member.hasPermission(this.options.permissions, false, true, true)) {
				check.valid = false;
				if (check.reasons === undefined)
					check.reasons = [];
				check.reasons.push("permissions");
			}
		}
		if (!msg.channel.nsfw && this.options.nsfw) {
			check.valid = false;
			if (check.reasons === undefined)
				check.reasons = [];
			check.reasons.push("nsfw");
		}
		if (msg.content.split(" ").length > 1 && this.options.arguments == "none") {
			check.valid = false;
			if (check.reasons === undefined)
				check.reasons = [];
			check.reasons.push("arguments set to none");
		}
		if (msg.content.split(" ").length == 1 && this.options.arguments == "required") {
			check.valid = false;
			if (check.reasons === undefined)
				check.reasons = [];
			check.reasons.push("arguments required");
		}
		if (this.options.uses == 0) {
			check.valid = false;
			if (check.reasons === undefined)
				check.reasons = [];
			check.reasons.push("uses");
		}
		let funcRes = this.options.function(msg);
		if (!funcRes.valid) {
			check.valid = false;
			if (check.reasons === undefined)
				check.reasons = [];
			check.reasons.push("function: " + funcRes.reason);
		}
		if (this.options.uses > 0 && dec && check.valid)
			this.options.uses--;
		return Object.freeze(check);
	}
}
