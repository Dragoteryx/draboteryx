const drabot = require("../drabot.js");
const config = require("../config.js");
const pack = require("../package.json");
const tools = require("./tools.js");
const music = require("./music.js");

exports.sendToOwner = async str => (await client.fetchApplication()).owner.send(str);
exports.error = (str = "", err) => {
	let preError = "[ERROR] " + (str.length > 0 ? str + ": " : "");
	if (process.env.HEROKU != undefined)
		console.log(preError + err.message);
	else console.error(preError + "\n", err);
}

exports.displayError = (msg, err) => {
	drabot.client.fetchApplication().then(async app => {
		let str = msg.lang.errors.unknown("$OWNERTAG", app.owner.tag, "$PREFIX", msg.prefix) + "```\n" + err.stack;
		msg.channel.send(str.substring(0, 1995) + "\n```");
		exports.error("msg => '" + msg.content + "'", err);
	}).catch(console.error);
}

exports.musicErrors = (msg, err) => {
	if (err.message == music.errorMessages.memberNotInVoiceChannel) msg.channel.send(msg.lang.music.memberNotInVoiceChannel());
	else if (err.message == music.errorMessages.voiceChannelNotJoinable) msg.channel.send(msg.lang.music.voiceChannelNotJoinable());
	else if (err.message == music.errorMessages.voiceChannelNotSpeakable) msg.channel.send(msg.lang.music.voiceChannelNotSpeakable());
	else if (err.message == music.errorMessages.voiceChannelFull) msg.channel.send(msg.lang.music.voiceChannelFull());
	else if (err.message == music.errorMessages.guildAlreadyJoined) msg.channel.send(msg.lang.music.guildAlreadyJoined());
	else if (err.message == music.errorMessages.notConnected) msg.channel.send(msg.lang.music.notConnected());
	else if (err.message == music.errorMessages.notPlaying) msg.channel.send(msg.lang.music.notPlaying());
	else if (err.message == music.errorMessages.emptyPlaylist) msg.channel.send(msg.lang.music.emptyPlaylist());
	else if (err.message == music.errorMessages.invalidMusicIndex) msg.channel.send(msg.lang.music.invalidMusicIndex());
	else if (err.message == music.errorMessages.videoWebsite) msg.channel.send(msg.lang.music.unknownWebsite());
	else if (err.message == music.errorMessages.invalidVolume) msg.channel.send(msg.lang.music.invalidVolume());
	else exports.logError(msg, err);
}

exports.showInfo = async msg => {
	let stats = "";
	let guilds = drabot.client.shard ?
	(await drabot.client.shard.fetchClientValues("guilds.size")).reduce((acc, val) => acc += val, 0)
	: drabot.client.guilds.size;
	let channels = drabot.client.shard ?
	(await drabot.client.shard.fetchClientValues("channels.size")).reduce((acc, val) => acc += val, 0)
	: drabot.client.channels.size;
	let users = drabot.client.shard ?
	(await drabot.client.shard.fetchClientValues("users.size")).reduce((acc, val) => acc += val, 0)
	: drabot.client.users.size;
	stats += msg.lang.commands.about.uptime("$UPTIME", tools.parseTimestamp(drabot.client.uptime).simple) + "\n";
	stats += msg.lang.commands.about.servers("$NB", guilds) + "\n";
	stats += msg.lang.commands.about.channels("$NB", channels) + "\n";
	stats += msg.lang.commands.about.users("$NB", users);
	if (drabot.client.shard) stats += "\n" + msg.lang.commands.about.sharding("$NB", drabot.client.shard.count, "$ID", drabot.client.shard.id);
	let info = tools.defaultEmbed()
	.setThumbnail(drabot.client.user.avatarURL)
	.addField(msg.lang.commands.about.tag(), drabot.client.user.tag, true);
	let app = await drabot.client.fetchApplication();
	if (msg.channel.type == "text")
		await msg.guild.fetchMember(app.owner.id).then(owner => {
			info.addField(msg.lang.commands.about.author(), app.owner.tag + " (" + owner + ")", true);
		}).catch(() => {
			info.addField(msg.lang.commands.about.author(), app.owner.tag, true);
		});
	else
		info.addField(msg.lang.commands.about.author(), app.owner.tag, true);
	info.addField(msg.lang.commands.about.version(), pack.version, true)
	.addField(msg.lang.commands.about.library(), "Discord.js", true)
	.addField(msg.lang.commands.about.desc(), pack.description)
	.addField(msg.lang.commands.about.stats(), stats)
	.addField("Github", "https://github.com/Dragoteryx/draboteryx", true)
	.addField(msg.lang.commands.about.homepage(), "https://dragoteryx.github.io/draboteryx", true)
	.addField(msg.lang.commands.about.invite(), "https://goo.gl/DTG2x2", true)
	.addField(msg.lang.commands.about.dblPage(), "https://discordbots.org/bot/273576577512767488", true);
	return info;
}
