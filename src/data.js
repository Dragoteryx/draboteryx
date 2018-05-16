const discord = require("discord.js");
const redis = require("redis").createClient(process.env.REDIS_URL);
let redisOK = false;

//REDIS EVENTS
redis.on("ready", () => {
	redisOK = true;
});
redis.on("end", () => {
	redisOK = false;
});
redis.on("error", err => {
	redisOK = false;
});

// REDIS FUNCTIONS
function fetchRedis(path) {
	return new Promise((resolve, reject) => {
		redis.get(path, (err, data) => {
			if (err) reject(err);
			else if (data === null) resolve({});
			else resolve(JSON.parse(data));
		});
	});
}

function sendRedis(path, data) {
	return redis.set(path, JSON.stringify(data));
}

// PROTOTYPES
Object.defineProperty(discord.Guild.prototype, "fetchData", {
  value: function() {
    return fetchRedis("guilds/" + this.id);
  }
});

Object.defineProperty(discord.Guild.prototype, "sendData", {
  value: function(data) {
    return sendRedis("guilds/" + this.id, data);
  }
});

Object.defineProperty(discord.User.prototype, "fetchData", {
  value: function() {
    return fetchRedis("users/" + this.id);
  }
});

Object.defineProperty(discord.User.prototype, "sendData", {
  value: function(data) {
    return sendRedis("users/" + this.id, data);
  }
});

Object.defineProperty(discord.GuildMember.prototype, "fetchData", {
  value: function() {
    return this.user.fetch();
  }
});

Object.defineProperty(discord.GuildMember.prototype, "sendData", {
  value: function(data) {
    return this.user.send(data);
  }
});

module.exports = {
  fetchData: fetchRedis,
  sendData: sendRedis,
  get ok() {
		return redisOK;
	}
}
