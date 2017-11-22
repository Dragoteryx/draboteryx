/* jshint node:true, evil:true, asi:true, esversion:6*/
"use strict";

const discord = require("discord.js")
const tools = require("./tools.js");

exports.Command = function(name, desc, type, show) {
	this.name = name;
	this.desc = desc;
	this.type = type; // CommandType
	this.show = show;
	this.toString = function() {
		let str = "visible";
		if (!this.show) str = "hidden";
		return this.name + " : " + this.desc + " (type : " + this.type.name +", " + str + ")";
	}
}

exports.CommandType = function(name, title) {
	this.name = name;
	this.title = title;
	this.embed = null;
	this.equals = function(other) {
		return this.name == other.name;
	}
}

exports.Dice = function(size) {
	if (Number(size) != size || size < 2) throw new Error("impossibleDiceSize");
	this.size = size;
	this.previous = [];
	// lance le dé et stocke sa valeur
	this.roll = function() {
		this.previous.push(tools.randomValue(size-1)+1);
		return this.previous[this.previous.length-1];
	}
	// calcul le lancer moyen
	this.avg = function() {
		if (this.previous.length == 0) return 0;
		let total = 0;
		for (let i = 0; i < this.previous.length; i++)
			total += this.previous[i];
		return total/this.previous.length;
	}
	// toString
	this.toString = function() {
		return this.size + " => " + this.previous + " (average = " + this.avg() + ")";
	}
}

exports.DicePlayer = function() {
	this.dices = new Map(); // Dice
	this.roll = function(size) {
		if (!this.dices.has(size)) this.dices.set(new exports.Dice(size));
		return this.dices.get(size).roll();
	}
}
