"use strict";
const discord = require("discord.js");
const Danbooru = require("danbooru");
const edsm = require("./edsm.js");
const ytdl = require("ytdl-core");
const DrGMusic2 = require("drg-music2");

const drabot = require("../drabot.js");
const config = require("../config.js");
const classes = require("./classes.js");
const tools = require("./tools.js");
const pack = require("../package.json");

const booru = new Danbooru();
const safebooru = new Danbooru.Safebooru();

exports.showMemberInfo = function(member) {
	let tempRoles = Array.from(member.roles.values());
	let roles = [];
	for (let role of tempRoles) {
		if (role.name != "@everyone")
			roles.push(role.name);
		else
			roles.push("everyone (default role)");
	}
	let info = tools.defaultEmbed();
	if (member.colorRole !== null)
		info.setColor(member.colorRole.color);
	info.setThumbnail(member.user.displayAvatarURL)
	.addField("Member", member, true)
	.addField("Display name", member.displayName, true)
	.addField("Username#discriminator", member.user.tag, true)
	.addField("Unique ID", member.user.id, true)
	.addField(roles.length + " role(s)",roles)
	.addField("Highest role", member.highestRole, true);
	if (member.voiceChannel !== undefined)
		info.addField("Connected to", member.voiceChannel.name, true);
	info.addField("Joined at", member.joinedAt.toUTCString())
	.addField("Is admin?", member.hasPermission("ADMINISTRATOR") ? "Yes" : "No", true)
	.addField("Is bot?", member.user.bot ? "Yes" : "No", true);
	let stts = "";
	if (member.presence.status == "online") stts += "Online";
	else if (member.presence.status == "offline") stts += "Offline";
	else if (member.presence.status == "idle") stts += "AFK";
	else stts += "Do not disturb";
	info.addField("Status", stts, true);
	if (member.presence.game !== null)
		info.addField("Currently playing", member.presence.game.name, true);
	info.addField("Avatar URL", member.user.avatarURL);
	if (member.user.id == config.users.drago)
		info.setFooter("He is my creator, my Senpai.. Daisuki!");
	if (member.user.id == drabot.client.user.id)
		info.setFooter("Why are you looking at my info? D:");
	return info;
}

exports.showGuildInfo = async function(guild) {
	let maxemojis = 100;
	try {
		let tempRoles = Array.from(guild.roles.values());
		let roles = [];
		for (let role of tempRoles) {
			if (role.name != "@everyone")
				roles.push(role.name);
			else
				roles.push("everyone (default role)");
		}
		let tempChannels = Array.from(guild.channels.values());
		let textChannels = [];
		let voiceChannels = [];
		for (let channel of tempChannels) {
			if (channel.type == "text")
				textChannels.push(channel.name);
			else if (channel.type == "voice")
				voiceChannels.push(channel.name);
		}
		let emojis = Array.from(guild.emojis.values());
		let info = tools.defaultEmbed();
		let nbCon;
		if (guild.iconURL != null)
			info.setThumbnail(guild.iconURL);
		info.addField("Server name", guild.name, true)
		.addField("Unique ID", guild.id, true)
		.addField("Owner", guild.owner, true)
		.addField("Custom emoji(s)", emojis.length + "/" + maxemojis + " (" + (maxemojis-emojis.length) + " remaining)", true)
		.addField(roles.length + " roles",roles)
		.addField(textChannels.length + " text channels",textChannels, true)
		.addField(voiceChannels.length + " voice channels",voiceChannels, true)
		.addField("Created at", guild.createdAt.toUTCString())
		.addField("Region", guild.region, true);
		if (!guild.large) {
			let nbCon = await guild.nbCon();
			info.addField(guild.memberCount + " total members", nbCon + " connected (" + Math.floor((nbCon/guild.memberCount)*100) + "%)", true);
		} else
			info.addField(guild.memberCount + " total members", "Disabled above 250 users", true);
		info.addField("Icon URL", guild.iconURL);
		return Promise.resolve(info);
	} catch(err) {
		return Promise.reject(err);
	}
}

exports.showChannelInfo = function(channel) {
	let info = tools.defaultEmbed();
	info.addField("Channel name", channel.name, true)
	.addField("Unique ID", channel.id, true)
	.addField("Type", channel.type)
	.addField("Created at", channel.createdAt.toUTCString());
	return info;
}

exports.showRoleInfo = function(role) {
	let info = tools.defaultEmbed();
	if (role.color != 0)
		info.setColor(role.color);
	info.addField("Role name", role.name, true)
	.addField("Unique ID", role.id, true)
	.addField("Color", role.hexColor)
	.addField("Created at", role.createdAt.toUTCString())
	.addField("Is admin?", role.hasPermission("ADMINISTRATOR") ? "Yes" : "No", true)
	.addField("Is mentionable?", role.mentionable ? "Yes" : "No", true);
	return info;
}

exports.cacheAllUsers = function(guild) {
	guild.fetchMembers().then(guild => {
		let members = Array.from(guild.members.values());
		for (let member of members)
			drabot.client.fetchUser(member.user.id);
		console.log("[CACHE] All users in guild '" + guild.name + "' have been cached.");
	});
}

exports.cacheUser = function(user) {
	drabot.client.fetchUser(user.id);
	console.log("[CACHE] '" + user.tag + "' has been cached.");
}

exports.showInfo = async msg => {
	try {
		let stats = "";
		stats += "Uptime: ``" + tools.parseTimestamp(drabot.client.uptime).simple + "``\n";
		stats += "``" + Array.from(drabot.client.guilds.keys()).length + "`` servers\n";
		let channels = Array.from(drabot.client.channels.values());
		let nbv = 0;
		for (let channel of channels)
			if (channel.type == "voice")
				nbv++;
		stats += "``" + channels.length + "`` channels (``" + (channels.length - nbv) + "`` text, ``" + nbv + "`` voice)\n";
		stats += "``" + Array.from(drabot.client.users.keys()).length + "`` users";
		let info = tools.defaultEmbed()
		.setThumbnail(drabot.client.user.avatarURL)
		.addField("Discord tag", drabot.client.user.tag, true);
		let app = await drabot.client.fetchApplication();
		if (msg.channel.type == "text")
			await msg.guild.fetchMember(app.owner.id).then(owner => {
				info.addField("Author", app.owner.tag + " (" + owner + ")", true);
			}).catch(() => {
				info.addField("Author", app.owner.tag, true);
			});
		else
			info.addField("Author", app.owner.tag, true);
		info.addField("Version", pack.version, true)
		.addField("Library", "Discord.js", true)
		.addField("Description", pack.description)
		.addField("Stats", stats)
		.addField("Homepage", pack.homepage, true)
		.addField("Invite link", "https://goo.gl/DTG2x2", true)
		.addField("Discordbots.org page", "https://discordbots.org/bot/273576577512767488", true);
		return info;
	} catch(err) {
		exports.logError(msg, err);
	}
}

exports.kanjiInfo = res => {
	let embed = tools.defaultEmbed()
	.addField("Taught in", res.taughtIn, true)
	.addField("JLPT level", res.jlptLevel, true)
	.addField("Stroke count", res.strokeCount, true)
	.addField("Frequency rank", res.newspaperFrequencyRank, true)
	.addField("Meaning", res.meaning);
	if (res.kunyomi.length != 0) {
		embed.addField("Kunyomi", "``" + res.kunyomi.join("   ") + "``");
		if (res.kunyomiExamples.length != 0)
			embed.addField("Kunyomi example", "``" + res.kunyomiExamples[0].example + "`` (read as ``" + res.kunyomiExamples[0].reading + "``): " + res.kunyomiExamples[0].meaning);
		else
			embed.addField("Kunyomi example", "no example to show");
	}
	if (res.onyomi.length != 0) {
		embed.addField("Onyomi", "``" + res.onyomi.join("   ") + "``");
		if (res.onyomiExamples.length != 0)
			embed.addField("Onyomi example", "``" + res.onyomiExamples[0].example + "`` (read as ``" + res.onyomiExamples[0].reading + "``): " + res.onyomiExamples[0].meaning);
		else
			embed.addField("Onyomi example", "no example to show");
	}
	embed.addField("Radical", "``" + res.radical.symbol + "``: " + res.radical.meaning, true)
	.addField("Parts", "``" + res.parts.join("   ") + "``", true)
	.addField("Jisho link", res.uri)
	.setImage(res.strokeOrderDiagramUri);
	return embed;

}

exports.logError = (msg, err) => {
	drabot.client.fetchApplication().then(async app => {
		let str = "A random error occured. Please contact ``" + app.owner.tag + "``. ``" + config.prefix + "server`` to join the test server.```\n" + err.stack;
		msg.channel.send(str.substring(0, 1995) + "\n```");
		console.log("[ERROR]");
		console.error(err);
	}).catch(console.error);
}

exports.musicErrors = (msg, err) => {
	if (err.message == DrGMusic2.errorMessages.memberNotInVoiceChannel) msg.channel.send("You're not in a voice channel.");
	else if (err.message == DrGMusic2.errorMessages.voiceChannelNotJoinable) msg.channel.send("I can't join this voice channel.");
	else if (err.message == DrGMusic2.errorMessages.voiceChannelNotSpeakable) msg.channel.send("I'm not allowed to speak in this voice channel.");
	else if (err.message == DrGMusic2.errorMessages.voiceChannelFull) msg.channel.send("This voice channel is full.");
	else if (err.message == DrGMusic2.errorMessages.guildAlreadyJoined) msg.channel.send("I'm already in a voice channel.");
	else if (err.message == DrGMusic2.errorMessages.notConnected) msg.channel.send("I am not in a voice channel.");
	else if (err.message == DrGMusic2.errorMessages.notPlaying) msg.channel.send("I am not playing any music at the moment.");
	else if (err.message == DrGMusic2.errorMessages.emptyPlaylist) msg.channel.send("The playlist is empty.");
	else if (err.message == DrGMusic2.errorMessages.invalidMusicIndex) msg.channel.send("There is no music with that index in the playlist.");
	else if (err.message == DrGMusic2.errorMessages.videoWebsite) msg.channel.send("Sorry but I don't know this website.");
	else if (err.message == DrGMusic2.errorMessages.invalidVolume) msg.channel.send("The volume must be above ``0``.");
	else exports.logError(msg, err);
}

exports.fetchRedis = path => {
	return new Promise((resolve, reject) => {
		drabot.redis.get(path, (err, data) => {
			if (err) reject(err);
			else if (data === null) resolve({});
			else resolve(JSON.parse(data));
		});
	});
}

exports.sendRedis = (path, data) => {
	return drabot.redis.set(path, JSON.stringify(data));
}

exports.searchDanbooru = async (msg, nsfw) => {
	try {
		let query = msg.content.split(" ").slice(1);
		if (query.length > 2) {
			msg.channel.send("You can't search for more than 2 tags at the same time.");
			return;
		}
		let posts = nsfw ? (await booru.posts(query)) : (await safebooru.posts(query));
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
		exports.logError(msg, err);
	}
}

exports.systemInfo = system => {
	let embed = tools.defaultEmbed()
	.addField("Coordinates", "``" + system.coords.x + "`` / ``" + system.coords.y + "`` / ``" + system.coords.z + "``");
	if (system.information !== null) {
		embed.addField("Allegiance", system.information.allegiance, true)
		.addField("Controlling faction", system.information.faction, true)
		.addField("Governement", system.information.government, true)
		.addField("Population", "``" + system.information.population + "``", true);
	}
	let str = "";
	let nb = 0;
	let bodies = Array.from(system.bodies.values());
	for (let body of bodies) {
		if (nb < 10)
			str += "\n- " + body.name.focus() + " (``" + body.distanceToArrival + "`` ls) => " + body.subType.focus();
		else {
			str += "\n- and ``" + (bodies.length-10) + "`` more...";
			break;
		}
		nb++
	}
	if (bodies.length > 0)
		embed.addField("Bodies", str.replace("\n", ""));
	str = "";
	nb = 0;
	let stations = Array.from(system.stations.values());
	for (let station of stations) {
		if (nb < 10)
			str += "\n- " + station.name.focus() + " (``" + station.distanceToArrival + "`` ls)";
		else {
			str += "\n- and ``" + (stations.length-10) + "`` more...";
			break;
		}
		nb++
	}
	if (stations.length > 0)
		embed.addField("Stations", str.replace("\n", ""));
	str = "";
	nb = 0;
	let factions = Array.from(system.factions.values());
	for (let faction of factions) {
		if (nb < 10)
			str += "\n- " + faction.name.focus();
		else {
			str += "\n- and ``" + (factions.length-10) + "`` more...";
			break;
		}
		nb++
	}
	if (factions.length > 0)
		embed.addField("Factions", str.replace("\n", ""));
	str = "https://www.edsm.net/en/system/id/" + system.id + "/name/" + system.name;
	while (str.includes(" "))
		str.replace(" ", "+");
	embed.addField("Distance to Sol", "``" + drabot.edsm.SOL.distance(system).toFixed(2) + "`` ly", true)
	.addField("Distance to Colonia", "``" + drabot.edsm.COLONIA.distance(system).toFixed(2) + "`` ly", true)
	.addField("EDSM page", str)
	.setThumbnail("https://vignette.wikia.nocookie.net/elite-dangerous/images/1/1a/Elite_Dangerous_Logo_Big.png/revision/latest/scale-to-width-down/528?cb=20170225174743");
	return embed;
}
