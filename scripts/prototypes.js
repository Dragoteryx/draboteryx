const discord = require("discord.js");

const tools = require("./tools.js");
const funcs = require("./funcs.js");

Object.defineProperty(String.prototype, "firstUpper", {
	value: function() {
		if (this.length == 0)
			return "";
		return this[0].toUpperCase() + this.slice(1);
	}
});

Object.defineProperty(Array.prototype, "random", {
	value: function() {
		if (this.length == 0)
			return undefined;
		return this[tools.random(this.length-1)];
	}
});

Object.defineProperty(discord.Message.prototype, "reply", {
	value: function(content, options) {
		if (this.channel.type == "text")
			return this.channel.send(this.member.displayed + ", " + content, options);
		else
			return this.channel.send(content.firstUpper(), options);
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

Object.defineProperty(discord.Guild.prototype, "rdfetch", {
	value: function() {
		return funcs.fetchRedis("guilds", this);
	}
});

Object.defineProperty(discord.Guild.prototype, "rdsend", {
	value: function(data) {
		return funcs.sendRedis("guilds", this, data);
	}
});

Object.defineProperty(discord.User.prototype, "rdfetch", {
	value: function() {
		return funcs.fetchRedis("users", this);
	}
});

Object.defineProperty(discord.User.prototype, "rdsend", {
	value: function(data) {
		return funcs.sendRedis("users", this, data);
	}
});

Object.defineProperty(String.prototype, "fetchHTTP", {
	value: function fetchHTTP() {
		return tools.request(this);
	}
});

Object.defineProperty(discord.GuildMember.prototype, "displayed", {
	get: function() {
		return "``" + this.displayName + "``";
	}
});
