"use strict";
const discord = require("discord.js");
const drabot = require("./drabot.js");
const config = require("./config.js");
const tools = require("./tools.js");
const types = require("./types.js");
const pack = require("./package.json");
const snekfetch = require("snekfetch")

exports.showMemberInfo = function(member) {
	let tempRoles = Array.from(member.roles.values());
	let roles = [];
	for (let role of tempRoles) {
		if (role.name != "@everyone")
			roles.push(role.name);
		else
			roles.push("everyone (default role)");
	}
	let info = new discord.RichEmbed();
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
	if (member.user.id == process.env.DRAGOID)
		info.setFooter("He is my creator, my Senpai.. Daisuki!");
	if (member.user.id == drabot.client.user.id)
		info.setFooter("Why are you looking at my info? D:");
	return info;
}

exports.showGuildInfo = async function(guild) {
	let maxemojis = 50;
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
	let info = new discord.RichEmbed();
	info.setColor(role.color)
	.addField("Role name", role.name, true)
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
	stats += "Uptime: ``" + new types.Duration(Date.now() - drabot.client.readyTimestamp).toString() + "``\n";
	stats += "``" + Array.from(client.guilds.keys()).length + "`` servers\n";
	stats += "``" + process.env.NBCHANNELS + "`` channels (``" + process.env.NBTEXT + "`` text, ``" + process.env.NBVOICE + "`` voice)\n";
	stats += "``" + process.env.NBUSERS + "`` users";
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

exports.sendR34 = async function(msg) {
	let searchOld;
	if (msg.content.startsWith(config.prefix + "rule34 "))
		searchOld = msg.content.replace(config.prefix + "rule34 ","");
	else if (msg.content.startsWith(config.prefix + "r34 "))
		searchOld = msg.content.replace(config.prefix + "r34 ","");
	let search = searchOld.toLowerCase();
	while (search.includes(" "))
		search = search.replace(" ", "_");
	let link = "https://rule34.paheal.net/post/list/" + search + "/1";
	link.getHTTP().then(res => {
		let nb = Number(res.text.split('">Last</a>').shift().split(' | <a href="/post/list/').pop().split("/").pop());
		let page = tools.random(1, nb);
		link = "https://rule34.paheal.net/post/list/" + search + "/" + page;
		link.getHTTP().then(res => {
			let html = res.text;
			for (let i = 0; i <= 100; i++)
				html = html.replace('<a href="http://rule34-data-',"<-SPLIT->-").replace('">Image Only</a>',"<-SPLIT->-");
			let htmlTab = html.split("<-SPLIT->-");
			let imgs = [];
			for (let i = 0; i < htmlTab.length; i++)
				if (htmlTab[i].includes("_images")) imgs.push(htmlTab[i].split('</a><br><a href="').pop());
			if (imgs.length != 0)
				msg.channel.send("Search: ``" + searchOld + "``", {file: tools.randTab(imgs)});
			else
				msg.channel.send("Sorry, I didn't find anything about ``" + searchOld + "``.");
		}).catch(err => {
			msg.channel.send("Sorry, I didn't find anything about ``" + searchOld + "``.");
		});
	}).catch(err => {
		msg.channel.send("Sorry, I didn't find anything about ``" + searchOld + "``.");
	});
}
