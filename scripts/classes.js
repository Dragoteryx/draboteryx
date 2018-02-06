"use strict";

const discord = require("discord.js");
const config = require("../config.js");
const funcs = require("./funcs.js");
const tools = require("./tools.js");

const weakmapPrivates = new WeakMap();
function prv(object) {
	if (!weakmapPrivates.has(object))
		weakmapPrivates.set(object, {});
	return weakmapPrivates.get(object);
}

class Command {
	constructor(name, desc, type, show) {
		this.name = name;
		this.desc = desc;
		this.type = type;
		this.show = show;
	}
}

module.exports = {
	Command: Command
}
