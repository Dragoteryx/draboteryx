const drabot = require("../drabot.js");
const discord = require("discord.js");
const config = require("../config.js");
const tools = require("./tools.js");
const EventEmitter = require("events");

// GLOBAL JS OBJECTS
Object.defineProperty(String.prototype, "firstUpper", {
	value: function() {
		if (this.length == 0)
			return "";
		return this[0].toUpperCase() + this.slice(1);
	}
});

Object.defineProperty(String.prototype, "replaceAll", {
	value: function(before, after) {
		return this.split(before).join(after);
	}
});

Object.defineProperty(Array.prototype, "shuffle", {
	value: function() {
		this.sort(() => 0.5 > Math.random());
		return this;
	}
});

Object.defineProperty(Array.prototype, "random", {
	value: function() {
		return this[tools.random(this.length-1)];
	}
});

Object.defineProperty(EventEmitter.prototype, "recursiveOn", {
	value: function(eventName, callback, recur) {
		this.once(eventName, (...args) => {
			callback(...args);
			if (recur()) this.recursiveOn(eventName, callback, recur);
		});
	}
})

// DISCORD RELATED
Object.defineProperty(discord.Message.prototype, "lang", {
  get: function() {
    return this.channel.lang;
  }
});

Object.defineProperty(discord.Channel.prototype, "lang", {
  get: function() {
		if (this._lang !== undefined)
      return drabot.langs[this._lang]
    else if (this.guild)
      return this.guild.lang;
    return drabot.langs.en;
  }
});

Object.defineProperty(discord.Guild.prototype, "lang", {
  get: function() {
    if (this._lang !== undefined)
			return drabot.langs[this._lang];
    return drabot.langs.en;
  }
});

Object.defineProperty(discord.Message.prototype, "prefix", {
  get: function() {
    return this.channel.prefix;
  }
});

Object.defineProperty(discord.Channel.prototype, "prefix", {
  get: function() {
		if (this._prefix !== undefined)
			return this._prefix;
    if (this.guild)
      return this.guild.prefix;
    else return config.prefix;
  }
});

Object.defineProperty(discord.Guild.prototype, "prefix", {
  get: function() {
		if (this._prefix !== undefined)
			return this._prefix;
    return config.prefix;
  }
});

Object.defineProperty(discord.Guild.prototype, "logsChannel", {
	get: function() {
		return this.channels.find(channel => channel.name == "drb-logs" && channel.type == "text");
	}
});

Object.defineProperty(discord.Guild.prototype, "modLogsChannel", {
	get: function() {
		return this.channels.find(channel => channel.name == "drb-modlogs" && channel.type == "text");
	}
});

Object.defineProperty(discord.Guild.prototype, "sendLog", {
	value: function(...args) {
		let channel = this.logsChannel;
		if (channel) channel.send(...args);
	}
});

Object.defineProperty(discord.Guild.prototype, "sendModLog", {
	value: function(...args) {
		let channel = this.modLogsChannel;
		if (channel) channel.send(...args);
	}
});

Object.defineProperty(discord.Message.prototype, "authorName", {
	get: function() {
		if (this.guild) return this.member.displayName;
		else return this.author.username;
	}
});

Object.defineProperty(discord.Guild.prototype, "nbCon", {
	value: function nbCon() {
		return new Promise((resolve, reject) => {
			this.fetchMembers().then(guild => {
				let presences = Array.from(guild.presences.values());
				let h = 0;
				for(let presence of presences)
					if (presence.status != "offline") h++;
				resolve(h);
			}).catch(reject);
		});
	}
});

Object.defineProperty(discord.User.prototype, "owner", {
	get: function() {
		return config.owners.includes(this.id);
	}
});

Object.defineProperty(discord.GuildMember.prototype, "admin", {
	get: function() {
		return this.roles.some(role => role.name.toLowerCase() == "drb-admin") || this.hasPermission("ADMINISTRATOR");
	}
});

Object.defineProperty(discord.GuildMember.prototype, "mod", {
	get: function() {
		if (this.admin) return true;
		return this.roles.some(role => role.name.toLowerCase() == "drb-mod");
	}
});

Object.defineProperty(discord.GuildMember.prototype, "dj", {
	get: function() {
		if (this.admin) return true;
		if (!this.guild.djRole) return true;
		return this.roles.some(role => role.name == "drb-dj");
	}
});

Object.defineProperty(discord.GuildMember.prototype, "embedInfo", {
	value: function() {
		let tempRoles = Array.from(this.roles.values());
		let roles = [];
		for (let role of tempRoles) {
			if (role.name != "@everyone")
				roles.push(role.name);
			else
				roles.push(this.guild.lang.commands.userinfo.defaultRole());
		}
		let info = tools.defaultEmbed();
		if (this.colorRole !== null)
			info.setColor(this.colorRole.color);
		info.setThumbnail(this.user.displayAvatarURL)
		.addField(this.guild.lang.commands.userinfo.member(), this, true)
		.addField(this.guild.lang.commands.userinfo.displayName(), this.displayName, true)
		.addField(this.guild.lang.commands.userinfo.tag(), this.user.tag, true)
		.addField(this.guild.lang.commands.userinfo.id(), this.user.id, true)
		.addField(this.guild.lang.commands.userinfo.roles("$NB", roles.length), roles)
		.addField(this.guild.lang.commands.userinfo.highestRole(), this.highestRole, true);
		if (this.voiceChannel !== undefined)
			info.addField(this.guild.lang.commands.userinfo.connectedTo(), this.voiceChannel.name, true);
		info.addField(this.guild.lang.commands.userinfo.joinedAt(), this.joinedAt.toUTCString())
		.addField(this.guild.lang.commands.userinfo.drabotPerms(), this.drabotPerms.join(" / "))
		.addField(this.guild.lang.commands.userinfo.admin(), this.hasPermission("ADMINISTRATOR") ? this.guild.lang.misc.yes() : this.guild.lang.misc.no(), true)
		.addField(this.guild.lang.commands.userinfo.bot(), this.user.bot ? this.guild.lang.misc.yes() : this.guild.lang.misc.no(), true);
		let stts = "";
		if (this.presence.status == "online") stts += this.guild.lang.commands.userinfo.online();
		else if (this.presence.status == "offline") stts += this.guild.lang.commands.userinfo.offline();
		else if (this.presence.status == "idle") stts += this.guild.lang.commands.userinfo.idle();
		else stts += this.guild.lang.commands.userinfo.dnd();
		info.addField(this.guild.lang.commands.userinfo.status(), stts, true);
		if (this.presence.game !== null)
			info.addField(this.guild.lang.commands.userinfo.currentlyPlaying(), this.presence.game.name, true);
		info.addField(this.guild.lang.commands.userinfo.avatarURL(), this.user.avatarURL);
		return info;
	}
});

Object.defineProperty(discord.Guild.prototype, "embedInfo", {
	value: async function() {
		let maxemojis = 100;
		let tempRoles = Array.from(this.roles.values());
		let roles = [];
		for (let role of tempRoles) {
			if (role.name != "@everyone")
				roles.push(role.name);
			else
				roles.push(this.lang.commands.userinfo.defaultRole());
		}
		let tempChannels = Array.from(this.channels.values());
		let textChannels = [];
		let voiceChannels = [];
		for (let channel of tempChannels) {
			if (channel.type == "text")
				textChannels.push(channel.name);
			else if (channel.type == "voice")
				voiceChannels.push(channel.name);
		}
		let emojis = Array.from(this.emojis.values());
		let info = tools.defaultEmbed();
		let nbCon;
		if (this.iconURL != null)
			info.setThumbnail(this.iconURL);
		info.addField(this.lang.commands.serverinfo.name(), this.name, true)
		.addField(this.lang.commands.serverinfo.id(), this.id, true)
		.addField(this.lang.commands.serverinfo.owner(), this.owner, true)
		.addField(this.lang.commands.serverinfo.emojis(), emojis.length + "/" + maxemojis, true)
		.addField(this.lang.commands.serverinfo.roles("$NB", roles.length), roles)
		.addField(this.lang.commands.serverinfo.textChannels("$NB", textChannels.length), textChannels, true)
		.addField(this.lang.commands.serverinfo.voiceChannels("$NB", voiceChannels.length), voiceChannels, true)
		.addField(this.lang.commands.serverinfo.createdAt(), this.createdAt.toUTCString())
		.addField(this.lang.commands.serverinfo.region(), this.region, true);
		if (!this.large) {
			let nbCon = await this.nbCon();
			info.addField(this.lang.commands.serverinfo.members("$NB", this.memberCount), this.lang.commands.serverinfo.connected("$NB", nbCon) + " (" + Math.floor((nbCon/this.memberCount)*100) + "%)", true);
		} else
			info.addField(this.lang.commands.serverinfo.members("$NB", nbCon), this.lang.commands.serverinfo.connectedDisabled(), true);
		info.addField(this.lang.commands.serverinfo.iconURL(), this.iconURL);
		return info;
	}
});

Object.defineProperty(discord.Channel.prototype, "embedInfo", {
	value: function() {
		let info = tools.defaultEmbed();
		info.addField(this.lang.commands.channelinfo.name(), this.name, true)
		.addField(this.lang.commands.channelinfo.id(), this.id, true)
		.addField(this.lang.commands.channelinfo.type(), this.type.firstUpper())
		.addField(this.lang.commands.channelinfo.createdAt(), this.createdAt.toUTCString());
		return info;
	}
});

Object.defineProperty(discord.Role.prototype, "embedInfo", {
	value: function() {
		let info = tools.defaultEmbed();
		if (this.color != 0)
			info.setColor(this.color);
		info.addField(this.guild.lang.commands.roleinfo.name(), this.name, true)
		.addField(this.guild.lang.commands.roleinfo.id(), this.id, true)
		.addField(this.guild.lang.commands.roleinfo.color(), this.hexColor)
		.addField(this.guild.lang.commands.roleinfo.createdAt(), this.createdAt.toUTCString())
		.addField(this.guild.lang.commands.roleinfo.admin(), this.hasPermission("ADMINISTRATOR") ? this.guild.lang.misc.yes() : this.guild.lang.misc.no(), true)
		.addField(this.guild.lang.commands.roleinfo.mentionable(), this.mentionable ? this.guild.lang.misc.yes() : this.guild.lang.misc.no(), true)
		.addField(this.guild.lang.commands.roleinfo.external(), this.managed ? this.guild.lang.misc.yes() : this.guild.lang.misc.no(), true);
		return info;
	}
});

Object.defineProperty(discord.Guild.prototype, "adminRole", {
	get: function() {
		return this.roles.find(role => role.name.toLowerCase() == "drb-admin");
	}
});

Object.defineProperty(discord.Guild.prototype, "modRole", {
	get: function() {
		return this.roles.find(role => role.name.toLowerCase() == "drb-mod");
	}
});

Object.defineProperty(discord.Guild.prototype, "djRole", {
	get: function() {
		return this.roles.find(role => role.name.toLowerCase() == "drb-dj");
	}
});

Object.defineProperty(discord.Channel.prototype, "onMsgCallbacks", {
	get: function() {
		if (this._onMsgCallbacks === undefined)
			this._onMsgCallbacks = new Map();
		return this._onMsgCallbacks;
	}
});

Object.defineProperty(discord.Channel.prototype, "waitResponse", {
	value: async function(options = {}) {
		return new Promise(resolve => {
			if (options.delay === undefined)
				options.delay = -1;
			if (options.filter === undefined)
				options.filter = () => true;
			let random;
			do {
				random = tools.random(0, 255);
			} while (this.onMsgCallbacks.has(this.id + "/" + random));
			let delay;
			if (options.delay >= 0) {
				delay = setTimeout(() => {
					this.onMsgCallbacks.delete(this.id + "/" + random);
					resolve(null);
				}, options.delay);
			}
			this.onMsgCallbacks.set(this.id + "/" + random, msg => {
				if (msg.channel.id != this.id) return;
				if (!options.filter(msg)) return;
				this.onMsgCallbacks.delete(this.id + "/" + random);
				if (options.delay >= 0)
					clearTimeout(delay);
				resolve(msg);
			});
		});
	}
});

Object.defineProperty(discord.GuildMember.prototype, "drabotPerms", {
	get: function() {
		let perms = [];
		if (this.user.owner) perms.push(this.guild.lang.misc.owner());
		if (this.admin) perms.push(this.guild.lang.misc.admin());
		if (this.mod) perms.push(this.guild.lang.misc.mod());
		if (this.dj) perms.push(this.guild.lang.misc.dj());
		if (this.admin) perms = perms.filter(perm => ![this.guild.lang.misc.mod(), this.guild.lang.misc.dj()].includes(perm));
		return perms;
	}
})
