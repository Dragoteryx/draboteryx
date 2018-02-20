const discord = require("discord.js");

const tools = require("./tools.js");
const funcs = require("./funcs.js");

Object.defineProperty(String.prototype, "firstUpper", {
	value: function() {
		return this[0].toUpperCase() + this.slice(1);
	}
});

Object.defineProperty(Array.prototype, "random", {
	value: function() {
		if (this.length == 0)
			return null;
		return this[tools.random(this.length-1)];
	}
});

Object.defineProperty(discord.Message.prototype, "dreply", {
	value: function(content) {
		if (this.channel.type == "text")
			return this.reply(content);
		else
			return this.channel.send(content.firstUpper());
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
