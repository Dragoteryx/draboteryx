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
const commands = new drgCommands("/");

// GLOBALS ----------------------------------------------------------------------------------------------
let connected = false;
let musicChannels = new Map();
let clever = true;
let cleverbots = new Map();
let debug = false;

// EXPORTS ----------------------------------------------------------------------------------------------
exports.client = client;

// COMMAND TYPES ----------------------------------------------------------------------------------------------
commands.owners = config.owners;
const utilityType = ":wrench: Utility commands";
const funType = ":bowling: Fun commands";
const musicType = ":microphone: Music commands";
const nsfwType = ":cucumber: NSFW commands";
const commandTypes = [utilityType, funType, musicType, nsfwType];

// MUSIC RELATED EVENTS ----------------------------------------------------------------------------------------------
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

// LISTENING TO MESSAGES ----------------------------------------------------------------------------------------------
client.on("message", msg => {

	// COMMANDS
	commands.check(msg).then(res => {
		if (res.result.valid) {
			let toLog = "";
			if (msg.channel.type != "dm") toLog += "[COMMAND] (" + msg.guild.name + " / #"+ msg.channel.name + ") " + msg.member.displayName + ": " + msg.content;
			else toLog += "[COMMAND] (DM) " + msg.author.username + ": " + msg.content;
			console.log(toLog);
		}
		if (debug) {
			if (res.result.reasons !== undefined && (res.result.reasons.includes("no prefix") || res.result.reasons.includes("unknown command"))) return;
			let toLog = "";
			if (msg.channel.type != "dm") toLog += "[DEBUG] (" + msg.guild.name + " / #"+ msg.channel.name + ") " + msg.member.displayName + ": " + msg.content;
			else toLog += "[DEBUG] (DM) " + msg.author.username + ": " + msg.content;
			console.log(toLog);
			console.log(res)
		}
	}).catch(console.error);

	// PING
	if (msg.content.toLowerCase() == "ping")
		msg.reply("pong!");

	// CLEVERBOT
	if (!msg.content.startsWith(config.prefix) && (msg.channel.type != "text" || msg.channel.name.toLowerCase() == "cleverbot") && msg.author.id != client.user.id && clever) {
		if (!cleverbots.has(msg.channel.id + "/" + msg.author.id))
			cleverbots.set(msg.channel.id + "/" + msg.author.id, new cleverbotIO(process.env.CLEVER_USER, process.env.CLEVER_KEY));
		let cleverbot = cleverbots.get(msg.channel.id + "/" + msg.author.id);
		cleverbot.create((err, session) => {
			if (err) console.error(err);
			else {
				let toLog = "";
				if (msg.channel.type != "dm") toLog += "[CLEVERBOT] Instance: " + msg.channel.id + "/" + msg.author.id + " (" + msg.guild.name + " / #"+ msg.channel.name + ") " + msg.member.displayName + ": " + msg.content;
				else toLog += "[CLEVERBOT] Instance: " + msg.channel.id + "/" + msg.author.id + " (DM) " + msg.author.username + ": " + msg.content;
				if (debug)
					console.log(toLog);
				cleverbot.ask(msg.content, (err, res) => {
					if (err) console.error(err)
					else {
						if (debug)
							console.log("[CLEVERBOT] Response: " + res);
						msg.channel.send(res);
					}
				});
			}
		});
	}

	// EXEC (special command)
	if (msg.content.startsWith("$exec ") && config.owners.includes(msg.author.id)) {
		try {
			eval(msg.content.replace("$exec ", ""));
		} catch(err) {
			console.error(err);
		}
	}

});

// CONNECT THE BOT TO DISCORD ----------------------------------------------------------------------------------------------
client.on("ready", () => {
	if (!connected) {
		connected = true;
		console.log("[DRABOT] I'm connected Senpai !");
		if (process.env.HEROKU !== undefined) {
			console.log("(Heroku launch)");
			client.guilds.get("255312496250978305").channels.get("275292955475050496").send("Heroku launch complete.");
		} else {
			console.log("(local launch)");
			client.guilds.get("255312496250978305").channels.get("275292955475050496").send("Local launch complete.");
		}
		client.user.setGame(config.prefix + "help");
	}
});
client.on("error", err => {
	console.error(err);
	connected = false;
	login();
})
login();

// SETUP COMMANDS ----------------------------------------------------------------------------------------------
commands.set("test", msg => {msg.channel.send("It works!")}, {owner: true, minargs: 2, maxargs: 4});
commands.set("help", msg => {
	null;
}, {arguments: "none", props: new types.Command("help", "you probably know what this command does or else you wouldn't be reading this", utilityType, true)});

commands.set("help", msg => {
	let props = Array.from(commands.fetchProps().values());
	let embed;
	if (msg.channel.type != "dm")
		msg.reply("help is coming in your DMs!");

	for (let type of commandTypes) {
		embed = tools.defaultEmbed();
		for (let prop of props) {
			if (prop.show && prop.type == type) {
				embed.addField(config.prefix + prop.name, prop.desc);
			}
		}
		if (type == utilityType)
			msg.author.send("Options between brackets are ``required``. Those between parenthesis are ``optional``.\n\n" + type + " (" + embed.fields.length + ")", embed);
		else
			msg.author.send(type + " (" + embed.fields.length + ")", embed);
	}
}, {maxargs: 0, props: new types.Command("help", "you probably know what this command does or else you wouldn't be reading this", utilityType, true)});

commands.set("info", msg => {
	funcs.showInfo().then(embed => {
		msg.channel.send("", embed);
	});
}, {maxargs: 0, props: new types.Command("info", "info about me", utilityType, true)});

commands.set("serverinfo", msg => {
	msg.channel.send("", funcs.showGuildInfo(msg.guild));
}, {dms: false, maxargs: 0, permissions: ["MANAGE_GUILD"], props: new types.Command("serverinfo", "info about this server", utilityType, true)});

commands.set("channelinfo", msg => {
	let nb = msg.content.split(" ").slice(1).length;
	let channel = msg.channel;
	if (nb > 0) {
		try {
			channel = tools.stringToChannel(msg.content.replace(config.prefix + "channelinfo ", ""), msg.guild);
		} catch(err) {
			if (err.message == "notAChannel")
				msg.reply("this channel doesn't exist.");
			else
				console.error(err);
			return;
		}
	}
	msg.channel.send("", funcs.showChannelInfo(channel));
}, {dms: false, permissions: ["MANAGE_CHANNELS"], props: new types.Command("channelinfo (channel name)", "info about a text/voice channel (case sensitive)", utilityType, true)});

commands.set("join", msg => {
	music.join(msg.member).then(() => {
		if (tools.getDate() == "1/4") {
			music.addMusic({member: msg.guild.me, link: process.env.APRIL_1ST_MUSIC, passes: 3}, () => {
				msg.channel.send("Happy April Fools' !");
			});
		}
		musicChannels.set(msg.guild.id, msg.channel);
		console.log("[MUSICBOT] Joined guild " + msg.guild.name + " (" + msg.guild.id + ")");
		msg.channel.send("I'm here o/");
	}).catch(err => {
		if (err.message == "memberNotInAVoiceChannel") msg.channel.send("You're not in a voice channel.");
		else if (err.message == "voiceChannelNotJoinable") msg.channel.send("I can't join this voice channel.");
		else if (err.message == "voiceChannelNotSpeakable") msg.channel.send("I'm not allowed to speak in this voice channel.");
		else if (err.message == "voiceChannelFull") msg.channel.send("This voice channel is full.");
		else if (err.message == "clientAlreadyInAVoiceChannel") msg.channel.send("I'm already in a voice channel.");
		else console.error(err);
	});
}, {dms: false, maxargs: 0, props: new types.Command("join", "join a voice channel", musicType, true)});

commands.set("leave", msg => {
	music.leave(msg.guild).then(() => {
		musicChannels.delete(msg.guild.id);
		console.log("[MUSICBOT] Leaved guild " + msg.guild.name + " (" + msg.guild.id + ")");
		msg.channel.send("Goodbye o/");
	}).catch(err => {
		if (err.message == "clientNotInAVoiceChannel") msg.channel.send("You can't ask me to leave when I'm not connected.");
		else console.error(err);
	});
}, {dms: false, maxargs: 0, props: new types.Command("leave", "leave the voice channel", musicType, true)});

commands.set("request", msg => {
	let link = msg.content.replace(config.prefix + "request ","");
	music.addMusic().then(added => {

	}).catch(err => {

	});
}, {dms: false, minargs: 1, maxargs: 1, props: new types.Command("request [youtube link]", "request a Youtube video using a Youtube link", musicType, true)});

commands.set("query", msg => {
	let query = msg.content.replace(config.prefix + "query ","");
	music.addMusic().then(added => {

	}).catch(err => {

	});
}, {dms: false, minargs: 1, maxargs: 1, props: new types.Command("query [youtube query]", "request a Youtube video with a Youtube query", musicType, true)});

commands.set("shitpost", msg => {
	let args = msg.content.split(" ").slice(1);
	let link = "https://shitpostgenerator.herokuapp.com";
	if (args.length > 0) {
		link += "/?query=";
		for (let arg of args)
			link += arg + "_";
		link = link.substring(0, link.length-1);
	}
	link.getHTTP().then(res => {
		if (res.text == "shitpostGenerationError")
			msg.channel.send("I did not find any shitpost relating to your query sorry.");
		else
			msg.channel.send(res.text);
	}).catch(err => {
		console.error(err);
		msg.channel.send("Sorry, but I'm not in the mood for shitposting right now.")
	});
}, {props: new types.Command("shitpost (query)", "request a random shitpost (as the bot asks the shitpost to a distant server there can be a delay)", funType, true)});

commands.set("say", msg => {
	let content = msg.content.replace(config.prefix + "say ", "");
	msg.channel.send(content);
	msg.delete();
}, {owner: true, minargs: 1});

commands.set("roll", msg => {
	let args = msg.content.split(" ").slice(1);
	let max = 6;
	if (args.length == 1 && args[0] == Number(args[0]) && Number(args[0]) > 0)
		max = Number(args[0]);
	let res = tools.random(1, max);
	msg.reply(res + "/" + max + " (:game_die:)")
}, {props: new types.Command("roll (size)", "roll a dice, invalid dice sizes will roll a 6", funType, true)});

commands.set("stopclever", msg => {
	clever = false;
	console.log("[CLEVERBOT] Off");
	setTimeout(() => {
		clever = true;
		console.log("[CLEVERBOT] On")
	}, 10000);
}, {owner: true, maxargs: 0});

commands.set("setName", msg => {
	let name = msg.content.replace(config.prefix + "setName ", "");
	client.user.setUsername(name).then(() => {
		console.log("[DRABOT] New name: " + name);
	}, () => {
		console.log("[DRABOT] Couldn't change name");
	});
}, {owner: true, maxargs: 0});

commands.set("setGame", msg => {
	let game = msg.content.replace(config.prefix + "setGame ", "");
	client.user.setGame(game).then(() => {
		console.log("[DRABOT] New game: " + game);
	}, () => {
		console.log("[DRABOT] Couldn't change game");
	});
}, {owner: true, minargs: 1});

commands.set("setAvatar", msg => {
	let avatar = msg.content.replace(config.prefix + "setAvatar ", "");
	client.user.setAvatar(avatar).then(() => {
		console.log("[DRABOT] New avatar: " + avatar);
	}, () => {
		console.log("[DRABOT] Couldn't change avatar");
	});
}, {owner: true, minargs: 1, maxargs: 1});

commands.set("debug", msg => {
	debug = !debug;
	if (debug)
		msg.channel.send("Debug mode ON");
	else
		msg.channel.send("Debug mode OFF");
}, {owner: true, maxargs: 0});

commands.set("kill", msg => {
	console.log("[DRABOT] Dying...");
	process.exit();
}, {owner: true, maxargs: 0});

commands.set("cahrcg", msg => {
	let lien = "http://explosm.net/rcg";
	lien.getHTTP().then(res => {
		msg.channel.send("(from " + lien + ")", {file: res.text.split('<meta property="og:image" content="').pop().split('">').shift()});
	}).catch(console.error);
}, {maxargs: 0, props: new types.Command("cahrcg", "random Cyanide and Happiness comic", funType, true)});

commands.set("rule34", funcs.sendR34, {minargs: 1, nsfw: true, props: new types.Command("rule34 [query]", "required on any Discord bot", nsfwType, true)});
commands.set("r34", funcs.sendR34, {minargs: 1, nsfw: true});

commands.set("waifu", msg => {
	if (msg.channel.type != "dm")
		msg.reply("your waifu doesn't exist and if she did she wouldn't like you.");
	else
		msg.channel.send("Your waifu doesn't exist and if she did she wouldn't like you.")
});

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
String.prototype.getHTTP = function() {
	return new Promise((resolve, reject) => {
		if (debug)
			console.log("[HTTP] Get " + this);
		snekfetch.get(this).then(res => {
			resolve(res);
		}, err => {
			reject(err);
		});
	});
}
