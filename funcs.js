"use strict";
const discord = require("discord.js");
const drabot = require("./drabot.js");
const tools = require("./tools.js");
const pack = require("./package.json");

exports.showMemberInfo = function(member) {
	let isAdmin = "No";
	let isBot = "No";
	if (member.hasPermission("ADMINISTRATOR"))
		isAdmin = "Yes";
	if (member.user.bot)
		isBot = "Yes";
	let tempRoles = Array.from(member.roles.values());
	let roles = [];
	for (let role of tempRoles) {
		if (role.name != "@everyone")
			roles.push(role.name);
		else
			roles.push("everyone (default role)");
	}
	let info = new discord.RichEmbed()
	.setThumbnail(member.user.displayAvatarURL)
	.setColor(member.highestRole.color)
	.addField("Member",member, true)
	.addField("Display name", member.displayName, true)
	.addField("Username#discriminator", member.user.tag, true)
	.addField("Unique ID", member.user.id, true)
	.addField(roles.length + " roles",roles)
	.addField("Highest role", member.highestRole, true);
	if (member.voiceChannel !== undefined)
		info.addField("Connected to", member.voiceChannel.name, true);
	info.addField("Joined at", member.joinedAt.toUTCString())
	.addField("Is admin?", isAdmin, true)
	.addField("Is bot?", isBot, true);
	let stts = "";
	if (member.presence.status == "online") stts += "Online";
	else if (member.presence.status == "offline") stts += "Offline";
	else if (member.presence.status == "idle") stts += "AFK";
	else stts += "Do not disturb";
	info.addField("Status", stts, true);
	if (member.presence.game !== undefined)
		info.addField("Currently playing", member.presence.game.name, true);
	info.addField("Avatar URL", member.user.avatarURL);
	if (member.user.id == process.env.DRAGOID)
		info.setFooter("He is my creator, my Senpai.. Daisuki!");
	if (member.user.id == drabot.id)
		info.setFooter("Why are you looking at my info? D:");
	return info;
}

exports.showGuildInfo = function(guild) {
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
		if (channel.type == "text") {
			if (channel.id == guild.defaultChannel.id)
				textChannels.push(channel.name + " (default channel)");
			else
				textChannels.push(channel.name);
		} else if (channel.type == "voice") {
			if (channel.id == guild.afkChannelID)
				voiceChannels.push(channel.name + " (AFK channel)");
			else
				voiceChannels.push(channel.name);
		}
	}
	let emojis = Array.from(guild.emojis.values());
	let info = exports.defaultEmbed();
	if (guild.iconURL != null)
		info.setThumbnail(guild.iconURL);
	info.addField("Server name",guild.name,true)
	.addField("Unique ID",guild.id,true)
	.addField("Owner",guild.owner,true)
	.addField("Custom emojis",emojis.length + "/" + 50 + " (" + (50-emojis.length) + " left)",true)
	.addField(roles.length + " roles",roles)
	.addField(textChannels.length + " text channels",textChannels,true)
	.addField(voiceChannels.length + " voice channels",voiceChannels,true)
	.addField("Created at",guild.createdAt.toUTCString())
	.addField("Region",guild.region,true)
	.addField(guild.memberCount + " total members", tools.getNbCon(guild) + " connected (" + Math.floor((getNbCon(guild)/guild.memberCount)*100) + "%)",true)
	.addField("Icon URL", guild.iconURL);
	return info;
}

exports.showChannelInfo = function(channel) {
	let info = exports.defaultEmbed();
	info.addField("Channel name",channel.name,true)
	.addField("Unique ID",channel.id,true)
	.addField("Type",channel.type)
	.addField("Created at",channel.createdAt.toUTCString());
	return info;
}

exports.showRoleInfo = function(role) {
	let isAdmin = "No";
	let isMent = "No";
	if (role.hasPermission("ADMINISTRATOR"))
		isAdmin = "Yes";
	if (role.mentionable)
		isMent = "Yes";
	let info = new discord.RichEmbed();
	info.setColor(role.color)
	.addField("Role name", role.name, true)
	.addField("Unique ID", role.id, true)
	.addField("Color", role.hexColor)
	.addField("Created at", role.createdAt.toUTCString())
	.addField("Is admin?", isAdmin, true)
	.addField("Is mentionable?", isMent, true);
	return info;
}

exports.cacheAllUsers = function(guild) {
	guild.fetchMembers().then(guild2 => {
		let members = Array.from(guild2.members.values());
		let user;
		for (let i = 0; i < members.length; i++) {
			let user = members[i].user;
			drabot.client.fetchUser(user.id);
		}
		console.log("[CACHE] All users in guild '" + guild.name + "' have been added to the cache");
	});
}

exports.cacheUser = function(user) {
	drabot.client.fetchUser(user.id);
	console.log("[CACHE] User '" + user.username + "#" + user.discriminator + "' has been added to the cache");
}

exports.showInfo = async () => {
	let app = await drabot.client.fetchApplication();
	let info = tools.defaultEmbed()
	.setThumbnail(drabot.client.user.avatarURL)
	.addField("Discord tag", drabot.client.user.tag, true)
	.addField("Author", app.owner.tag, true)
	.addField("Version", pack.version)
	.addField("Description", pack.description)
	.addField("Website link", "https://draboteryx.herokuapp.com")
	.addField("Github link", pack.homepage)
	.addField("Invite link", "https://discordapp.com/oauth2/authorize?client_id=" + drabot.client.user.id + "&scope=bot&permissions=104193088");
	return info;
}
