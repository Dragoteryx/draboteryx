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
let musicChannels = new Map();

// COMMAND TYPES
const commands = new drgCommands.CommandsHandler();
commands.owners.push(process.env.DRAGOID);
commands.prefixes.push("/", "<@273576577512767488> ");
const utilityType = new types.CommandType("utility", ":wrench: Utility commands");
const funType = new types.CommandType("fun", ":bowling: Fun commands");
const musicType = new types.CommandType("music", ":microphone: Music commands");
const nsfwType = new types.CommandType("nsfw", ":cucumber: NSFW commands");
const commandTypes = [utilityType, funType, musicType, nsfwType];

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
				try {
					res.command.callback(msg);
				} catch(err) {
					console.error(err);
				}
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

// SETUP COMMANDS
commands.setCommand("test", () => {console.log("[TEST] It works!")}, {ownerOnly: true});
commands.setCommand("help", msg => sendHelpEmbeds(msg), {arguments: "none", props:
new types.Command("help", "you probably know what this command does or else you wouldn't be reading this", utilityType, true)});
commands.setCommand("info", msg => tools.showInfo().then(embed => {
	msg.channel.send("", embed);
}), {arguments: "none", props:
new types.Command("info", "info about me", utilityType, true)});
commands.setCommand("shitpost", msg => {msg.channel.send(shitpost.genShitpost())}, {arguments: "none", props:
new types.Command("shitpost", "generates a random shitpost", funType, true)});
commands.setCommand("join", msg => {
	music.join(msg.member).then(() => {
		if (tools.getDate() == "1/4") {
			music.addMusic({member: msg.guild.me, link: process.env.APRIL_1ST_MUSIC, passes: 3}, () => {
				msg.channel.send("Happy April Fools' !");
			});
		}
		musicChannels.set(msg.guild.id, msg.channel);
		console.log("[MUSICBOT] Joined guild " + msg.guild.name + " (" + msg.guild.id + ")");
		msg.channel.send("I'm here o/");
	}, err => {
		if (err.message == "memberNotInAVoiceChannel") msg.channel.send("You're not in a voice channel.");
		else if (err.message == "voiceChannelNotJoinable") msg.channel.send("I can't join this voice channel.");
		else if (err.message == "voiceChannelNotSpeakable") msg.channel.send("I'm not allowed to speak in this voice channel.");
		else if (err.message == "voiceChannelFull") msg.channel.send("This voice channel is full.");
		else if (err.message == "clientAlreadyInAVoiceChannel") msg.channel.send("I'm already in a voice channel.");
		else console.error(err);
	});
}, {allowDMs: false, arguments: "none", props: new types.Command("join", "join a voice channel", musicType, true)});
commands.setCommand("leave", msg => {
	music.leave(msg.guild).then(() => {
		musicChannels.delete(msg.guild.id);
		console.log("[MUSICBOT] Leaved guild " + msg.guild.name + " (" + msg.guild.id + ")");
		msg.channel.send("Goodbye o/");
	}, err => {
		if (err.message == "clientNotInAVoiceChannel") msg.channel.send("You can't ask me to leave when I'm not connected.");
		else console.error(err);
	});
}, {allowDMs: false, arguments: "none", props: new types.Command("leave", "leave the voice channel", musicType, true)});
commands.setCommand("request", msg => {
	let link = msg.content.replace(config.prefix + "request ","");
	msg.channel.send("Downloading this music: ``" + link + "``").then(async msg2 => {
		let added = await music.addMusic(link, msg.member, {passes: 3});
		if (added instanceof Error) {
			if (added.message == "clientNotInAVoiceChannel") msg2.edit("I'm not connected. You can ask me to join you using ``" + config.prefix + "join``.");
			else if (added.message == "unknownOrNotSupportedVideoWebsite") msg2.edit("Sorry, but I don't know this website.");
			else {
				msg2.edit("Sorry but for some reason I was not able to download that music. (maybe it's not available where I'm hosted)");
				console.error(added);
			}
		}
		msg2.edit("``" + added.title + "`` has been added to the playlist.");
	});
}, {allowDMs: false, arguments: "required", props: new types.Command("request [youtube link]", "request a video", musicType, true)});
commands.setCommand("query", msg => {
	let link = msg.content.replace(config.prefix + "query ","");
	msg.channel.send("I am searching for a music that corresponds to your request.").then(msg2 => {
		music.addMusic(link, msg.member, {passes: 3, ytbApiKey: process.env.YOUTUBEAPIKEY, type: "query"}).then(added => {
			msg2.edit("``" + added.title + "`` has been added to the playlist.");
		}, err => {
			if (err.message == "clientNotInAVoiceChannel") msg2.edit("I'm not connected. You can ask me to join you using ``" + config.prefix + "join``.");
			else if (err.message == "notImplementedYet") msg2.edit("Sorry, but I did not find anything.");
			else {
				msg2.edit("Sorry but for some reason I was not able to download that music. (maybe it's not available where I'm hosted)");
				console.error(err);
			}
		});
	});
}, {allowDMs: false, arguments: "required", props: new types.Command("query [youtube query]", "request a video", musicType, true)});

// CONNECT THE BOT TO DISCORD
bot.login(process.env.DISCORDTOKEN).catch(err => {
	console.log("[DRABOT] Connection failed.");
	console.error(err);
});
