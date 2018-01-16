/* jshint node:true, evil:true, asi:true, esversion:6*/
"use strict";

const discord = require("discord.js");
const config = require("./config.js");
const types = require("./types.js");
const noise = ["0","1","2","3","4","5","6","7","8","9",
"a","b","c","d","e","f","g","h","i","j","k","l","m","n","o","p","q","r","s","t","u","v","w","x","y","z",
"A","B","C","D","E","F","G","H","I","J","K","L","M","N","O","P","Q","R","S","T","U","V","W","X","Y","Z"
];

// valeur random entre min et max
exports.random = function(min, max) {
	return Math.floor(Math.random()*max+min);
}

// donner une valeur aléatoire entre 0 et max (inclus)
exports.randomFloor = function(max) {
	return exports.random(0, max)
}

//donner une valeur aléatoire d'un tableau
exports.randTab = function(tab) {
	return tab[exports.randomFloor(tab.length-1)];
}

// écrire dans un fichier
exports.write = function(file) {
	fs.writeFile("./" + file + ".json", JSON.stringify(eval(file)), (err) => {if(err) console.error(err)});
}

exports.defaultEmbed = () => new discord.RichEmbed().setColor("#7289DA");

exports.stringToMember = function(str, guild) {
	let member;
	if (str.startsWith("<@") && str.endsWith(">"))
		member = guild.members.get(str.replace("<@","").replace(">","").replace("!",""));
	else
		member = guild.members.find("displayName",str);
	if (member !== null || member === undefined)
		return member;
	throw new Error("notAMember");
}

exports.stringToChannel = function(str, guild) {
	let channel = guild.channels.find("name", str);
	if (channel !== null || channel === undefined)
		return channel;
	throw new Error("notAChannel");
}

exports.stringToRole = function(str, guild) {
	let role;
	if (str.startsWith("<@") && str.endsWith(">"))
		role = guild.roles.get(str.replace("<@","").replace(">","").replace("&",""));
	else
		role = guild.roles.find("name",str);
	if (role !== null || role === undefined)
		return role;
	throw new Error("notARole");
}

exports.getDate = () => new Date().getDate() + "/" + (new Date().getMonth()+1);
