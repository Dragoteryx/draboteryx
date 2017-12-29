"use strict";
require("dotenv").config();

// REQUIREMENTS
const discord = require("discord.js");
const fs = require("fs");
const snekfetch = require("snekfetch");
const drgMusic = require("drg-music");
const drgCommands = require("./commands.js");

// FILES
const config = require("./config.js"); 	// configs
const tools = require("./tools.js");		// useful functions
const funcs = require("./funcs.js");		// commands related functions
const types = require("./types.js");		// custom types

// DRABOT ----------------------------------------------------------------------------------------------------------------------

// CONSTS
const bot = new discord.Client();
const music = new drgMusic.MusicHandler(bot);
exports.bot = bot;

// GLOBALS
let ready = false;

// COMMAND TYPES
const commands = new drgCommands.CommandsHandler();
commands.owners.push(process.env.DRAGOID);
commands.prefixes.push("/", "<@273576577512767488> ");
funcs.initCommands(commands);
exports.commands = commands;

// MUSIC RELATED EVENTS
music.on("next", (guild, musik) => {
	if (!music.isLooping(guild)) {
		if (!musik.file)
			musicChannels.get(guild.id).send("Now playing: ``" + musik.title + "`` by ``" + musik.author.name + "``. (requested by " + musik.member +")");
		else
			musicChannels.get(guild.id).send("Now playing: ``" + musik.name + "``. (requested by " + musik.member +")");
	}
});
music.on("empty", guild => {
	musicChannels.get(guild.id).send("The playlist is empty.");
});

// PROTOTYPES
discord.TextChannel.prototype.std = function(content, duration) {
	this.send(content).then(msg2 => msg2.delete(duration));
}
discord.Message.prototype.rtd = function(content, duration) {
	this.reply(content).then(msg2 => msg2.delete(duration));
}

// MAIN
bot.on("message", msg => {

		commands.check(msg).then(res => {
			if (res.result.valid) {
				let toLog = "";
				if (msg.channel.type != "dm") toLog += "[LOG] (" + msg.guild.name + " / #"+ msg.channel.name + ") " + msg.member.displayName + " : " + msg.content;
				else toLog += "[LOG] (DM) " + msg.author.username + " : " + msg.content;
				console.log(toLog);
				res.command.callback(msg);
			}
		}, err => {
			console.error(err);
		})

});

// WHEN BOT READY
bot.on("ready", () => {
	if (!ready) {
		ready = true;
		console.log("[DRABOT] I'm ready Senpai !");
		if (process.env.HEROKU !== undefined) {
			console.log("(Heroku launch)");
			bot.guilds.get("255312496250978305").channels.get("275292955475050496").send("Heroku launch complete.");
		} else {
			console.log("(local launch)");
			bot.guilds.get("255312496250978305").channels.get("275292955475050496").send("Local launch complete.");
		}
		bot.user.setGame(config.prefix + "help");
	}
});

// CONNECT THE BOT TO DISCORD
bot.login(process.env.DISCORDTOKEN).catch(err => {
	console.log("[DRABOT] Connection failed.");
	console.error(err);
});
