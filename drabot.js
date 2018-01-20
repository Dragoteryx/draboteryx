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
const vars = {};

// GLOBALS ----------------------------------------------------------------------------------------------
let connected = false;
let musicChannels = new Map();
let clever = true;
let cleverbots = new Map();
let debug = false;

// EXPORTS ----------------------------------------------------------------------------------------------
exports.client = client;
exports.vars = vars;

// COMMAND TYPES ----------------------------------------------------------------------------------------------
commands.owners = config.owners;
const utilityType = ":wrench: Utility commands";
const funType = ":bowling: Fun commands";
const musicType = ":microphone: Music commands";
const nsfwType = ":cucumber: NSFW commands";
const commandTypes = [utilityType, funType, musicType, nsfwType];

// MUSIC RELATED EVENTS ----------------------------------------------------------------------------------------------
music.on("next", (guild, next) => {
	if (!music.isLooping(guild)) {
		if (!next.file)
			musicChannels.get(guild.id).send("Now playing: ``" + next.title + "`` by ``" + next.author.name + "``. (requested by " + next.member +")");
		else
			musicChannels.get(guild.id).send("Now playing: ``" + next.name + "``. (requested by " + next.member +")");
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
		else if (res.result.reasons.includes("DMs not allowed"))
			msg.channel.send("You can't use this command in private channels.");
		else if (res.result.reasons.includes("owner only command"))
			msg.channel.send("This is an owner only command.");
		else if (res.result.reasons.includes("missing permissions"))
			msg.channel.send("You don't have the necessary permissions.");
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
	if (msg.content.toLowerCase() == "ping") {
		msg.channel.send(":ping_pong: Pong!").then(msg2 => {
			msg2.edit(":ping_pong: Pong! (``" + (msg2.createdTimestamp - msg.createdTimestamp) + "`` ms)");
		});
	}

	// EXEC (special command)
	else if (msg.content.startsWith("$exec ") && config.owners.includes(msg.author.id)) {
		try {
			eval(msg.content.replace("$exec ", ""));
		} catch(err) {
			console.error(err);
		}
	}

	// CLEVERBOT
	else if (!msg.content.startsWith(config.prefix) && (msg.channel.type != "text" || msg.channel.name.toLowerCase() == "cleverbot") && msg.author.id != client.user.id && clever) {
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
		process.env.NBGUILDS = Array.from(client.guilds.keys()).length;
		let channels = Array.from(client.channels.values());
		let nbv = 0;
		for (let channel of channels)
			if (channel.type == "voice")
				nbv++;
		process.env.NBCHANNELS = channels.length;
		process.env.NBVOICE = nbv;
		process.env.NBTEXT = channels.length - nbv;
		process.env.NBUSERS = Array.from(client.users.keys()).length;
	}
});
client.on("error", err => {
	console.error(err);
	connected = false;
	login();
})
login();

// SETUP COMMANDS ----------------------------------------------------------------------------------------------
commands.setCommand("test", msg => {msg.channel.send("It works!")}, {owner: true, minargs: 2, maxargs: 4});
commands.setCommand("help", msg => {
	null;
}, {arguments: "none", props: new types.Command("help", "you probably know what this command does or else you wouldn't be reading this", utilityType, true)});

commands.setCommand("help", msg => {
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

commands.setCommand("info", msg => {
	funcs.showInfo(msg).then(embed => {
		msg.channel.send("", embed);
	});
}, {maxargs: 0, props: new types.Command("info", "info about me", utilityType, true)});

commands.setCommand("uptime", msg => {
	let uptime = new types.Duration(Date.now() - client.readyTimestamp);
	msg.channel.send("I have been up for " + uptime.toString2() + ". My last reboot was " + client.readyAt.toUTCString() + ".")
}, {maxargs: 0, props: new types.Command("uptime", "for how long the bot has been running", utilityType, true)});

commands.setCommand("serverinfo", async msg => {
	msg.channel.send("", await msg.guild.embedInfo());
}, {override: true, dms: false, maxargs: 0, permissions: ["MANAGE_GUILD"], props: new types.Command("serverinfo", "info about this server, you need to have the permission to manage the server", utilityType, true)});

commands.setCommand("channelinfo", msg => {
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
	msg.channel.send("", channel.embedInfo());
}, {override: true, dms: false, permissions: ["MANAGE_CHANNELS"], props: new types.Command("channelinfo (channel name)", "info about a text/voice channel (case sensitive), you need to have the permission to manage channels", utilityType, true)});

commands.setCommand("userinfo", msg => {
	let nb = msg.content.split(" ").slice(1).length;
	let member = msg.member;
	if (nb > 0) {
		try {
			member = tools.stringToMember(msg.content.replace(config.prefix + "userinfo ", ""), msg.guild);
		} catch(err) {
			if (err.message == "notAMember")
				msg.reply("this user doesn't exist.");
			else
				console.error(err);
			return;
		}
	}
	if (commands.isOwner(msg.author) || msg.member.hasPermission("ADMINISTRATOR") || msg.member.highestRole.comparePositionTo(member.highestRole) > 0 || msg.member.user.id == member.user.id)
		msg.channel.send("", member.embedInfo());
	else
		msg.channel.send("You don't have the necessary permissions.");
}, {override: true, dms: false, props: new types.Command("userinfo (username)", "info about a user (case sensitive), your highest role needs to be above the user's highest role", utilityType, true)});

commands.setCommand("roleinfo", msg => {
	let nb = msg.content.split(" ").slice(1).length;
	let role = msg.member.highestRole;
	if (nb > 0) {
		try {
			role = tools.stringToRole(msg.content.replace(config.prefix + "roleinfo ", ""), msg.guild);
		} catch(err) {
			if (err.message == "notARole")
				msg.reply("this role doesn't exist.");
			else
				console.error(err);
			return;
		}
	}
	msg.channel.send("", role.embedInfo());
}, {override: true, dms: false, permissions: ["MANAGE_ROLES"], props: new types.Command("roleinfo (role name)", "info about a role (case sensitive), you need to have the permission to manage roles", utilityType, true)});

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
	}).catch(err => {
		if (err.message == "memberNotInAVoiceChannel") msg.channel.send("You're not in a voice channel.");
		else if (err.message == "voiceChannelNotJoinable") msg.channel.send("I can't join this voice channel.");
		else if (err.message == "voiceChannelNotSpeakable") msg.channel.send("I'm not allowed to speak in this voice channel.");
		else if (err.message == "voiceChannelFull") msg.channel.send("This voice channel is full.");
		else if (err.message == "clientAlreadyInAVoiceChannel") msg.channel.send("I'm already in a voice channel.");
		else console.error(err);
	});
}, {dms: false, maxargs: 0, props: new types.Command("join", "join a voice channel", musicType, true)});

commands.setCommand("leave", msg => {
	music.leave(msg.guild).then(() => {
		musicChannels.delete(msg.guild.id);
		console.log("[MUSICBOT] Leaved guild " + msg.guild.name + " (" + msg.guild.id + ")");
		msg.channel.send("Goodbye o/");
	}).catch(err => {
		if (err.message == "clientNotInAVoiceChannel") msg.channel.send("You can't ask me to leave when I'm not connected.");
		else console.error(err);
	});
}, {dms: false, maxargs: 0, props: new types.Command("leave", "leave the voice channel", musicType, true)});

commands.setCommand("request", msg => {
	let link = msg.content.replace(config.prefix + "request ","");
	music.addMusic().then(added => {

	}).catch(err => {

	});
}, {dms: false, minargs: 1, maxargs: 1, props: new types.Command("request [youtube link]", "request a Youtube video using a Youtube link", musicType, true)});

commands.setCommand("query", msg => {
	let query = msg.content.replace(config.prefix + "query ","");
	music.addMusic().then(added => {

	}).catch(err => {

	});
}, {dms: false, minargs: 1, maxargs: 1, props: new types.Command("query [youtube query]", "request a Youtube video with a Youtube query", musicType, true)});

commands.setCommand("shitpost", msg => {
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

commands.setCommand("say", msg => {
	let content = msg.content.replace(config.prefix + "say ", "");
	msg.channel.send(content);
	msg.delete();
}, {owner: true, minargs: 1});

commands.setCommand("roll", msg => {
	let args = msg.content.split(" ").slice(1);
	let max = 6;
	if (args.length == 1 && args[0] == Number(args[0]) && Number(args[0]) > 0)
		max = Number(args[0]);
	let res = tools.random(1, max);
	msg.reply(res + "/" + max + " (:game_die:)")
}, {props: new types.Command("roll (size)", "roll a dice, invalid dice sizes will roll a 6", funType, true)});

commands.setCommand("stopclever", msg => {
	clever = false;
	console.log("[CLEVERBOT] Off");
	setTimeout(() => {
		clever = true;
		console.log("[CLEVERBOT] On")
	}, 10000);
}, {owner: true, maxargs: 0});

commands.setCommand("setName", msg => {
	let name = msg.content.replace(config.prefix + "setName ", "");
	client.user.setUsername(name).then(() => {
		console.log("[DRABOT] New name: " + name);
	}, () => {
		console.log("[DRABOT] Couldn't change name");
	});
}, {owner: true, maxargs: 0});

commands.setCommand("setGame", msg => {
	let game = msg.content.replace(config.prefix + "setGame ", "");
	client.user.setGame(game).then(() => {
		console.log("[DRABOT] New game: " + game);
	}, () => {
		console.log("[DRABOT] Couldn't change game");
	});
}, {owner: true, minargs: 1});

commands.setCommand("setAvatar", msg => {
	let avatar = msg.content.replace(config.prefix + "setAvatar ", "");
	client.user.setAvatar(avatar).then(() => {
		console.log("[DRABOT] New avatar: " + avatar);
	}, () => {
		console.log("[DRABOT] Couldn't change avatar");
	});
}, {owner: true, minargs: 1, maxargs: 1});

commands.setCommand("debug", msg => {
	debug = !debug;
	if (debug)
		msg.channel.send("Debug mode ON");
	else
		msg.channel.send("Debug mode OFF");
}, {owner: true, maxargs: 0});

commands.setCommand("kill", msg => {
	console.log("[DRABOT] Dying...");
	process.exit();
}, {owner: true, maxargs: 0});

commands.setCommand("cahrcg", msg => {
	let lien = "http://explosm.net/rcg";
	lien.getHTTP().then(res => {
		msg.channel.send("(from " + lien + ")", {file: res.text.split('<meta property="og:image" content="').pop().split('">').shift()});
	}).catch(console.error);
}, {maxargs: 0, props: new types.Command("cahrcg", "random Cyanide and Happiness comic", funType, true)});

commands.setCommand("rule34", funcs.sendR34, {minargs: 1, nsfw: true, props: new types.Command("rule34 [query]", "required on any Discord bot", nsfwType, true)});
commands.setCommand("r34", funcs.sendR34, {minargs: 1, nsfw: true});

commands.setCommand("waifu", msg => {
	if (msg.channel.type != "dm")
		msg.reply("your waifu doesn't exist and if she did she wouldn't like you.");
	else
		msg.channel.send("Your waifu doesn't exist and if she did she wouldn't like you.")
});

commands.setCommand("dicksize", msg => {
	let xsmall = ["Life hates you.", "Did you know that the ancient Greek considered small penises as a symbol of fertility?", "At least it won't get any smaller."];
	let small = ["It's almost cute.", "Well... it could have been worse...", "I'm sorry about that."];
	let smedium = ["Seems like it's normal sized to me.", "The average.", "A decent size."];
	let medium = ["You're slightly above the average.", "Good job.", "To be honest it's not that impressive."];
	let large = ["My horse is jealous.", "This is something I would be proud of.", "Almost as long as my arm."];
	let xlarge = ["Keep that thing away from me! D:", "You could knock down someone with that.", "Do you sometimes bang it on the ceiling?", "Don't trip over it.", "Damn son."];
	let id = msg.author.id.split("");
	let nb = 0;
	for (let i of id)
		nb += Number(i);
	let length = nb%10+1;
	let str = "8";
	for (let i = 0; i < length; i++)
		str += "=";
	str += "D";
	if (msg.channel.type == "text")
		msg.channel.send(":straight_ruler: | " + str + " (" + msg.member.displayName +")");
	else
		msg.channel.send(":straight_ruler: | " + str);
	setTimeout(() => {
		if (length == 1)
			msg.channel.send(tools.randTab(xsmall));
		else if (length <= 3)
			msg.channel.send(tools.randTab(small));
		else if (length <= 5)
			msg.channel.send(tools.randTab(smedium));
		else if (length <= 7)
			msg.channel.send(tools.randTab(medium));
		else if (length <= 9)
			msg.channel.send(tools.randTab(large));
		else if (length == 10)
			msg.channel.send(tools.randTab(xlarge));
	}, 1500);
}, {bots: true});

commands.setCommand("crystal", msg => {
	msg.channel.fetchMessages().then(msgs => {
  let tab = Array.from(msgs.values());
  let todel = [];
  for (let message of tab) {
    if (message.id == "141629369150865408")
      todel.push(message);
  }
  if (todel.length > 0) {
    msg.channel.bulkDelete(todel);
		msg.channel.send("No need to thank me.").then(msg2 => {msg2.delete(2500)});
	}
}).catch(console.error);
}, {guilds: ["191560973922992128"]});

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

discord.Message.prototype.dreply = function(content) {
	if (this.channel.type == "text")
		return this.reply(content);
	else
		return this.channel.send(content);
}

discord.Guild.prototype.nbCon = function() {
	return new Promise((resolve, reject) => {
		this.fetchMembers().then(guild => {
			let presences = Array.from(guild.presences.values());
			let h = 0;
			for(let presence of presences)
				if (presence.status != "offline") h++;
			resolve(h);
		}).catch(reject);
	});
}

discord.Guild.prototype.embedInfo = function() {
	return funcs.showGuildInfo(this);
}

discord.Channel.prototype.embedInfo = function() {
	return funcs.showChannelInfo(this);
}

discord.Role.prototype.embedInfo = function() {
	return funcs.showRoleInfo(this);
}

discord.GuildMember.prototype.embedInfo = function() {
	return funcs.showMemberInfo(this);
}
