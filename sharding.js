const discord = require('discord.js');
const manager = new discord.ShardingManager('./drabot.js');
manager.totalShards = 1;
console.log("[INFO] Spawning '" + manager.totalShards + "' shards.");
console.log(process.env.HEROKU ? "(Heroku launch)" : "(local launch)");
manager.spawn();
