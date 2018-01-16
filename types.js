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

exports.Duration = function(timestamp) {
	var secondsAbs = Math.floor(timestamp/1000);
	var minutesAbs = Math.floor(secondsAbs/60);
	var hoursAbs = Math.floor(minutesAbs/60);
	var daysAbs = Math.floor(hoursAbs/24);
	var weeks = Math.floor(daysAbs/7);
	var days = daysAbs%7;
	var hours = hoursAbs%24;
	var minutes = minutesAbs%60;
	var seconds = secondsAbs%60;
	this.relatives = Object.freeze({
		weeks: weeks,
		days: days,
		hours: hours,
		minutes: minutes,
		seconds: seconds
	});
	this.absolutes = Object.freeze({
		weeks: weeks,
		days: daysAbs,
		hours: hoursAbs,
		minutes: minutesAbs,
		seconds: secondsAbs
	});
	this.toString = () => {
		let str = seconds + "s";
		if (timestamp >= 1000*60)
			str = minutes + "m " + str;
		if (timestamp >= 1000*60*60)
			str = hours + "h " + str;
		if (timestamp >= 1000*60*60*24)
			str = days + "d " + str;
		if (timestamp >= 1000*60*60*24*7)
			str = weeks + "w " + str;
		return str;
	}
	this.toString2 = () => {
		let str = "";
		if (seconds != 1)
			str += seconds + " seconds";
		else
			str += seconds + " second";
		if (timestamp >= 1000*60) {
			if (minutes != 1)
				str = minutes + " minutes, " + str;
			else
				str = minutes + " minute, " + str;
		}
		if (timestamp >= 1000*60*60) {
			if (hours != 1)
				str = hours + " hours, " + str;
			else
				str = hours + " hour, " + str;
		}
		if (timestamp >= 1000*60*60*24) {
			if (days != 1)
				str = days + " days, " + str;
			else
				str = days + " day, " + str;
		}
		if (timestamp >= 1000*60*60*24*7) {
			if (weeks != 1)
				str = weeks + " weeks, " + str;
			else
				str = weeks + " week, " + str;
		}
		if (str.includes("minute"))
			str = str.replace(" minute, ", " minute and ");
		else if (str.includes("minutes"))
			str = str.replace(" minutes, ", " minutes and ");
		return str;
	}
}
