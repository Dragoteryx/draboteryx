/* jshint node:true, evil:true, asi:true, esversion:6*/
"use strict";

const discord = require("discord.js");
const https = require("https");

const drabot = require("../drabot.js");
const config = require("../config.js");

const noise = ["0","1","2","3","4","5","6","7","8","9",
"a","b","c","d","e","f","g","h","i","j","k","l","m","n","o","p","q","r","s","t","u","v","w","x","y","z",
"A","B","C","D","E","F","G","H","I","J","K","L","M","N","O","P","Q","R","S","T","U","V","W","X","Y","Z"
];

// valeur random entre min et max
exports.random = function(min, max) {
	if (max === undefined)
		return Math.floor(Math.random()*(min+1));
	else
		return Math.floor(Math.random()*(max-min+1))+min;
}

// écrire dans un fichier
exports.write = function(file) {
	return new Promise((resolve, reject) => {
		fs.writeFile("./" + file + ".json", JSON.stringify(eval(file)), (err) => {
			if (err) reject(err);
			else resolve();
		});
	});
}

exports.coloredEmbed = color => new discord.RichEmbed().setColor(color);
exports.defaultEmbed = () => exports.coloredEmbed("#808000");
exports.discordEmbed = () => exports.coloredEmbed("#7289DA");

exports.stringToMembers = (str, guild) => {
	return new Promise(async (resolve, reject) => {
		try {
			let member;
			let guildFetched = await guild.fetchMembers();
			if (str.startsWith("<@") && str.endsWith(">")) {
				member = await guild.fetchMember(str.replace("<@","").replace(">","").replace("!",""));
				if (member === undefined)
					member = [];
				else
					member = [member];
			} else
				member = guildFetched.members.findAll("displayName",str);
			console.log(member);
			resolve(member);
		} catch(err) {
			reject(err);
		}
	});
}

exports.stringToChannels = (str, guild) => {
	let channel;
	if (str.startsWith("<#") && str.endsWith(">")) {
		channel = guild.channels.get(str.replace("<#","").replace(">",""));
		if (channel === undefined)
			channel = [];
		else
			channel = [channel];
	} else
		channel = guild.channels.findAll("name", str);
	return channel;
}

exports.stringToRoles = (str, guild) => {
	let role;
	if (str.startsWith("<@") && str.endsWith(">")) {
		role = guild.roles.get(str.replace("<@","").replace(">","").replace("&",""));
		if (role === undefined)
			role = [];
		else
			role = [role];
	} else
		role = guild.roles.findAll("name",str);
	return role;
}

exports.getDate = () => new Date().getDate() + "/" + (new Date().getMonth()+1);
exports.sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

exports.defineAllProperties = (obj, option) => {
	let properties = Object.getOwnPropertyNames(obj);
	for (let property of properties)
		Object.defineProperty(obj, property, option);
	return obj;
}
