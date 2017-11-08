/* jshint esversion: 6 */
"use strict";

const discord = require("discord.js");
const drabot = require("./drabot.js");
const tools = require("./tools.js");
const pack = require("./package.json");
const config = require("./config.js");
const hashSigns = ["0","1","2","3","4","5","6","7","8","9",
"a","b","c","d","e","f","g","h","i","j","k","l","m","n","o","p","q","r","s","t","u","v","w","x","y","z",
"A","B","C","D","E","F","G","H","I","J","K","L","M","N","O","P","Q","R","S","T","U","V","W","X","Y","Z"
];
// generate a random hash
exports.genRandomHash = function(size) {
	let str = "";
	for (let i = 0; i < size; i++)
		str += tools.randTab(hashSigns);
	return str;
}

// logger une commande
exports.log = function(msg, str) {
	let toLog = "";
	if (msg.channel.type != "dm") toLog += "[LOG] (" + msg.guild.name + " / #"+ msg.channel.name + ") " + msg.member.displayName + " : " + msg.content;
	else toLog += "[LOG] (DM) " + msg.author.username + " : " + msg.content;
	console.log(toLog);
}

// envoyer un message lorsque la demande est incomprise puis supprimer le message (+ la demande)
exports.wakannai = function(msg) {
	let responses = ["what? I didn't understand","uh? Could you repeat please?", "wakannai yo","this doesn't make any sense","but... drabot.exe has stopped working : incorrect parameters"];
	msg.channel.send(tools.firstCharLowerToUpper(tools.randTab(responses)));
}

// 0 => sans arguments, 1 => avec arguments, 2 => avec/sans arguments
exports.check = function(msg, str, only, allowDMs) {
	return exports.checkTab(msg, [str], only, allowDMs);
}

exports.checkTab = function(msg, strs, only, allowDMs) {
	if (msg.channel.type != "text" && !allowDMs)
		return false;
	let command = "";
	if (msg.content.startsWith(config.prefix))
		command += msg.content.replace(config.prefix, "")
	else if (msg.content.startsWith(config.ownerPrefix))
		command += msg.content.replace(config.ownerPrefix, "");
	else
		return false;
	let bool = false;
	if (only != 0 && only != 1 && only != 2)
		throw new Error("checkOnlyZeroOneTwo");
	for (let str of strs) {
		if (!bool) {
			if (only == 0)
				bool = command == str;
			else if (only == 1)
				bool = command.startsWith(str + " ");
			else
				bool = command.startsWith(str);
		}
	}
	if (bool)
		exports.log(msg, "");
	return bool;
}

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
	.addField("Member",member,true)
	.addField("Display name", member.displayName,true)
	.addField("Username#discriminator", member.user.tag,true)
	.addField("Unique ID", member.user.id,true)
	.addField(roles.length + " roles",roles)
	.addField("Highest role", member.highestRole,true);
	if (member.voiceChannel != null)
		info.addField("Connected to", member.voiceChannel.name,true);
	info.addField("Joined at", member.joinedAt.toUTCString())
	.addField("Is admin?", isAdmin,true)
	.addField("Is bot?", isBot,true);
	let stts = "";
	if (member.presence.status == "online") stts += "Online";
	else if (member.presence.status == "offline") stts += "Offline";
	else if (member.presence.status == "idle") stts += "AFK";
	else stts += "Do not disturb";
	info.addField("Status",stts,true);
	if (member.presence.game != null)
		info.addField("Currently playing", member.presence.game.name,true);
	info.addField("Avatar URL", member.user.avatarURL);
	if (member.user.id == process.env.DRAGOID)
		info.setFooter("He is my creator, my Senpai... Daisuki!");
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
	let info = new discord.RichEmbed();
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
	.addField(guild.memberCount + " total members",getNbCon(guild) + " connected (" + Math.floor((getNbCon(guild)/guild.memberCount)*100) + "%)",true)
	.addField("Icon URL", guild.iconURL);
	return info;
}

function getNbCon(guild) {
	let presences = Array.from(guild.presences.values());
	let h = 0;
	for(let i = 0; i < presences.length; i++) {
		if (presences[i].status != "offline") h++;
	}
	return h;
}

exports.showChannelInfo = function(channel) {
	let info = new discord.RichEmbed();
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

function cacheAllUsers(guild) {
	guild.fetchMembers().then(guild2 => {
		let members = Array.from(guild2.members.values());;
		let user;
		for (i = 0; i < members.length; i++) {
			let user = members[i].user;
			bot.fetchUser(user.id);
		}
		console.log("[CACHE] All users in guild '" + guild.name + "' have been added to the cache");
	});
}

function cacheUser(user) {
	bot.fetchUser(user.id);
	console.log("[CACHE] User '" + user.username + "#" + user.discriminator + "' has been added to the cache");
}

exports.botInfo = function(bot) {
	let info = new discord.RichEmbed()
	.setThumbnail(bot.user.avatarURL)
	.addField("Discord tag", bot.user.tag, true)
	.addField("Author", "Dragoteryx#6922", true)
	.addField("Version", pack.version)
	.addField("Description", "My Discord bot, DraBOTeryx, or Drabot for short.")
	.addField("Github link", "https://github.com/Dragoteryx/draboteryx");
	return info;
}

exports.stringToMember = function(str, guild) {
	let member;
	if (str.startsWith("<@") && str.endsWith(">"))
		member = guild.members.get(str.replace("<@","").replace(">","").replace("!",""));
	else
		member = guild.members.find("displayName",str);
		if (member != null)
			return member;
		throw new Error("notAMember");
}

exports.stringToChannel = function(str, guild) {
	let channel = guild.channels.find("name", str);
	if (channel != null)
		return channel;
	throw new Error("notAChannel");
}

exports.stringToRole = function(str, guild) {
	let role;
	if (str.startsWith("<@") && str.endsWith(">"))
		role = guild.roles.get(str.replace("<@","").replace(">","").replace("&",""));
	else
		role = guild.roles.find("name",str);
	if (role != null)
		return role;
	throw new Error("notARole");
}
