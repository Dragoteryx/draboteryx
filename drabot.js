"use strict";
require("dotenv").config();
require("./scripts/prototypes.js");

// REQUIREMENTS ----------------------------------------------------------------------------------------------
const discord = require("discord.js");
const fs = require("fs");
const cleverbotIO = require("cleverbot.io");
const util = require("util");
const jishoApi = new require('unofficial-jisho-api');
const DBL = require("dblapi.js");
const qr = require("qrcode");
const EDSMApi = require("./scripts/edsm.js");

// CUSTOM NPM -----------------------------------------------------------------------------------
const MusicHandler = require("drg-music2");

// FILES ----------------------------------------------------------------------------------------------
const config = require("./config.js");
const tools = require("./scripts/tools.js")
const funcs = require("./scripts/funcs.js");
const classes = require("./scripts/classes.js");
const gamefetch = require("./scripts/gamefetch.js");
const CommandsHandler = require("./scripts/commands.js");
const crypt = require("./scripts/crypt.js");
const TicTacToe = require("./scripts/tictactoe.js");

// DRABOT ----------------------------------------------------------------------------------------------------------------------

// CONSTS ----------------------------------------------------------------------------------------------
const client = new discord.Client();
const baby = new discord.Client();
const music = new MusicHandler(client);
const commands = new CommandsHandler();
const redis = require("redis").createClient(process.env.REDIS_URL);
const vars = {};
const jisho = new jishoApi();
const dbl = new DBL(process.env.DBLAPITOKEN);
const edsm = new EDSMApi();

// GLOBALS ----------------------------------------------------------------------------------------------
let connected = false;
let musicChannels = new Map();
let clever = true;
let cleverbots = new Map();
let debug = false;
let babylogged = false;
let memes = ["fart", "burp", "damnit", "dewae", "spaghet", "airhorns", "omaewa"];
let musicLeaves = new Map();
let redisOK = false;
let onMessageCallbacks = new Map();

// EXPORTS ----------------------------------------------------------------------------------------------
exports.client = client;
exports.vars = vars;
exports.dbl = dbl;
exports.redis = redis;
exports.edsm = edsm;

// COMMAND TYPES ----------------------------------------------------------------------------------------------
commands.defaultPrefix = config.prefix;
commands.owners = config.owners;
const utilityType = "Utility commands";
const funType = "Fun commands";
const musicType = "Music commands";
const nsfwType = "NSFW commands";
const miscType = "Misc commands";
const botType = "Bot related commands";
const warframeType = "Warframe related commands";
const gameType = "Games"
const commandTypes = [utilityType, gameType, funType, miscType, musicType, nsfwType, botType];

// LISTENING TO MESSAGES AND REACTIONS ----------------------------------------------------------------------------------------------
client.on("message", msg => {

	// COMMANDS
	commands.check(msg, {prefix: config.prefix}).then(res => {
		if (debug) {
			if (res.result.reasons !== undefined && (res.result.reasons.includes("no prefix") || res.result.reasons.includes("unknown command"))) return;
			console.log("[DEBUG] " + msg.content);
			console.log(res);
		}
		if (!res.result.valid) {
			if (res.result.reasons.includes("no prefix") || res.result.reasons.includes("unknown command"))
				return;
			else if (res.result.reasons.includes("guild only command"))
				msg.channel.send("You can't use this command in private channels.");
			else if (res.result.reasons.includes("owner only command"))
				msg.channel.send("This is an owner only command.");
			else if (res.result.reasons.includes("missing permissions"))
				msg.channel.send("You don't have the necessary permissions.");
			else if (res.result.reasons.includes("vote required"))
				msg.channel.send("To use this command you need to vote for the bot: https://discordbots.org/bot/273576577512767488/vote");
			else if (res.result.reasons.includes("nsfw"))
				msg.channel.send("What are you trying to do?");
			else if (res.result.reasons.some(reason => reason.includes(" arguments: ")))
				msg.channel.send("This is not how you're supposed to use this command. Use ``" + config.prefix + "help " + res.command.name + "`` to learn the correct syntax.");
		}
	}).catch(err => {
		funcs.logError(msg, err);
	});

	// CORRIGER VLTBOT
	if (msg.content == "/id") {
		msg.channel.waitResponse({delay: 5000, filter: msg2 => msg2.author.id == config.users.vltbot}).then(msg2 => {
			if (!msg2) return;
			msg.channel.send("What a silly bot, here is your true true ID: ``" + msg.author.id + "``.");
		});
	}

	// CALL ONMESSAGE FUNCTIONS
	onMessageCallbacks.forEach(func => func(msg));

});

// EVENTS ----------------------------------------------------------------------------------------------
process.on("unhandledRejection", err => {
	if (err instanceof discord.DiscordAPIError)
		console.log("[ERROR] Unhandled Promise Rejection:\nDiscordAPIError: " + err.message);
	else {
		console.log("[ERROR] Unhandled Promise Rejection:");
		console.error(err);
	}
})
client.on("ready", () => {
	if (!connected) {
		connected = true;
		console.log("[DRABOT] Connected!");
		if (process.env.HEROKU !== undefined) {
			console.log("(Heroku launch)");
			client.guilds.get("255312496250978305").channels.get("275292955475050496").send("Heroku launch complete.");
			dbl.postStats(client.guilds.size);
		} else {
			console.log("(local launch)");
			client.guilds.get("255312496250978305").channels.get("275292955475050496").send("Local launch complete.");
		}
		client.user.setActivity(config.prefix + "help");
	}
});
client.on("error", err => {
	console.log("[DRABOT] Error.");
	console.error(err);
	connected = false;
	login();
});
client.on("guildCreate", guild => {
	if (process.env.HEROKU !== undefined)
		dbl.postStats(client.guilds.size);
});
client.on("guildDelete", guild => {
	if (process.env.HEROKU !== undefined)
		dbl.postStats(client.guilds.size);
});
redis.on("ready", () => {
	redisOK = true;
});
redis.on("end", () => {
	redisOK = false;
});
redis.on("error", err => {
	redisOK = false;
});
music.on("next", (playlist, next) => {
	if (!next.file)
		musicChannels.get(playlist.guild.id).send("Now playing: ``" + next.title + "`` by ``" + next.author.name + "``. (requested by " + next.member.displayed +")");
	else
		musicChannels.get(playlist.guild.id).send("Now playing: ``" + next.title + "``. (requested by " + next.member.displayed +")");
});
music.on("empty", playlist => {
	musicChannels.get(playlist.guild.id).send("The playlist is empty.");
});
music.on("clientMove", (oldChannel, newChannel) => {
	musicChannels.get(newChannel.guild.id).send("I moved to " + newChannel + ".");
});
music.on("memberJoin", (member, channel) => {
	if (musicLeaves.has(member.guild.id)) {
		client.clearTimeout(musicLeaves.get(member.guild.id));
		musicLeaves.delete(member.guild.id);
		musicChannels.get(member.guild.id).send("Someone joined, staying for a little longer.");
	}
});
music.on("memberLeave", (member, channel) => {
	if (channel.members.size == 1) {
		musicChannels.get(member.guild.id).send("The voice channel is empty, I will leave in ``one minute``.");
		musicLeaves.set(member.guild.id,
		client.setTimeout(() => {
			member.guild.playlist.leave().then(() => {
				delete member.guild.busy;
				musicChannels.get(member.guild.id).send("Goodbye o/");
				musicChannels.delete(member.guild.id);
				console.log("[MUSICBOT] Leaved guild " + member.guild.name + " (" + member.guild.id + ")");
			}).catch(funcs.logError);
		}, 60000));
	}
});

// SETUP COMMANDS ----------------------------------------------------------------------------------------------
commands.set("test", msg => {msg.channel.send("It works!")}, {owner: true, maxargs: 0});

commands.set("help", msg => {
	let checkDM = "take a look at your private messages!";
	let unknown = "This command doesn't seem to exist. Use ``" + config.prefix + "help`` to get a list of all commands.";
	let args = msg.content.split(" ").slice(1);
	if (args.length == 0) {
		let coms = [];
		for (let command of commands.array)
			if (command.options.props.show) coms.push({name: command.name, type: command.options.props.type});
		let embed = tools.defaultEmbed();
		embed.addField("Drabot " + config.prefix + "help", "Options between brackets are ``required``. Those between parenthesis are ``optional``.\nIf you need some help, use ``" + config.prefix + "server`` to join the test server.\nYou can also use ``" + config.prefix + "help [command]`` to obtain help about one particular command.");
		for (let type of commandTypes) {
			let str = "";
			for (let com of coms)
				if (com.type == type) str += " ``" + com.name + "``";
			embed.addField(type, str.replace(" ", ""));
		}
		msg.author.send("", embed);
		if (msg.channel.type != "dm")
			msg.reply(checkDM);
	} else {
		if (commands.has(args[0])) {
			let command = commands.get(args[0]);
			if (!command.options.props.show)
				msg.channel.send(unknown);
			else {
				let embed = tools.defaultEmbed()
				.addField("Command", command.name, true)
				.addField("Type", command.options.props.type, true)
				.addField("Description", command.options.props.desc.firstUpper())
				.addField("Syntax", "```" + config.prefix + command.options.props.usage + "```");
				msg.author.send("", embed);
				if (msg.channel.type != "dm")
					msg.reply(checkDM);
			}
		} else {
			msg.channel.send(unknown);
		}
	}
}, {maxargs: 1, props: new classes.Command("help (command)", "you probably know what this command does or else you wouldn't be reading this", botType, true)});

commands.set("invite", msg => {
	msg.channel.send("What? You want me to join you? :heart:\nThen click here: https://discordapp.com/oauth2/authorize?client_id=273576577512767488&scope=bot&permissions=70437888");
}, {maxargs: 0, props: new classes.Command("invite", "get a link to invite the bot to your server", botType, true)});

commands.set("server", msg => {
	if (msg.channel.type != "text" || msg.guild.id != config.guilds.test) {
		msg.reply("you want to join the test server? https://discord.gg/aCgwj8M").catch(() => {
			msg.author.send("you want to join the test server? https://discord.gg/aCgwj8M");
			msg.reply("you should have received a private message.")
		});
	} else
		msg.channel.send("And... you're arrived!");
}, {maxargs: 0, props: new classes.Command("server", "get an invite to the test server", botType, true)});

commands.set("ping", msg => {
	msg.channel.send(":ping_pong: Pong!").then(msg2 => {
		msg2.edit(":ping_pong: Pong! (``" + (msg2.createdTimestamp - msg.createdTimestamp) + "`` ms)");
	});
}, {props: new classes.Command("ping", "pong!", botType, true)});

commands.set("exec", msg => {
	(async () => {
		try {
			let val = eval(msg.content.replace(config.prefix + "exec ", ""));
			let str = "Executed:\n";
			if (val instanceof Promise) {
				val = await val;
				str = "Executed (Promise):\n";
			}
			if (process.env.HEROKU !== undefined)
				console.dir(val);
			else
				console.dir(val, {colors: true});
			let tosend = val instanceof Function ? val : tools.stringifyObject(val);
			msg.channel.send(str + tosend);
			msg.react("✅");
		} catch(err) {
			funcs.logError(msg, err);
			msg.react("⛔");
		}
	})();
}, {owner: true, minargs: 1});

commands.set("prefix", msg => {
	let args = msg.content.split(" ");
	if (args.length == 1)
		msg.channel.send("Really? My prefix is ``" + config.prefix + "``.");
	else {
		if (!isOwner(msg.author))
			msg.channel.send("Only my creators are allowed to change my prefix!");
		else {
			config.prefix = args.pop();
			msg.channel.send("My prefix is now ``" + config.prefix + "``.")
		}
	}
}, {maxargs: 1, props: new classes.Command("prefix", "if you don't know what my prefix is despite reading this", botType, true)});

commands.set("about", msg => {
	funcs.showInfo(msg).then(embed => {
		msg.channel.send("", embed);
	});
}, {maxargs: 0, props: new classes.Command("about", "information about me", botType, true)});

commands.set("info", msg => {
	funcs.showInfo(msg).then(embed => {
		msg.channel.send("", embed);
	});
}, {maxargs: 0});

commands.set("uptime", msg => {
	msg.channel.send("I have been up for ``" + tools.parseTimestamp(client.uptime).text + "``. My last reboot was ``" + client.readyAt.toUTCString() + "``.");
}, {maxargs: 0, props: new classes.Command("uptime", "for how long the bot has been running", botType, true)});

commands.set("serverinfo", async msg => {
	msg.channel.send("", await funcs.showGuildInfo(msg.guild));
}, {override: true, guildonly: true, maxargs: 0, permissions: ["MANAGE_GUILD"], props: new classes.Command("serverinfo", "info about this server, you need to have the permission to manage the server", utilityType, true)});

commands.set("channelinfo", msg => {
	let nb = msg.content.split(" ").slice(1).length;
	let channel = msg.channel;
	if (nb > 0)
		channel = tools.stringToChannels(msg.content.replace(config.prefix + "channelinfo ", ""), msg.guild).shift();
	if (channel === undefined)
		msg.channel.send("This channel doesn't exist.");
	else
		msg.channel.send("", funcs.showChannelInfo(channel));
}, {override: true, guildonly: true, permissions: ["MANAGE_CHANNELS"], props: new classes.Command("channelinfo (channel name)", "info about a text/voice channel (case sensitive), you need to have the permission to manage channels", utilityType, true)});

commands.set("userinfo", async msg => {
	let nb = msg.content.split(" ").slice(1).length;
	let member = msg.member;
	if (nb > 0)
		member = (await tools.stringToMembers(msg.content.replace(config.prefix + "userinfo ", ""), msg.guild)).shift();
	if (member === undefined)
		msg.channel.send("This user doesn't exist.");
	else {
		if (isOwner(msg.author) || msg.member.hasPermission("ADMINISTRATOR") || msg.member.highestRole.comparePositionTo(member.highestRole) > 0 || msg.member.user.id == member.user.id)
			msg.channel.send("", funcs.showMemberInfo(member));
		else
			msg.channel.send("You don't have the necessary permissions.");
	}
}, {override: true, guildonly: true, props: new classes.Command("userinfo (username)", "info about a user (case sensitive), your highest role needs to be above the user's highest role", utilityType, true)});

commands.set("roleinfo", msg => {
	let nb = msg.content.split(" ").slice(1).length;
	let role = msg.member.highestRole;
	if (nb > 0)
		role = tools.stringToRoles(msg.content.replace(config.prefix + "roleinfo ", ""), msg.guild).shift();
	if (role === undefined)
		msg.channel.send("This role doesn't exist.");
	else
		msg.channel.send("", funcs.showRoleInfo(role));
}, {override: true, guildonly: true, permissions: ["MANAGE_ROLES"], props: new classes.Command("roleinfo (role name)", "info about a role (case sensitive), you need to have the permission to manage roles", utilityType, true)});


commands.set("join", msg => {
	if (msg.guild.busy) return;
	music.join(msg.member).then(() => {
		msg.guild.busy = true;
		if (tools.getDate() == "1/4") {
			music.add(process.env.APRIL_1ST_MUSIC, msg.guild.me, {passes: 10}).then(() => {
				msg.channel.send("Happy April Fools' !");
			});
		}
		musicChannels.set(msg.guild.id, msg.channel);
		console.log("[MUSICBOT] Joined guild " + msg.guild.name + " (" + msg.guild.id + ")");
		msg.channel.send("I'm here o/");
	}).catch(err => {
		funcs.musicErrors(msg, err);
	});
}, {guildonly: true, maxargs: 0, props: new classes.Command("join", "join a voice channel", musicType, true)});

commands.set("leave", msg => {
	music.leave(msg.guild).then(() => {
		delete msg.guild.busy;
		musicChannels.delete(msg.guild.id);
		console.log("[MUSICBOT] Leaved guild " + msg.guild.name + " (" + msg.guild.id + ")");
		msg.channel.send("Goodbye o/");
	}).catch(err => {
		funcs.musicErrors(msg, err);
	});
}, {guildonly: true, maxargs: 0, props: new classes.Command("leave", "leave the voice channel", musicType, true)});

commands.set("request", msg => {
	let link = msg.content.replace(config.prefix + "request ","");
	if (MusicHandler.videoWebsite(link) === undefined) {
		msg.channel.send("This link is not valid or this website is not supported.");
		return;
	}
	msg.channel.send("Adding ``" + link + "`` to the playlist.").then(msg2 => {
		music.add(link, msg.member, {passes: 10}).then(added => {
			msg2.edit("``" + added.title + "`` by ``" + added.author.name + "`` has been added to the playlist.");
		}).catch(err => {
			if (err.message == "the client is not in a voice channel") msg2.edit("I am not in a voice channel. You can ask me to join you using ``" + config.prefix + "join``.");
			else if (err.message == "this video id is invalid") msg2.edit("This Youtube link is invalid.");
			else if (err.message == "this video is unavailable") msg2.edit("This video is unavailable.");
			else funcs.musicErrors(msg, err);
		});
	});
}, {guildonly: true, minargs: 1, maxargs: 1, props: new classes.Command("request [youtube link]", "request a Youtube video using a Youtube link", musicType, true)});

commands.set("query", async msg => {
	try {
		if (!music.isConnected(msg.guild)) {
			msg.channel.send("I am not in a voice channel. You can ask me to join you using ``" + config.prefix + "join``.");
			return;
		}
		let query = msg.content.replace(config.prefix + "query ", "");
		let msg2 = await msg.channel.send("Searching for ``" + query + "`` on Youtube.");
		let links = await MusicHandler.queryYoutube(query, process.env.YOUTUBEAPIKEY, 5);
		if (links.length == 0) {
			msg2.edit("Sorry but I did not find anything.");
			return;
		}
		let embed = tools.defaultEmbed();
		for (let i = 0; i < links.length; i++) {
			let info = await MusicHandler.youtubeInfo(links[i]);
			embed.addField((i+1) + " - " + info.title + " by " + info.author.name + " (" + tools.parseTimestamp(info.length).timer + ")", info.link);
		}
		msg2.edit("So, which one do you want to listen to?", embed);
		let msg3 = await msg.channel.waitResponse({delay: 10000, filter: msg3 => {
			let choice = Number(msg3.content);
			if (msg3.author.id != msg.author.id || isNaN(choice)) return false;
			else if (!tools.range(1, links.length).includes(choice)) {
				msg.channel.send("You need to enter an index between ``1`` and ``" + links.length + "``.");
				return false;
			} else return true;
		}});
		let choice;
		if (msg3 === null) {
			msg.channel.send("You didn't respond in time, so I'll play the first one.");
			choice = 0;
		} else choice = Number(msg3.content) - 1;
		let added = await music.add(links[choice], msg.member, {passes: 10});
		msg.channel.send("``" + added.title + "`` by ``" + added.author.name + "`` has been added to the playlist.");
	} catch(err) {
		funcs.musicErrors(msg, err);
	}
}, {guildonly: true, minargs: 1, props: new classes.Command("query [youtube query]", "request a Youtube video with a Youtube query", musicType, true)});

commands.set("plremove", msg => {
	let id = Math.floor(Number(msg.content.split(" ").pop()))-1;
	if (isNaN(id)) {
		msg.channel.send("This ID is invalid.");
		return;
	}
	music.remove(msg.guild, id).then(removed => {
		msg.channel.send("``" + removed.title + "`` has been removed from the playlist.");
	}).catch(err => {
		funcs.musicErrors(msg, err);
	});
}, {guildonly: true, minargs: 1, maxargs: 1, props: new classes.Command("plremove [id]", "remove a music from the playlist", musicType, true)})

commands.set("skip", msg => {
	music.playNext(msg.guild).then(current => {
		msg.channel.send("The current music (``" + current.title + "``) has been skipped.");
	}).catch(err => {
		funcs.musicErrors(msg, err);
	});
}, {guildonly: true, maxargs: 0, props: new classes.Command("skip", "skip the current music", musicType, true)});

commands.set("plclear", msg => {
	music.clear(msg.guild).then(nb => {
		if (nb == 1)
			msg.channel.send("``1`` music has been removed from the playlist.");
		else
			msg.channel.send("``" + nb + "`` musics have been removed from the playlist.");
	}).catch(err => {
		funcs.musicErrors(msg, err)
	});
}, {guildonly: true, maxargs: 0, props: new classes.Command("plclear", "clear the playlist", musicType, true)});

commands.set("plshuffle", msg => {
	music.shuffle(msg.guild).then(() => {
		msg.channel.send("The playlist has been shuffled.");
	}).catch(err => {
		funcs.musicErrors(msg, err);
	});
}, {guildonly: true, maxargs: 0, props: new classes.Command("plshuffle", "shuffle the playlist", musicType, true)});

commands.set("loop", msg => {
	music.toggleLooping(msg.guild).then(looping => {
		let current = music.currentInfo(msg.guild);
			if (looping)
				msg.channel.send("The current music (``" + current.title + "``) is now looping.");
			else
				msg.channel.send("The current music is no longer looping.");
	}).catch(err => {
		funcs.musicErrors(msg, err);
	});
}, {guildonly: true, maxargs: 0, props: new classes.Command("loop", "loop the current music", musicType, true)});

commands.set("plloop", msg => {
	music.togglePlaylistLooping(msg.guild).then(looping => {
		if (looping)
			msg.channel.send("The playlist is now looping.");
		else
			msg.channel.send("The playlist is no longer looping.");
	}).catch(err => {
		funcs.musicErrors(msg, err);
	});
}, {guildonly: true, maxargs: 0, props: new classes.Command("plloop", "loop the playlist", musicType, true)});

commands.set("toggle", msg => {
	music.togglePaused(msg.guild).then(paused => {
		if (paused)
			msg.channel.send("The music has been paused.");
		else
			msg.channel.send("The music has been resumed.");
	}).catch(err => {
		funcs.musicErrors(msg, err);
	});
}, {guildonly: true, maxargs: 0, props: new classes.Command("toggle", "pause/resume the music", musicType, true)});;

commands.set("volume", msg => {
	let volume = Number(msg.content.split(" ").pop());
	if (isNaN(volume))
		return;
	music.setVolume(msg.guild, volume).then(() => {
		msg.channel.send("The volume has been set to ``" + volume + "%``.")
	}).catch(err => {
		funcs.musicErrors(msg, err);
	});
}, {guildonly: true, minargs: 1, maxargs: 1, props: new classes.Command("volume [value]", "set the volume of the music", musicType, true)});

commands.set("current", msg => {
	let current = music.currentInfo(msg.guild);
	if (current === undefined) {
		msg.channel.send("I am not playing anything at the moment.");
		return;
	}
	let info = tools.defaultEmbed();
	if (!current.file) {
		info.setThumbnail(current.thumbnailURL)
		.addField("Title", current.title, true)
		.addField("Author", current.author.name + " (" + current.author.channelURL + ")", true)
		.addField("Description", current.description.length > 1024 ? current.description.substring(0, 1021) + "..." : current.description, true)
		.addField("Link", current.link, true)
		.addField("Requested by", current.member, true);
	} else {
		info.addField("File name", current.title, true)
		.addField("Requested by", current.member, true);
	}
	msg.channel.send("Playing: ``" + tools.parseTimestamp(current.time).timer + " / " + tools.parseTimestamp(current.length).timer + " ("+ Math.floor((current.time / current.length)*100) + "%)``", info);
}, {guildonly: true, maxargs: 0, props: new classes.Command("current", "info about the current music", musicType, true)});

commands.set("playlist", msg => {
	let playlist = music.playlistInfo(msg.guild);
	if (playlist === undefined) {
		msg.channel.send("I am not in a voice channel.");
		return;
	}
	let info = tools.defaultEmbed();
	let i = 1;
	for (let music of playlist) {
		if (!music.file) {
			info.addField(i + " - " + music.title + " by " + music.author.name + " (``" + tools.parseTimestamp(music.length).timer + "``)", "Requested by " + music.member);
		}	else
			info.addField(i + " - " + music.title + " (``" + tools.parseTimestamp(music.length).timer + "``)", "Requested by " + music.member);
		i++;
	}
	if (playlist.length > 0) {
		msg.channel.send("Here's the playlist:", info);
		msg.channel.send("Use ``" + config.prefix + "current`` to have information about the current music.");
	} else msg.channel.send("The playlist is empty. Use ``" + config.prefix + "current`` to have information about the current music.");
}, {guildonly: true, maxargs: 0, props: new classes.Command("playlist", "info about the playlist", musicType, true)});

commands.set("plsave", msg => {
	if (!redisOK) {
		msg.channel.send("This command is unavailable at the moment.");
		return;
	}
	let playlist = music.playlistInfo(msg.guild);
	if (playlist === undefined)
		msg.channel.send("I am not in a voice channel.");
	else if (playlist.length == 0)
		msg.channel.send("You really want to save an empty playlist ? 😕");
	else {
		let current = music.currentInfo(msg.guild);
		let tab = [];
		if (!current.file)
			tab.push(current.link);
		for (let mus of playlist) {
			if (!mus.file)
				tab.push(mus.link);
		}
		if (tab.length > 6)
			msg.channel.send("You can only save up to ``6`` musics. You have ``" + tab.length + "`` counting the one playing.");
		else {
			msg.guild.rdfetch().then(data => {
				data.savedpl = tab;
				if (msg.guild.rdsend(data))
					msg.channel.send("The current playlist has been saved. Use ``" + config.prefix + "plload`` to load it.");
				else
					msg.channel.send("For some reason I was unable to save your playlist, sorry.");
			}).catch(err => {
				funcs.logError(msg, err);
			});
		}
	}
}, {vote: true, guildonly: true, maxargs: 0, props: new classes.Command("plsave", "save the current playlist", musicType, true)});

commands.set("plload", msg => {
	if (!redisOK) {
		msg.channel.send("This command is unavailable at the moment.");
		return;
	}
	if (!music.isConnected(msg.guild))
		msg.channel.send("I am not in a voice channel.");
	else {
		msg.guild.rdfetch().then(async data => {
			if (data.savedpl === undefined)
				msg.channel.send("You need to save a playlist first using ``" + config.prefix + "plsave``.");
			else {
				for (let link of data.savedpl) {
					try {
						await music.add(link, msg.member, {passes: 10});
					} catch(err) {}
				}
				msg.channel.send("The playlist was successfully loaded.");
			}
		}).catch(err => {
			funcs.logError(msg, err);
		});
	}
}, {vote: true, guildonly: true, maxargs: 0, props: new classes.Command("plload", "load a saved playlist", musicType, true)});

commands.set("fact", msg => {
	let args = msg.content.split(" ").slice(1);
	let link = "https://factgenerator.herokuapp.com";
	if (args.length > 0) {
		link += "/?query=";
		for (let arg of args)
			link += arg + "_";
		link = link.substring(0, link.length-1);
	}
	link.fetchHTTP().then(res => {
		let parsed = JSON.parse(res.text);
		if (!parsed.found)
			msg.channel.send("I did not find any interesting fact sorry.");
		else
			msg.channel.send(parsed.fact);
	}).catch(err => {
		msg.channel.send("I'm not in the mood for this right now. Try again later. :grimacing:");
	});
}, {props: new classes.Command("fact (query)", "procedurally generates a random stupid fact", funType, true)});

commands.set("shitpost", msg => {
	msg.reply("this command is now called ``" + config.prefix + "fact``. It works exactly the same though. :wink:");
});

commands.set("say", msg => {
	let content = msg.content.replace(config.prefix + "say ", "");
	msg.channel.send(content);
	msg.delete();
}, {owner: true, minargs: 1});

commands.set("ttsay", msg => {
	let content = msg.content.replace(config.prefix + "ttsay ", "");
	msg.channel.send(content, {tts: true});
	msg.delete();
}, {owner: true, minargs: 1});

commands.set("roll", msg => {
	let args = msg.content.split(" ").slice(1);
	let max = 6;
	if (args.length == 1 && !isNaN(Number(args[0])) && Number(args[0]) > 0)
		max = Number(args[0]);
	let res = tools.random(1, max);
	msg.reply(res + "/" + max + " (:game_die:)")
}, {props: new classes.Command("roll (size)", "roll a dice, invalid dice sizes will roll a 6", funType, true)});

commands.set("z0r", msg => {
	msg.channel.send("Enjoy! http://z0r.de/" + tools.random(7912) + " (earphone/headphone users beware)");
}, {props: new classes.Command("z0r", "get a random z0r.de link", funType, true)});

commands.set("stopclever", async msg => {
	clever = false;
	console.log("[CLEVERBOT] Off");
	let msg2 = await msg.channel.send("Cleverbot has been disabled for ``10`` seconds.");
	for (let i = 8; i > 0; i = i - 2) {
		await tools.sleep(2000);
		msg2.edit("Cleverbot will be back in ``" + i + "`` seconds.");
	}
	await tools.sleep(2000);
	clever = true;
	console.log("[CLEVERBOT] On");
	msg2.edit("Cleverbot is back!");
	msg2.delete(3000);
}, {owner: true, maxargs: 0});

commands.set("setName", msg => {
	let name = msg.content.replace(config.prefix + "setName ", "");
	client.user.setUsername(name).then(() => {
		console.log("[DRABOT] New name: " + name);
		msg.channel.send("My name is ``" + name + "``.");
	}).catch(() => {
		console.log("[DRABOT] Couldn't change name");
	});
}, {owner: true, minargs: 1});

commands.set("setGame", msg => {
	let game = msg.content.replace(config.prefix + "setGame ", "");
	client.user.setActivity(game).then(() => {
		console.log("[DRABOT] New game: " + game);
		msg.channel.send("Playing ``" + game + "``.");
	}).catch(() => {
		console.log("[DRABOT] Couldn't change game");
	});
}, {owner: true, minargs: 1});

commands.set("setAvatar", msg => {
	let avatar = msg.content.replace(config.prefix + "setAvatar ", "");
	client.user.setAvatar(avatar).then(() => {
		console.log("[DRABOT] New avatar: " + avatar);
		msg.channel.send("My new avatar: ``" + avatar + "``.");
	}).catch(() => {
		console.log("[DRABOT] Couldn't change avatar");
	});
}, {owner: true, minargs: 1, maxargs: 1});

commands.set("debug", msg => {
	debug = !debug;
	let str = debug ? "ON" : "OFF";
	msg.channel.send("Debug mode " + str);
}, {owner: true, maxargs: 0});

commands.set("kill", msg => {
	console.log("[DRABOT] Dying...");
	process.exit();
}, {owner: true, maxargs: 0});

commands.set("cyanidehappiness", msg => {
	let lien = "http://explosm.net/rcg";
	lien.fetchHTTP().then(res => {
		msg.channel.send("(from " + lien + ")", {file: res.text.split('<meta property="og:image" content="').pop().split('">').shift()});
	}).catch(err => {
		funcs.logError(msg, err);
	});
}, {maxargs: 0, props: new classes.Command("cyanidehappiness", "random Cyanide and Happiness comic", funType, true)});

commands.set("csshumor", msg => {
	let lien = "https://csshumor.com";
	lien.fetchHTTP().then(res => {
		msg.channel.send("(from " + lien + ")", {file: res.text.split('<meta property="og:image" content="').pop().split('">').shift()});
	}).catch(err => {
		funcs.logError(msg, err);
	});
}, {maxargs: 0, props: new classes.Command("csshumor", "random CSS joke", funType, true)});

commands.set("httpdog", msg => {
	let lien = "https://httpstatusdogs.com";
	lien.fetchHTTP().then(res => {
		let img = res.text.split('src="img/').random().split('" alt="')[0];
		let link = "https://httpstatusdogs.com/img/" + img;
		msg.channel.send("", {files: [link]});
	}).catch(err => {
		funcs.logError(msg, err);
	});
}, {maxargs: 0, props: new classes.Command("httpdog", "HTTP, and dogs", funType, true)});

commands.set("8ball", msg => {
	let answers = ["yes.", "no.", "maybe.", "well... that's a tricky one... $8", "42.", "you're not worthy.", "chigau yo!", "only time will tell.", "yes, obviously.", "you don't want to know.", "I am 99.9% sure it's yes.", "I am 99.9% sure it's no.", "tabun..."];
	let answer = "$8";
	while (answer.includes("$8"))
		answer = answer.replace("$8", answers.random());
	msg.channel.send(answer.firstUpper());
}, {minargs: 1, props: new classes.Command("8ball [question]", "ask me something, and I shall answer the truth", funType, true)});

commands.set("rule34", msg => {
	let searchOld;
	if (msg.content.startsWith(config.prefix + "rule34 "))
		searchOld = msg.content.replace(config.prefix + "rule34 ","");
	else if (msg.content.startsWith(config.prefix + "r34 "))
		searchOld = msg.content.replace(config.prefix + "r34 ","");
	let search = searchOld.toLowerCase();
	while (search.includes(" "))
		search = search.replace(" ", "_");
	let link = "https://rule34.paheal.net/post/list/" + search + "/1";
	link.fetchHTTP().then(res => {
		let nb = Number(res.text.split('">Last</a>').shift().split(' | <a href="/post/list/').pop().split("/").pop());
		let page = tools.random(1, nb);
		let link = "https://rule34.paheal.net/post/list/" + search + "/" + page;
		return link.fetchHTTP();
	}).then(res => {
		let html = res.text;
		for (let i = 0; i <= 100; i++)
			html = html.replace('<a href="http://rule34-data-',"<-SPLIT->-").replace('">Image Only</a>',"<-SPLIT->-");
		let htmlTab = html.split("<-SPLIT->-");
		let imgs = [];
		for (let i = 0; i < htmlTab.length; i++)
			if (htmlTab[i].includes("_images")) imgs.push(htmlTab[i].split('</a><br><a href="').pop());
		if (imgs.length != 0)
			msg.channel.send("Search: ``" + searchOld + "``", {file: imgs.random()});
		else
			return Promise.reject();
	}).catch(() => {
		msg.channel.send("Sorry, I didn't find anything about ``" + searchOld + "``.");
	});
}, {minargs: 1, nsfw: true, props: new classes.Command("rule34 [query]", "if it exists...", nsfwType, true)});

commands.set("danbooru", msg => {
	funcs.searchDanbooru(msg, true);
}, {minargs: 1, nsfw: true, props: new classes.Command("danbooru [tags]", "search something on danbooru", nsfwType, true)});

commands.set("safebooru", msg => {
	funcs.searchDanbooru(msg, false);
}, {minargs: 1, props: new classes.Command("safebooru [tags]", "search for a SFW image on safebooru", miscType, true)});

commands.set("waifu", msg => {
	if (msg.channel.type != "dm")
		msg.reply("your waifu doesn't exist and if she did she wouldn't like you.");
	else
		msg.channel.send("Your waifu doesn't exist and if she did she wouldn't like you.")
}, {maxargs: 0, props: new classes.Command("waifu", "get to know who your waifu is", funType, true)});

commands.set("daisuki", msg => {
	msg.author.voted().then(voted => {
		if (voted)
			msg.reply("yes! :heart:");
		else
			msg.reply("no, but I would if you voted for me here: https://discordbots.org/bot/273576577512767488");
	}).catch(err => {
		funcs.logError(msg, err);
	});
}, {props: new classes.Command("daisuki", "do I like you?", funType, true)});

commands.set("dicksize", async msg => {
	let xsmall = ["Life hates you.", "Did you know that the ancient Greek considered small penises as a symbol of fertility?", "At least it won't get any smaller."];
	let small = ["It's almost cute.", "Well... it could have been worse...", "I'm sorry about that."];
	let smedium = ["Seems like it's normal sized to me.", "The average.", "A decent size."];
	let medium = ["You're slightly above the average.", "Good job.", "To be honest it's not that impressive."];
	let large = ["My horse is jealous.", "This is something I would be proud of.", "Almost as long as my arm."];
	let xlarge = ["Keep that thing away from me! D:", "You could knock down someone with that.", "Do you sometimes bang it on the ceiling?", "Don't trip over it.", "Damn son."];
	let id = msg.author.id.split("");
	let sum = 0;
	for (let i of id)
		sum += Number(i);
	let length = sum%10+1;
	let str = "8";
	for (let i = 0; i < length; i++)
		str += "=";
	str += "D";
	if (msg.channel.type == "text")
		msg.channel.send(":straight_ruler: | " + str + " (" + msg.member.displayed +")");
	else
		msg.channel.send(":straight_ruler: | " + str);
	await tools.sleep(1500);
	if (length == 1)
		msg.channel.send(xsmall.random());
	else if (length <= 3)
		msg.channel.send(small.random());
	else if (length <= 5)
		msg.channel.send(smedium.random());
	else if (length <= 7)
		msg.channel.send(medium.random());
	else if (length <= 9)
		msg.channel.send(large.random());
	else if (length == 10)
		msg.channel.send(xlarge.random());
}, {bots: true});

commands.set("chrischansong", msg => {
	music.add("./files/chrischan.oga", msg.member, {type: "file", passes: 10}).then(added => {
		msg.channel.send("Test file (``" + added.title + "``) added to the playlist with success.");
	}).catch(err => {
		funcs.musicErrors(msg, err);
	});
}, {owner: true});

commands.set("nis", async msg => {
	if (msg.guild.busy) return;
	let member = msg.member;
	if (msg.content.split(" ").length != 1) {
		let str = msg.content.replace(config.prefix + "nis ", "");
		member = (await tools.stringToMembers(str, msg.guild)).shift();
	}
	if (member !== undefined && member.voiceChannel !== undefined) {
		member.voiceChannel.join().then(connection => {
			msg.guild.busy = true;
			connection.playFile("./files/fart.mp3", {passes: 10}).on("end", () => {
				setTimeout(() => {
					connection.playFile("./files/burp.mp3", {passes: 10}).on("end", () => {
						msg.guild.me.voiceChannel.leave();
						delete msg.guild.busy;
					}).setVolume(2);
				}, 500);
			}).setVolume(2);
		});
	}
}, {guildonly: true, users: [config.users.drago, config.users.nis]});

commands.set("whatisthebestyoutubechannel?", msg => {
	msg.channel.send("https://www.youtube.com/channel/UC6nSFpj9HTCZ5t-N3Rm3-HA :ok_hand:");
}, {maxargs: 0});

commands.set("hug", async msg => {
	let member = msg.content.split(" ").length == 1 ? msg.member : await tools.stringToMembers(msg.content.replace(config.prefix + "hug ", ""), msg.guild).shift();
	console.log(member);
	if (member === undefined)
		msg.channel.send("Who is that?");
	else {
		if (member.user.id == config.users.vlt)
			msg.channel.send("Keep that monster away from me! 😱");
		else {
			msg.channel.send(member.displayName + ", want a hug?", {files: ["./files/hug.gif"]});
		}
	}
}, {props: new classes.Command("hug", "ask me to hug someone", funType, true)});

commands.set("ytbthumb", msg => {
	let link = msg.content.replace(config.prefix + "ytbthumb ","");
	if (MusicHandler.videoWebsite(link) != "Youtube")
		msg.channel.send("This isn't a Youtube link.");
	else {
		MusicHandler.youtubeInfo(link).then(info => {
			msg.channel.send("No need to thank me. :wink:", {files: [info.maxResThumbnailURL]});
		}).catch(err => {
			msg.channel.send("I was unable to download the thumbnail for some reason, sorry.");
			console.error(err);
		});
	}
}, {minargs: 1, maxargs: 1, props: new classes.Command("ytbthumb [youtube link]", "retrieve the thumbnail from a Youtube video", miscType, true)});

commands.set("jisho", async msg => {
	let kanjis = msg.content.replace(config.prefix + "jisho ", "").split("");
	let atlone = false;
	for (let kanji of kanjis) {
		let res = await jisho.searchForKanji(kanji);
		if (res.found) {
			atlone = true;
			msg.channel.send("Kanji: ``" + kanji + "``", funcs.kanjiInfo(res));
		}
	}
	if (!atlone)
		msg.channel.send("I did not find any kanji in your message.");
}, {minargs: 1, props: new classes.Command("jisho [text]", "returns information about every kanji in the text", miscType, true)});

commands.set("qrcode", msg => {
	let text = msg.content.replace(config.prefix + "qrcode ", "");
	qr.toDataURL(text, {margin: 2, scale: 8, color: {light: "#00000000", dark: "#202225"}}).then(url => {
		fs.writeFile("./temp/qrcode.png", new Buffer(url.split(",")[1], "base64"), (err) => {
			if (err) funcs.logError(msg, err);
			else msg.channel.send("Input: ``" + text + "``", {files: ["./temp/qrcode.png"]});
		});
	}).catch(err => {
		funcs.logError(msg, err);
	});
}, {minargs: 1, props: new classes.Command("qrcode [text]", "generates a QRCode", miscType, true)});

commands.set("wfalerts", msg => {
	let args = msg.content.split(" ").slice(1);
	let platform = args.length == 0 ? "pc" : args[0].toLowerCase();
	gamefetch.fetchWF(platform).then(data => {
		console.dir(data.Alerts, {colors: true});
	}).catch(err => {
		if (err.message.startsWith("404 Not Found")) msg.channel.send("The Warframe API servers seem to be down.");
		else if (err.message == "invalid platform") msg.channel.send("Available platforms: ``pc``, ``ps4``, ``xb1``.");
		else funcs.logError(msg, err);
	});
}, {owner: true, maxargs: 1, props: new classes.Command("wfalerts (platform)", "get the current state of alerts", warframeType, false)});

commands.set("owstats", msg => {
	let args = msg.content.split(" ").slice(1);
	if (!args[0].includes("#")) {
		msg.channel.send("This username does not follow the right format => ``username``#``discriminator``.");
		return;
	}
	let idents = args[0].split("#");
	gamefetch.fetchOW(idents[0], idents[1]).then(profile => {
		let stats = profile.stats;
		let heroes = gamefetch.fetchOWPlaytimes(profile);
		let overall = {quickplay: stats.quickplay.overall_stats, competitive: stats.competitive.overall_stats};
		let game = {quickplay: stats.quickplay.game_stats, competitive: stats.competitive.game_stats};
		let embed = tools.defaultEmbed()
		.setThumbnail(overall.quickplay.avatar)
		.addField("Level", overall.quickplay.level + 100 * overall.quickplay.prestige, true);
		overall.competitive.comprank !== null ?
		embed.addField("Rank", overall.competitive.comprank + " (" + overall.competitive.tier + ")", true)
		: embed.addField("Rank", "not ranked", true);
		embed.addField("Time played", game.quickplay.time_played + " hours", true)
		.addField("Competitive winrate", overall.competitive.win_rate + "%", true)
		.addField("Games won", game.quickplay.games_won, true)
		.addField("Medals", game.quickplay.medals, true)
		.addField("Eliminations", game.quickplay.eliminations, true)
		.addField("Deaths", game.quickplay.deaths, true)
		.addField("K/D ratio", (game.quickplay.eliminations/game.quickplay.deaths).toFixed(2), true)
		.addField("Solo kills", game.quickplay.solo_kills, true)
		.addField("Hero damage done", game.quickplay.hero_damage_done, true)
		.addField("Healing done", game.quickplay.healing_done, true)
		.addField("Most played hero", heroes[0].name.firstUpper() + " (``" + Math.round(heroes[0].playtime) +  "`` hours)", true)
		.addField("2nd most played hero", heroes[1].name.firstUpper() + " (``" + Math.round(heroes[1].playtime) +  "`` hours)", true)
		.addField("3rd most played hero", heroes[2].name.firstUpper() + " (``" + Math.round(heroes[2].playtime) +  "`` hours)", true)
		.addField("Least played hero", heroes[heroes.length-1].name.firstUpper() + " (``" + Math.round(heroes[heroes.length-1].playtime) +  "`` hours)", true)
		msg.channel.send("User: ``" + idents.join("#") + "``", embed);
	}).catch(err => {
		if (err.message.startsWith("400")) msg.channel.send("This user doesn't exist, isn't tracked or the API servers are down.");
		else if (err.message.startsWith("429")) msg.channel.send("Too many requests, please try again later.");
		else funcs.logError(msg, err);
	});
}, {minargs: 1, maxargs: 1, props: new classes.Command("owstats [blizzard username#discriminator]", "get your Overwatch stats", miscType, true)});

commands.set("reflex", async msg => {
	if (msg.channel.reflex) return;
	msg.channel.reflex = true;
	msg.channel.send("I will post a message, the first to respond with the correct number wins!");
	await tools.sleep(tools.random(5000, 15000));
	let random = tools.random(100, 999);
	await msg.channel.send("The fastest one wins! ``" + random + "``");
	let msg2 = await msg.channel.waitResponse({delay: 10000, filter: msg2 => {
		if (msg2.content == random && msg2.author.bot) {
			msg2.reply("bots are not authorized to play this game. That's cheating!");
			return false;
		}
		return msg2.content == random;
	}});
	if (!msg2) msg.channel.send("You guys are slow.");
	else msg.channel.send("Well played " + msg2.member + ".");
	delete msg.channel.reflex;
}, {guildonly: true, maxargs: 0, props: new classes.Command("reflex", "the first user to react wins", gameType, true)});

commands.set("encrypt", async msg => {
	let message = msg.content.replace(config.prefix + "encrypt ", "");
	let key;
	await msg.channel.send("Do you want me to use a specific key ? If you do reply with the key within ``10`` seconds.");
	let msg2 = await msg.channel.waitResponse({delay: 10000, filter: msg2 => msg2.author.id == msg.author.id});
	if (!msg2) key = crypt.genNoise(8);
	else key = msg2.content;
	msg.channel.send("Your encrypted message: ``" + crypt.encrypt(message, key) + "``. Key: ``" + key + "``.")
}, {minargs: 1, props: new classes.Command("encrypt [message]", "encrypt a message (AES)", miscType, true)});

commands.set("decrypt", async msg => {
	let crypted = msg.content.replace(config.prefix + "decrypt ", "");
	await msg.channel.send("Do you happen to know the key ? Reply with the key to decrypt this message within ``10`` seconds.");
	let msg2 = await msg.channel.waitResponse({delay: 10000, filter: msg3 => msg3.author.id == msg.author.id});
	if (!msg2) msg.channel.send("If you don't know the key I can't decrypt this message.");
	else {
		let message = crypt.decrypt(crypted, msg2.content);
		if (!message) msg.channel.send("This doesn't seem to be the right key to decrypt this message.");
		else msg.channel.send("I successfully decrypted this message: ``" + message + "``.");
	}
}, {minargs: 1, props: new classes.Command("decrypt [message]", "decrypt a message", miscType, true)});

commands.set("tictactoe", TicTacToe.command, {guildonly: true, bots: true, props: new classes.Command("tictactoe (user)", "play Tic-Tac-Toe with someone, you can also tag the bot", gameType, true)});

commands.set("edsm", async msg => {
	let name = msg.content.replace(config.prefix + "edsm ", "");
	if (name == config.prefix + "edsm")
		msg.channel.send("You need to specify a system name.");
	else {
		if (!(await edsm.knownSystem(name)))
			msg.channel.send("This system isn't present in EDSM's database or doesn't exist.");
		else {
			if (!edsm.systems.has(name))
				await edsm.fetchSystems(name);
			let system = edsm.systems.get(name);
			if (system === undefined) {
				msg.channel.send("This system isn't present in EDSM's database or doesn't exist.");
				return;
			}
			if (system.bodies == null)
				await system.fetchAll();
			msg.channel.send("System: " + system.name.focus(), funcs.systemInfo(system));
		}
	}
}, {owner: true, props: new classes.Command("edsm [system name]", "gives you information about a system using ESDM's API", miscType, false)});

// FUNCTIONS ----------------------------------------------------------------------------------------------
function login() {
	console.log("[DRABOT] Trying to connect to Discord servers.");
	client.login(process.env.DISCORDTOKEN).catch(async () => {
		console.log("[DRABOT] Connection failed. Retry in 60 seconds.");
		await tools.sleep(60000);
		login();
	});
}

function addMeme(name) {
	commands.set(name, async msg => {
		if (msg.guild.busy) return;
		let member = msg.member;
		if (msg.content.split(" ").length != 1) {
			let str = msg.content.replace(config.prefix + name + " ", "");
			member = (await tools.stringToMembers(str, msg.guild)).shift();
		}
		if (member !== undefined && member.voiceChannel !== undefined) {
			member.voiceChannel.join().then(connection => {
				msg.guild.busy = true;
				connection.playFile("./files/" + name + ".mp3", {passes: 10}).on("end", () => {
					setTimeout(() => {
						msg.guild.me.voiceChannel.leave();
						delete msg.guild.busy;
					}, 500);
				}).setVolume(2);
			});
		}
	}, {guildonly: true});
}

let isOwner = user => commands.owners.includes(user.id);

// PROTOTYPES
Object.defineProperty(discord.Channel.prototype, "waitResponse", {
	value: function(options) {
		return new Promise(resolve => {
			if (options === undefined)
				options = {};
			if (options.delay === undefined)
				options.delay = -1;
			if (options.filter === undefined)
				options.filter = () => true;
			let random;
			do {
				random = tools.random(0, 255);
			} while (onMessageCallbacks.has(this.id + "/" + random));
			let delay;
			if (options.delay >= 0) {
				delay = setTimeout(() => {
					onMessageCallbacks.delete(this.id + "/" + random);
					resolve(null);
				}, options.delay);
			}
			onMessageCallbacks.set(this.id + "/" + random, msg => {
				if (msg.channel.id != this.id) return;
				if (!options.filter(msg)) return;
				onMessageCallbacks.delete(this.id + "/" + random);
				if (options.delay >= 0)
					clearTimeout(delay);
				resolve(msg);
			});
		});
	}
});

Object.defineProperty(discord.User.prototype, "voted", {
	value: function() {
		return dbl.hasVoted("" + this.id);
	}
});

// CONNECT THE BOT
login();
for (let meme of memes)
	addMeme(meme);
