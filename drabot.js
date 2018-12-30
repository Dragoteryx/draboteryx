"use strict";
require("dotenv").config();
require("./src/prototypes.js");

// IMPORTS
const discord = require("discord.js");
const snekfetch = require("snekfetch");
const DBL = require("dblapi.js");
const Danbooru = require("danbooru");
const Cleverbot = require("cleverbot.io");

// FILES
const config = require("./config.js");
const tools = require("./src/tools.js");
const funcs = require("./src/funcs.js");
const data = require("./src/data.js");
const crypt = require("./src/crypt.js");
const CommandHandler = require("./src/commands.js");
const music = require("./src/music.js");
const Lang = require("./langs/langs.js");
const listenmoe = require("./src/listenmoe.js");
const money = require("./src/money.js");

// CONSTS
const heroku = process.env.HEROKU != undefined;
const client = new discord.Client();
const commands = new CommandHandler();
commands.owners = config.owners;
const langs = {
  en: new Lang(require("./langs/lang_en.json")),
  fr: new Lang(require("./langs/lang_fr.json"), require("./langs/lang_en.json"))
}
const commandTypes = ["moderation", "utility", "game", "fun", "misc", "music", "nsfw", "bot"];
const dbl = heroku ? new DBL(process.env.DBLAPITOKEN, client) : null;
const aliases = [];
const vars = {};
const booru = new Danbooru(process.env.DANBOORU_LOGIN + ":" + process.env.DANBOORU_KEY);
const clever = new Cleverbot(process.env.CLEVER_USER, process.env.CLEVER_KEY);

// GLOBALS
let debug = false;
let firstConnection = true;
let cbot = 0;

// EXPORTS
exports.client = client;
exports.commands = commands;
exports.langs = langs;
exports.vars = vars;
exports.heroku = heroku;

// LISTEN TO MESSAGES
client.on("message", async msg => {
  if (msg.author.id == client.user.id) return;
  try {

    // set prefix and lang
    if (msg.guild) {
      if (!msg.guild.fetched) {
        msg.guild.fetchData().then(data => {
          if (data.lang) msg.guild._lang = data.lang;
          if (data.prefix) msg.guild._prefix = data.prefix;
        });
        msg.guild.fetched = true;
      }
      if (!msg.author.bot) {
        if (!msg.author.dmChannel) {
          msg.author.createDM().then(channel => {
            msg.author.dmChannel._lang = msg.lang.id();
            msg.author.dmChannel._prefix = msg.prefix;
          });
        }
      }
    }

    // replace tag with prefix
    for (let alias of aliases) {
      if (msg.content.startsWith(alias)) {
        msg.content = msg.content.replace(alias, msg.prefix);
        break;
      }
    }

    // on message callbacks
    msg.channel.onMsgCallbacks.forEach(func => func(msg));

    // commands
  	let res = await commands.run(msg);
  	if (!res.result.valid) {
  		if (res.result.reasons.includes("no prefix") || res.result.reasons.includes("unknown command")) {
        // not a command
        if (["dm", "group"].includes(msg.channel.type) || msg.channel.name == "cleverbot") {
          msg.content = msg.prefix + "cleverbot " + msg.content;
          await commands.run(msg);
        } else if (msg.guild && msg.author.id == config.users.vltclone && msg.content == "je répond au bot") {
          tools.stringToChannels("cleverbot").forEach(channel => {
            if (channel.type == "text") msg.channel.send("Salut Clone raté!");
          });
        }
      } else if (res.result.reasons.includes("owner only command"))
  			msg.channel.send(msg.lang.errors.ownerOnlyCommand());
      else if (res.result.reasons.includes("disabled"))
        msg.channel.send(msg.lang.errors.disabledCommand());
  		else if (res.result.reasons.includes("guild only command"))
  			msg.channel.send(msg.lang.errors.guildOnlyCommand());
      else if (res.result.reasons.includes("large guild"))
        msg.channel.send(msg.lang.errors.largeGuild());
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
  	} else {
      if (msg.channel.type == "text") console.log("[LOG] Guild channel: '" + msg.guild.name + "' => '" + msg.content + "'");
      else if (msg.channel.type == "group") console.log("[LOG] Group channel => '" + msg.content + "'");
      else if (msg.channel.type == "dm") console.log("[LOG] Private channel => '" + msg.content + "'");
    }

  } catch(err) {
    funcs.displayError(msg, err);
  }
});

// EVENTS
const ignoredErrors = ["DiscordAPIError", "PlaylistError"];
process.on("uncaughtException", async err => {
  funcs.error("Uncaught Exception", err);
  await client.destroy();
  process.exit(1);
});
process.on("unhandledRejection", async (err, promise) => {
  funcs.error("Unhandled Promise Rejection", err);
  if (!ignoredErrors.includes(err.name)) {
    await client.destroy();
    process.exit(1);
  }
});
process.on("SIGTERM", async () => {
  await client.destroy();
  process.exit();
});
process.on("SIGHUP", async () => {
  await client.destroy();
  process.exit();
});
process.on("SIGINT", async () => {
  await client.destroy();
  process.exit();
});
process.on("exit", code => {
  console.log("[INFO] Process exiting with code '" + code + "'");
});

client.on("ready", () => {
  if (!aliases.ready) {
    aliases.push("<@" + client.user.id + "> ", "<@!" + client.user.id + "> ");
    aliases.ready = true;
  }
  client.user.setActivity(config.prefix + "help");
	console.log(client.shard ? "[INFO] Shard '" + client.shard.id + "' connected!" : "[INFO] Connected!");
  let guild = client.guilds.get(config.guilds.drg);
  if (guild) {
    if (firstConnection) {
      guild.sendLog("Hello world!");
      firstConnection = false;
    } else guild.sendLog("I've just restarted.");
  }
});
client.on("disconnect", async () => {
  console.log("[INFO] Disconnected.");
  let guild = client.guilds.get(config.guilds.drg);
  if (guild) await guild.sendLog("Disconnected!");
});
client.on("error", err => {
  console.log("[INFO] Disconnected.");
  funcs.error("Drabot disconnect", err);
	login();
});
client.on("debug", str => {
  if (heroku) return;
  //console.log("[DEBUG] " + str);
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

// OWNER

commands.set("test", msg => {
  msg.channel.send("Test1 => " + msg.lang.misc.test() + "\nTest2 => " + msg.lang.misc.test2());
}, {owner: true, maxargs: 0});

commands.set("exec", async msg => {
	try {
    let val = eval(msg.content.replace(msg.prefix + "exec ", ""));
    let promise = false;
    if (val instanceof Promise) {
      promise = true;
      val = await val;
    }
    if (!heroku) {
      console.log("[EXEC]");
      console.dir(val, {colors: true});
    }
		msg.react("✅");
    try {
      msg.channel.send((promise ? "Executed (Promise):\n" : "Executed:\n") + tools.stringifyObject(val));
    } catch(err) {}
	} catch(err) {
		msg.react("⛔");
    funcs.displayError(msg, err);
	}
}, {owner: true, minargs: 1});

commands.set("setavatar", async (msg, args) => {
  await client.user.setAvatar(args[0]);
  msg.channel.send("New avatar:", {files: [args[0]]});
}, {owner: true, minargs: 1, maxargs: 1});

commands.set("setusername", async (msg, args, argstr) => {
  await client.user.setUsername(argstr);
  msg.channel.send("New username: `" + argstr + "`");
}, {owner: true, minargs: 1});

commands.set("setmoney", async (msg, args) => {
  await msg.author.fetchMoney();
  let amount = Number(args.shift());
  let res = tools.validNumber(amount, 0, Infinity, true);
  if (!res.valid) {
    if (res.fail == 2) msg.channel.send(msg.lang.money.notEnough());
    else msg.channel.send(msg.lang.money.invalidAmount());
  } else {
    let members = await tools.stringToMembers(args.join(" "), msg.guild);
    if (members.size == 0) msg.channel.send(msg.lang.commands.userinfo.noUser());
    else if (members.size == 1) {
      members.values().next().value.user.money = amount;
      msg.channel.send("Set money to `" + amount + "` " + config.currency + ".");
    } else msg.channel.send(msg.lang.commands.givemoney.duplicates());
  }
}, {owner: true, minargs: 2});

commands.set("restart", async msg => {
  msg.channel.send("Ok I'm disconnecting!");
  await client.destroy();
  let nb = await login();
  msg.channel.send("I'm back!");
}, {owner: true, maxargs: 0});

// BOT

commands.set("help", (msg, args) => {
  if (args.length == 0) {
    let embed = tools.defaultEmbed();
    for (let type of commandTypes) {
      let sameType = commands.array.filter(command => command.options.info && command.options.info.show && command.options.info.type == type).map(command => "`" + command.name + "`").sort();;
      if (sameType.length > 0)
        embed.addField(msg.lang.types()[type], sameType.join(" | "));
      else embed.addField(msg.lang.types()[type], "---");
		}
    msg.author.send(msg.lang.commands.help.info("$PREFIX", msg.prefix), embed);
    if (msg.channel.type != "dm")
      msg.channel.send(msg.lang.commands.help.takeALook());
  } else {
    let nb = 0;
    args.sort();
    for (let arg of args) {
      arg = arg.toLowerCase();
      if (commands.has(arg)) {
        nb++;
        let command = commands.get(arg);
        let embed = tools.defaultEmbed()
        .addField(msg.lang.commands.help.commandName(), command.name, true)
				.addField(msg.lang.commands.help.commandType(), msg.lang.types()[command.options.info.type], true)
				.addField(msg.lang.commands.help.commandDescription(), msg.lang.commands[command.name].description("$PREFIX", msg.prefix))
				.addField(msg.lang.commands.help.commandSyntax(), "```" + msg.lang.commands[command.name].syntax("$PREFIX", msg.prefix) + "```");
				msg.author.send("", embed);
      }
    }
    if (nb > 0) {
      if (msg.channel.type != "dm")
        msg.channel.send(msg.lang.commands.help.takeALook());
    } else if (args.length == 1) msg.channel.send(msg.lang.commands.help.unknownCommand("$PREFIX", msg.prefix));
    else msg.channel.send(msg.lang.commands.help.unknownCommands("$PREFIX", msg.prefix));
  }
}, {info: {show: true, type: "bot"}});

commands.set("server", msg => {
  msg.channel.send("https://discord.gg/aCgwj8M");
}, {maxargs: 0, info: {show: true, type: "bot"}});

commands.set("invite", msg => {
  msg.channel.send("https://discordapp.com/oauth2/authorize?client_id=273576577512767488&scope=bot&permissions=70437888");
}, {maxargs: 0, info: {show: true, type: "bot"}});

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
  } msg.channel.send("I've been reset to default values.\nLanguage: `English`\nPrefix: `/`");
}, {admin: true, maxargs: 0, info: {show: true, type: "bot"}});

commands.set("prefix", async (msg, args) => {
  if (args.length == 0)
    msg.channel.send(msg.lang.commands.prefix.current("$PREFIX", msg.prefix));
  else {
    let prefix = args[0];
    if (msg.guild) {
      if (!msg.member.admin)
        msg.channel.send(msg.lang.errors.adminOnlyCommand());
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
    msg.channel.send(msg.lang.commands.lang.list() + str);
  } else {
    let lang = args[0];
    if (!Object.keys(langs).includes(lang))
      msg.channel.send(msg.lang.commands.lang.unknown());
    else {
      if (msg.guild) {
        if (!msg.member.admin)
          msg.channel.send(msg.lang.errors.adminOnlyCommand());
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
  msg.channel.send("Pong! (" + Math.round(client.ping) + "ms) :ping_pong:");
}, {maxargs: 0, info: {show: true, type: "bot"}});

// MONEY

commands.set("money", async msg => {
  await msg.author.fetchMoney();
  msg.channel.send(msg.lang.commands.money.display("$AMOUNT", msg.author.money, "$CURRENCY", config.currency));
}, {bots: true, maxargs: 0, info: {show: true, type: "misc"}});

commands.set("givemoney", async (msg, args) => {
  await msg.author.fetchMoney();
  let amount = Number(args.shift());
  let res = tools.validNumber(amount, 1, msg.author.money, true);
  if (!res.valid) {
    if (res.fail == 2) msg.channel.send(msg.lang.money.notEnough());
    else msg.channel.send(msg.lang.money.invalidAmount());
  } else {
    let members = await tools.stringToMembers(args.join(" "), msg.guild);
    if (members.size == 0) msg.channel.send(msg.lang.commands.userinfo.noUser());
    else if (members.size == 1) {
      let member = members.values().next().value;
      await member.user.fetchMoney();
      msg.author.giveMoney(member.user, amount);
      msg.channel.send(msg.lang.commands.givemoney.gaveMoney("$USERNAME1", msg.authorName, "$AMOUNT", amount, "$CURRENCY", config.currency, "$USERNAME2", member.displayName));
    } else msg.channel.send(msg.lang.commands.givemoney.duplicates());
  }
}, {guildonly: true, bots: true, minargs: 2, info: {show: true, type: "misc"}});

commands.set("dropmoney", async (msg, args) => {
  await msg.author.fetchMoney();
  let res = tools.validNumber(args[0], 1, msg.author.money, true);
  if (!res.valid) {
    if (res.fail == 2) msg.channel.send(msg.lang.money.notEnough());
    else msg.channel.send(msg.lang.money.invalidAmount());
  } else {
    let amount = Number(args[0]);
    msg.channel.send(msg.lang.commands.dropmoney.userDropMoney("$PREFIX", msg.prefix, "$USERNAME", msg.authorName, "$AMOUNT", amount, "$CURRENCY", config.currency));
    let msg2 = await msg.channel.waitResponse({delay: 10000, filter: msg2 => {
      if (msg2.author.bot && msg.author.id != msg2.author.id) return false;
      return msg2.content == msg.prefix + "pickmoney";
    }});
    if (!msg2) msg.channel.send(msg.lang.commands.dropmoney.noPickMoney());
    else {
      await msg2.author.fetchMoney();
      msg.author.giveMoney(msg2.author, amount);
      msg.channel.send(msg.lang.commands.dropmoney.pickMoney("$USERNAME", msg2.authorName, "$AMOUNT", amount, "$CURRENCY", config.currency));
    }
  }
}, {guildonly: true, bots: true, minargs: 1, maxargs: 1, info: {show: true, type: "misc"}});

commands.set("moneyleaderboard", async msg => {
  await msg.guild.fetchMoney();
  let members = Array.from(msg.guild.members.values());
  members.sort((member1, member2) => {
    return member1.user.money > member2.user.money;
  }).reverse();
  let embed = tools.defaultEmbed();
  for (let i = 0; i < members.length; i++) {
    let member = members[i];
    if (member.user.money == 0) break;
    embed.addField(msg.lang.commands.moneyleaderboard.info("$POS", i+1, "$USERNAME", member.displayName),
    msg.lang.commands.moneyleaderboard.display("$AMOUNT", member.user.money, "$CURRENCY", config.currency));
    if (i == 19) break;
  }
  msg.channel.send("", embed);
}, {guildonly: true, largeguilds: false, maxargs: 0, info: {show: true, type: "misc"}});

// MODERATION


// UTILS

commands.set("serverinfo", async msg => {
  msg.channel.send("", await msg.guild.embedInfo());
}, {maxargs: 0, guildonly: true, info: {show: true, type: "utility"}});

commands.set("userinfo", async (msg, args, argstr) => {
  if (args.length == 0) msg.channel.send("", msg.member.embedInfo());
  else {
    let nb = 0;
    let members = await tools.stringToMembers(argstr, msg.guild);
    members.forEach(member => {
      nb++;
      msg.channel.send("", member.embedInfo())
    });
    if (nb == 0) msg.channel.send(msg.lang.commands.userinfo.noUser());
  }
}, {guildonly: true, info: {show: true, type: "utility"}});

commands.set("channelinfo", (msg, args, argstr) => {
  if (args.length == 0) msg.channel.send("", msg.channel.embedInfo());
  else {
    let nb = 0;
    tools.stringToChannels(argstr, msg.guild).forEach(channel => {
      nb++;
      msg.channel.send("", channel.embedInfo())
    });
    if (nb == 0) msg.channel.send(msg.lang.commands.channelinfo.noChannel());
  }
}, {guildonly: true, info: {show: true, type: "utility"}});

commands.set("roleinfo", (msg, args, argstr) => {
  if (args.length == 0) msg.channel.send("", msg.member.highestRole.embedInfo());
  else {
    let nb = 0;
    tools.stringToRoles(argstr, msg.guild).forEach(role => {
      nb++;
      msg.channel.send("", role.embedInfo())
    });
    if (nb == 0) msg.channel.send(msg.lang.commands.roleinfo.noRole());
  }
}, {guildonly: true, info: {show: true, type: "utility"}});

commands.set("prune", async (msg, args) => {
  let nb = 100;
  if (args.length == 1) {
    let res = tools.validNumber(args[0], 0, 100, true);
    if (!res.valid) {
      if (res.fail == 2) msg.channel.send(msg.lang.commands.prune.limit());
      else msg.channel.send(msg.lang.commands.prune.invalid());
      return;
    } else nb = Number(args[0]);
  }
  try {
    let res = await msg.channel.bulkDelete(nb, true);
    msg.channel.send(msg.lang.commands.prune.done("$NB", res.size)).then(msg2 => msg2.delete(5000));
  } catch(err) {
    msg.channel.send(msg.lang.commands.prune.error());
  }
}, {admin: true, maxargs: 1, guildonly: true, info: {show: true, type: "utility"}});

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
      msg.channel.send(msg.lang.commands.stream.nowStreaming("$NAME", stream.name));
    } else msg.channel.send(msg.lang.commands.stream.stopStreaming());
  } else msg.channel.send(msg.lang.music.noPlaying());
}, {disabled: true, minargs: 1, maxargs: 1, guildonly: true, info: {show: true, type: "music"}});

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
    if (!tools.validNumber(args[0], 1, msg.guild.playlist.pending.length, true).valid)
      msg.channel.send(msg.lang.commands.plremove.invalidIndex());
    else {
      let removed = msg.guild.playlist.pending.splice(Number(args[0])-1, 1)[0];
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
    let volume = args[0];
    if (tools.validNumber(volume, 0, msg.guild.playlist.maxVolume).valid) {
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
      msg.channel.send(msg.lang.commands.stream.nowPlaying("$TITLE", msg.guild.playlist.current.title, "$NAME", msg.guild.playlist.current.name));
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
	if (args.length == 1 && tools.validNumber(args[0], 1, Infinity, true).valid)
		max = Number(args[0]);
	let res = tools.random(1, max);
	msg.channel.send(res + "/" + max + " :game_die:");
}, {maxargs: 1, info: {show: true, type: "fun"}});

commands.set("fact", (msg, args) => {
	let link = "https://factgenerator.herokuapp.com/generate?words=" + args.join("_");
  msg.channel.startTyping(1);
	snekfetch.get(link).then(res => {
    msg.channel.stopTyping();
		let parsed = JSON.parse(res.text);
		msg.channel.send(parsed.facts[0].text);
	}).catch(err => {
    msg.channel.stopTyping();
		msg.channel.send(msg.lang.commands.fact.offline());
	});
}, {info: {show: true, type: "fun"}});

commands.set("reflex", async msg => {
	if (msg.channel.reflex) return;
	msg.channel.reflex = true;
	msg.channel.send(msg.lang.commands.reflex.rules());
  msg.channel.startTyping(1);
	await tools.sleep(tools.random(1000, 10000));
  msg.channel.stopTyping();
	let random = tools.random(100, 999);
	await msg.channel.send(msg.lang.commands.reflex.msg("$RANDOM", random));
	let msg2 = await msg.channel.waitResponse({delay: 10000, filter: msg2 => {
		if (msg2.content == random && msg2.author.bot) {
			msg.channel.send(msg.lang.commands.reflex.bots());
			return false;
		}
		return msg2.content == random;
	}});
	if (!msg2) msg.channel.send(msg.lang.commands.reflex.slow());
	else msg.channel.send(msg.lang.commands.reflex.wellPlayed("$WINNER", msg2.authorName));
	msg.channel.reflex = false;
}, {guildonly: true, maxargs: 0, info: {show: true, type: "game"}});

commands.set("cyanidehappiness", msg => {
  let link = "http://explosm.net/rcg";
  msg.channel.startTyping(1);
	snekfetch.get(link).then(res => {
    msg.channel.stopTyping()
    let img = res.text.match(/http:\/\/files.explosm.net\/rcg\/[a-z]{9}\.png/i).shift();
  	msg.channel.send(msg.lang.misc.fromWebsite("$LINK", link), {files: [img]});
  }).catch(err => msg.channel.stopTyping());
}, {maxargs: 0, info: {show: true, type: "fun"}});

commands.set("httpdog", msg => {
  let link = "https://httpstatusdogs.com";
  msg.channel.startTyping(1);
	snekfetch.get(link).then(res => {
    msg.channel.stopTyping();
  	let imgs = res.text.match(/img\/[1-5][0-9]{2}\.jpg/g);
  	msg.channel.send(msg.lang.misc.fromWebsite("$LINK", link), {files: [link + "/" + imgs.random()]});
  }).catch(err => msg.channel.stopTyping());
}, {maxargs: 0, info: {show: true, type: "fun"}});

commands.set("waifu", msg => {
	msg.channel.send(msg.lang.commands.waifu.theTruth());
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

commands.set("danbooru", async (msg, args, argstr) => {
  if (args.length > 3 || (args.length == 3 && !args.includes("rating:safe"))) {
    msg.channel.send(msg.lang.commands.danbooru.limit("$LIMIT", 2));
    return;
  }
  let tags = argstr;
  if (msg.guild && !msg.guild.nsfw) {
    args = args.filter(tag => !tag.startsWith("rating:"));
    args.push("rating:safe");
    tags = args.join(" ");
  }
  msg.channel.startTyping(1);
  booru.posts({limit: 1, random: true, tags: tags}).then(posts => {
    msg.channel.stopTyping();
    if (posts.length == 0 || !posts[0]) msg.channel.send(msg.lang.misc.noResults());
    else msg.channel.send(msg.lang.commands.danbooru.result("$TAGS", tags), {files: [posts[0].large_file_url]});
  }).catch(err => {
    msg.channel.stopTyping();
    funcs.displayError(msg, err);
  });
}, {minargs: 1, info: {show: true, type: "nsfw"}});

commands.set("spurriouscorrelations", msg => {
  msg.channel.startTyping(1);
  snekfetch.get("http://tylervigen.com/page?page=" + tools.random(1, 3700)).then(res => {
    msg.channel.stopTyping();
    let corrs = res.text.match(/correlation_images\/[a-z0-9_-]+\.png/gi);
    if (corrs) msg.channel.send(msg.lang.misc.fromWebsite("$LINK", "http://tylervigen.com/spurious-correlations"), {files: ["http://tylervigen.com/correlation_project/" + corrs.random()]});
  }).catch(err => msg.channel.stopTyping());
}, {maxargs: 0, info: {show: true, type: "fun"}});

commands.set("csshumor", msg => {
  let link = "https://csshumor.com";
  msg.channel.startTyping(1);
  snekfetch.get(link).then(res => {
    msg.channel.stopTyping();
    let humor = res.text.match(/<td class="crayon-code">.+<\/td>/i).shift().split(/[<>]/).filter(str => {
      return !str.includes("class=") && !str.startsWith("/") && str.length > 0 && !str.startsWith("&");
    }).join("");
    if (humor.length > 0) msg.channel.send(msg.lang.misc.fromWebsite("$LINK", link) + "\n```css\n" + humor + "\n```");
  }).catch(err => msg.channel.stopTyping());
}, {maxargs: 0, info: {show: true, type: "fun"}});

commands.set("cleverbot", (msg, args, argstr) => {
  if (msg.poster.cleverResponding) return null;
  let currcbot = cbot;
  cbot++;
  msg.poster.cleverResponding = true;
  msg.channel.startTyping(1);
  clever.setNick(msg.channel.id);
  try {
    clever.create((err, session) => {
      console.log("[CBOT] Input (" + currcbot + ") => '" + argstr + "'");
      try {
        clever.ask(argstr, (err, res) => {
          console.log("[CBOT] Output (" + currcbot + ") => '" + res + "'");
          msg.poster.cleverResponding = false;
          msg.channel.stopTyping();
          if (!err) msg.channel.send(res);
        });
      } catch(err) {
        msg.channel.stopTyping();
      }
    })
  } catch(err) {
    msg.channel.stopTyping();
  }
}, {minargs: 1, info: {show: true, type: "fun"}});

// FUNCTIONS -------------------------------------------------------------------------------

async function login(delay = 20000, nb = 1) {
	console.log(client.shard ? "[INFO] Shard '" + client.shard.id + "' connecting." : "[INFO] Connecting.");
  try {
    await client.login(process.env.DISCORDTOKEN);
    return nb;
  } catch(err) {
    console.log(client.shard ? "[INFO] Shard '" + client.shard.id + "' connection failed." : "[INFO] Connection failed.");
    console.log("Retrying in '" + delay/1000 + "' seconds.");
		await tools.sleep(delay);
		return login(delay, nb+1);
  }
}

login();
