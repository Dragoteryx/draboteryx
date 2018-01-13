"use strict";
require("dotenv").config();

// REQUIREMENTS ----------------------------------------------------------------------------------------------
const discord = require("discord.js");
const fs = require("fs");
const snekfetch = require("snekfetch");
const drgMusic = require("drg-music");
const drgCommands = require("./commands.js");
const cleverbotIO = require("cleverbot.io");

// FILES ----------------------------------------------------------------------------------------------
const config = require("./config.js"); 	// configs
const tools = require("./tools.js");		// useful functions
const funcs = require("./funcs.js");		// commands related functions
const types = require("./types.js");		// custom types

// DRABOT ----------------------------------------------------------------------------------------------------------------------

// CONSTS ----------------------------------------------------------------------------------------------
const client = new discord.Client();
const music = new drgMusic.MusicHandler(client);
const commands = new drgCommands.CommandsHandler();
const cleverbot = new cleverbotIO(process.env.CLEVER_USER, process.env.CLEVER_KEY);
exports.client = client;

// GLOBALS ----------------------------------------------------------------------------------------------
let ready = false;
let musicChannels = new Map();
let clever = true;
let cvbignore = [];

// COMMAND TYPES ----------------------------------------------------------------------------------------------
commands.owners = config.owners;
commands.prefixes.push(config.prefix);
const utilityType = new types.CommandType("utility", ":wrench: Utility commands");
const funType = new types.CommandType("fun", ":bowling: Fun commands");
const musicType = new types.CommandType("music", ":microphone: Music commands");
const nsfwType = new types.CommandType("nsfw", ":cucumber: NSFW commands");
const commandTypes = [utilityType, funType, musicType, nsfwType];

// MUSIC RELATED EVENTS ----------------------------------------------------------------------------------------------
music.on("next", (guild, musik) => {
	if (!music.isLooping(guild)) {
		if (!musik.file)
			musicChannels.get(guild.id).lsend("Now playing: ``" + musik.title + "`` by ``" + musik.author.name + "``. (requested by " + musik.member +")");
		else
			musicChannels.get(guild.id).lsend("Now playing: ``" + musik.name + "``. (requested by " + musik.member +")");
	}
});
music.on("empty", guild => {
	musicChannels.get(guild.id).lsend("The playlist is empty.");
});

// LISTENING TO MESSAGES ----------------------------------------------------------------------------------------------
client.on("message", msg => {

	// COMMANDS
	commands.check(msg).then(res => {
		if (res.result.valid) {
			let toLog = "";
			if (msg.channel.type != "dm") toLog += "[COMMAND] (" + msg.guild.name + " / #"+ msg.channel.name + ") " + msg.member.displayName + ": " + msg.content;
			else toLog += "[COMMAND] (DM) " + msg.author.username + ": " + msg.content;
			console.log(toLog);
			try {
				res.command.callback(msg);
			} catch(err) {
				console.error(err);
			}
		}
	}, err => {
		console.error(err);
	});

	// PING
	if (msg.content.toLowerCase() == "ping")
		msg.lreply("pong!");

	// CLEVERBOT
	if (!msg.content.startsWith(config.prefix) && msg.channel.name.toLowerCase() == "cleverbot" && msg.author.id != client.user.id && clever && !cvbignore.includes(msg.author.id)) {
		let toLog = "";
		if (msg.channel.type != "dm") toLog += "[CLEVERBOT] (" + msg.guild.name + " / #"+ msg.channel.name + ") " + msg.member.displayName + ": " + msg.content;
		else toLog += "[CLEVERBOT] (DM) " + msg.author.username + ": " + msg.content;
		console.log(toLog);
		cleverbot.setNick(msg.author.id + "/" + msg.channel.id);
		cleverbot.create((err, res) => {
			if (err) console.error(err);
			else {
				cleverbot.ask(msg.content, (err, res) => {
					if (err) console.error(err)
					else msg.channel.lsend(res);
				});
			}
		});

	}

});

// CONNECT THE BOT TO DISCORD ----------------------------------------------------------------------------------------------
client.on("ready", () => {
	if (!ready) {
		ready = true;
		console.log("[DRABOT] I'm ready Senpai !");
		if (process.env.HEROKU !== undefined) {
			console.log("(Heroku launch)");
			client.guilds.get("255312496250978305").channels.get("275292955475050496").lsend("Heroku launch complete.");
		} else {
			console.log("(local launch)");
			client.guilds.get("255312496250978305").channels.get("275292955475050496").lsend("Local launch complete.");
		}
		client.user.setGame(config.prefix + "help");
	}
});
client.on("error", err => {
	console.error(err);
	ready = false;
	login();
})
login();

// SETUP COMMANDS ----------------------------------------------------------------------------------------------
commands.setCommand("test", () => {console.log("[TEST] It works!")}, {owner: true});
commands.setCommand("help", msg => {
	null;
}, {arguments: "none", props: new types.Command("help", "you probably know what this command does or else you wouldn't be reading this", utilityType, true)});

commands.setCommand("info", msg => {
	funcs.showInfo().then(embed => {
		msg.channel.send("", embed);
	});
}, {arguments: "none", props: new types.Command("info", "info about me", utilityType, true)});

commands.setCommand("shitpost", msg => {
	msg.channel.lsend(shitpost.genShitpost())
}, {arguments: "none", props: new types.Command("shitpost", "generates a random shitpost", funType, true)});

commands.setCommand("join", msg => {
	music.join(msg.member).then(() => {
		if (tools.getDate() == "1/4") {
			music.addMusic({member: msg.guild.me, link: process.env.APRIL_1ST_MUSIC, passes: 3}, () => {
				msg.channel.lsend("Happy April Fools' !");
			});
		}
		musicChannels.set(msg.guild.id, msg.channel);
		console.log("[MUSICBOT] Joined guild " + msg.guild.name + " (" + msg.guild.id + ")");
		msg.channel.lsend("I'm here o/");
	}, err => {
		if (err.message == "memberNotInAVoiceChannel") msg.channel.lsend("You're not in a voice channel.");
		else if (err.message == "voiceChannelNotJoinable") msg.channel.lsend("I can't join this voice channel.");
		else if (err.message == "voiceChannelNotSpeakable") msg.channel.lsend("I'm not allowed to speak in this voice channel.");
		else if (err.message == "voiceChannelFull") msg.channel.lsend("This voice channel is full.");
		else if (err.message == "clientAlreadyInAVoiceChannel") msg.channel.lsend("I'm already in a voice channel.");
		else console.error(err);
	});
}, {dms: false, arguments: "none", props: new types.Command("join", "join a voice channel", musicType, true)});

commands.setCommand("leave", msg => {
	music.leave(msg.guild).then(() => {
		musicChannels.delete(msg.guild.id);
		console.log("[MUSICBOT] Leaved guild " + msg.guild.name + " (" + msg.guild.id + ")");
		msg.channel.lsend("Goodbye o/");
	}, err => {
		if (err.message == "clientNotInAVoiceChannel") msg.channel.lsend("You can't ask me to leave when I'm not connected.");
		else console.error(err);
	});
}, {dms: false, arguments: "none", props: new types.Command("leave", "leave the voice channel", musicType, true)});

commands.setCommand("request", msg => {
	let link = msg.content.replace(config.prefix + "request ","");
	music.addMusic().then(added => {

	}, err => {

	});
}, {dms: false, arguments: "required", props: new types.Command("request [youtube link]", "request a Youtube video using a Youtube link", musicType, true)});

commands.setCommand("query", msg => {
	let query = msg.content.replace(config.prefix + "query ","");

}, {dms: false, arguments: "required", props: new types.Command("query [youtube query]", "request a Youtube video with a Youtube query", musicType, true)});

commands.setCommand("shitpost", msg => {
	let args = msg.content.split(" ").slice(1);
	let link = "https://shitpostgenerator.herokuapp.com";
	if (args.length > 0) {
		link += "/?query=";
		for (let arg of args)
			link += arg + "_";
		link = link.substring(0, link.length-1);
	}
	link.httpGet().then(res => {
		if (res.text == "shitpostGenerationError")
			msg.channel.lsend("I did not find any shitpost relating to your query sorry.");
		else
			msg.channel.lsend(res.text);
	}, err => {
		console.error(err);
		msg.channel.lsend("Sorry, but I'm not in the mood for shitposting right now.")
	});
}, {props: new types.Command("shitpost ([query])", "request a random shitpost (as the bot asks the shitpost to a distant server there can be a delay)", funType, true)});

commands.setCommand("say", msg => {
	let content = msg.content.replace(config.prefix + "say ", "");
	msg.channel.lsend(content);
	msg.ldelete();
}, {owner: true});

commands.setCommand("roll", msg => {
	let args = msg.content.split(" ").slice(1);
	let max = 6;
	if (args.length == 1 && args[0] == Number(args[0]) && Number(args[0]) > 0)
		max = Number(args[0]);
	let res = tools.random(1, max);
	msg.lreply(res + "/" + max + " (:game_die:)")
}, {props: new types.Command("roll ([size])", "roll a dice, invalid dice sizes will roll a 6", funType, true)});

commands.setCommand("stopclever", () => {
	clever = false;
	console.log("[CLEVERBOT] Off");
	setTimeout(() => {
		clever = true;
		console.log("[CLEVERBOT] On")
	}, 10000);
}, {owner: true});

commands.setCommand("exec", msg => {
	let code = msg.content.replace(config.prefix + "exec ", "");
	eval(code);
}, {owner: true});

// FUNCTIONS ----------------------------------------------------------------------------------------------
function login() {
	console.log("[DRABOT] Trying to connect to Discord servers.");
	client.login(process.env.DISCORDTOKEN).catch(err => {
		console.log("[DRABOT] Connection failed.");
		console.error(err);
		setTimeout(login, 60000);
	});
}

// PROTOTYPES ----------------------------------------------------------------------------------------------
discord.TextChannel.prototype.lsend = function(content) {
	let toLog = "";
	if (this.type != "dm") toLog += "[MESSAGE] Send (" + this.guild.name + " / #"+ this.name + ") => " + content;
	else toLog += "[MESSAGE] Send (DM) => " + content;
	console.log(toLog);
	return this.send(content);
}
discord.Message.prototype.lreply = function(content) {
	this.channel.lsend(this.member + ", " + content);
}
discord.Message.prototype.ledit = function(content) {
	let toLog = "";
	if (this.channel.type != "dm") toLog += "[MESSAGE] Edit (" + this.guild.name + " / #"+ this.channel.name + "): " + this.content + " => " + content;
	else toLog += "[MESSAGE] Edit (DM): " + this.content + " => " + content;
	console.log(toLog);
	return this.edit(content);
}
discord.Message.prototype.ldelete = function() {
	let toLog = "";
	if (this.channel.type != "dm") toLog += "[MESSAGE] Delete (" + this.guild.name + " / #"+ this.channel.name + ") " + this.member.displayName + ": " + this.content;
	else toLog += "[MESSAGE] Delete (DM) " + this.member.displayName + ": " + this.content;
	console.log(toLog);
	return this.delete();
}
String.prototype.httpGet = function() {
	return new Promise((resolve, reject) => {
		console.log("[HTTP] Get " + this);
		snekfetch.get(this).then(res => {
			resolve(res);
		}, err => {
			reject(err);
		});
	});
}
