"use strict";
const EventEmitter = require("events");

const weakmapPrivates = new WeakMap();
function prv(object) {
	if (!weakmapPrivates.has(object))
		weakmapPrivates.set(object, {});
	return weakmapPrivates.get(object);
}

class Duration {
	constructor(timestamp) {
		let that = prv(this);
		that.timestamp = timestamp;
		that.values = {}
		that.calc = () => {
			that.values.secondsAbs = Math.floor(that.timestamp/1000);
			that.values.minutesAbs = Math.floor(that.values.secondsAbs/60);
			that.values.hoursAbs = Math.floor(that.values.minutesAbs/60);
			that.values.daysAbs = Math.floor(that.values.hoursAbs/24);
			that.values.weeks = Math.floor(that.values.daysAbs/7);
			that.values.days = that.values.daysAbs%7;
			that.values.hours = that.values.hoursAbs%24;
			that.values.minutes = that.values.minutesAbs%60;
			that.values.seconds = that.values.secondsAbs%60;
		}
		that.calc();
	}
}
function Duration(timestamp) {
	if (timestamp === undefined)
		timestamp = 0;
  this.auto = false;
	var start = Date.now() - timestamp;
	var secondsAbs = 0;
	var minutesAbs = 0;
	var hoursAbs = 0;
	var daysAbs = 0;
	var weeks = 0;
	var days = 0;
	var hours = 0;
	var minutes = 0;
	var seconds = 0;
	function calc() {

	}
	calc();
	this.refresh = () => {
		timestamp = Date.now() - start;
		calc();
    return this;
	}
	this.relatives = () => {
		if (this.auto) this.refresh();
		return Object.freeze({
			weeks: weeks,
			days: days,
			hours: hours,
			minutes: minutes,
			seconds: seconds
		});
	}
	this.absolutes = () => {
		if (this.auto) this.refresh();
		return Object.freeze({
			weeks: weeks,
			days: daysAbs,
			hours: hoursAbs,
			minutes: minutesAbs,
			seconds: secondsAbs
		});
	}
	this.getTimestamp = () => timestamp;
	this.sleep = () => new Promise(resolve => setTimeout(resolve, timestamp));
	this.strings = () => {
		if (this.auto) this.refresh();
		let object = {};
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
}

// EXPORTS
module.exports = Duration;
