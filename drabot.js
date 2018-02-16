"use strict";
require("dotenv").config();

// REQUIREMENTS ----------------------------------------------------------------------------------------------
const discord = require("discord.js");
const fs = require("fs");
const snekfetch = require("snekfetch");
const cleverbotIO = require("cleverbot.io");
const util = require("util");
const Danbooru = require("danbooru");
const jishoApi = new require('unofficial-jisho-api');
const DBL = require("dblapi.js");

// FILES ----------------------------------------------------------------------------------------------
const config = require("./config.js"); 	// configs
const tools = require("./scripts/tools.js");		// useful functions
const funcs = require("./scripts/funcs.js");		// commands related functions
const classes = require("./scripts/classes.js");		// custom classes
const Duration = require("./scripts/duration.js"); // durations
const MusicHandler = require("./node_modules/drg-music2/music.js");
const DrgCommands = require("./scripts/commands.js");
const dbl = new DBL(process.env.DBLAPITOKEN);

// DRABOT ----------------------------------------------------------------------------------------------------------------------

// CONSTS ----------------------------------------------------------------------------------------------
const client = new discord.Client();
const baby = new discord.Client();
const music = new MusicHandler(client);
const commands = new DrgCommands(config.prefix);
const redis = require('redis').createClient(process.env.REDIS_URL);
const vars = {};
const booru = new Danbooru();
const safebooru = new Danbooru.Safebooru();
const jisho = new jishoApi();

// GLOBALS ----------------------------------------------------------------------------------------------
let connected = false;
let musicChannels = new Map();
let clever = true;
let cleverbots = new Map();
let debug = false;
let babylogged = false;
let uptime = new Duration();
uptime.auto = true;
let memes = ["fart", "burp", "damnit", "dewae", "spaghet", "airhorns", "omaewa"];
let memeing = new Map();
let musicLeaves = new Map();
let redisOK = false;

// EXPORTS ----------------------------------------------------------------------------------------------
exports.client = client;
exports.vars = vars;
exports.uptime = uptime;
exports.dbl = dbl;

// COMMAND TYPES ----------------------------------------------------------------------------------------------
commands.defaultPrefix = config.prefix;
commands.owners = config.owners;
const utilityType = ":wrench: Utility commands";
const funType = ":bowling: Fun commands";
const musicType = ":microphone: Music commands";
const nsfwType = ":cucumber: NSFW commands";
const otherType = ":satellite: Other commands";
const botType = ":toilet: Bot related commands";
const commandTypes = [utilityType, funType, otherType, musicType, nsfwType, botType];

// MUSIC RELATED EVENTS ----------------------------------------------------------------------------------------------
music.on("next", (playlist, next) => {
	if (!next.file)
		musicChannels.get(playlist.guild.id).send("Now playing: ``" + next.title + "`` by ``" + next.author.name + "``. (requested by " + next.member +")");
	else
		musicChannels.get(playlist.guild.id).send("Now playing: ``" + next.title + "``. (requested by " + next.member +")");
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
				musicChannels.get(member.guild.id).send("Goodbye o/");
				musicChannels.delete(member.guild.id);
				console.log("[MUSICBOT] Leaved guild " + member.guild.name + " (" + member.guild.id + ")");
			}).catch(funcs.logError);
		}, 60000));
	}
});

// LISTENING TO MESSAGES ----------------------------------------------------------------------------------------------
client.on("message", msg => {

	// COMMANDS
	commands.check(msg, {prefix: config.prefix}).then(res => {
		if (debug) {
			if (res.result.reasons !== undefined && (res.result.reasons.includes("no prefix") || res.result.reasons.includes("unknown command"))) return;
			let toLog = "";
			if (msg.channel.type != "dm") toLog += "[DEBUG] (" + msg.guild.name + " / #"+ msg.channel.name + ") " + msg.member.displayName + ": " + msg.content;
			else toLog += "[DEBUG] (DM) " + msg.author.username + ": " + msg.content;
			console.log(toLog);
			console.log(res);
		}
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
	}).catch(err => {
		funcs.logError(msg, err);
	});

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

});

// CONNECT THE BOT TO DISCORD ----------------------------------------------------------------------------------------------
client.on("ready", () => {
	if (!connected) {
		connected = true;
		console.log("[DRABOT] I'm connected Senpai !");
		if (process.env.HEROKU !== undefined) {
			console.log("(Heroku launch)");
			client.guilds.get("255312496250978305").channels.get("275292955475050496").send("Heroku launch complete.");
			dbl.postStats(client.guilds.size);
			setInterval(() => {
				dbl.postStats(client.guilds.size);
			}, 1800000);
		} else {
			console.log("(local launch)");
			client.guilds.get("255312496250978305").channels.get("275292955475050496").send("Local launch complete.");
		}
		client.user.setActivity(config.prefix + "help");
	}
});
client.on("error", err => {
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
login();
for (let meme of memes)
	addMeme(meme);

redis.on("ready", () => {
	redisOK = true;
})
redis.on("end", () => {
	redisOK = false;
})

// SETUP COMMANDS ----------------------------------------------------------------------------------------------
commands.set("test", msg => {msg.channel.send("It works!")}, {owner: true, maxargs: 0});

commands.set("help", msg => {
	let embed;
	if (msg.channel.type != "dm")
		msg.reply("help is coming in your DMs!");
	for (let type of commandTypes) {
		embed = tools.defaultEmbed();
		for (let command of commands.array) {
			if (command.options.props !== undefined && command.options.props.show && command.options.props.type == type) {
				embed.addField(config.prefix + command.options.props.name, command.options.props.desc);
			}
		}
		if (type == utilityType)
			msg.author.send("Options between brackets are ``required``. Those between parenthesis are ``optional``.\n\n" + type + " (" + embed.fields.length + ")", embed);
		else
			msg.author.send(type + " (" + embed.fields.length + ")", embed);
	}
}, {maxargs: 0, props: new classes.Command("help", "you probably know what this command does or else you wouldn't be reading this", utilityType, true)});

commands.set("invite", msg => {
	msg.channel.send("What? You want me to join you? Daisuki! :heart:\nThen click here: https://discordapp.com/oauth2/authorize?client_id=273576577512767488&scope=bot&permissions=70437888");
}, {maxargs: 0, props: new classes.Command("invite", "get a link to invite the bot to your server", botType, true)});

commands.set("joinserver", msg => {
	if (msg.channel.type != "text" || msg.guild.id != config.guilds.test)
		msg.channel.send("You want to join the test server? https://discord.gg/aCgwj8M");
	else
		msg.channel.send("And... you're arrived!");
}, {maxargs: 0, props: new classes.Command("joinserver", "get an invite to the test server", botType, true)});

commands.set("ping", msg => {
	msg.channel.send(":ping_pong: Pong!").then(msg2 => {
		msg2.edit(":ping_pong: Pong! (``" + (msg2.createdTimestamp - msg.createdTimestamp) + "`` ms)");
	});
}, {props: new classes.Command("ping", "pong!", botType, true)});

commands.set("exec", msg => {
	(async () => {
		try {
			let val = eval(msg.content.replace(config.prefix + "exec ", ""));
			let str = "Executed: ```js\n";
			if (val instanceof Promise) {
				val = await val;
				str = "Executed (Promise): ```js\n";
			}
			console.dir(val, {colors: true});
			let tosend = val instanceof Function ? val : util.inspect(val, {depth: 0, breakLength: 0});
			msg.channel.send(str + tosend + "\n```").catch(err => {
				msg.channel.send("Execution sent to console.");
			});
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

commands.set("info", msg => {
	funcs.showInfo(msg).then(embed => {
		msg.channel.send("", embed);
	});
}, {maxargs: 0, props: new classes.Command("info", "info about me", botType, true)});

commands.set("uptime", msg => {
	msg.channel.send("I have been up for ``" + uptime.strings.text + "``. My last reboot was ``" + client.readyAt.toUTCString() + "``.");
}, {maxargs: 0, props: new classes.Command("uptime", "for how long the bot has been running", botType, true)});

commands.set("serverinfo", async msg => {
	msg.channel.send("", await msg.guild.embedInfo());
}, {override: true, dms: false, maxargs: 0, permissions: ["MANAGE_GUILD"], props: new classes.Command("serverinfo", "info about this server, you need to have the permission to manage the server", utilityType, true)});

commands.set("channelinfo", msg => {
	let nb = msg.content.split(" ").slice(1).length;
	let channel = msg.channel;
	if (nb > 0)
		channel = tools.stringToChannel(msg.content.replace(config.prefix + "channelinfo ", ""), msg.guild);
	if (channel === undefined)
		msg.channel.send("This channel doesn't exist.");
	else
		msg.channel.send("", channel.embedInfo());
}, {override: true, dms: false, permissions: ["MANAGE_CHANNELS"], props: new classes.Command("channelinfo (channel name)", "info about a text/voice channel (case sensitive), you need to have the permission to manage channels", utilityType, true)});

commands.set("userinfo", async msg => {
	let nb = msg.content.split(" ").slice(1).length;
	let member = msg.member;
	if (nb > 0)
		member = await tools.stringToMember(msg.content.replace(config.prefix + "userinfo ", ""), msg.guild);
	if (member === undefined)
		msg.channel.send("This user doesn't exist.");
	else {
		if (isOwner(msg.author) || msg.member.hasPermission("ADMINISTRATOR") || msg.member.highestRole.comparePositionTo(member.highestRole) > 0 || msg.member.user.id == member.user.id)
			msg.channel.send("", member.embedInfo());
		else
			msg.channel.send("You don't have the necessary permissions.");
	}
}, {override: true, dms: false, props: new classes.Command("userinfo (username)", "info about a user (case sensitive), your highest role needs to be above the user's highest role", utilityType, true)});

commands.set("roleinfo", msg => {
	let nb = msg.content.split(" ").slice(1).length;
	let role = msg.member.highestRole;
	if (nb > 0)
		role = tools.stringToRole(msg.content.replace(config.prefix + "roleinfo ", ""), msg.guild);
	if (role === undefined)
		msg.channel.send("This role doesn't exist.");
	else
		msg.channel.send("", role.embedInfo());
}, {override: true, dms: false, permissions: ["MANAGE_ROLES"], props: new classes.Command("roleinfo (role name)", "info about a role (case sensitive), you need to have the permission to manage roles", utilityType, true)});

commands.set("join", msg => {
	music.join(msg.member).then(() => {
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
}, {dms: false, maxargs: 0, function: msg => !memeing.has(msg.guild.id), props: new classes.Command("join", "join a voice channel", musicType, true)});

commands.set("leave", msg => {
	music.leave(msg.guild).then(() => {
		musicChannels.delete(msg.guild.id);
		console.log("[MUSICBOT] Leaved guild " + msg.guild.name + " (" + msg.guild.id + ")");
		msg.channel.send("Goodbye o/");
	}).catch(err => {
		funcs.musicErrors(msg, err);
	});
}, {dms: false, maxargs: 0, props: new classes.Command("leave", "leave the voice channel", musicType, true)});

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
}, {dms: false, minargs: 1, maxargs: 1, props: new classes.Command("request [youtube link]", "request a Youtube video using a Youtube link", musicType, true)});

commands.set("query", msg => {
	let query = msg.content.replace(config.prefix + "query ","");
	msg.channel.send("Searching for ``" + query + "`` on Youtube.").then(msg2 => {
		music.add(query, msg.member, {type: "ytquery", passes: 10, apiKey: process.env.YOUTUBEAPIKEY}).then(added => {
			msg2.edit("``" + added.title + "`` by ``" + added.author.name + "`` has been added to the playlist.");
		}).catch(err => {
			if (err.message == "the client is not in a voice channel") msg2.edit("I am not in a voice channel. You can ask me to join you using ``" + config.prefix + "join``.");
			else if (err.message == "no query results") msg2.edit("Sorry but I did not find anything.");
			else funcs.musicErrors(msg, err);
		});
	});
}, {dms: false, minargs: 1, props: new classes.Command("query [youtube query]", "request a Youtube video with a Youtube query", musicType, true)});

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
}, {dms: false, minargs: 1, maxargs: 1, props: new classes.Command("plremove [id]", "remove a music from the playlist", musicType, true)})

commands.set("skip", msg => {
	music.playNext(msg.guild).then(current => {
		msg.channel.send("The current music (``" + current.title + "``) has been skipped.");
	}).catch(err => {
		funcs.musicErrors(msg, err);
	});
}, {dms: false, maxargs: 0, props: new classes.Command("skip", "skip the current music", musicType, true)});

commands.set("plclear", msg => {
	music.clear(msg.guild).then(nb => {
		if (nb == 1)
			msg.channel.send("``1`` music has been removed from the playlist.");
		else
			msg.channel.send("``" + nb + "`` musics have been removed from the playlist.");
	}).catch(err => {
		funcs.musicErrors(msg, err)
	});
}, {dms: false, maxargs: 0, props: new classes.Command("plclear", "clear the playlist", musicType, true)});

commands.set("plshuffle", msg => {
	music.shuffle(msg.guild).then(() => {
		msg.channel.send("The playlist has been shuffled.");
	}).catch(err => {
		funcs.musicErrors(msg, err);
	});
}, {dms: false, maxargs: 0, props: new classes.Command("plshuffle", "shuffle the playlist", musicType, true)});

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
}, {dms: false, maxargs: 0, props: new classes.Command("loop", "loop the current music", musicType, true)});

commands.set("plloop", msg => {
	music.togglePlaylistLooping(msg.guild).then(looping => {
		if (looping)
			msg.channel.send("The playlist is now looping.");
		else
			msg.channel.send("The playlist is no longer looping.");
	}).catch(err => {
		funcs.musicErrors(msg, err);
	});
}, {dms: false, maxargs: 0, props: new classes.Command("plloop", "loop the playlist", musicType, true)});

commands.set("toggle", msg => {
	music.togglePaused(msg.guild).then(paused => {
		if (paused)
			msg.channel.send("The music has been paused.");
		else
			msg.channel.send("The music has been resumed.");
	}).catch(err => {
		funcs.musicErrors(msg, err);
	});
}, {dms: false, maxargs: 0, props: new classes.Command("toggle", "pause/resume the music", musicType, true)});;

commands.set("volume", msg => {
	let volume = Number(msg.content.split(" ").pop());
	if (isNaN(volume))
		return;
	music.setVolume(msg.guild, volume).then(() => {
		msg.channel.send("The volume has been set to ``" + volume + "%``.")
	}).catch(err => {
		funcs.musicErrors(msg, err);
	});
}, {dms: false, minargs: 1, maxargs: 1, props: new classes.Command("volume [value]", "set the volume of the music", musicType, true)});

commands.set("current", msg => {
	let current = music.currentInfo(msg.guild);
	if (current === undefined) {
		msg.channel.send("I am not playing anything at the moment.");
		return;
	}
	let info = tools.defaultEmbed();
	let timer = new Duration(current.time);
	let end = new Duration(current.length);
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
	msg.channel.send("Playing: ``" + timer.strings.timer + " / " + end.strings.timer + " ("+ Math.floor((current.time / current.length)*100) + "%)``", info);
}, {dms: false, maxargs: 0, props: new classes.Command("current", "info about the current music", musicType, true)});

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
			info.addField(i + " - " + music.title + " by " + music.author.name + " (``" + new Duration(music.length).strings.timer + "``)", "Requested by " + music.member);
		}	else
			info.addField(i + " - " + music.title + " (``" + new Duration(music.length).strings.timer + "``)", "Requested by " + music.member);
		i++;
	}
	if (playlist.length > 0) {
		msg.channel.send("Here's the playlist:", info);
		msg.channel.send("Use ``" + config.prefix + "current`` to have information about the current music.");
	} else msg.channel.send("The playlist is empty. Use ``" + config.prefix + "current`` to have information about the current music.");
}, {dms: false, maxargs: 0, props: new classes.Command("playlist", "info about the playlist", musicType, true)});

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
		let str = "";
		if (!current.file)
			str += " " + current.link;
		for (let mus of playlist) {
			if (!mus.file)
				str += " " + mus.link;
		}
		str = str.replace(" ", "");
		let nb = str.split(" ").length;
		if (nb > 6)
			msg.channel.send("You can only save up to ``6`` musics. You have ``" + nb + "`` counting the one playing.");
		else {
			redis.set("guilds->" + msg.guild.id + "->plsaved", str);
			msg.channel.send("The current playlist has been saved. Use ``" + config.prefix + "plload`` to load it.");
		}
	}
}, {dms: false, maxargs: 0, props: new classes.Command("plsave", "save the current playlist", musicType, true)});

commands.set("plload", msg => {
	if (!redisOK) {
		msg.channel.send("This command is unavailable at the moment.");
		return;
	}
	if (!music.isConnected(msg.guild))
		msg.channel.send("I am not in a voice channel.");
	else {
		redis.get("guilds->" + msg.guild.id + "->plsaved", async (err, str) => {
			if (err) funcs.logError(msg, err);
			if (str === null)
				msg.channel.send("You need to save a playlist first using ``" + config.prefix + "plsave``.");
			else {
				let array = str.split(" ");
				for (let link of array) {
					try {
						await music.add(link, msg.member, {passes: 10});
					} catch(err) {}
				}
				msg.channel.send("The playlist was successfully loaded.");
			}
		});
	}
}, {dms: false, maxargs: 0, props: new classes.Command("plload", "load a saved playlist", musicType, true)});

commands.set("shitpost", msg => {
	let args = msg.content.split(" ").slice(1);
	let link = "https://shitpostgenerator.herokuapp.com";
	if (args.length > 0) {
		link += "/?query=";
		for (let arg of args)
			link += arg + "_";
		link = link.substring(0, link.length-1);
	}
	link.fetchHTTP().then(res => {
		let parsed = JSON.parse(res.text);
		if (!parsed.found)
			msg.channel.send("I did not find any shitpost sorry.");
		else
			msg.channel.send(parsed.tries == 1 ? parsed.shitpost : parsed.shitpost + "\n(took me ``" + (parsed.duration/1000).toFixed(2) + "`` seconds)");
	}).catch(err => {
		msg.channel.send("I'm not in the mood for shitposting right now. Try again later. :grimacing:");
	});
}, {props: new classes.Command("shitpost (query)", "request a random shitpost (as the bot asks the shitpost to a distant server there can be a delay)", funType, true)});

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

commands.set("cahrcg", msg => {
	let lien = "http://explosm.net/rcg";
	lien.fetchHTTP().then(res => {
		msg.channel.send("(from " + lien + ")", {file: res.text.split('<meta property="og:image" content="').pop().split('">').shift()});
	}).catch(err => {
		funcs.logError(msg, err);
	});
}, {maxargs: 0, props: new classes.Command("cahrcg", "random Cyanide and Happiness comic", funType, true)});

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
	searchDanbooru(msg, true);
}, {minargs: 1, nsfw: true, props: new classes.Command("danbooru [tags]", "search something on danbooru", nsfwType, true)});

commands.set("safebooru", msg => {
	searchDanbooru(msg, false);
}, {minargs: 1, props: new classes.Command("safebooru [tags]", "search for a SFW image on safebooru", otherType, true)});

commands.set("waifu", msg => {
	if (msg.channel.type != "dm")
		msg.reply("your waifu doesn't exist and if she did she wouldn't like you.");
	else
		msg.channel.send("Your waifu doesn't exist and if she did she wouldn't like you.")
}, {maxargs: 0, props: new classes.Command("waifu", "get to know who your waifu is", funType, true)});

commands.set("daisuki?", msg => {
	dbl.hasVoted(msg.author.id).then(voted => {
		if (voted)
			msg.dreply("yes! :heart:");
		else
			msg.dreply("no, but I would if you voted for me here: https://discordbots.org/bot/273576577512767488");
	}).catch(err => {
		funcs.logError(msg, err);
	});
}, {props: new classes.Command("daisuki?", "do I like you?", funType, true)});

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
		msg.channel.send(":straight_ruler: | " + str + " (" + msg.member.displayName +")");
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
	let member = msg.member;
	if (msg.content.split(" ").length != 1) {
		let str = msg.content.replace(config.prefix + "nis ", "");
		member = await tools.stringToMember(str, msg.guild);
	}
	if (member !== undefined && member.voiceChannel !== undefined) {
		member.voiceChannel.join().then(connection => {
			memeing.set(member.guild.id, true);
			connection.playFile("./files/fart.mp3", {passes: 10}).on("end", () => {
				setTimeout(() => {
					connection.playFile("./files/burp.mp3", {passes: 10}).on("end", () => {
						memeing.delete(member.guild.id);
						msg.guild.me.voiceChannel.leave();
					}).setVolume(2);
				}, 500);
			}).setVolume(2);
		});
	}
}, {dms: false, users: [config.users.drago, config.users.nis], function: msg => !music.isConnected(msg.guild) && !memeing.has(msg.guild.id)});

commands.set("whatisthebestyoutubechannel?", msg => {
	msg.channel.send("https://www.youtube.com/channel/UC6nSFpj9HTCZ5t-N3Rm3-HA :ok_hand:");
}, {maxargs: 0});

commands.set("hug", async msg => {
	let member = msg.content.split(" ").length == 1 ? msg.member : await tools.stringToMember(msg.content.replace(config.prefix + "hug ", ""), msg.guild);
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
}, {minargs: 1, maxargs: 1, props: new classes.Command("ytbthumb", "retrieve the thumbnail from a Youtube video", otherType, true)});

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
}, {minargs: 1, props: new classes.Command("jisho [text]", "returns information about every kanji in the text", otherType, true)});

// FUNCTIONS ----------------------------------------------------------------------------------------------
function login() {
	console.log("[DRABOT] Trying to connect to Discord servers.");
	client.login(process.env.DISCORDTOKEN).catch(async err => {
		console.log("[DRABOT] Connection failed.");
		console.error(err);
		await tools.sleep(60000);
		login();
	});
}

function addMeme(name) {
	commands.set(name, async msg => {
		let member = msg.member;
		if (msg.content.split(" ").length != 1) {
			let str = msg.content.replace(config.prefix + name + " ", "");
			member = await tools.stringToMember(str, msg.guild);
		}
		if (member !== undefined && member.voiceChannel !== undefined) {
			member.voiceChannel.join().then(connection => {
				memeing.set(member.guild.id, true);
				connection.playFile("./files/" + name + ".mp3", {passes: 10}).on("end", () => {
					setTimeout(() => {
						memeing.delete(member.guild.id);
						msg.guild.me.voiceChannel.leave();
					}, 500);
				}).setVolume(2);
			});
		}
	}, {dms: false, function: msg => !music.isConnected(msg.guild) && !memeing.has(msg.guild.id)});
}

function isOwner(user) {
	return commands.owners.includes(user.id);
}

async function searchDanbooru(msg, nsfw) {
	try {
		let query = msg.content.split(" ").slice(1);
		if (query.length > 2) {
			msg.channel.send("You can't search for more than 2 tags at the same time.");
			return;
		}
		let posts;
		if (nsfw) posts = await booru.posts(query);
		else posts = await safebooru.posts(query);
		if (posts.length == 0)
			msg.channel.send("Sorry, I didn't find anything about ``" + query.join(" ") + "``.");
		else {
			let post = {large_file_url: undefined};
			while (post.large_file_url === undefined)
				post = posts.random().raw;
			let link = post.large_file_url.includes("https://") ? post.large_file_url : "http://danbooru.donmai.us" + post.large_file_url;
			msg.channel.send("Search: ``" + query.join(" ") + "``", {file: link});
		}
	} catch(err) {
		funcs.logError(msg, err);
	}
}

// PROTOTYPES ----------------------------------------------------------------------------------------------
Object.defineProperty(String.prototype, "fetchHTTP", {
	value: function fetchHTTP() {
		return new Promise((resolve, reject) => {
			if (debug)
				console.log("[HTTP] Fetch " + this);
			snekfetch.get(this)
			.then(resolve)
			.catch(reject);
		});
	}
});

Object.defineProperty(String.prototype, "firstUpper", {
	value: function() {
		return this[0].toUpperCase() + this.slice(1);
	}
});

Object.defineProperty(Array.prototype, "random", {
	value: function() {
		if (this.length == 0)
			return undefined;
		return this[tools.random(this.length-1)];
	}
});

Object.defineProperty(discord.Message.prototype, "dreply", {
	value: function(content) {
		if (this.channel.type == "text")
			return this.reply(content);
		else
			return this.channel.send(content.firstUpper());
	}
});

Object.defineProperty(discord.Guild.prototype, "nbCon", {
	value: function nbCon() {
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
});

Object.defineProperty(discord.Guild.prototype, "embedInfo", {
	value: function embedInfo() {
		return funcs.showGuildInfo(this);
	}
});

Object.defineProperty(discord.Channel.prototype, "embedInfo", {
	value: function embedInfo() {
		return funcs.showChannelInfo(this);
	}
});

Object.defineProperty(discord.Role.prototype, "embedInfo", {
	value: function embedInfo() {
		return funcs.showRoleInfo(this);
	}
});

Object.defineProperty(discord.GuildMember.prototype, "embedInfo", {
	value: function embedInfo() {
		return funcs.showMemberInfo(this);
	}
});
