const discord = require("discord.js");

//MONDOGB
const mongoclient = require('mongodb').MongoClient;
function connectMongo() {
	return new Promise((resolve, reject) => {
		mongoclient.connect(process.env.MONGODB_URI, {useNewUrlParser: true}, function(err, client) {
		 	if (err) reject(err);
		  else resolve(client);
		});
	});
}

async function insertMongo(client, coll, data) {
	let collection = client.db().collection(coll);
	return new Promise((resolve, reject) => {
		collection.insertOne(data, (err, res) => {
			if (err) reject(err);
			else resolve(res);
		});
	})
}

async function fetchMongo(client, coll, find = {}) {
	let collection = client.db().collection(coll);
	return new Promise((resolve, reject) => {
		collection.find(find).toArray((err, res) => {
			if (err) reject(err);
			else resolve(res);
		});
	})
}

async function updateMongo(client, coll, find = {}, data) {
	let collection = client.db().collection(coll);
	return new Promise((resolve, reject) => {
		collection.updateOne(find, {$set: data}, (err, res) => {
			if (err) reject(err);
			else resolve(res);
		});
	})
}

async function deleteMongo(client, coll, find = {}) {
	let collection = client.db().collection(coll);
	return new Promise((resolve, reject) => {
		collection.deleteOne(find, (err, res) => {
			if (err) reject(err);
			else resolve(res);
		});
	})
}

//REDIS
const redis = require("redis").createClient(process.env.REDIS_URL);
let redisOK = false;
redis.on("ready", () => {
	redisOK = true;
});
redis.on("end", () => {
	redisOK = false;
});
redis.on("error", err => {
	redisOK = false;
});

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
	if (typeof data == "object") data = JSON.stringify(data);
	return redis.set(path, data);
}

// PROTOTYPES
async function fetchData(collection, id) {
	let client = await connectMongo();
	let find = await fetchMongo(client, collection, {id: id});
	if (find.length == 0) return {id: id};
	return find.shift();
}
async function sendData(collection, id, data) {
	let client = await connectMongo();
	let find = await fetchMongo(client, collection, {id: id});
	let res = find.length == 0 ?
	await insertMongo(client, collection, Object.assign({id: id}, data))
	: await updateMongo(client, collection, {id: id}, data);
	client.close();
	return res;
}
async function clearData(collection, id) {
	let client = await connectMongo();
	let res = await deleteMongo(client, collection, {id: id});
	client.close();
	return res;
}

Object.defineProperty(discord.Guild.prototype, "fetchData", {
  value: function() {
		return fetchData("guilds", this.id);
  }
});

Object.defineProperty(discord.Guild.prototype, "sendData", {
  value: function(data) {
		return sendData("guilds", this.id, data);
  }
});

Object.defineProperty(discord.Guild.prototype, "clearData", {
  value: function() {
		return clearData("guilds", this.id);
  }
});

Object.defineProperty(discord.User.prototype, "fetchData", {
  value: function() {
    return fetchData("users", this.id);
  }
});

Object.defineProperty(discord.User.prototype, "sendData", {
  value: function(data) {
    return sendData("users", this.id, data);
  }
});

Object.defineProperty(discord.User.prototype, "clearData", {
  value: function() {
		return clearData("users", this.id);
  }
});

Object.defineProperty(discord.GuildMember.prototype, "fetchData", {
  value: function() {
    return this.user.fetchData();
  }
});

Object.defineProperty(discord.GuildMember.prototype, "sendData", {
  value: function(data) {
    return this.user.sendData(data);
  }
});

Object.defineProperty(discord.GuildMember.prototype, "clearData", {
  value: function() {
		return this.user.clearData();
  }
});

module.exports = {
  fetchRedis: fetchRedis,
  sendRedis: sendRedis,
  get redis() {
		return redisOK;
	},
	insertMongo: insertMongo,
	fetchMongo: fetchMongo,
	updateMongo: updateMongo,
	deleteMongo: deleteMongo
}
