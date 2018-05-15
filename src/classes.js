"use strict";

const discord = require("discord.js");
const config = require("../config.js");
const funcs = require("./funcs.js");
const tools = require("./tools.js");
const EventEmitter = require("events");

const weakmapPrivates = new WeakMap();
function prv(object) {
	if (!weakmapPrivates.has(object))
		weakmapPrivates.set(object, {});
	return weakmapPrivates.get(object);
}

class Command {
	constructor(usage, desc, type, show) {
		this.usage = usage;
		this.desc = desc;
		this.type = type;
		this.show = show;
	}
}

class Timer extends EventEmitter {
	constructor() {
		super();
		this.reset();
		this.launch();
	}
	get timestamp() {
		return prv(this).timestamp;
	}
	get parsed() {
		return tools.parseTimestamp(this);
	}
	reset() {
		prv(this).timestamp = 0;
		return this;
	}
	launch() {
		prv(this).interval = setInterval(() => {
			prv(this).timestamp += 1000;
			this.emit("second");
		}, 1000);
		return this;
	}
	stop() {
		clearInterval(prv(this).interval);
		return this;
	}
	clone() {
		return new Timer(this.timestamp);
	}
}

class ReactionAwaits {
	constructor(reaction, user) {
		this.reaction = reaction;
		this.user = user;
	}
	compare(emoji) {
		return emoji.toString() == this.reaction.emoji.toString();
	}
}

module.exports = {
	Command: Command,
	Timer: Timer,
	ReactionAwaits: ReactionAwaits
}
