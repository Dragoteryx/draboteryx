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
		if (timestamp === undefined || timestamp < 0)
			timestamp = 0;
		this.auto = false;
		that.start = Date.now() - timestamp;
		that.timestamp = timestamp;
		that.values = {};
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
	refresh() {
		let that = prv(this);
		that.timestamp = Date.now() - that.start;
		that.calc();
    return this;
	}
	sleep() {
		return new Promise(resolve => setTimeout(resolve, timestamp));
	}
	get timestamp() {
		return prv(this).timestamp;
	}
	set timestamp(timestamp) {
		let that = prv(this);
		that.start = Date.now() - timestamp;
		that.timestamp = timestamp;
		this.refresh();
	}
	get relatives() {
		let that = prv(this);
		if (this.auto) this.refresh();
		return Object.freeze({
			weeks: that.values.weeks,
			days: that.values.days,
			hours: that.values.hours,
			minutes: that.values.minutes,
			seconds: that.values.seconds
		});
	}
	get absolutes() {
		let that = prv(this);
		if (this.auto) this.refresh();
		return Object.freeze({
			weeks: that.values.weeks,
			days: that.values.daysAbs,
			hours: that.values.hoursAbs,
			minutes: that.values.minutesAbs,
			seconds: that.values.secondsAbs
		});
	}
	get strings() {
		let that = prv(this);
		if (this.auto) this.refresh();
		let object = {};
		let simple = that.values.seconds + "s";
		if (that.timestamp >= 1000*60)
			simple = that.values.minutes + "m " + simple;
		if (that.timestamp >= 1000*60*60)
			simple = that.values.hours + "h " + simple;
		if (that.timestamp >= 1000*60*60*24)
			simple = that.values.days + "d " + simple;
		if (that.timestamp >= 1000*60*60*24*7)
			simple = that.values.weeks + "w " + simple;
		let text = "";
		if (that.values.seconds != 1)
			text += that.values.seconds + " seconds";
		else
			text += that.values.seconds + " second";
		if (that.timestamp >= 1000*60) {
			if (that.values.minutes != 1)
				text = that.values.minutes + " minutes, " + text;
			else
				text = that.values.minutes + " minute, " + text;
		}
		if (that.timestamp >= 1000*60*60) {
			if (that.values.hours != 1)
				text = that.values.hours + " hours, " + text;
			else
				text = that.values.hours + " hour, " + text;
		}
		if (that.timestamp >= 1000*60*60*24) {
			if (that.values.days != 1)
				text = that.values.days + " days, " + text;
			else
				text = that.values.days + " day, " + text;
		}
		if (that.timestamp >= 1000*60*60*24*7) {
			if (that.values.weeks != 1)
				text = that.values.weeks + " weeks, " + text;
			else
				text = that.values.weeks + " week, " + text;
		}
		if (text.includes("minutes"))
			text = text.replace(" minutes, ", " minutes and ");
		else if (text.includes("minute"))
			text = text.replace(" minute, ", " minute and ");
		let timer = "";
		let secs = "" + that.values.seconds;
		if (secs.length == 1)
			secs = "0" + that.values.seconds;
		let mins = "" + that.values.minutes;
		if (mins.length == 1)
			mins = "0" + that.values.minutes;
		if (that.values.hoursAbs > 0)
			timer = that.values.hoursAbs + ":" + mins + ":" + secs;
		else
			timer = that.values.minutesAbs + ":" + secs;
		return Object.freeze({
			simple: simple,
			text: text,
			timer: timer
		});
	}
}

// EXPORTS
module.exports = Duration;
