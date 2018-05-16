const drabot = require("../drabot.js");
const discord = require("discord.js");
const config = require("../config.js");
const tools = require("./tools.js");

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

Object.defineProperty(discord.Message.prototype, "reply", {
	value: function(content, options) {
		if (this.channel.type == "text")
			return this.channel.send("``" + this.member.displayName + "``, " + content, options);
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
