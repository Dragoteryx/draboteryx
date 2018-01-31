"use strict";

const discord = require("discord.js")

const tools = require("./tools.js");

exports.Command = function(name, desc, type, show) {
	this.name = name;
	this.desc = desc;
	this.type = type;
	this.show = show;
}
