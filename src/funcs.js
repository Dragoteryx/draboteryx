const drabot = require("../drabot.js");
const config = require("../config.js");
const music = require("./music.js");

exports.logError = (msg, err) => {
	drabot.client.fetchApplication().then(async app => {
		let str = msg.lang.errors.unknown("$OWNERTAG", app.owner.tag, "$PREFIX", msg.prefix) + "```\n" + err.stack;
		msg.channel.send(str.substring(0, 1995) + "\n```");
		console.log("[ERROR]");
		console.error(err);
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
