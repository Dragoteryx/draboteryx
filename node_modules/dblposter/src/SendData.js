const { post } = require("snekfetch");

const wait = () => new Promise(resolve => setTimeout(resolve, 1500));

class SendData {
	static async post (client, shardID, shardCount, guilds, discordIE, paramName) {
		const clientID = discordIE ? client.User.id : client.id ? client.id : client.user.id;
		await wait();
		post(SendData.API_URL.replace("{id}", clientID))
			.set("Authorization", client[paramName]._apiKey)
			.send({
				server_count: Number(guilds),
				shard_id: Number(shardID),
				shard_count: Number(shardCount || 1),
			})
			.then(
				() => {
					client[paramName].emit("posted");
				},
				err => {
					client[paramName].emit("error", err);
				},
			);
	}

	static send (client, paramName, DISCORDIE) {
		const {
			shardID,
			shardCount,
			guilds,
			isEris,
		} = SendData.getStats(client, DISCORDIE);
		if (isEris && guilds.constructor === Object) {
			for (const [sID, guildCount] of Object.entries(guilds)) {
				SendData.post(client, sID, shardCount, guildCount, false, paramName);
			}
			return;
		}
		SendData.post(client, shardID, shardCount, guilds, DISCORDIE, paramName);
	}

	static getStats (client, discordIE) {
		let totalGuilds = 0, shardID = 0, shardCount = 1;
		let DIO = false, ERIS = false;

		// #region DiscordIE Checks
		if (discordIE) {
			totalGuilds = client.Guilds.size;
			if (client.options && client.options.shardId && client.options.shardCount) {
				shardID = client.options.shardId || 0;
				shardCount = client.options.shardCount || 1;
			}
		}
		// #endregion DiscordIE Checks

		// #region DiscordIO Shard Checker
		if (client._shard) {
			DIO = true;
			shardID = client._shard[0];
			shardCount = client._shard[1];
		}
		// #endregion DiscordIO Shard Checker

		if (!DIO) {
			if (client.shards && client.shards.size) {
				// #region Eris Sharded Check
				shardCount = client.options.maxShards;
				if (client.options.firstShardID === client.options.lastShardID) {
					shardID = client.options.firstShardID;
				} else {
					ERIS = true;
				}
				// #endregion Eris Sharded Check
			} else if (client.shard) {
				// TODO: Discord.JS is going to get Internal Sharding
				// Handle it the same way as Eris sharding (filter guilds, etc)
				// #region Discord.JS Sharded Check
				shardID = client.shard.id;
				shardCount = client.shard.count || 1;
				// #endregion Discord.JS Sharded Check
			} else {
				// #region Safety
				shardID = 0;
				shardCount = 1;
				// #endregion Safety
			}
		}

		if (!totalGuilds) totalGuilds = client.servers ? Object.keys(client.servers.length) : client.guilds.size;
		if (ERIS) {
			const shards = {};
			client.shards.forEach(shard => {
				const totalShardGuilds = client.guilds.filter(g => g.shard.id === shard.id).length;
				shards[shard.id] = totalShardGuilds;
			});
			return {
				shardCount,
				isEris: true,
				guilds: shards,
				shardID: null,
			};
		} else {
			return {
				shardID,
				shardCount,
				guilds: totalGuilds,
				isEris: ERIS,
			};
		}
	}
}

SendData.API_URL = "https://discordbots.org/api/bots/{id}/stats";

module.exports = SendData;
