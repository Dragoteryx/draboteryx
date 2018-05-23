const discord = require('discord.js');
const manager = new discord.ShardingManager('./drabot.js');
let nb = 2;
console.log("[INFO] Spawning '" + nb + "' shards.");
console.log(process.env.HEROKU ? "(Heroku launch)" : "(local launch)");
manager.spawn(nb);
