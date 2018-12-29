"use strict";
const discord = require("discord.js");
const util = require("util");

exports.getDate = () => new Date().getDate() + "/" + (new Date().getMonth()+1);
exports.sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
exports.assert = function(obj, ...tests) {
	for (let i = 0; i < tests.length; i++) {
		if (!tests[i](obj)) return {valid: false, fail: i};
	}
	return {valid: true, fail: -1};
}
exports.validNumber = (nb, min = -Infinity, max = Infinity, integer = false) => {
	return exports.assert(Number(nb), nb => !isNaN(nb), nb => nb >= min, nb => nb <= max, nb => {
		if (integer) return Math.round(nb) == nb;
		else return true;
	});
}

exports.random = function(min, max) {
	if (max === undefined) {
		let buffer = max;
		max = min;
		min = 0;
	}
	return Math.floor(Math.random()*(max-min+1))+min;
}

exports.coloredEmbed = color => new discord.RichEmbed().setColor(color);
exports.defaultEmbed = () => exports.coloredEmbed("#808000");
exports.discordEmbed = () => exports.coloredEmbed("#7289DA");

exports.stringToMembers = async function(str, guild) {
	let guildFetched = await guild.fetchMembers();
	if (str.startsWith("<@") && str.endsWith(">"))
		return guildFetched.members.filter(member => member.id == str.replace("<@","").replace(">","").replace("!",""));
	else return guildFetched.members.filter(member => member.displayName.toLowerCase() == str.toLowerCase());
}

exports.stringToChannels = function(str, guild) {
	if (str.startsWith("<#") && str.endsWith(">"))
		return guild.channels.filter(channel => channel.id == str.replace("<#","").replace(">",""));
	else return guild.channels.filter(channel => channel.name.toLowerCase() == str.toLowerCase());
}

exports.stringToRoles = function(str, guild) {
	if (str.startsWith("<@#") && str.endsWith(">"))
		return guild.roles.filter(role => role.id == str.replace("<@#","").replace(">",""));
	else return guild.roles.filter(role => role.name.toLowerCase() == str.toLowerCase());
}

exports.stringifyObject = function(object) {
	if (object instanceof Function) return "```js\n" + object.toString().substring(0, 1950) + "\n```";
	else return "```js\n" + util.inspect(object, {depth: 0, breakLength: 0}).substring(0, 1950) + "\n```";
}

exports.parseTimestamp = function(timestamp) {
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

exports.range = function(min = 0, max = 10) {
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
