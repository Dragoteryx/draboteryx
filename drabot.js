"use strict";
require("dotenv").config();
require("./src/prototypes.js");

// IMPORTS
const snekfetch = require("snekfetch");
const DBL = require("dblapi.js");
const Danbooru = require("danbooru");

// FILES
const {Client} = require("./src/client.js");
const config = require("./config.json");
const tools = require("./src/tools.js");
const funcs = require("./src/funcs.js");
const data = require("./src/data.js");
const crypt = require("./src/crypt.js");
const music = require("./src/music.js");
const Lang = require("./langs/langs.js");
const listenmoe = require("./src/listenmoe.js");
const money = require("./src/money.js");
const Cleverbot = require("./src/cleverbot.js");

// CONSTS
const client = new Client({
  prefix: config.prefix,
  onMessage: async msg => {
    if (msg.guild) {
      if (!msg.guild.fetched) {
        let data = await msg.guild.fetchData();
        if (data.lang) msg.guild._lang = data.lang;
        if (data.prefix) msg.guild._prefix = data.prefix;
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
  }
});
const langs = {
  en: new Lang(require("./langs/lang_en.json")),
  //jp: new Lang(require("./langs/lang_jp.json"), require("./langs/lang_en.json")),
  fr: new Lang(require("./langs/lang_fr.json"), require("./langs/lang_en.json"))
}
const vars = {};
const heroku = process.env.HEROKU != undefined;

// GLOBALS
const commandTypes = ["moderation", "utility", "game", "fun", "misc", "music", "nsfw", "bot"];
const dbl = heroku ? new DBL(process.env.DBLAPITOKEN, client) : null;
const aliases = [];
const booru = new Danbooru(process.env.DANBOORU_LOGIN + ":" + process.env.DANBOORU_KEY);
const clever = new Cleverbot(process.env.CLEVER_USER, process.env.CLEVER_KEY);
let debug = false;
let firstConnection = true;
let cbot = 0;
let cbotRespond = 0 // 0 all | 1 users | 2 bots
let crashs = 0

// EXPORTS
exports.client = client;
exports.langs = langs;
exports.vars = vars;
exports.heroku = heroku;

// EVENTS
const ignoredErrors = ["DiscordAPIError", "PlaylistError"];
process.on("uncaughtException", async err => {
  funcs.error("Uncaught Exception", err);
  await client.destroy();
  process.exit(1);
});
process.on("unhandledRejection", async (err, promise) => {
  funcs.error("Unhandled Promise Rejection", err);
  /*if (!ignoredErrors.includes(err.name)) {
    await client.destroy();
    process.exit(1);
  }*/
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
  crashs = 0
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
client.on("error", () => {
  console.log("[INFO] Disconnected.");
	login();
});

client.on("command", (msg, command) => {
  if (msg.channel.type == "text") console.log("[LOG] Guild channel: '" + msg.guild.name + "' => '" + msg.content + "'");
  else if (msg.channel.type == "group") console.log("[LOG] Group channel => '" + msg.content + "'");
  else if (msg.channel.type == "dm") console.log("[LOG] Private channel => '" + msg.content + "'");
});
client.on("beforeCommand", (msg, command, before) => {
  null;
});
client.on("afterCommand", (msg, command, before, after, res) => {
  null;
});
client.on("deniedCommand", (msg, command, reasons) => {
  if (reasons.includes("owner"))
    msg.channel.send(msg.lang.errors.ownerOnlyCommand());
  else if (reasons.includes("disabled"))
    msg.channel.send(msg.lang.errors.disabledCommand());
  else if (reasons.includes("admin"))
    msg.channel.send(msg.lang.errors.adminOnlyCommand());
  else if (reasons.includes("mod"))
    msg.channel.send(msg.lang.errors.modOnlyCommand());
  else if (reasons.includes("dj"))
    msg.channel.send(msg.lang.errors.djOnlyCommand());
  else if (reasons.includes("guildOnly"))
    msg.channel.send(msg.lang.errors.guildOnlyCommand());
  else if (reasons.includes("largeGuilds"))
    msg.channel.send(msg.lang.errors.largeGuild());
  else if (reasons.includes("nsfw"))
    msg.channel.send(msg.lang.errors.nsfwCommand());
  else if (reasons.includes("maxArgs") || reasons.includes("minArgs"))
    msg.channel.send(msg.lang.errors.wrongSyntax("$PREFIX", msg.prefix, "$COMMAND", command.name));
  else if (reasons.includes("disabled"))
    msg.channel.send(msg.lang.errors.disabledCommand());
});
client.on("notCommand", msg => {
  if (msg.channel.type == "dm" || (msg.guild && ["cleverbot", "cbot", "drb-cleverbot", "drb-cbot"].includes(msg.channel.name))) {
    let command = client.getCommand("cbot");
    let args = msg.content.split(/ +/g);
    command.run(msg, args, args.join(" "), command);
  }
});
client.on("commandError", (msg, err, command) => {
  funcs.displayError(msg, err);
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

client.commandProperty("owner", (msg, owneronly = false) => !owneronly || msg.author.owner);
client.commandProperty("admin", (msg, adminonly = false) => !adminonly || msg.author.admin);
client.commandProperty("mod", (msg, modonly = false) => !modonly || msg.author.mod);
client.commandProperty("dj", (msg, djonly = false) => !djonly || msg.author.dj);
client.commandProperty("disabled", (msg, disabled = false) => !disabled || msg.author.owner);

// OWNER

client.defineCommand("test", function(msg) {
  msg.channel.send("Test1 => " + msg.lang.misc.test() + "\nTest2 => " + msg.lang.misc.test2());
  this.delete();
}, {owner: true, maxArgs: 0});

client.defineCommand(["exec", "eval"], async (msg, args, argstr) => {
	try {
    let val = eval(argstr);
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
}, {owner: true, minArgs: 1});

client.defineCommand("setavatar", async (msg, args) => {
  await client.user.setAvatar(args[0]);
  msg.channel.send("New avatar:", {files: [args[0]]});
}, {owner: true, minArgs: 1, maxArgs: 1});

client.defineCommand("setusername", async (msg, args, argstr) => {
  await client.user.setUsername(argstr);
  msg.channel.send("New username: `" + argstr + "`");
}, {owner: true, minArgs: 1});

client.defineCommand("setmoney", async (msg, args) => {
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
}, {owner: true, minArgs: 2});

client.defineCommand("restart", async msg => {
  msg.channel.send("Ok I'm disconnecting!");
  await client.destroy();
  let nb = await login();
  msg.channel.send("I'm back!");
}, {owner: true, maxArgs: 0});

// BOT

client.defineCommand("help", (msg, args) => {
  if (args.length == 0) {
    let embed = tools.defaultEmbed();
    for (let type of commandTypes) {
      let sameType = client.commandsArray.filter(command => command.properties.info && command.properties.info.show && command.properties.info.type == type).map(command => "`" + command.name + "`").sort();
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
      if (client.commandExists(arg)) {
        nb++;
        let command = client.getCommand(arg);
        let embed = tools.defaultEmbed()
        .addField(msg.lang.commands.help.commandName(), command.name, true)
				.addField(msg.lang.commands.help.commandType(), msg.lang.types()[command.properties.info.type], true)
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

client.defineCommand("server", msg => {
  msg.channel.send("https://discord.gg/aCgwj8M");
}, {maxArgs: 0, info: {show: true, type: "bot"}});

client.defineCommand("invite", msg => {
  msg.channel.send("https://discordapp.com/oauth2/authorize?client_id=273576577512767488&scope=bot&permissions=70437888");
}, {maxArgs: 0, info: {show: true, type: "bot"}});

client.defineCommand(["about", "info"], async msg => {
  msg.channel.send("", await funcs.showInfo(msg));
}, {maxArgs: 0, info: {show: true, type: "bot"}});

client.defineCommand("permissions", async msg => {
  msg.channel.send(msg.lang.commands.permissions.info());
}, {maxArgs: 0, info: {show: true, type: "bot"}});

client.defineCommand("reset", async msg => {
  if (msg.guild) {
    delete msg.guild._lang;
    delete msg.guild._prefix;
    await msg.guild.clearData();
  } else {
    delete msg.channel._lang;
    delete msg.channel._prefix;
  } msg.channel.send("I've been reset to default values.\nLanguage: `English`\nPrefix: `/`");
}, {admin: true, maxArgs: 0, info: {show: true, type: "bot"}});

client.defineCommand("prefix", async (msg, args) => {
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
}, {maxArgs: 1, info: {show: true, type: "bot"}});

client.defineCommand(["lang", "language"], async (msg, args) => {
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
}, {maxArgs: 1, info: {show: true, type: "bot"}});

client.defineCommand("ping", async msg => {
  msg.channel.send("Pong! (" + Math.round(client.ping) + "ms) :ping_pong:");
}, {maxArgs: 0, info: {show: true, type: "bot"}});

// MONEY

client.defineCommand("money", async msg => {
  await msg.author.fetchMoney();
  msg.channel.send(msg.lang.commands.money.display("$AMOUNT", msg.author.money, "$CURRENCY", config.currency));
}, {bots: true, maxArgs: 0, info: {show: true, type: "misc"}});

client.defineCommand("givemoney", async (msg, args) => {
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
}, {guildOnly: true, bots: true, minArgs: 2, info: {show: true, type: "misc"}});

client.defineCommand("dropmoney", async (msg, args) => {
  await msg.author.fetchMoney();
  let res = tools.validNumber(args[0], 1, msg.author.money, true);
  if (!res.valid) {
    if (res.fail == 2) msg.channel.send(msg.lang.money.notEnough());
    else msg.channel.send(msg.lang.money.invalidAmount());
  } else {
    let amount = Number(args[0]);
    msg.channel.send(msg.lang.commands.dropmoney.userDropMoney("$PREFIX", msg.prefix, "$USERNAME", msg.authorName, "$AMOUNT", amount, "$CURRENCY", config.currency));
    let msg2 = await msg.channel.waitResponse(15000, msg2 => {
      if (msg2.author.bot && msg.author.id != msg2.author.id) return false;
      return msg2.content == msg.prefix + "pickmoney";
    });
    if (!msg2) msg.channel.send(msg.lang.commands.dropmoney.noPickMoney());
    else {
      await msg2.author.fetchMoney();
      msg.author.giveMoney(msg2.author, amount);
      msg.channel.send(msg.lang.commands.dropmoney.pickMoney("$USERNAME", msg2.authorName, "$AMOUNT", amount, "$CURRENCY", config.currency));
    }
  }
}, {guildOnly: true, bots: true, minArgs: 1, maxArgs: 1, info: {show: true, type: "misc"}});

client.defineCommand("moneyleaderboard", async msg => {
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
}, {guildOnly: true, largeGuilds: false, maxArgs: 0, info: {show: true, type: "misc"}});

// MODERATION


// UTILS

client.defineCommand(["serverinfo", "guildinfo"], async msg => {
  msg.channel.send("", await msg.guild.embedInfo());
}, {maxArgs: 0, guildOnly: true, info: {show: true, type: "utility"}});

client.defineCommand(["userinfo", "memberinfo"], async (msg, args, argstr) => {
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
}, {guildOnly: true, info: {show: true, type: "utility"}});

client.defineCommand("channelinfo", (msg, args, argstr) => {
  if (args.length == 0) msg.channel.send("", msg.channel.embedInfo());
  else {
    let nb = 0;
    tools.stringToChannels(argstr, msg.guild).forEach(channel => {
      nb++;
      msg.channel.send("", channel.embedInfo())
    });
    if (nb == 0) msg.channel.send(msg.lang.commands.channelinfo.noChannel());
  }
}, {guildOnly: true, info: {show: true, type: "utility"}});

client.defineCommand("roleinfo", (msg, args, argstr) => {
  if (args.length == 0) msg.channel.send("", msg.member.highestRole.embedInfo());
  else {
    let nb = 0;
    tools.stringToRoles(argstr, msg.guild).forEach(role => {
      nb++;
      msg.channel.send("", role.embedInfo())
    });
    if (nb == 0) msg.channel.send(msg.lang.commands.roleinfo.noRole());
  }
}, {guildOnly: true, info: {show: true, type: "utility"}});

client.defineCommand("prune", async (msg, args) => {
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
}, {admin: true, maxArgs: 1, guildOnly: true, info: {show: true, type: "utility"}});

// MUSIC

client.defineCommand("join", async msg => {
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
}, {disabled: true, maxArgs: 0, guildOnly: true, info: {show: true, type: "music"}});

client.defineCommand("leave", async msg => {
  if (!msg.guild.playlist.connected)
    msg.channel.send(msg.lang.music.notConnected())
  else {
    msg.guild.musicChannel = msg.channel;
    msg.guild.playlist.leave();
    msg.channel.send(msg.lang.commands.leave.bye());
  }
}, {maxArgs: 0, guildOnly: true, info: {show: true, type: "music"}});

client.defineCommand("request", async (msg, args) => {
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
}, {minArgs: 1, guildOnly: true, info: {show: true, type: "music"}});

client.defineCommand(["stream", "radio"], async (msg, args) => {
  if (!msg.guild.playlist.connected)
    msg.channel.send(msg.lang.music.notConnected())
  else if (!msg.guild.playlist.playing) {
    msg.guild.musicChannel = msg.channel;
    let streams = [];
    streams["listen.moe"] = listenmoe.jpop;
    streams["listen.moe/jpop"] = listenmoe.jpop;
    streams["listen.moe/kpop"] = listenmoe.kpop;
    streams["off"] = null;
    let stream = streams[args[0]];
    if (stream === undefined)
      msg.channel.send(msg.lang.errors.wrongSyntax("$PREFIX", msg.prefix, "$COMMAND", "stream"));
    else {
      msg.guild.playlist.stream(stream);
      if (stream) {
        msg.channel.send(msg.lang.commands.stream.nowStreaming("$NAME", stream.name));
      } else msg.channel.send(msg.lang.commands.stream.stopStreaming());
    }
  } else msg.channel.send(msg.lang.music.noPlaying());
}, {disabled: true, minArgs: 1, maxArgs: 1, guildOnly: true, info: {show: true, type: "music"}});

client.defineCommand("pause", msg => {
  if (!msg.guild.playlist.connected)
    msg.channel.send(msg.lang.music.notConnected())
  else if (!msg.guild.playlist.dispatching)
    msg.channel.send(msg.lang.music.notPlayingNorStreaming())
  else {
    msg.guild.musicChannel = msg.channel;
    msg.guild.playlist.paused = true;
    msg.channel.send(msg.lang.commands.pause.done());
  }
}, {maxArgs: 0, guildOnly: true, info: {show: true, type: "music"}});

client.defineCommand("resume", msg => {
  if (!msg.guild.playlist.connected)
    msg.channel.send(msg.lang.music.notConnected())
  else if (!msg.guild.playlist.dispatching)
    msg.channel.send(msg.lang.music.notPlayingNorStreaming())
  else {
    msg.guild.musicChannel = msg.channel;
    msg.guild.playlist.paused = false;
    msg.channel.send(msg.lang.commands.resume.done());
  }
}, {maxArgs: 0, guildOnly: true, info: {show: true, type: "music"}});

client.defineCommand("skip", msg => {
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
}, {maxArgs: 0, guildOnly: true, info: {show: true, type: "music"}});

client.defineCommand("plremove", (msg, args) => {
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
}, {minArgs: 1, maxArgs: 1, guildOnly: true, info: {show: true, type: "music"}});

client.defineCommand("plclear", msg => {
  if (!msg.guild.playlist.connected)
    msg.channel.send(msg.lang.music.notConnected())
  else if (msg.guild.playlist.playing) {
    msg.guild.musicChannel = msg.channel;
    let nb = msg.guild.playlist.pending.clear();
    msg.channel.send(msg.lang.commands.plclear.done("$NB", nb));
  } else if (msg.guild.playlist.streaming)
    msg.channel.send(msg.lang.music.noStreaming("$PREFIX", msg.prefix));
  else msg.channel.send(msg.lang.music.notPlaying())
}, {maxArgs: 0, guildOnly: true, info: {show: true, type: "music"}});

client.defineCommand("plshuffle", msg => {
  if (!msg.guild.playlist.connected)
    msg.channel.send(msg.lang.music.notConnected())
  else if (msg.guild.playlist.playing) {
    msg.guild.musicChannel = msg.channel;
    msg.guild.playlist.pending.shuffle();
    msg.channel.send(msg.lang.commands.plshuffle.done());
  } else if (msg.guild.playlist.streaming)
    msg.channel.send(msg.lang.music.noStreaming("$PREFIX", msg.prefix));
  else msg.channel.send(msg.lang.music.notPlaying())
}, {maxArgs: 0, guildOnly: true, info: {show: true, type: "music"}});

client.defineCommand("volume", (msg, args) => {
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
}, {guildOnly: true, minArgs: 1, maxArgs: 1, info: {show: true, type: "music"}});

client.defineCommand("loop", msg => {
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
}, {maxArgs: 0, guildOnly: true, info: {show: true, type: "music"}});

client.defineCommand("plloop", msg => {
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
}, {maxArgs: 0, guildOnly: true, info: {show: true, type: "music"}});

client.defineCommand("current", msg => {
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
  		.addField(msg.lang.misc.link(), current.link, true)
    } else if (current.type == "file") {
  		info.addField(msg.lang.commands.current.fileName(), current.name, true);
    }
    info.addField(msg.lang.commands.current.requestedBy(), current.member, true);
  	msg.channel.send(msg.lang.commands.current.display("$TIMER", tools.parseTimestamp(time).timer + " / " + tools.parseTimestamp(current.length).timer + " ("+ Math.floor((time / current.length)*100) + "%)"), info);
  } else if (msg.guild.playlist.streaming) {
      msg.channel.send(msg.lang.commands.stream.nowPlaying("$TITLE", msg.guild.playlist.current.title, "$NAME", msg.guild.playlist.current.name));
  } else
    msg.channel.send(msg.lang.music.notPlayingNorStreaming())
}, {guildOnly: true, maxArgs: 0, info: {show: true, type: "music"}});

client.defineCommand("playlist", async msg => {
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
}, {guildOnly: true, maxArgs: 0, info: {show: true, type: "music"}});

// ELSE

client.defineCommand("say", (msg, args, argstr) => {
	msg.channel.send(argstr);
	msg.delete();
}, {owner: true, minArgs: 1});

client.defineCommand("ttsay", (msg, args, argstr) => {
	msg.channel.send(argstr, {tts: true});
	msg.delete();
}, {owner: true, minArgs: 1});

client.defineCommand("roll", (msg, args) => {
	let max = 6;
	if (args.length == 1 && tools.validNumber(args[0], 1, Infinity, true).valid)
		max = Number(args[0]);
	let res = tools.random(1, max);
	msg.channel.send(res + "/" + max + " :game_die:");
}, {maxArgs: 1, info: {show: true, type: "fun"}});

client.defineCommand("fact", async (msg, args) => {
  try {
    msg.channel.startTyping(1);
  	let res = await snekfetch.get("https://factgenerator.herokuapp.com/generate?words=" + args.join("_"));
    msg.channel.stopTyping();
  	let parsed = JSON.parse(res.text);
  	msg.channel.send(parsed.facts[0].text);
  } catch(err) {
    msg.channel.stopTyping();
		msg.channel.send(msg.lang.commands.fact.offline());
  }
}, {info: {show: true, type: "fun"}});

client.defineCommand("reflex", async msg => {
	if (msg.channel.reflex) return;
	msg.channel.reflex = true;
	msg.channel.send(msg.lang.commands.reflex.rules());
  msg.channel.startTyping(1);
	await tools.sleep(tools.random(1000, 10000));
  msg.channel.stopTyping();
	let random = tools.random(100, 999);
	await msg.channel.send(msg.lang.commands.reflex.msg("$RANDOM", random));
	let msg2 = await msg.channel.waitResponse(10000, msg2 => {
		if (msg2.content == random && msg2.author.bot) {
			msg.channel.send(msg.lang.commands.reflex.bots());
			return false;
		}
		return msg2.content == random;
	});
	if (!msg2) msg.channel.send(msg.lang.commands.reflex.slow());
	else msg.channel.send(msg.lang.commands.reflex.wellPlayed("$WINNER", msg2.authorName));
	msg.channel.reflex = false;
}, {guildOnly: true, maxArgs: 0, info: {show: true, type: "game"}});

client.defineCommand(["cyanidehappiness", "cah"], async msg => {
  try {
    let link = "http://explosm.net/rcg";
    msg.channel.startTyping(1);
  	let res = await snekfetch.get(link);
    msg.channel.stopTyping()
    let img = res.text.match(/http:\/\/files.explosm.net\/rcg\/[a-z]{9}\.png/i).shift();
  	msg.channel.send(msg.lang.misc.fromWebsite("$LINK", link), {files: [img]});
  } catch(err) {
    msg.channel.stopTyping();
    throw err;
  }
}, {maxArgs: 0, info: {show: true, type: "fun"}});

client.defineCommand("httpdog", async msg => {
  try {
    let link = "https://httpstatusdogs.com";
    msg.channel.startTyping(1);
  	let res = await snekfetch.get(link);
    msg.channel.stopTyping();
  	let imgs = res.text.match(/img\/[1-5][0-9]{2}\.jpg/g);
  	msg.channel.send(msg.lang.misc.fromWebsite("$LINK", link), {files: [link + "/" + imgs.random()]});
  } catch(err) {
    msg.channel.stopTyping();
    throw err;
  }
}, {maxArgs: 0, info: {show: true, type: "fun"}});

client.defineCommand("waifu", msg => {
	msg.channel.send(msg.lang.commands.waifu.theTruth());
}, {maxArgs: 0, info: {show: true, type: "fun"}});

client.defineCommand("whatisthebestyoutubechannel?", msg => {
	msg.channel.send("https://www.youtube.com/channel/UC6nSFpj9HTCZ5t-N3Rm3-HA :ok_hand:");
}, {maxArgs: 0});

client.defineCommand("encrypt", async (msg, args, argstr) => {
	let key = crypt.genNoise(16);
  let msg2 = await msg.channel.send(msg.lang.commands.encrypt.specificKey());
  let useKey = await msg2.askValidation(10000, msg.author);
  if (useKey) {
    await msg.channel.send(msg.lang.commands.encrypt.askKey());
    let msg3 = await msg.channel.waitResponse(10000, msg2 => msg2.author.id == msg.author.id);
    if (msg3) key = msg3.content;
  }
  msg.channel.send(msg.lang.commands.encrypt.encrypted("$MESSAGE", crypt.encrypt(argstr, key), "$KEY", key));
}, {minArgs: 1, info: {show: true, type: "misc"}});

client.defineCommand("decrypt", async (msg, args, argstr) => {
	let crypted = argstr;
	await msg.channel.send(msg.lang.commands.decrypt.keyRequest());
	let msg2 = await msg.channel.waitResponse(20000, msg3 => msg3.author.id == msg.author.id);
	if (!msg2) msg.channel.send(msg.lang.commands.decrypt.unknownKey());
	else {
		let message = crypt.decrypt(crypted, msg2.content);
		if (!message) msg.channel.send(msg.lang.commands.decrypt.wrongKey());
		else msg.channel.send(msg.lang.commands.decrypt.decrypted("$MESSAGE", message));
	}
}, {minArgs: 1, info: {show: true, type: "misc"}});

client.defineCommand("danbooru", async (msg, args, argstr) => {
  if (args.length > 3 || (args.length == 3 && !args.includes("rating:safe"))) {
    msg.channel.send(msg.lang.commands.danbooru.limit("$LIMIT", 2));
    return;
  }
  let tags = argstr;
  if (msg.guild && !msg.channel.nsfw) {
    args = args.filter(tag => !tag.startsWith("rating:"));
    args.push("rating:safe");
    tags = args.join(" ");
  }
  try {
    msg.channel.startTyping(1);
    let posts = await booru.posts({limit: 1, random: true, tags: tags});
    msg.channel.stopTyping();
    if (posts.length == 0 || !posts[0]) msg.channel.send(msg.lang.misc.noResults());
    else msg.channel.send(msg.lang.commands.danbooru.result("$TAGS", tags), {files: [posts[0].large_file_url]});
  } catch(err) {
    msg.channel.stopTyping();
    throw err;
  }
}, {minArgs: 1, info: {show: true, type: "nsfw"}});

client.defineCommand(["spurriouscorrelations", "spcl"], async msg => {
  try {
    msg.channel.startTyping(1);
    let res = await snekfetch.get("http://tylervigen.com/page?page=" + tools.random(1, 3700));
    msg.channel.stopTyping()
    let corrs = res.text.match(/correlation_images\/[a-z0-9_-]+\.png/gi);
    if (corrs) msg.channel.send(msg.lang.misc.fromWebsite("$LINK", "http://tylervigen.com/spurious-correlations"), {files: ["http://tylervigen.com/correlation_project/" + corrs.random()]});
  } catch(err) {
    msg.channel.stopTyping()
    throw err;
  }
}, {maxArgs: 0, info: {show: true, type: "fun"}});

client.defineCommand("csshumor", async msg => {
  try {
    let link = "https://csshumor.com";
    msg.channel.startTyping(1);
    let res = await snekfetch.get(link);
    msg.channel.stopTyping();
    let humor = res.text.match(/<td class="crayon-code">.+<\/td>/i).shift().split(/[<>]/).filter(str => {
      return !str.includes("class=") && !str.startsWith("/") && str.length > 0 && !str.startsWith("&");
    }).join("");
    if (humor.length > 0) msg.channel.send(msg.lang.misc.fromWebsite("$LINK", link) + "\n```css\n" + humor + "\n```");
  } catch(err) {
    msg.channel.stopTyping();
    throw err;
  }
}, {maxArgs: 0, info: {show: true, type: "fun"}});

client.defineCommand(["cleverbot", "cbot"], async (msg, args, argstr) => {
  try {
    if (cbotRespond == 1 && msg.author.bot) return null;
    if (cbotRespond == 2 && !msg.author.bot) return null;
    if (msg.poster.cleverResponding) return null;
    let currcbot = cbot;
    cbot++;
    msg.poster.cleverResponding = true;
    msg.channel.startTyping(1);
    console.log("[CBOT] Input (" + currcbot + ") => '" + argstr + "'");
    let res = await clever.fetch(argstr, msg.channel.id);
    console.log("[CBOT] Output (" + currcbot + ") => '" + res + "'");
    msg.poster.cleverResponding = false;
    msg.channel.stopTyping();
    let msg2 = await msg.channel.send(res);
    return msg2;
  } catch(err) {
    msg.poster.cleverResponding = false;
    msg.channel.stopTyping();
    throw err;
  }
}, {bots: true, minArgs: 1, info: {show: true, type: "fun"}});

client.defineCommand("scp", async (msg, args) => {
  try {
    let scp = {};
    let pages = [
      "http://www.scp-wiki.net/scp-series",
      "http://www.scp-wiki.net/scp-series-2",
      "http://www.scp-wiki.net/scp-series-3",
      "http://www.scp-wiki.net/scp-series-4",
      "http://www.scp-wiki.net/scp-series-5"
    ];
    if (args.length == 0) {
      msg.channel.startTyping(1);
      let index = await snekfetch.get(pages.random());
      let scpData = index.text.match(/<li><a href="\/scp-\d+">SCP-\d+<\/a> - .+<\/li>/gi).random();
      scp.id = scpData.match(/scp-\d+/)[0];
      scp.name = scpData.match(/ - .+<\/li>/i)[0].replace(" - ", "").replace("</li>", "").removeHTML();
    } else {
      let assert = tools.validNumber(args[0], 1, 4999, true);
      if (!assert.valid) {
        msg.channel.send(msg.lang.commands.scp.invalidSCP());
        return;
      } else {
        msg.channel.startTyping(1);
        while (args[0].length < 3)
          args[0] = "0" + args[0];
        scp.id = "scp-" + args[0];
        let page;
        if (args[0].length == 3) page = pages[0];
        else page = pages[Number(args[0][0])];
        let index = await snekfetch.get(page);
        let scpData = index.text.match(new RegExp('<li><a href="/' + scp.id + '">SCP-' + args[0] + '</a> - .+</li>', "i"));
        if (scpData)
          scp.name = scpData[0].match(/ - .+<\/li>/i)[0].replace(" - ", "").replace("</li>", "").removeHTML();
        else {
          msg.channel.send(msg.lang.commands.scp.invalidSCP());
          msg.channel.stopTyping();
          return;
        }
      }
    }
    let embed = tools.coloredEmbed("#673D3D").setThumbnail("https://upload.wikimedia.org/wikipedia/commons/thumb/e/ec/SCP_Foundation_%28emblem%29.svg/langfr-220px-SCP_Foundation_%28emblem%29.svg.png")
    .addField(scp.id.toUpperCase(), scp.name).addField(msg.lang.misc.link(), "http://www.scp-wiki.net/" + scp.id);
    msg.channel.stopTyping();
    msg.channel.send("", embed);
  } catch(err) {
    msg.channel.stopTyping();
    throw err;
  }
}, {maxArgs: 1, info: {show: true, type: "misc"}});

// FUNCTIONS -------------------------------------------------------------------------------

async function login(delay = 20000, nb = 1) {
	console.log(client.shard ? "[INFO] Shard '" + client.shard.id + "' connecting." : "[INFO] Connecting.");
  try {
    await client.login(process.env.DISCORDTOKEN);
    return nb;
  } catch(err) {
    console.log(client.shard ? "[INFO] Shard '" + client.shard.id + "' connection failed." : "[INFO] Connection failed.");
    crashs++
    if (crashs >= 3) {
      console.log("Failed to connect 3 times in a row, restarting.");
      process.exit();
    } else {
      console.log("Retrying in '" + delay/1000 + "' seconds.");
  		await tools.sleep(delay);
  		return login(delay, nb+1);
    }
  }
}

login();
