"use strict";
const discord = require("discord.js");
const util = require("util");

// valeur random entre min et max
exports.random = function(min, max) {
	if (max === undefined)
		return Math.floor(Math.random()*(min+1));
	else
		return Math.floor(Math.random()*(max-min+1))+min;
}

exports.coloredEmbed = color => new discord.RichEmbed().setColor(color);
exports.defaultEmbed = () => exports.coloredEmbed("#808000");
exports.discordEmbed = () => exports.coloredEmbed("#7289DA");

exports.stringToMembers = async (str, guild) => {
	let member;
	let guildFetched = await guild.fetchMembers();
	if (str.startsWith("<@") && str.endsWith(">")) {
		member = await guild.fetchMember(str.replace("<@","").replace(">","").replace("!",""));
		if (member === undefined)
			member = [];
		else
			member = [member];
	} else member = guildFetched.members.findAll("displayName", str);
	return member;
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

exports.stringifyObject = object => {
	if (object instanceof Function) return "```js\n" + object.toString().substring(0, 1950) + "\n```";
	else return "```js\n" + util.inspect(object, {depth: 0, breakLength: 0}).substring(0, 1950) + "\n```";
}

exports.parseTimestamp = timestamp => {
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

exports.range = function(min = 10, max = 0) {
	if (max < min) {
		let buffer = min;
		min = max;
		max = buffer;
	}
	let array = [];
	for (let i = min; i <= max; i++)
		array.push(i);
	return array;
}
