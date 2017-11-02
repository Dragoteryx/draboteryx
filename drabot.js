"use strict"
require("dotenv").config()

// REQUIREMENTS
const discord = require("discord.js");
const fs = require("fs");
const snekfetch = require("snekfetch");
const sha1 = require("sha1");
const qrcode = require("qrcode");
const twitter = require("twitter");
const youtubeSearch = require("youtube-search");
const drgMusic = require("drg-music");

// FILES
const config = require("./config.js");
const shitpost = require("./shitpost.js");
const crypt = require("./crypt.js");
const tools = require("./tools.js");
const funcs = require("./funcs.js");
const types = require("./types.js");

// DRABOT ----------------------------------------------------------------------------------------------------------------------

// CONSTS
const bot = new discord.Client();
const music = new drgMusic.MusicHandler(bot);
music.on("joined", guild => {
	console.log("[MUSICBOT] Joined guild " + guild.name + " (" + guild.id + ")");
	musicChannels.get(guild.id).send("I'm here !");
});
music.on("leaved", guild => {
	console.log("[MUSICBOT] Leaved guild " + guild.name + " (" + guild.id + ")");
	musicChannels.get(guild.id).send("Goodbye o/")
});
music.on("next", (guild, musik) => {
	if (!music.isLooping(guild)) {
		if (!musik.file)
			musicChannels.get(guild.id).send("Now playing: ``" + musik.title + "`` by ``" + musik.author.name + "``. (requested by " + musik.member +")");
		else
			musicChannels.get(guild.id).send("Now playing: ``" + musik.title + "``. (requested by " + musik.member +")");
	}
});
music.on("empty", guild => {
	musicChannels.get(guild.id).send("The playlist is empty.");
});
music.on("added", (guild, musik) => {
		musicChannels.get(guild.id).send("``" + musik.title + "`` has been added to the playlist.");
});
music.on("removed", (guild, musik) => {
	musicChannels.get(guild.id).send("``" + musik.title + "`` has been removed the playlist.");
});
music.on("paused", guild => {
	musicChannels.get(guild.id).send("The music has been paused.");
});
music.on("resumed", guild => {
	musicChannels.get(guild.id).send("The music has been resumed.");
});
music.on("skipped", (guild, musik) => {
	musicChannels.get(guild.id).send("The current music (``" + musik.title + "``) has been skipped.");
});
music.on("shuffled", guild => {
	musicChannels.get(guild.id).send("The playlist has been shuffled.");
});
music.on("cleared", guild => {
	musicChannels.get(guild.id).send("The playlist has been cleared.");
});
music.on("volumechange", (guild, newVolume, oldVolume) => {
	musicChannels.get(guild.id).send("The volume has been set to " + newVolume + "%.");
});
music.on("looping", (guild, musik, loop) => {
	if (loop)
		musicChannels.get(guild.id).send("The current music (``" + musik.title + "``) will now loop. Use ``" + config.prefix + "loop`` again to stop looping.");
	else
		musicChannels.get(guild.id).send("The current music (``" + musik.title + "``) won't loop anymore.");
});
const heroku = process.env.HEROKU != undefined;
const utilityType = new types.CommandType("utility", ":wrench: Utility commands");
const funType = new types.CommandType("fun", ":bowling: Fun commands")
const musicType = new types.CommandType("music", ":microphone: Music commands")
const nsfwType = new types.CommandType("nsfw", ":cucumber: NSFW commands")
const commandTypes = [utilityType, funType, musicType, nsfwType];
let enableMusic = true;
const commands = [
	new types.Command("help", "you probably know what this command does or else you wouldn't be reading this", utilityType, true),
	new types.Command("info", "info about me", utilityType, true),
	new types.Command("roll ([dice size])", "rolls a dice (6 by default)", funType, true),
	new types.Command("rolls", "gives you rolls stats (resets when the bot restarts)", funType, true),
	new types.Command("shitpost", "generates a random shitpost", funType, true),
	new types.Command("crypt (k:[key]) [message]", "crypts a message and generates a random key", funType, true),
	new types.Command("decrypt [key] [message]", "decrypts a crypted message using its key", funType, true),
	new types.Command("join", "join a voice channel", musicType, true),
	new types.Command("leave", "leave the voice channel", musicType, true),
	new types.Command("request [youtube link]", "request a video", musicType, true),
	new types.Command("search [youtube query]", "request a video", musicType, true),
	new types.Command("remove [nb]", "remove a music from the playlist", musicType, true),
	new types.Command("toggle", "pause/resume the playlist", musicType, true),
	new types.Command("volume [0 or more]", "change the volume of the bot", musicType, true),
	new types.Command("skip", "skip a music", musicType, true),
	new types.Command("playlist", "show the playlist", musicType, true),
	new types.Command("playing", "show information about the current music", musicType, true),
	new types.Command("plshuffle", "shuffle the playlist", musicType, true),
	new types.Command("plclear", "clear the playlist", musicType, true),
	new types.Command("rule34", "mandatory on a Discord bot...", nsfwType, true),
	new types.Command("cahrcg", "random Cyanide and Happiness comic", funType, true),
	new types.Command("z0r", "random z0r.de", funType, true),
	new types.Command("rdscp", "random SCP Object", funType, true),
	new types.Command("serverinfo", "info about this server", utilityType, true),
	new types.Command("channelinfo ([channelname])", "info about a channel", utilityType, true),
	new types.Command("memberinfo ([membername])", "info about a member", utilityType, true),
	new types.Command("roleinfo [rolename]", "info about a role", utilityType, true),
	new types.Command("qrcode [text/link]", "generates a QRCode", funType, true)
];
const tweet = new twitter({
	consumer_key : process.env.CONSUMERKEY,
	consumer_secret : process.env.CONSUMERSECRET,
	access_token_key : process.env.ACCESSTOKENKEY,
	access_token_secret : process.env.ACCESSTOKENSECRET
});

// VARIABLES GLOBALES
let ready = false;
let dicePlayers = new Map();
let vars = new Map();
let musicChannels = new Map();
let follow = false;
let date = new Date();

// CHANGEMENT DE PROTOTYPES
discord.TextChannel.prototype.std = function(content, duration) {
	this.send(content).then(msg2 => msg2.delete(duration));
}
discord.Message.prototype.rtd = function(content, duration) {
	this.reply(content).then(msg2 => msg2.delete(duration));
}

// VOICE FOLLOW
bot.on("voiceStateUpdate", (memberOld, memberNew) => {
	if (follow && memberNew.user.id == process.env.DRAGOID && memberOld.voiceChannelID != memberNew.voiceChannelID && memberNew.guild.me.voiceChannel != null)
		if (memberNew.voiceChannel != null)
			memberNew.voiceChannel.join();
});

// MAIN
bot.on("message", msg => {

	try {

		// OWNER COMMANDS
		if (msg.content.startsWith(config.ownerPrefix) && config.owners.includes(msg.author.id)) {
			let command = msg.content.replace(config.ownerPrefix, "");
			let args = command.split(" ");
			funcs.log(msg, "", "admin");

			// changer l'avatar du bot
			if (funcs.check(command, "setAvatar", 1))
				bot.user.setAvatar(command.replace("setAvatar ",""));

			// changer le nom du bot
			if (funcs.check(command, "setName", 1))
				bot.user.setUsername(command.replace("setName ",""));

			// changer le jeu actuel du bot
			if (funcs.check(command, "setGame", 1))
				bot.user.setGame(command.replace("setGame ",""));

			// exécuter un bout de code pendant l'exécution
			if (funcs.check(command, "exec", 1))
					eval(command.replace("exec ", ""));

			// affiche la valeur d'une variable
			if (funcs.check(command, "value", 1))
				msg.channel.send(command.replace("value ", "") + tools.toBlock(eval(command.replace("value ", "")).toString()));

			// connecter/déconnecter babybot
			if (funcs.check(command, "babybot", 0)) {
				if (!babyReady) {
					babybot.login(process.env.BABYBOTDISCORDTOKEN).then( () => {
						babybot.guilds.get(msg.guild.id).channels.get(msg.channel.id).send("Bonzour !");
					});
				} else {
					babybot.guilds.get(msg.guild.id).channels.get(msg.channel.id).send("Bon ze dois y aller aureuhvoir !").then( () => {
						babybot.destroy();
					});
					console.log("[BABYDRABOT] Bonneuh nuit");
					babyReady = false;
				}
			}

			// bot follow
			if (funcs.check(command, "follow", 0)) {
				follow = !follow;
				if (follow)
					msg.reply("I'm following you !");
				else
					msg.reply("I'll stay here in case you need me.")
			}

			// mode perroquet
			if (funcs.check(command, "say", 1)) {
				msg.channel.send(command.replace("say ",""));
				msg.delete();
			}

		}

		// NORMAL COMMANDS
		if (msg.content.startsWith(config.prefix)) {
			let command = msg.content.replace(config.prefix, "");
			let args = command.split(" ").slice(1);
			funcs.log(msg, "", "command");

			// commandes musicales
			if (enableMusic) {

				// rejoindre un channel vocal
				if (funcs.check(command, "join", 0)) {
					musicChannels.set(msg.guild.id, msg.channel);
					music.join(msg.member);
				}

				// quitter un channel vocal
				if (funcs.check(command, "leave", 0)) {
					music.leave(msg.guild);
					musicChannels.delete(msg.guild.id);
				}

				// ajouter une musique
				if (funcs.check(command, "request", 1))
					music.addMusic(msg.member, command.replace("request ",""));

				// retirer une musique
				if (funcs.check(command, "remove", 1))
					music.removeMusic(msg.guild, Number(command.replace("remove ",""))-1);

				// toggle la playlist (pause/resume)
				if (funcs.check(command, "toggle", 0))
					music.toggleMusic(msg.guild);

				// skip la musique actuelle
				if (funcs.check(command, "skip", 0)) {
					if (!music.playingInfo(msg.guild).file || config.owners.indexOf(msg.author.id) != -1)
						music.nextMusic(msg.guild);
					else
						msg.channel.send("You are not allowed to skip that !");
				}

				// clear la playlist
				if (funcs.check(command, "plclear", 0))
					music.clearPlaylist(msg.guild);

				// shuffle la playlist
				if (funcs.check(command, "plshuffle", 0))
					music.shufflePlaylist(msg.guild);

				// set le volume
				if (funcs.check(command, "volume", 1))
					music.setVolume(msg.guild, Number(command.replace("volume ","")));

				// afficher la playlist
				if (funcs.check(command, "playlist", 0)) {
					let playing = music.playingInfo(msg.guild);
					let playlist = music.playlistInfo(msg.guild);
					let embed = new discord.RichEmbed().setThumbnail(playing.thumbnailURL);
					if (!playing.file)
						embed.addField("Playing (" + Math.floor((playing.time/playing.length)*100) + "%) - " + playing.title + " by " + playing.author.name, "Requested by " + playing.member);
					else
						embed.addField("Playing - " + playing.title, "Requested by " + playing.member)
					for (let i = 0; i < playlist.length; i++) {
						if (!playlist[i].file)
							embed.addField((i+1) + " - " + playlist[i].title + " by " + playlist[i].author.name, "Requested by " + playlist[i].member);
						else
							embed.addField((i+1) + " - " + playlist[i].title, "Requested by " + playlist[i].member);
					}
					msg.channel.send("Here's the playlist:", embed);
				}

				// afficher la musique actuelle
				if (funcs.check(command, "playing", 0)) {
					let playing = music.playingInfo(msg.guild);
					let embed = new discord.RichEmbed();
					if (!playing.file) {
						embed.setThumbnail(playing.thumbnailURL)
						.addField("Title", playing.title, true)
						.addField("Author", playing.author.name + " (" + playing.author.channelURL + ")", true)
						.addField("Link", playing.link, true)
						.addField("Requested by", playing.member, true);
						msg.channel.send("Playing: ``" + Math.floor((playing.time/playing.length)*100) + "%``", embed);
					} else {
						embed.addField("File name", playing.title, true)
						.addField("Requested by", playing.member, true);
						msg.channel.send("Playing:", embed);
					}
				}

				// ajoute une musique par recherche
				if (funcs.check(command, "search", 1)) {
					let search = command.replace("search ", "");
					while (search.includes(" "))
						search = search.replace(" ", "+");
					youtubeSearch(search, {maxResults : 10, key : process.env.YOUTUBEAPIKEY}, (err, rep) => {
						if (err) throw err;
						try {
							let link = "";
							for (let i = 0; i < 10; i++)
								if (rep[i].kind == "youtube#video" && link == "")
									link += rep[i].link;
							if (link != "")
								music.addMusic(msg.member, link);
							else
								msg.channel.send("Sorry, but I didn't find anything.");
						} catch (err) {
							if (err.message == "clientNotInAVoiceChannel") msg.channel.send("I'm not connected. You can ask me to join you using ``" + config.prefix + "join``.");
							else console.error(err);
						}
					});
				}

				// permettre de jouer une musique en boucle
				if (funcs.check(command, "loop", 0))
					music.toggleLooping(msg.guild);

			}

			// -----------------------------------------------------------------------------------------------------------------------------------

			// affiche le menu d'aide
			if (funcs.check(command, "help", 0)) {
				let i = 0;
				for (i; i < commandTypes.length; i++) {
					let help = new discord.RichEmbed();
					for (let h = 0; h < commands.length; h++) {
						if (commands[h].type.equals(commandTypes[i]) && commands[h].show)
							help.addField(config.prefix + commands[h].name,commands[h].desc);
					} msg.author.send(commandTypes[i].title + " (" + help.fields.length + ")", help);
				}
			}

			// guild info
			if (funcs.check(command, "serverinfo", 0))
				msg.channel.send("", funcs.showGuildInfo(msg.guild));

			// channel info
			if (funcs.check(command, "channelinfo", 2)) {
				msg.channel.send("", funcs.showChannelInfo(msg.channel));
			}

			// member info
			if (funcs.check(command, "memberinfo", 2)) {
				msg.channel.send("", funcs.showMemberInfo(msg.member));
			}

			// role info
			if (funcs.check(command, "roleinfo", 2)) {
				msg.channel.send("", funcs.showRoleInfo(msg.member.highestRole));
			}

			// bot info
			if (funcs.check(command, "info", 0)) {
				msg.channel.send("", funcs.botInfo(bot));
			}

			// -----------------------------------------------------------------------------------------------------------------------------------

			// voir ses stats de lancer de dé
			if (funcs.check(command, "rolls", 0)) {
				if (!dicePlayers.has(msg.author.id)) {
					msg.channel.send("You didn't do any rolls");
					return;
				} let str = "Your rolls:```";
				let dicesArray = Array.from(dicePlayers.get(msg.author.id).dices.values());
				for (let i = 0; i < dicesArray.length; i++)
					str += "\n" + dicesArray[i].toString();
				msg.channel.std(str + "```");
			}

			// lancer un dé
			else if (funcs.check(command, "roll", 2)) {
				if (!dicePlayers.has(msg.author.id)) dicePlayers.set(msg.author.id, new types.DicePlayer());
				let max = 6;
				if (args.length == 1) max = Number(args[0]);
				if (!dicePlayers.get(msg.author.id).dices.has(max)) dicePlayers.get(msg.author.id).dices.set(max, new types.Dice(max));
				msg.reply(dicePlayers.get(msg.author.id).roll(max) + "/" + max + " (:game_die:)");
			}

			// envoyer un shitpost
			if (funcs.check(command, "shitpost", 2)) {
				if (args.length == 0)
					msg.channel.send(shitpost.genShitpost());
				else
					msg.channel.send(shitpost.findShitpost(command.replace("shitpost ","").split(" && ")));
			}

			// chiffer un message
			if (funcs.check(command, "crypt", 1)) {
				let message;
				if (args[0].startsWith("k:"))
					message = crypt.getHandler().crypt(command.replace("crypt " + args[0] + " ",""), args[0].replace("k:",""));
				else message = crypt.getHandler().randomCrypt(command.replace("crypt ",""));
				msg.channel.send("Crypted message: " + tools.toCodeBlock(message.getCrypted()) + "Key: " + message.requestKey());
			}

			// déchiffer un message
			if (funcs.check(command, "decrypt", 1)) {
				let decrypted = crypt.getHandler().decrypt(command.replace("decrypt " + args[0] + " ",""), args[0]);
				msg.channel.send("Decrypted message: " + tools.toCodeBlock(decrypted));
			}

			// rule34
			if (funcs.check(command, "r34", false) || funcs.check(command, "rule34", 1)) {
				if (!msg.channel.nsfw)
					msg.reply("what are you doing? D:");
				else {
					let search = command.replace("r34 ","").replace("rule34 ","").toLowerCase();
					while (search.includes(" "))
						search = search.replace(" ", "_");
					snekfetch.get("https://rule34.paheal.net/post/list/" + search + "/1").then(rep => {
						let nbPagesTab = rep.text.replace('">Last</a>',"//LAST//").split("//LAST//")[0].split("/post/list/" + search + "/");
						let nbPages = nbPagesTab[nbPagesTab.length-1];
						let searchLink = "https://rule34.paheal.net/post/list/" + search + "/" + (tools.randomValue(nbPages-1)+1);
						snekfetch.get(searchLink).then(rep2 => {
							let html = rep2.text;
							for (let i = 0; i <= 100; i++)
								html = html.replace('<a href="http://rule34-data-',"<-SPLIT->-").replace('">Image Only</a>',"<-SPLIT->-");
							let htmlTab = html.split("<-SPLIT->-");
							let imgs = [];
							for (let i = 0; i < htmlTab.length; i++)
								if (htmlTab[i].includes("_images")) imgs.push("http://rule34-data-" + htmlTab[i]);
							if (imgs.length != 0)
								msg.channel.send("Search: " + tools.toBlock(search), {file:tools.randTab(imgs)});
							else
								msg.channel.send("Sorry, I didn't find anything about '" + search + "'");
						});
					}, function() {
						msg.reply("sorry, I didn't find anything about '" + search + "'");
					});
				}
			}

			// random cyanide and happiness
			if (funcs.check(command, "cahrcg", 0)) {
				snekfetch.get("http://explosm.net/rcg").then(rep => {
					msg.channel.send({file:rep.text.split('<meta property="og:image" content="')[1].split('">')[0]});
				});
			}

			//random z0rde
			if (funcs.check(command, "z0r", 0)) {
				msg.channel.send("Enjoy ! http://z0r.de/" + tools.randomValue(7912) + " (earphone/headphone users beware)");
			}

			// random scp
			if (funcs.check(command, "rdscp", 0)) {
				let d = tools.randomValue(3)+1;
				let url;
				let nb;
				if (d == 1) {
					url = "http://www.scp-wiki.net/scp-series";
					nb = 0;
				} else {
					url = "http://www.scp-wiki.net/scp-series-" + d;
					nb = d-1;
				} snekfetch.get(url).then(rep => {
					let htmltab = rep.text.split("<ul>").slice(1);
					let trouve = false;
					while (!trouve) {
						let htmlSCPtab = htmltab[tools.randomValue(9)+19].split("</li>");
						let tabSCPs = [];
						for (let i = 0; i <= 99; i++) {
							if (!htmlSCPtab[i].includes("newpage")) {
								trouve = true;
								tabSCPs.push(htmlSCPtab[i]);
							}
						}
						let SCPhtml = tools.randTab(tabSCPs);
						let numero = SCPhtml.split("SCP-")[1].split("</a>")[0];
						let name = SCPhtml.split("</a> - ")[1];
						msg.channel.send("SCP-" + numero + " | " + name + " => http://www.scp-wiki.net/scp-" + numero);
					}
				});
			}

			// générer un QRCode
			if (funcs.check(command, "qrcode", 1)) {
				qrcode.toFile("./temp/qrcode.png", command.replace("qrcode ", ""), {margin : 1, scale : 8, color : {dark : "#202225FF", light : "#36393EFF"}}, function (err) {
					if (err) throw err;
					try {
						msg.channel.send("QRCode: " + tools.toBlock(command.replace("qrcode ", "")), {"file":"./temp/qrcode.png"});
					} catch (err) {
						console.error(err);
					}
				});
			}

			// générer une histoire
			if (funcs.check(command, "story", 0))
				msg.channel.send(shitpost.genStory());

			// waifu (SECRET COMMAND UNLESS YOU ARE READING THIS)
			if (funcs.check(command, "waifu", 0)) {
				if (msg.channel.type != "dm")
					msg.reply("your waifu doesn't exist and if she did she wouldn't like you.");
				else
					msg.channel.send("Your waifu doesn't exist and if she did she wouldn't like you.")
			}

		}

	} catch (err) {
		if (err.message == "impossibleDiceSize") msg.channel.send("This is not a dice and you know it.");
		else if (err.message == "incorrectKey") msg.channel.send("This key and/or message is incorrect.");
		else if (err.message == "shitpostNotFound") msg.channel.send("Sorry but I didn't find anything.");
		else if (err.message == "memberNotInAVoiceChannel") msg.channel.send("You're not in a voice channel.");
		else if (err.message == "voiceChannelNotJoinable") msg.channel.send("I can't join this voice channel.");
		else if (err.message == "voiceChannelNotSpeakable") msg.channel.send("I'm not allowed to speak in this voice channel.");
		else if (err.message == "voiceChannelFull") msg.channel.send("This voice channel is full.");
		else if (err.message == "clientAlreadyInAVoiceChannel") msg.channel.send("I'm already in a voice channel.");
		else if (err.message == "clientNotInAVoiceChannel") msg.channel.send("I'm not connected. You can ask me to join you using ``" + config.prefix + "join``.");
		else if (err.message == "unknownOrNotSupportedVideoWebsite") msg.channel.send("Sorry, but I don't know this website.")
		else if (err.message == "notPlayingMusic") msg.channel.send("I'm not playing any music at the moment. Use ``" + config.prefix + "request [link]``.");
		else if (err.message == "invalidVolume") msg.channel.send("The volume must be over 0%.");
		else if (err.message == "emptyPlaylist") msg.channel.send("You can't do that when the playlist is empty.");
		else if (err.message == "invalidPlaylistIndex") msg.channel.send("There is no music with that ID in the playlist.");
		else console.error(err);
	}

});

// READY
bot.on("ready", () => {
	if (!ready) {
		ready = true;
		console.log("[DRABOT] I'm ready Senpai !");
		if (heroku) {
			console.log("(Heroku launch)");
			bot.guilds.get("255312496250978305").channels.get("275292955475050496").send("Heroku launch complete.");
		} else {
			console.log("(local launch)");
			bot.guilds.get("255312496250978305").channels.get("275292955475050496").send("Local launch complete.");
		}
		exports.id = bot.id;
	}
});

// CONNECT THE BOT TO DISCORD
bot.login(process.env.DISCORDTOKEN);

// BABYBOT ----------------------------------------------------------------------------------------------------------------------

// CONSTANTES
const babybot = new discord.Client();

// VARIABLES GLOBALES
let babyReady = false;

// MAIN
babybot.on("message", msg => {

	try {

		// COMMANDES
		if (msg.content.startsWith(config.babybotPrefix)) {
			let command = msg.content.replace(config.babybotPrefix, "");
			let args = command.split(" ");

			// COMMANDES ADMIN
			if (config.owners.indexOf(msg.author.id) != -1) {

				// changer l'avatar du bot
				if (funcs.check(command, "setAvatar", 1))
					babybot.user.setAvatar(command.replace("setAvatar ",""));

				// changer le nom du bot
				if (funcs.check(command, "setName", 1))
					babybot.user.setUsername(command.replace("setName ",""));

				// changer le jeu actuel du bot
				if (funcs.check(command, "setGame", 1))
					babybot.user.setGame(command.replace("setGame ",""));

			}

			// répéter
			if (funcs.check(command, "say", 1)) {
				if (msg.author.id == process.env.DRAGOID) {
					msg.channel.send(command.replace("say ",""));
					msg.delete();
				} else {
					msg.channel.send("Ma maman m'a dit de ne pas parler aux inconnus !");
				}
			}

		}

	} catch (err) {
		console.error(err);
	}

});

// READY
babybot.on("ready", () => {
	if (!babyReady) {
		babyReady = true;
		babybot.user.setGame("");
		console.log("[BABYDRABOT] Ze suis prêt");
	}
});
