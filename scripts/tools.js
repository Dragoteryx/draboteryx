/* jshint node:true, evil:true, asi:true, esversion:6*/
"use strict";

const discord = require("discord.js");
const util = require("util");
const https = require("https");
const http = require("http");

const drabot = require("../drabot.js");
const config = require("../config.js");
const classes = require("./classes.js");

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

exports.request = (host, options, data) => {
	return new Promise((resolve, reject) => {
		if (host === undefined) reject(new Error("'host' is undefined"));
		else {
			let protocol;
			if (host.startsWith("https://"))
				protocol = https;
			else if (host.startsWith("http://"))
				protocol = http;
			else {
				reject(new Error("Invalid protocol: https or http"));
				return;
			}
			host = host.replace("https://", "").replace("http://", "");
			host = host.split("/");
			if (options === undefined)
				options = {};
			options.hostname = host.shift();
			options.path = "/" + host.join("/");
	    let req = protocol.request(options, res => {
				res.setEncoding("utf8");
				let html = "";
				res.on("data", data => {
					html += data.toString();
				});
				res.on("end", () => {
					if (("" + res.statusCode).startsWith("2"))
						resolve({statusCode: res.statusCode, headers: res.headers, text: html});
					else
						reject(new Error("" + res.statusCode + " " + res.statusMessage));
				});
			}).on("error", reject);
			if (options.method == "POST") {
				if (data === undefined) reject(new Error("'data' is undefined"));
				else req.write(data);
			}
			req.end();
		}
  });
}

exports.stringifyObject = object => {
	return "```js\n" + util.inspect(object, {depth: 0, breakLength: 0}).substring(0, 1950) + "\n```";
}

exports.parseTimestamp = timestamp => {
	if (timestamp instanceof classes.Timer)
		return exports.parseTimestamp(timestamp.timestamp);
	if (timestamp instanceof Date)
		return exports.parseTimestamp(timestamp.getTime());
	let secondsAbs = Math.floor(timestamp/1000);
	let minutesAbs = Math.floor(secondsAbs/60);
	let hoursAbs = Math.floor(minutesAbs/60);
	let daysAbs = Math.floor(hoursAbs/24);
	let weeks = Math.floor(daysAbs/7);
	let days = daysAbs%7;
	let hours = hoursAbs%24;
	let minutes = minutesAbs%60;
	let seconds = secondsAbs%60;
	let simple = seconds + "s";
	if (timestamp >= 1000*60)
		simple = minutes + "m " + simple;
	if (timestamp >= 1000*60*60)
		simple = hours + "h " + simple;
	if (timestamp >= 1000*60*60*24)
		simple = days + "d " + simple;
	if (timestamp >= 1000*60*60*24*7)
		simple = weeks + "w " + simple;
	let text = "";
	if (seconds != 1)
		text += seconds + " seconds";
	else
		text += seconds + " second";
	if (timestamp >= 1000*60) {
		if (minutes != 1)
			text = minutes + " minutes, " + text;
		else
			text = minutes + " minute, " + text;
	}
	if (timestamp >= 1000*60*60) {
		if (hours != 1)
			text = hours + " hours, " + text;
		else
			text = hours + " hour, " + text;
	}
	if (timestamp >= 1000*60*60*24) {
		if (days != 1)
			text = days + " days, " + text;
		else
			text = days + " day, " + text;
	}
	if (timestamp >= 1000*60*60*24*7) {
		if (weeks != 1)
			text = weeks + " weeks, " + text;
		else
			text = weeks + " week, " + text;
	}
	if (text.includes("minutes"))
		text = text.replace(" minutes, ", " minutes and ");
	else if (text.includes("minute"))
		text = text.replace(" minute, ", " minute and ");
	let timer = "";
	let secs = "" + seconds;
	if (secs.length == 1)
		secs = "0" + seconds;
	let mins = "" + minutes;
	if (mins.length == 1)
		mins = "0" + minutes;
	if (hoursAbs > 0)
		timer = hoursAbs + ":" + mins + ":" + secs;
	else
		timer = minutesAbs + ":" + secs;
	return Object.freeze({
		simple: simple,
		text: text,
		timer: timer
	});
}
