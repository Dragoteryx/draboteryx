/* jshint node:true, evil:true, asi:true, esversion:6*/
"use strict";

const discord = require("discord.js")
const tools = require("./tools.js");

exports.Command = function(name, desc, type, show) {
	this.name = name;
	this.desc = desc;
	this.type = type;
	this.show = show;
	this.toString = function() {
		let str = "visible";
		if (!this.show) str = "hidden";
		return this.name + " : " + this.desc + " (type : " + this.type.name +", " + str + ")";
	}
}
