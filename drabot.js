"use strict";
require("dotenv").config();
require("./src/prototypes.js");

// IMPORTS
const discord = require("discord.js");
const snekfetch = require("snekfetch");
const DBL = require("dblapi.js");
const Danbooru = require("danbooru");

// FILES
const config = require("./config.js");
const tools = require("./src/tools.js");
const funcs = require("./src/funcs.js");
const data = require("./src/data.js");
const crypt = require("./src/crypt.js");
const CommandHandler = require("./src/commands.js");
const music = require("./src/music.js");
const cleverbot = require("./src/cleverbot.js");
const Lang = require("./langs/langs.js");
//const listenmoe = require("./src/listenmoe.js");

// CONSTS
const client = new discord.Client();
const commands = new CommandHandler();
commands.owners = config.owners;
const langs = {
  en: new Lang(require("./langs/lang_en.json")),
  fr: new Lang(require("./langs/lang_fr.json"), require("./langs/lang_en.json"))
}
const commandTypes = ["moderation", "utility", "game", "fun", "misc", "music", "nsfw", "bot"];
const dbl = process.env.HEROKU ? new DBL(process.env.DBLAPITOKEN, client) : null;
const pfAliases = [];
const vars = {};
const booru = new Danbooru(process.env.DANBOORU_LOGIN + ":" + process.env.DANBOORU_KEY);
// GLOBALS
let connected = false;
let debug = false;

// EXPORTS
exports.client = client;
exports.commands = commands;
exports.langs = langs;
exports.vars = vars;

// LISTEN TO MESSAGES
client.on("message", async msg => {
  try {
    if (msg.author.id == client.user.id) return;

    // set prefix and lang
    if (msg.guild) {
      if (!msg.guild.fetched) {
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

    // replace tag with prefix
    for (let alias of pfAliases) {
      if (msg.content.startsWith(alias) && !msg.usedPrefixAlias) {
        msg.content = msg.content.replace(alias, msg.prefix);
        msg.usedPrefixAlias = true;
      }
    }

    // on message callbacks
    msg.channel.onMsgCallbacks.forEach(func => func(msg));

    // commands
  	let res = await commands.run(msg);
  	if (!res.result.valid) {
  		if (res.result.reasons.includes("no prefix") || res.result.reasons.includes("unknown command"))
        if (msg.channel.name.toLowerCase().includes("cleverbot")) {
          let res = await cleverbot(msg);
          if (res) msg.channel.send(res);      
        }
      else if (res.result.reasons.includes("owner only command"))
  			msg.channel.send(msg.lang.errors.ownerOnlyCommand());
      else if (res.result.reasons.includes("disabled"))
        msg.channel.send(msg.lang.errors.disabledCommand());
  		else if (res.result.reasons.includes("guild only command"))
  			msg.channel.send(msg.lang.errors.guildOnlyCommand());
      else if (res.result.reasons.includes("admin only command"))
  			msg.channel.send(msg.lang.errors.adminOnlyCommand());
      else if (res.result.reasons.includes("mod only command"))
  			msg.channel.send(msg.lang.errors.modOnlyCommand());
      else if (res.result.reasons.includes("dj only command"))
  			msg.channel.send(msg.lang.errors.djOnlyCommand());
  		else if (res.result.reasons.includes("nsfw"))
  			msg.channel.send(msg.lang.errors.nsfwCommand());
  		else if (res.result.reasons.some(reason => reason.includes(" arguments: ")))
  			msg.channel.send(msg.lang.errors.wrongSyntax("$PREFIX", msg.prefix, "$COMMAND", res.command.name));
  	}

  } catch(err) {
    funcs.logError(msg, err);
  }
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
    if (!pfAliases.ready) {
      pfAliases.push("<@" + client.user.id + "> ", "<@!" + client.user.id + "> ");
      pfAliases.ready = true;
    }
		connected = true;
    client.user.setActivity(config.prefix + "help");
		console.log(client.shard ? "[INFO] Shard '" + client.shard.id + "' connected!" : "[INFO] Connected!");
    let owner = (await client.fetchApplication()).owner;
		if (process.env.HEROKU) {
			if (!client.shard) console.log("(Heroku launch)");
      if (owner.presence.status == "online")
			  owner.send("Heroku launch complete.");
		} else {
			if (!client.shard) console.log("(local launch)");
      if (owner.presence.status == "online")
			  owner.send("Local launch complete.");
		}
	}
});
client.on("error", err => {
	console.error("[ERROR]\n", err);
	connected = false;
	login();
});
client.on("guildCreate", guild => {
  null;
});
client.on("guildDelete", guild => {
  guild.clearData();
});
client.on("playlistNext", (playlist, next) => {
	if (!next.file) playlist.guild.musicChannel.send(playlist.guild.lang.music.nowPlaying("$TITLE", next.title, "$AUTHOR", next.author.name, "$MEMBER", next.member.displayName));
	else playlist.guild.musicChannel.send(playlist.guild.lang.music.nowPlayingFile("$TITLE", next.name, "$MEMBER", next.member.displayName));
});
client.on("playlistEmpty", playlist => {
  if (playlist.connected && playlist.channel.members.size == 1) {
    playlist.leave();
    playlist.guild.musicChannel.send(playlist.guild.lang.commands.leave.inactivity());
  } else playlist.guild.musicChannel.send(playlist.guild.lang.music.emptyPlaylist());
});

// COMMANDS --------------------------------------------------

// BOT
commands.set("test", msg => {
  msg.channel.send("Test1 => " + msg.lang.misc.test() + "\nTest2 => " + msg.lang.misc.test2());
}, {owner: true, maxargs: 0});

commands.set("exec", async msg => {
	try {
		let val = eval(msg.content.replace(msg.prefix + "exec ", ""));
		let str = "Executed:\n";
		if (val instanceof Promise) {
			val = await val;
			str = "Executed (Promise):\n";
		}
		if (!process.env.HEROKU) {
      console.log("[EXEC]");
      console.dir(val, {colors: true});
    }
		let tosend = tools.stringifyObject(val);
		msg.channel.send(str + tosend);
		msg.react("✅");
	} catch(err) {
		funcs.logError(msg, err);
		msg.react("⛔");
	}
}, {owner: true, minargs: 1});

commands.set("help", (msg, args) => {
	if (args.length == 0) {
		let coms = [];
		for (let command of commands)
			if (command.options.info && command.options.info.show && !command.options.disabled) coms.push({name: command.name, type: command.options.info.type});
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
				.addField(msg.lang.commands.help.embedcontent4(), "```" + msg.lang.commands[command.name].syntax("$PREFIX", msg.prefix) + "```");
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

commands.set("permissions", async msg => {
  msg.channel.send(msg.lang.commands.permissions.info());
}, {maxargs: 0, info: {show: true, type: "bot"}});

commands.set("reset", async msg => {
  if (msg.guild) {
    delete msg.guild._lang;
    delete msg.guild._prefix;
    await msg.guild.clearData();
  } else {
    delete msg.channel._lang;
    delete msg.channel._prefix;
  } msg.channel.send("I've been reset to default values.\nLang: `English`\nPrefix: `/`");
}, {admin: true, maxargs: 0, info: {show: true, type: "bot"}});

commands.set("prefix", async (msg, args) => {
  if (args.length == 0)
    msg.reply(msg.lang.commands.prefix.current("$PREFIX", msg.prefix));
  else {
    let prefix = args[0];
    if (msg.guild) {
      if (!msg.member.admin)
        msg.reply(msg.lang.errors.adminOnlyCommand());
      else {
        msg.guild._prefix = prefix;
        msg.guild.sendData({prefix: prefix});
      }
    } else msg.channel._prefix = prefix;
    msg.channel.send(msg.lang.commands.prefix.set("$PREFIX", msg.prefix));
  }
}, {maxargs: 1, info: {show: true, type: "bot"}});

commands.set("lang", async (msg, args) => {
  if (args.length == 0) {
    let str = "";
    for (let lang of Object.values(langs))
      str += "\n- " + lang.name() + " (`" + lang.id() + "`)";
    msg.reply(msg.lang.commands.lang.list() + str);
  } else {
    let lang = args[0];
    if (!Object.keys(langs).includes(lang))
      msg.reply(msg.lang.commands.lang.unknown());
    else {
      if (msg.guild) {
        if (!msg.member.admin)
          msg.reply(msg.lang.errors.adminOnlyCommand());
        else {
          msg.guild._lang = lang;
          msg.guild.sendData({lang: lang});
        }
      } else msg.channel._lang = lang;
      let name = msg.lang.name();
      msg.channel.send(msg.lang.commands.lang.set("$LANG", name));
    }
  }
}, {maxargs: 1, info: {show: true, type: "bot"}});

commands.set("ping", async msg => {
  let delay = Date.now() - msg.createdTimestamp;
  msg.channel.send("Pong! (" + delay + "ms) :ping_pong:");
}, {maxargs: 0, info: {show: true, type: "bot"}});

// MODERATION


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

commands.set("prune", async (msg, args) => {
  let nb = args.length == 0 ? 100 : Math.floor(Number(args[0]));
  if (nb > 100) {
    msg.channel.send(msg.lang.commands.prune.limit());
  } else {
    try {
      let res = await msg.channel.bulkDelete(nb, true);
      msg.channel.send(msg.lang.commands.prune.done("$NB", res.size)).then(msg2 => msg2.delete(5000));
    } catch(err) {
      msg.channel.send(msg.lang.commands.prune.error());
    }
  }
}, {maxargs: 1, guildonly: true, info: {show: true, type: "utility"}});

// MUSIC
commands.set("join", async msg => {
  if (!msg.member.voiceChannelID)
    msg.channel.send(msg.lang.commands.join.notInVoiceChannel());
  else if (msg.member.voiceChannelID == msg.guild.me.voiceChannelID)
    msg.channel.send(msg.lang.commands.join.already());
  else {
    let voiceChannel = msg.member.voiceChannel;
    if (!voiceChannel.joinable)
      msg.channel.send(msg.lang.commands.join.notJoinable());
    else if (!voiceChannel.speakable)
      msg.channel.send(msg.lang.commands.join.notSpeakable());
    else {
      msg.guild.musicChannel = msg.channel;
      await msg.guild.playlist.join(voiceChannel);
      msg.channel.send(msg.lang.commands.join.hello());
    }
  }
}, {maxargs: 0, guildonly: true, info: {show: true, type: "music"}});

commands.set("leave", async msg => {
  if (!msg.guild.playlist.connected)
    msg.channel.send(msg.lang.music.notConnected())
  else {
    msg.guild.musicChannel = msg.channel;
    msg.guild.playlist.leave();
    msg.channel.send(msg.lang.commands.leave.bye());
  }
}, {maxargs: 0, guildonly: true, info: {show: true, type: "music"}});

commands.set("request", async (msg, args) => {
  if (!msg.guild.playlist.connected)
    msg.channel.send(msg.lang.music.notConnected())
  else if (!msg.guild.playlist.streaming) {
    msg.guild.musicChannel = msg.channel;
    if (["https://www.youtube.com/watch?", "https://youtu.be/", "https://youtube.com/watch?"].some(val => args[0].startsWith(val))) {
      let msg2 = await msg.channel.send(msg.lang.commands.request.adding("$LINK", args[0]));
      try {
        let request = await music.youtube.fetchVideo(args[0]);
        msg2.edit(msg.lang.commands.request.added("$TITLE", request.title, "$AUTHOR", request.author.name));
        request.member = msg.member;
        msg.guild.playlist.pending.push(request);
      } catch(err) {
        if (err.message.includes("does not match expected format"))
          msg.channel.send(msg.lang.commands.request.unexpectedFormat())
        else if (err.message.includes("unavailable"))
          msg.channel.send(msg.lang.commands.request.videoUnavailable())
        else throw err;
      }
    } else if (["https://www.youtube.com/playlist?", "https://youtube.com/playlist?"].some(val => args[0].startsWith(val))) {
      let msg2 = await msg.channel.send(msg.lang.commands.request.fetchingYoutubePlaylist("$LINK", args[0]));
      try {
        let playlist = await music.youtube.fetchPlaylist(args[0], process.env.YOUTUBEAPIKEY);
        msg2.edit(msg.lang.commands.request.fetchingYoutubePlaylistTitle("$TITLE", playlist.title));
        let nb = 0;
        for (let video of playlist.videos) {
          try {
            let res = await music.youtube.fetchVideo(video.link);
            res.member = msg.member;
            msg.guild.playlist.pending.push(res);
          } catch(err) {
            nb++;
          }
        }
        msg.channel.send(msg.lang.commands.request.youtubePlaylistFetched("$TITLE", playlist.title, "$NB", nb));
      } catch(err) {
        msg2.edit(msg.lang.commands.request.youtubePlaylistFetchError());
      }
    } else if (["https://", "http://"].some(val => args[0].startsWith(val)))
      msg.channel.send(msg.lang.commands.request.notSupported());
    else {
      let query = args.join(" ");
      let msg2 = await msg.channel.send(msg.lang.commands.request.searchingOnYoutube("$QUERY", query));
      try {
        let videos = await music.youtube.query(query, process.env.YOUTUBEAPIKEY, 1);
        if (videos.length == 1) {
          let request = await music.youtube.fetchVideo(videos[0].link);
          msg2.edit(msg.lang.commands.request.added("$TITLE", request.title, "$AUTHOR", request.author.name));
          request.member = msg.member;
          msg.guild.playlist.pending.push(request);
        } else msg2.edit(msg.lang.misc.noResults());
      } catch(err) {
        msg2.edit(msg.lang.commands.request.queryError());
      }
    }
  } else msg.channel.send(msg.lang.music.noStreaming("$PREFIX", msg.prefix));
}, {minargs: 1, guildonly: true, info: {show: true, type: "music"}});

commands.set("stream", async (msg, args) => {
  if (!msg.guild.playlist.connected)
    msg.channel.send(msg.lang.music.notConnected())
  else if (!msg.guild.playlist.playing) {
    msg.guild.musicChannel = msg.channel;
    let stream;
    if (args[0] == "listen.moe" || args[0] == "listen.moe/jpop") stream = listenmoe.jpop;
    else if (args[0] == "listen.moe/kpop") stream = listenmoe.kpop;
    else if (args[0] == "off") stream = null;
    else {
      msg.channel.send(msg.lang.errors.wrongSyntax("$PREFIX", msg.prefix, "$COMMAND", "stream"));
      return;
    }
    msg.guild.playlist.stream(stream);
    if (stream) {
      if (msg.guild.playlist.current.title)
        msg.channel.send(msg.lang.commands.stream.nowStreamingTitle("$NAME", msg.guild.playlist.current.name, "$TITLE", msg.guild.playlist.current.title));
      else
        msg.channel.send(msg.lang.commands.stream.nowStreaming("$NAME", msg.guild.playlist.current.name));
    } else msg.channel.send(msg.lang.commands.stream.stopStreaming());
  } else msg.channel.send(msg.lang.music.noPlaying());
}, {disabled: true, minargs: 1, maxargs: 1, guildonly: true, info: {show: true, type: "music"}});

commands.set("query", msg => {
  if (!msg.guild.playlist.connected)
    msg.channel.send(msg.lang.music.notConnected())
  else msg.channel.send(msg.lang.misc.merged("$PREFIX", msg.prefix, "$COMMAND", "request"));
}, {guildonly: true});

commands.set("ytbplaylist", msg => {
  if (!msg.guild.playlist.connected)
    msg.channel.send(msg.lang.music.notConnected())
  else msg.channel.send(msg.lang.misc.merged("$PREFIX", msg.prefix, "$COMMAND", "request"));
}, {guildonly: true});

commands.set("pause", msg => {
  if (!msg.guild.playlist.connected)
    msg.channel.send(msg.lang.music.notConnected())
  else if (!msg.guild.playlist.dispatching)
    msg.channel.send(msg.lang.music.notPlayingNorStreaming())
  else {
    msg.guild.musicChannel = msg.channel;
    msg.guild.playlist.paused = true;
    msg.channel.send(msg.lang.commands.pause.done());
  }
}, {maxargs: 0, guildonly: true, info: {show: true, type: "music"}});

commands.set("resume", msg => {
  if (!msg.guild.playlist.connected)
    msg.channel.send(msg.lang.music.notConnected())
  else if (!msg.guild.playlist.dispatching)
    msg.channel.send(msg.lang.music.notPlayingNorStreaming())
  else {
    msg.guild.musicChannel = msg.channel;
    msg.guild.playlist.paused = false;
    msg.channel.send(msg.lang.commands.resume.done());
  }
}, {maxargs: 0, guildonly: true, info: {show: true, type: "music"}});

commands.set("skip", msg => {
  if (!msg.guild.playlist.connected)
    msg.channel.send(msg.lang.music.notConnected())
  else if (msg.guild.playlist.playing) {
    msg.guild.musicChannel = msg.channel;
    let current = msg.guild.playlist.current;
    msg.guild.playlist.next();
    msg.channel.send(msg.lang.commands.skip.skipped("$TITLE", current.title));
  } else if (msg.guild.playlist.streaming)
    msg.channel.send(msg.lang.music.noStreaming("$PREFIX", msg.prefix));
  else msg.channel.send(msg.lang.music.notPlaying())
}, {maxargs: 0, guildonly: true, info: {show: true, type: "music"}});

commands.set("plremove", (msg, args) => {
  if (!msg.guild.playlist.connected)
    msg.channel.send(msg.lang.music.notConnected())
  else if (msg.guild.playlist.pending.length == 0)
    msg.channel.send(msg.lang.music.emptyPlaylist())
  else if (msg.guild.playlist.playing) {
    msg.guild.musicChannel = msg.channel;
    let id = Math.floor(Number(args[0]));
    if (id < 1 || id > msg.guild.playlist.pending.length)
      msg.channel.send(msg.lang.commands.plremove.invalidIndex());
    else {
      let removed = msg.guild.playlist.pending.splice(id-1, 1)[0];
      msg.channel.send(msg.lang.commands.plremove.done("$TITLE", removed.title));
    }
  } else if (msg.guild.playlist.streaming)
    msg.channel.send(msg.lang.music.noStreaming("$PREFIX", msg.prefix));
  else msg.channel.send(msg.lang.music.notPlaying())
}, {minargs: 1, maxargs: 1, guildonly: true, info: {show: true, type: "music"}});

commands.set("plclear", msg => {
  if (!msg.guild.playlist.connected)
    msg.channel.send(msg.lang.music.notConnected())
  else if (msg.guild.playlist.playing) {
    msg.guild.musicChannel = msg.channel;
    let nb = msg.guild.playlist.pending.clear();
    msg.channel.send(msg.lang.commands.plclear.done("$NB", nb));
  } else if (msg.guild.playlist.streaming)
    msg.channel.send(msg.lang.music.noStreaming("$PREFIX", msg.prefix));
  else msg.channel.send(msg.lang.music.notPlaying())
}, {maxargs: 0, guildonly: true, info: {show: true, type: "music"}});

commands.set("plshuffle", msg => {
  if (!msg.guild.playlist.connected)
    msg.channel.send(msg.lang.music.notConnected())
  else if (msg.guild.playlist.playing) {
    msg.guild.musicChannel = msg.channel;
    msg.guild.playlist.pending.shuffle();
    msg.channel.send(msg.lang.commands.plshuffle.done());
  } else if (msg.guild.playlist.streaming)
    msg.channel.send(msg.lang.music.noStreaming("$PREFIX", msg.prefix));
  else msg.channel.send(msg.lang.music.notPlaying())
}, {maxargs: 0, guildonly: true, info: {show: true, type: "music"}});

commands.set("volume", (msg, args) => {
  if (!msg.guild.playlist.connected)
    msg.channel.send(msg.lang.music.notConnected())
  else {
    msg.guild.musicChannel = msg.channel;
    let volume = Number(args);
    if (!isNaN(volume)) {
      msg.guild.playlist.volume = volume/100;
      if (volume < 0) volume = 0;
      if (volume/100 > msg.guild.playlist.maxVolume) volume = msg.guild.playlist.maxVolume*100;
      msg.channel.send(msg.lang.commands.volume.volumeSet("$VOLUME", volume));
    } else msg.channel.send(msg.lang.commands.volume.invalidVolume());
  }
}, {guildonly: true, minargs: 1, maxargs: 1, info: {show: true, type: "music"}});

commands.set("loop", msg => {
  if (!msg.guild.playlist.connected)
    msg.channel.send(msg.lang.music.notConnected())
  else if (msg.guild.playlist.playing) {
    msg.guild.musicChannel = msg.channel;
    msg.guild.playlist.looping = !msg.guild.playlist.looping;
    if (msg.guild.playlist.looping) msg.channel.send(msg.lang.commands.loop.on("$TITLE", msg.guild.playlist.current.title));
    else msg.channel.send(msg.lang.commands.loop.off());
  } else if (msg.guild.playlist.streaming)
    msg.channel.send(msg.lang.music.noStreaming("$PREFIX", msg.prefix));
  else msg.channel.send(msg.lang.music.notPlaying())
}, {maxargs: 0, guildonly: true, info: {show: true, type: "music"}});

commands.set("plloop", msg => {
  if (!msg.guild.playlist.connected)
    msg.channel.send(msg.lang.music.notConnected())
  else if (msg.guild.playlist.playing) {
    msg.guild.musicChannel = msg.channel;
    msg.guild.playlist.playlistLooping = !msg.guild.playlist.playlistLooping;
    if (msg.guild.playlist.playlistLooping) msg.channel.send(msg.lang.commands.plloop.on());
    else msg.channel.send(msg.lang.commands.plloop.off());
  } else if (msg.guild.playlist.streaming)
    msg.channel.send(msg.lang.music.noStreaming("$PREFIX", msg.prefix));
  else msg.channel.send(msg.lang.music.notPlaying())
}, {maxargs: 0, guildonly: true, info: {show: true, type: "music"}});

commands.set("current", msg => {
  if (!msg.guild.playlist.connected)
    msg.channel.send(msg.lang.music.notConnected())
  else if (msg.guild.playlist.playing) {
    let current = msg.guild.playlist.current;
    let time = msg.guild.playlist.time;
  	let info = tools.defaultEmbed();
  	if (current.type == "youtube") {
  		info.setThumbnail(current.thumbnailURL)
  		.addField(msg.lang.commands.current.title(), current.title, true)
  		.addField(msg.lang.commands.current.author(), current.author.name + " (" + current.author.channelURL + ")", true)
  		.addField(msg.lang.commands.current.description(), current.description.length > 1024 ? current.description.substring(0, 1021) + "..." : current.description, true)
  		.addField(msg.lang.commands.current.link(), current.link, true)
    } else if (current.type == "file") {
  		info.addField(msg.lang.commands.current.fileName(), current.name, true);
    }
    info.addField(msg.lang.commands.current.requestedBy(), current.member, true);
  	msg.channel.send(msg.lang.commands.current.display("$TIMER", tools.parseTimestamp(time).timer + " / " + tools.parseTimestamp(current.length).timer + " ("+ Math.floor((time / current.length)*100) + "%)"), info);
  } else if (msg.guild.playlist.streaming) {
    if (msg.guild.playlist.current.title)
      msg.channel.send(msg.lang.commands.stream.nowStreamingTitle("$NAME", msg.guild.playlist.current.name, "$TITLE", msg.guild.playlist.current.title));
    else
      msg.channel.send(msg.lang.commands.stream.nowStreaming("$NAME", msg.guild.playlist.current.name));
  } else
    msg.channel.send(msg.lang.music.notPlayingNorStreaming())
}, {guildonly: true, maxargs: 0, info: {show: true, type: "music"}});

commands.set("playlist", async msg => {
  if (!msg.guild.playlist.connected)
    msg.channel.send(msg.lang.music.notConnected())
  else if (msg.guild.playlist.playing) {
    let playlist = msg.guild.playlist.pending;
  	let info = tools.defaultEmbed();
  	let i = 1;
  	for (let music of playlist) {
  		if (music.type == "youtube")
        info.addField(msg.lang.commands.playlist.info("$ID", i, "$TITLE", music.title, "$AUTHOR", music.author.name, "$DURATION", tools.parseTimestamp(music.length).timer),
        msg.lang.commands.playlist.requestedBy("$MEMBER", music.member));
  		else if (music.type == "file")
        info.addField(msg.lang.commands.playlist.info("$ID", i, "$TITLE", music.name, "$DURATION", tools.parseTimestamp(music.length).timer),
        msg.lang.commands.playlist.requestedBy("$MEMBER", music.member));
  		i++;
      if (i == 21) break;
  	}
  	if (playlist.length > 0) {
  		await msg.channel.send(msg.lang.commands.playlist.display(), info);
      if (playlist.length <= 20) msg.channel.send(msg.lang.commands.playlist.displayCurrent("$PREFIX", msg.prefix));
      else msg.channel.send(msg.lang.commands.playlist.displayMore("$NB", playlist.length - 20) + " " + msg.lang.commands.playlist.displayCurrent("$PREFIX", msg.prefix));
  	} else msg.channel.send(msg.lang.music.emptyPlaylist() + " " + msg.lang.commands.playlist.displayCurrent("$PREFIX", msg.prefix));
  } else if (msg.guild.playlist.streaming)
    msg.channel.send(msg.lang.music.noStreaming("$PREFIX", msg.prefix));
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

commands.set("roll", (msg, args) => {
	let max = 6;
	if (args.length == 1 && !isNaN(Number(args[0])) && Number(args[0]) > 0)
		max = Number(args[0]);
	let res = tools.random(1, max);
	msg.reply(res + "/" + max + " :game_die:");
}, {maxargs: 1, info: {show: true, type: "fun"}});

commands.set("fact", (msg, args) => {
	let link = "https://factgenerator.herokuapp.com/generate?words=" + args.join("_");
	snekfetch.get(link).then(res => {
		let parsed = JSON.parse(res.text);
		msg.channel.send(parsed.facts[0].text);
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

commands.set("cyanidehappiness", async msg => {
  let link = "http://explosm.net/rcg/";
	let res = await snekfetch.get(link);
  let img = res.text.match(new RegExp("http://files.explosm.net/rcg/[a-z]{9}.png", "i")).shift();
	msg.channel.send("(" + msg.lang.commands.cyanidehappiness.from("$LINK", link) + ")", {files: [img]});
}, {maxargs: 0, info: {show: true, type: "fun"}});

commands.set("httpdog", async msg => {
  let link = "https://httpstatusdogs.com/";
	let res = await snekfetch.get(link);
	let imgs = res.text.match(new RegExp("img/[1-5][0-9]{2}.jpg", "g"));
	msg.channel.send("", {files: [link + imgs.random()]});
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

commands.set("danbooru", async (msg, args) => {
  let tags = args.join(" ");
  if (msg.guild && !msg.channel.nsfw) tags += " rating:safe";
  let posts = await booru.posts({limit: 1, random: true, tags: tags});
  if (posts.length == 0 || !posts[0]) msg.channel.send(msg.lang.misc.noResults());
  else msg.channel.send(msg.lang.commands.danbooru.result("$TAGS", tags), {files: [posts[0].large_file_url]});
}, {minargs: 1, maxargs: 2, info: {show: true, type: "nsfw"}});

commands.set("spurriouscorrelations", async msg => {
  let corrs = null;
  while (corrs === null) {
    let res = await snekfetch.get("http://tylervigen.com/page?page=" + tools.random(1, 3700));
    corrs = res.text.match(new RegExp("correlation_images/[a-z0-9_-]+[.]png", "gi"));
  }
  msg.channel.send("", {files: ["http://tylervigen.com/correlation_project/" + corrs.random()]});
}, {maxargs: 0, info: {show: true, type: "fun"}});

/*commands.set("tictactoe", async (msg, args) => {
  if (msg.channel._ttt) {
    msg.channel.send(msg.lang.commands.tictactoe.already());
    return;
  }
  msg.channel._ttt = true;
  let delay = 20;
  let other = args.length == 0 ? undefined, (await tools.stringToMembers(args[0], msg.guild)).shift();
  msg.channel.send(msg.lang.commands.tictactoe.wantsToPlay("$PREFIX", msg.prefix, "$PLAYER", msg.member.displayName, "$DELAY", delay));
  let msg2 = await msg.channel.waitResponse({delay: delay, filter: msg2 => {
    if (msg.content != msg.prefix + "tttplay") return false;
    if (msg.author.id == msg2.author.id) return false;
    else return true;
  }});
  if (!msg2) msg.channel.send(msg.lang.commands.tictactoe.noPlayers("$PLAYER", msg.member.displayName));
  else {

  }
  let ttt = Math.random() < 0.5 ? new TicTacToe(msg.channel, msg.member, msg2.member) : new TicTacToe(msg.channel, msg2.member, msg.member);

  msg.channel._ttt = false;
}, {maxargs: 1, info: {show: true, type: "game"}});*/

// FUNCTIONS
function login() {
	console.log(client.shard ? "[INFO] Shard '" + client.shard.id + "' connecting." : "[INFO] Connecting.");
	client.login(process.env.DISCORDTOKEN).catch(async () => {
		console.log(client.shard ? "[INFO] Shard '" + client.shard.id + "' connection failed." : "[INFO] Connection failed.");
		await tools.sleep(60000);
		login();
	});
}

login();
