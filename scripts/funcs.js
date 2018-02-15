"use strict";
const discord = require("discord.js");
const snekfetch = require("snekfetch");

const drabot = require("../drabot.js");
const config = require("../config.js");
const classes = require("./classes.js");
const tools = require("./tools.js");
const pack = require("../package.json");

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
	.addField("Member",member, true)
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
	let stats = "";
	stats += "Uptime: ``" + drabot.uptime.strings.simple + "``\n";
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
	.addField("Homepage", pack.homepage)
	.addField("Invite link", "http://bit.ly/2DhiN6n");
	return info;
}

exports.logError = (msg, err) => {
	drabot.client.fetchApplication().then(app => {
		msg.channel.send("A random error occured. Please contact ``" + app.owner.tag + "``. ``" + config.prefix + "invite`` to join the test server.```\n" + err.stack + "\n```");
		console.error(err);
	}).catch(console.error);
}

exports.musicErrors = (msg, err) => {
	if (err.message == "this member is not in a voice channel") msg.channel.send("You're not in a voice channel.");
	else if (err.message == "the client can't join this voice channel") msg.channel.send("I can't join this voice channel.");
	else if (err.message == "the client is not authorized to speak in this channel") msg.channel.send("I'm not allowed to speak in this voice channel.");
	else if (err.message == "this voice channel is full") msg.channel.send("This voice channel is full.");
	else if (err.message == "the client already joined a voice channel in this guild") msg.channel.send("I'm already in a voice channel.");
	else if (err.message == "the client is not in a voice channel") msg.channel.send("I am not in a voice channel.");
	else if (err.message == "the client is not playing") msg.channel.send("I am not playing music at the moment.");
	else if (err.message == "the playlist is empty") msg.channel.send("The playlist is empty.");
	else if (err.message == "invalid music index") msg.channel.send("There is no music with that index in the playlist.");
	else if (err.message == "this website is not supported") msg.channel.send("Sorry but I don't know this website.");
	else if (err.message == "volume < 0") msg.channel.send("The volume must be above ``0``.");
	else exports.logError(msg, err);
}
