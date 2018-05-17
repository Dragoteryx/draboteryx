"use strict";
require("dotenv").config();
require("./src/prototypes.js");

// IMPORTS
const discord = require("discord.js");
const snekfetch = require("snekfetch");
const mc = require("minecraft-protocol");
const DBL = require("dblapi.js");

// FILES
const config = require("./config.js");
const tools = require("./src/tools.js");
const funcs = require("./src/funcs.js");
const data = require("./src/data.js");
const crypt = require("./src/crypt.js");
const CommandHandler = require("./src/commands.js");
const MusicHandler = require("./src/music.js");
const Lang = require("./langs/langs.js");
MusicHandler.setYoutubeApiKey(process.env.YOUTUBEAPIKEY);

// CONSTS
const client = new discord.Client();
const commands = new CommandHandler();
commands.owners = config.owners;
const music = new MusicHandler(client);
const langs = {
  en: new Lang("en"),
  fr: new Lang("fr")
}
const commandTypes = ["utility", "game", "fun", "misc", "music", "nsfw", "bot"];
let dbl = null;
if (process.env.HEROKU) {
  dbl = new DBL(process.env.DBLAPITOKEN, client);
  // other stuff
}

// GLOBALS
const musicChannels = new Map();
const onMessageCallbacks = new Map();
let connected = false;
let debug = false;

// EXPORTS
exports.client = client;
exports.commands = commands;
exports.langs = langs;

// LISTEN TO MESSAGES
client.on("message", async msg => {

  // set prefix and lang
  if (msg.guild) {
    if (!msg.guild.fetched && data.ok) {
      try {
        let res = await msg.guild.fetchData();
        if (res.lang) msg.guild._lang = res.lang;
        if (res.prefix) msg.guild._prefix = res.prefix;
        msg.guild.fetched = true;
      } catch(err) {}
    }
    if (!msg.author.bot) {
      if (!msg.author.dmChannel)
        await msg.author.createDM();
      msg.author.dmChannel._lang = msg.lang.id();
      msg.author.dmChannel._prefix = msg.prefix;
    }
  }

  // COMMANDS
	commands.check(msg, {prefix: msg.prefix}).then(res => {
		if (debug) {
			if (res.result.reasons !== undefined && (res.result.reasons.includes("no prefix") || res.result.reasons.includes("unknown command"))) return;
			console.log("[DEBUG] " + msg.content);
			console.log(res);
		}
		if (!res.result.valid) {
			if (res.result.reasons.includes("no prefix") || res.result.reasons.includes("unknown command"))
				return;
			else if (res.result.reasons.includes("guild only command"))
				msg.channel.send(msg.lang.errors.guildOnlyCommand());
			else if (res.result.reasons.includes("owner only command"))
				msg.channel.send(msg.lang.errors.ownerOnlyCommand());
			else if (res.result.reasons.includes("missing permissions"))
				msg.channel.send(msg.lang.errors.missingPermissionsCommand("$PREFIX", msg.prefix));
			else if (res.result.reasons.includes("vote required"))
				msg.channel.send(msg.lang.errors.voteRequiredCommand("$VOTELINK", "https://discordbots.org/bot/273576577512767488/vote"));
			else if (res.result.reasons.includes("nsfw"))
				msg.channel.send(msg.lang.errors.nsfwCommand());
			else if (res.result.reasons.some(reason => reason.includes(" arguments: ")))
				msg.channel.send(msg.lang.errors.wrongSyntax("$PREFIX", msg.prefix, "$COMMANDNAME", res.command.name));
		}
	}).catch(err => {
		console.error(err);
	});

  // ON MESSAGE CALLBACKS
  onMessageCallbacks.forEach(func => func(msg));

});

// EVENTS
process.on("unhandledRejection", err => {
	if (err instanceof discord.DiscordAPIError && process.env.HEROKU)
		console.log("[ERROR] Unhandled Promise Rejection:\nDiscordAPIError: " + err.message);
	else {
		console.log("[ERROR] Unhandled Promise Rejection:");
		console.error(err);
	}
});
client.on("ready", async () => {
	if (!connected) {
    let owner = (await client.fetchApplication()).owner;
		connected = true;
		console.log("[DRABOT] Connected!");
		if (process.env.HEROKU) {
			console.log("(Heroku launch)");
      if (owner.presence.status == "online")
			  owner.send("Heroku launch complete.");
		} else {
			console.log("(local launch)");
      if (owner.presence.status == "online")
			  owner.send("Local launch complete.");
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
/*client.on("guildCreate", guild => {

});
client.on("guildDelete", guild => {

});*/
music.on("next", (playlist, next) => {
	if (!next.file)
		musicChannels.get(playlist.guild.id).send(playlist.guild.lang.music.nowPlaying("$TITLE", next.title, "$AUTHOR", next.author.name, "$MEMBER", next.member.displayName));
	else
		musicChannels.get(playlist.guild.id).send(playlist.guild.lang.music.nowPlayingFile("$TITLE", next.title, "$MEMBER", next.member.displayName));
});
music.on("empty", playlist => {
	musicChannels.get(playlist.guild.id).send(playlist.guild.lang.music.emptyPlaylist());
});
music.on("clientMove", (oldChannel, newChannel) => {
	musicChannels.get(newChannel.guild.id).send(newChannel.lang.music.clientMoved("$CHANNEL", newChannel));
});
music.on("memberJoin", (member, channel) => {
	if (member.guild.leaveTimeout) {
		client.clearTimeout(member.guild.leaveTimeout);
		member.guild.leaveTimeout = null;
		musicChannels.get(member.guild.id).send(channel.lang.music.memberJoined());
	}
});
music.on("memberLeave", (member, channel) => {
	if (channel.members.size == 1) {
		musicChannels.get(member.guild.id).send(channel.lang.music.leaveInactivity());
		member.guild.leaveTimeout = client.setTimeout(() => {
			member.guild.playlist.leave().then(() => {
				member.guild.busy = false;
        member.guild.leaveTimeout = null;
				musicChannels.get(member.guild.id).send(msg.lang.leave());
				musicChannels.delete(member.guild.id);
				console.log("[MUSICBOT] Leaved guild " + member.guild.name + " (" + member.guild.id + ")");
			}).catch(funcs.logError);
		}, 60000);
  }
});

// COMMANDS --------------------------------------------------

// BOT
commands.set("test", msg => {
  msg.channel.send(msg.lang.test() + " (" + msg.lang.name() + ")");
}, {owner: true, maxargs: 0});

commands.set("exec", async msg => {
	try {
		let val = eval(msg.content.replace(msg.prefix + "exec ", ""));
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
}, {owner: true, minargs: 1});

commands.set("help", msg => {
	let args = msg.content.split(" ").slice(1);
	if (args.length == 0) {
		let coms = [];
		for (let command of commands.array)
			if (command.options.info.show) coms.push({name: command.name, type: command.options.info.type});
		let embed = tools.defaultEmbed();
		embed.addField("Drabot " + msg.prefix + "help", msg.lang.commands.help.info("$PREFIX", msg.prefix));
		for (let type of commandTypes) {
			let str = "";
			for (let com of coms)
				if (com.type == type) str += " ``" + com.name + "``";
      if (str == "") str = "---";
			embed.addField(msg.lang.types()[type], str.replace(" ", ""));
		}
		msg.author.send("", embed);
		if (msg.channel.type != "dm")
			msg.reply(msg.lang.commands.help.takeALook());
	} else {
		if (commands.has(args[0])) {
			let command = commands.get(args[0]);
			if (!command.options.info.show)
				msg.channel.send(msg.lang.commands.help.unknownCommand("$PREFIX", msg.prefix));
			else {
				let embed = tools.defaultEmbed()
				.addField(msg.lang.commands.help.embedcontent1(), command.name, true)
				.addField(msg.lang.commands.help.embedcontent2(), msg.lang.types()[command.options.info.type], true)
				.addField(msg.lang.commands.help.embedcontent3(), msg.lang.commands[command.name].description())
				.addField(msg.lang.commands.help.embedcontent4(), "```" + msg.prefix + msg.lang.commands[command.name].syntax() + "```");
				msg.author.send("", embed);
				if (msg.channel.type != "dm")
					msg.reply(msg.lang.commands.help.takeALook());
			}
		} else {
			msg.channel.send(msg.lang.commands.help.unknownCommand("$PREFIX", msg.prefix));
		}
	}
}, {maxargs: 1, info: {show: true, type: "bot"}});

commands.set("about", async msg => {
  msg.channel.send("", await funcs.showInfo(msg));
}, {maxargs: 0, info: {show: true, type: "bot"}});

commands.set("prefix", async msg => {
  let args = msg.content.split(" ");
  if (args.length == 1) {
    msg.reply(msg.lang.commands.prefix.current("$PREFIX", msg.prefix));
  } else if (msg.guild) {
    let prefix = args[1];
    let data = await msg.guild.fetchData();
    data.prefix = prefix;
    msg.guild._prefix = prefix;
    msg.guild.sendData(data);
    msg.channel.send(msg.lang.commands.prefix.set("$PREFIX", msg.prefix));
  } else msg.reply(msg.lang.commands.prefix.guildonly());
}, {maxargs: 0, info: {show: true, type: "bot"}});

commands.set("lang", async msg => {
  let args = msg.content.split(" ");
  if (args.length == 1) {
    let str = "";
    for (let lang of Object.values(langs))
      str += "\n- " + lang.name() + "(`" + lang.id() + "`)";
    msg.reply(msg.lang.commands.lang.list() + str);
  } else if (msg.guild) {
    let lang = args[1];
    if (Object.keys(langs).includes(lang)) {
      let data = await msg.guild.fetchData();
      data.lang = lang;
      msg.guild._lang = lang;
      msg.guild.sendData(data);
      let name = msg.lang.name()
      msg.channel.send(msg.lang.commands.lang.set("$LANG", name));
    } else msg.reply(msg.lang.commands.lang.unknown());
  } else msg.reply(msg.lang.commands.lang.guildonly());
}, {maxargs: 0, info: {show: true, type: "bot"}});

// UTILS
commands.set("serverinfo", async msg => {
  msg.channel.send("", await msg.guild.embedInfo());
}, {guildonly: true, maxargs: 0, info: {show: true, type: "utility"}});

commands.set("userinfo", async msg => {
	let member = msg.member;
	if (msg.content.split(" ").slice(1).length > 0)
	  member = (await tools.stringToMembers(msg.content.replace(msg.prefix + "userinfo ", ""), msg.guild)).shift();
	if (!member)
		msg.channel.send(msg.lang.commands.userinfo.noUser());
	else
		msg.channel.send("", member.embedInfo());
}, {guildonly: true, info: {show: true, type: "utility"}});

commands.set("channelinfo", msg => {
	let nb = msg.content.split(" ").slice(1).length;
	let channel = msg.channel;
	if (nb > 0)
		channel = tools.stringToChannels(msg.content.replace(msg.prefix + "channelinfo ", ""), msg.guild).shift();
	if (!channel)
		msg.channel.send(msg.lang.commands.channelinfo.noChannel());
	else
		msg.channel.send("", channel.embedInfo());
}, {guildonly: true, info: {show: true, type: "utility"}});

commands.set("roleinfo", msg => {
	let nb = msg.content.split(" ").slice(1).length;
	let role = msg.member.highestRole;
	if (nb > 0)
		role = tools.stringToRoles(msg.content.replace(msg.prefix + "roleinfo ", ""), msg.guild).shift();
	if (!role)
		msg.channel.send(msg.lang.commands.roleinfo.noRole());
	else
		msg.channel.send("", role.embedInfo());
}, {guildonly: true, info: {show: true, type: "utility"}});

// MUSIC
commands.set("join", async msg => {
	if (msg.guild.busy) return;
	music.join(msg.member).then(() => {
		msg.guild.busy = true;
    msg.guild.leaveTimeout = null;
		if (tools.getDate() == "1/4") {
			music.add(process.env.APRIL_1ST_MUSIC, msg.guild.me, {passes: 10}).then(() => {
				msg.channel.send("Happy April Fools' !");
			});
		}
		musicChannels.set(msg.guild.id, msg.channel);
		msg.channel.send(msg.lang.music.join());
	}).catch(err => {
		funcs.musicErrors(msg, err);
	});
}, {guildonly: true, maxargs: 0, info: {show: true, type: "music"}});

commands.set("leave", msg => {
	music.leave(msg.guild).then(() => {
		msg.guild.busy = false;
    msg.guild.leaveTimeout = null;
		musicChannels.delete(msg.guild.id);
		msg.channel.send(msg.lang.music.leave());
	}).catch(err => {
		funcs.musicErrors(msg, err);
	});
}, {guildonly: true, maxargs: 0, info: {show: true, type: "music"}});

commands.set("request", msg => {
	let link = msg.content.replace(msg.prefix + "request ","");
	if (!music.isConnected(msg.guild)) {
		msg.channel.send(msg.lang.music.notConnected() + " " + msg.lang.music.askToJoin("$PREFIX", msg.prefix));
		return;
	}
	msg.channel.send(msg.lang.music.addingToPlaylist("$LINK", link)).then(msg2 => {
		music.add(link, msg.member, {passes: 10}).then(added => {
			msg2.edit(msg.lang.music.addedToPlaylist("$TITLE", added.title, "$AUTHOR", added.author.name));
		}).catch(err => {
      if (err.message.includes("not supported")) msg2.edit(msg.lang.music.unknownWebsite());
			else if (err.message.includes("unavailable")) msg2.edit(msg.lang.music.videoUnavailable());
			else if (err.message.includes("does not match expected format")) msg2.edit(msg.lang.music.unexpectedFormat());
			else funcs.musicErrors(msg, err);
		});
	});
}, {guildonly: true, minargs: 1, maxargs: 1, info: {show: true, type: "music"}});

commands.set("query", async msg => {
	try {
		let query = msg.content.replace(msg.prefix + "query ", "");
		let msg2 = await msg.channel.send(msg.lang.music.searchingOnYoutube("$QUERY", query));
		let videos = await MusicHandler.queryYoutube(query, 5);
    let choice;
		if (videos.length == 0) {
			msg2.edit(msg.lang.noResults());
			return;
		} else if (videos.length > 1) {
      let embed = tools.defaultEmbed();
  		for (let i = 0; i < videos.length; i++)
  			embed.addField((i+1) + " - " + videos[i].title + " " + msg.lang.music.by() + " " + videos[i].authorName + " (" + tools.parseTimestamp(videos[i].length).timer + ")", videos[i].link);
  		msg2.edit(msg.lang.music.queryChoice(), embed);
  		let msg3 = await msg.channel.waitResponse({delay: 20000, filter: msg3 => {
  			choice = Number(msg3.content);
  			if (msg3.author.id != msg.author.id || isNaN(choice)) return false;
  			else if (!tools.range(1, videos.length).includes(choice)) {
  				msg.channel.send(msg.lang.music.queryNumber("$NBVIDEOS", videos.length));
  				return false;
  			} else return true;
  		}});
  		if (msg3 === null) {
  			msg.channel.send(msg.lang.music.noResFirstOne());
  			choice = 0;
  		} else choice = Number(msg3.content) - 1;
    } else {
      msg2.edit(msg.lang.music.oneResult());
      choice = 0;
    }
		let added = await music.add(videos[choice].link, msg.member, {passes: 10});
		msg.channel.send(msg.lang.music.addedToPlaylist("$TITLE", added.title, "$AUTHOR", added.author.name));
	} catch(err) {
		funcs.musicErrors(msg, err);
	}
}, {guildonly: true, minargs: 1, info: {show: true, type: "music"}});

commands.set("ytbplaylist", async msg => {
	let link = msg.content.replace(msg.prefix + "ytbplaylist ","");
	if (!music.isConnected(msg.guild)) {
		msg.channel.send(msg.lang.music.notConnected() + " " + msg.lang.music.askToJoin("$PREFIX", msg.prefix));
		return;
	}
	if (!link.startsWith("https://www.youtube.com/playlist?list=")) {
		msg.channel.send(msg.lang.ùusic.invalidYoutubePlaylistLink());
		return;
	}
	let msg2 = await msg.channel.send(msg.lang.music.fetchingYoutubePlaylist("$LINK", link));
	DrGMusic2.youtubePlaylist(link).then(async playlist => {
		msg2.edit(msg.lang.music.fetchingYoutubePlaylist2("$TITLE", playlist.title));
		for (let video of playlist.videos) {
			try {
				await music.add(video.link, msg.member, {passes: 10});
			} catch(err){}
		}
		msg.channel.send(msg.lang.music.youtubePlaylistFetched("$TITLE", playlist.title));
	}).catch(err => {
		funcs.logError(msg, err);
	});
}, {guildonly: true, minargs: 1, maxargs: 1, info: {show: true, type: "music"}});

commands.set("plremove", msg => {
	let id = Math.floor(Number(msg.content.split(" ").pop()))-1;
	if (isNaN(id)) {
		msg.channel.send(msg.lang.music.invalidMusicIndex());
		return;
	}
	music.remove(msg.guild, id).then(removed => {
		msg.channel.send(msg.lang.music.removedFromPlaylist("$TITLE", removed.title));
	}).catch(err => {
		funcs.musicErrors(msg, err);
	});
}, {guildonly: true, minargs: 1, maxargs: 1, info: {show: true, type: "music"}})

commands.set("skip", msg => {
	music.playNext(msg.guild).then(current => {
		msg.channel.send(msg.lang.music.skipped("$TITLE", current.title));
	}).catch(err => {
		funcs.musicErrors(msg, err);
	});
}, {guildonly: true, maxargs: 0, info: {show: true, type: "music"}});

commands.set("plclear", msg => {
	music.clear(msg.guild).then(nb => {
		if (nb == 1)
			msg.channel.send(msg.lang.music.clear1());
		else
			msg.channel.send(msg.lang.music.clearMore("$NB", nb));
	}).catch(err => {
		funcs.musicErrors(msg, err)
	});
}, {guildonly: true, maxargs: 0, info: {show: true, type: "music"}});

commands.set("plshuffle", msg => {
	music.shuffle(msg.guild).then(() => {
		msg.channel.send(msg.lang.music.shuffled());
	}).catch(err => {
		funcs.musicErrors(msg, err);
	});
}, {guildonly: true, maxargs: 0, info: {show: true, type: "music"}});

commands.set("loop", msg => {
	music.toggleLooping(msg.guild).then(looping => {
		let current = music.currentInfo(msg.guild);
			if (looping)
				msg.channel.send(msg.lang.music.loopingOn("$TITLE", current.title));
			else
				msg.channel.send(msg.lang.music.loopingOff("$TITLE", current.title));
	}).catch(err => {
		funcs.musicErrors(msg, err);
	});
}, {guildonly: true, maxargs: 0, info: {show: true, type: "music"}});

commands.set("plloop", msg => {
	music.togglePlaylistLooping(msg.guild).then(looping => {
		if (looping)
			msg.channel.send(msg.lang.music.playlistLoopingOn());
		else
			msg.channel.send(msg.lang.music.playlistLoopingOff());
	}).catch(err => {
		funcs.musicErrors(msg, err);
	});
}, {guildonly: true, maxargs: 0, info: {show: true, type: "music"}});

commands.set("toggle", msg => {
	music.togglePaused(msg.guild).then(paused => {
		if (paused)
			msg.channel.send(msg.lang.music.paused());
		else
			msg.channel.send(msg.lang.music.resumed());
	}).catch(err => {
		funcs.musicErrors(msg, err);
	});
}, {guildonly: true, maxargs: 0, info: {show: true, type: "music"}});;

commands.set("volume", msg => {
	let volume = Number(msg.content.split(" ").pop());
	if (isNaN(volume))
		return;
	music.setVolume(msg.guild, volume).then(() => {
		msg.channel.send(msg.lang.music.volumeSet("$VOLUME", volume));
	}).catch(err => {
		funcs.musicErrors(msg, err);
	});
}, {guildonly: true, minargs: 1, maxargs: 1, info: {show: true, type: "music"}});

commands.set("current", msg => {
	let current = music.currentInfo(msg.guild);
	if (current === undefined) {
		msg.channel.send(msg.lang.music.notPlaying());
		return;
	}
	let info = tools.defaultEmbed();
	if (!current.file) {
		info.setThumbnail(current.thumbnailURL)
		.addField(msg.lang.music.title(), current.title, true)
		.addField(msg.lang.music.author(), current.author.name + " (" + current.author.channelURL + ")", true)
		.addField(msg.lang.music.description(), current.description.length > 1024 ? current.description.substring(0, 1021) + "..." : current.description, true)
		.addField(msg.lang.music.link(), current.link, true)
	} else
		info.addField(msg.lang.music.fileName(), current.title, true);
  info.addField(msg.lang.music.requestedBy(), current.member, true);
	msg.channel.send(msg.lang.music.playingDisplay() + " ``" + tools.parseTimestamp(current.time).timer + " / " + tools.parseTimestamp(current.length).timer + " ("+ Math.floor((current.time / current.length)*100) + "%)``", info);
}, {guildonly: true, maxargs: 0, info: {show: true, type: "music"}});

commands.set("playlist", msg => {
	let playlist = music.playlistInfo(msg.guild);
	if (playlist === undefined) {
		msg.channel.send(msg.lang.music.notConnected());
		return;
	}
	let info = tools.defaultEmbed();
	let i = 1;
	for (let music of playlist) {
		if (!music.file) {
			info.addField(i + " - " + music.title + " " + msg.lang.music.by() + " " + music.author.name + " (``" + tools.parseTimestamp(music.length).timer + "``)", msg.lang.music.requestedBy() + " " + music.member);
		}	else
			info.addField(i + " - " + music.title + " (``" + tools.parseTimestamp(music.length).timer + "``)", msg.lang.music.requestedBy() + " " + music.member);
		i++;
	}
	if (playlist.length > 0) {
		msg.channel.send(msg.lang.music.playlistDisplay(), info);
		msg.channel.send(msg.lang.music.playlistDisplayCurrent("$PREFIX", msg.prefix));
	} else msg.channel.send(msg.lang.music.emptyPlaylist() + " " + msg.lang.music.playlistDisplayCurrent("$PREFIX", msg.prefix));
}, {guildonly: true, maxargs: 0, info: {show: true, type: "music"}});


// ELSE
commands.set("say", msg => {
	let content = msg.content.replace(msg.prefix + "say ", "");
	msg.channel.send(content);
	msg.delete();
}, {owner: true, minargs: 1});

commands.set("ttsay", msg => {
	let content = msg.content.replace(msg.prefix + "ttsay ", "");
	msg.channel.send(content, {tts: true});
	msg.delete();
}, {owner: true, minargs: 1});

commands.set("roll", msg => {
	let args = msg.content.split(" ").slice(1);
	let max = 6;
	if (args.length == 1 && !isNaN(Number(args[0])) && Number(args[0]) > 0)
		max = Number(args[0]);
	let res = tools.random(1, max);
	msg.reply(res + "/" + max + " (:game_die:)");
}, {info: {show: true, type: "fun"}});

commands.set("fact", msg => {
	let args = msg.content.split(" ").slice(1);
	let link = "https://factgenerator.herokuapp.com/generate/";
	if (args.length > 0) {
		for (let arg of args)
			link += arg + "_";
		link = link.substring(0, link.length-1);
	}
	snekfetch.get(link).then(res => {
		let parsed = JSON.parse(res.text);
		if (!parsed.found)
			msg.channel.send(msg.lang.commands.fact.noResults());
		else
			msg.channel.send(parsed.fact);
	}).catch(err => {
		msg.channel.send(msg.lang.commands.fact.offline());
	});
}, {info: {show: true, type: "fun"}});

commands.set("reflex", async msg => {
	if (msg.channel.reflex) return;
	msg.channel.reflex = true;
	msg.channel.send(msg.lang.commands.reflex.rules());
	await tools.sleep(tools.random(5000, 15000));
	let random = tools.random(100, 999);
	await msg.channel.send(msg.lang.commands.reflex.msg("$RANDOM", random));
	let msg2 = await msg.channel.waitResponse({delay: 10000, filter: msg2 => {
		if (msg2.content == random && msg2.author.bot) {
			msg2.reply(msg.lang.commands.reflex.bots());
			return false;
		}
		return msg2.content == random;
	}});
	if (!msg2) msg.channel.send(msg.lang.commands.reflex.slow());
	else msg.channel.send(msg.lang.commands.reflex.wellPlayed("$WINNER", msg2.member.displayName));
	msg.channel.reflex = false;
}, {guildonly: true, maxargs: 0, info: {show: true, type: "game"}});

commands.set("fbw", msg => {
	mc.ping({host: "play.fantabobworld.com"}, (err, res) => {
    if (err) funcs.logError(msg, err);
    else msg.reply("il y a actuellement ``" + res.players.online + "`` joueurs sur le FantaBobWorld.");
  });
}, {guildonly: true, guilds: [config.guilds.patate]});

commands.set("cyanidehappiness", msg => {
  let link = "http://explosm.net/rcg";
	snekfetch.get(link).then(res => {
		msg.channel.send("(" + msg.lang.commands.cyanidehappiness.from("$LINK", link) + ")", {file: res.text.split('<meta property="og:image" content="').pop().split('">').shift()});
	}).catch(err => {
		funcs.logError(msg, err);
	});
}, {maxargs: 0, info: {show: true, type: "fun"}});

commands.set("httpdog", msg => {
	snekfetch.get("https://httpstatusdogs.com").then(res => {
		let img = res.text.split('src="img/').random().split('" alt="')[0];
		let link = "https://httpstatusdogs.com/img/" + img;
		msg.channel.send("", {files: [link]});
	}).catch(err => {
		funcs.logError(msg, err);
	});
}, {maxargs: 0, info: {show: true, type: "fun"}});

commands.set("waifu", msg => {
	msg.reply(msg.lang.commands.waifu.theTruth());
}, {maxargs: 0, info: {show: true, type: "fun"}});

commands.set("whatisthebestyoutubechannel?", msg => {
	msg.channel.send("https://www.youtube.com/channel/UC6nSFpj9HTCZ5t-N3Rm3-HA :ok_hand:");
}, {maxargs: 0});

commands.set("encrypt", async msg => {
	let message = msg.content.replace(msg.prefix + "encrypt ", "");
	let key;
	await msg.channel.send(msg.lang.commands.encrypt.specificKey());
	let msg2 = await msg.channel.waitResponse({delay: 10000, filter: msg2 => msg2.author.id == msg.author.id});
	if (!msg2) key = crypt.genNoise(8);
	else key = msg2.content;
	msg.channel.send(msg.lang.commands.encrypt.encrypted("$MESSAGE", crypt.encrypt(message, key), "$KEY", key));
}, {minargs: 1, info: {show: true, type: "misc"}});

commands.set("decrypt", async msg => {
	let crypted = msg.content.replace(msg.prefix + "decrypt ", "");
	await msg.channel.send(msg.lang.commands.decrypt.keyRequest());
	let msg2 = await msg.channel.waitResponse({delay: 20000, filter: msg3 => msg3.author.id == msg.author.id});
	if (!msg2) msg.channel.send(msg.lang.commands.decrypt.unknownKey());
	else {
		let message = crypt.decrypt(crypted, msg2.content);
		if (!message) msg.channel.send(msg.lang.commands.decrypt.wrongKey());
		else msg.channel.send(msg.lang.commands.decrypt.decrypted("$MESSAGE", message));
	}
}, {minargs: 1, info: {show: true, type: "misc"}});

// PROTOTYPES
Object.defineProperty(discord.Channel.prototype, "waitResponse", {
	value: function(options = {}) {
		return new Promise(resolve => {
			if (options.delay === undefined)
				options.delay = -1;
			if (options.filter === undefined)
				options.filter = () => true;
			let random;
			do {
				random = tools.random(0, 10000);
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

// FUNCTIONS
function login() {
	console.log("[DRABOT] Trying to connect to Discord servers.");
	client.login(process.env.DISCORDTOKEN).catch(async () => {
		console.log("[DRABOT] Connection failed. Retry in 60 seconds.");
		await tools.sleep(60000);
		login();
	});
}

login();
