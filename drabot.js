/* jshint node:true, evil:true, asi:true, esversion:6*/
"use strict";
require("dotenv").config();

// REQUIREMENTS
const discord = require("discord.js");
const fs = require("fs");
const snekfetch = require("snekfetch");
const qrcode = require("qrcode");
const youtubeSearch = require("youtube-search");
const drgMusic = require("drg-music");
const twitter = require("twitter");
const http = require("http");

// FILES
const config = require("./config.js");
const shitposting = require("./shitpost.js");
const crypt = require("./crypt.js");
const tools = require("./tools.js");
const funcs = require("./funcs.js");
const types = require("./types.js");

// DRABOT ----------------------------------------------------------------------------------------------------------------------

// CONSTS
const bot = new discord.Client();
const music = new drgMusic.MusicHandler(bot);
const shitpost = new shitposting.ShitpostHandler();
music.on("joined", guild => {
	console.log("[MUSICBOT] Joined guild " + guild.name + " (" + guild.id + ")");
	musicChannels.get(guild.id).send("I'm here !");
});
music.on("leaved", guild => {
	console.log("[MUSICBOT] Leaved guild " + guild.name + " (" + guild.id + ")");
	musicChannels.get(guild.id).send("Goodbye o/");
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
const heroku = process.env.HEROKU !== undefined;
const utilityType = new types.CommandType("utility", ":wrench: Utility commands");
const funType = new types.CommandType("fun", ":bowling: Fun commands");
const musicType = new types.CommandType("music", ":microphone: Music commands");
const nsfwType = new types.CommandType("nsfw", ":cucumber: NSFW commands");
//const gmType = new types.Commandtype("gm", ":sunrise_over_mountains:");
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
	new types.Command("channelinfo ([channelname])", "info about a channel (if empty then info about the channel the message has been send it)", utilityType, true),
	new types.Command("memberinfo ([membername])", "info about a member (if empty then info about you)", utilityType, true),
	new types.Command("roleinfo ([rolename])", "info about a role (if empty info about your hightest role)", utilityType, true),
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
let dabbing = false;
let reddab;
let orangedab;
let yellowdab;
let greendab;
let bluedab;
let indigodab;
let purpledab;
let pinkdab;
let whitedab;
let blackdab;
let rainbowdab;

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

		// dabbing
		if (msg.guild.id == "191560973922992128" && dabbing && msg.author.id != bot.user.id && msg.content != config.prefix + "dabbing") {
			let rand = Math.random();
			/*if (msg.content.toLowerCase().includes("dieu du dab"))
				rand = 0.05;*/
			msg.react(reddab).then(react => {
			msg.react(orangedab).then(react => {
			msg.react(yellowdab).then(react => {
			msg.react(greendab).then(react => {
			msg.react(bluedab).then(react => {
			msg.react(indigodab).then(react => {
			msg.react(purpledab).then(react => {
			msg.react(pinkdab).then(react => {
			msg.react(whitedab).then(react => {
			msg.react(blackdab).then(react => {
				if (rand <= 0.05)
					msg.react(rainbowdab);
			})})})})})})})})})});
		}

		// OWNER COMMANDS
		if (msg.content.startsWith(config.ownerPrefix) && config.owners.includes(msg.author.id)) {
			let command = msg.content.replace(config.ownerPrefix, "");
			let args = command.split(" ");

			// changer l'avatar du bot
			if (funcs.check(msg, "setAvatar", 1, true))
				bot.user.setAvatar(command.replace("setAvatar ",""));

			// changer le nom du bot
			else if (funcs.check(msg, "setName", 1, true))
				bot.user.setUsername(command.replace("setName ",""));

			// changer le jeu actuel du bot
			else if (funcs.check(msg, "setGame", 1, true))
				bot.user.setGame(command.replace("setGame ",""));

			// exécuter un bout de code pendant l'exécution
			else if (funcs.check(msg, "exec", 1, true))
					eval(command.replace("exec ", ""));

			// affiche la valeur d'une variable
			else if (funcs.check(msg, "value", 1, true))
				msg.channel.send(command.replace("value ", "") + tools.toBlock(eval(command.replace("value ", "")).toString()));

			// connecter/déconnecter babybot
			else if (funcs.check(msg, "babybot", 0, true)) {
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
			else if (funcs.check(msg, "follow", 0, true)) {
				follow = !follow;
				if (follow)
					msg.reply("I'm following you !");
				else
					msg.reply("I'll stay here in case you need me.")
			}

			// mode perroquet
			else if (funcs.check(msg, "say", 1, true)) {
				msg.channel.send(command.replace("say ",""));
				msg.delete();
			}

		}

		// NORMAL COMMANDS
		else if (msg.content.startsWith(config.prefix)) {
			let command = msg.content.replace(config.prefix, "");
			let args = command.split(" ").slice(1);

			// commandes musicales
			if (enableMusic) {

				// rejoindre un channel vocal
				if (funcs.check(msg, "join", 0, false)) {
					musicChannels.set(msg.guild.id, msg.channel);
					music.join(msg.member);
				}

				// quitter un channel vocal
				else if (funcs.check(msg, "leave", 0, false)) {
					music.leave(msg.guild);
					musicChannels.delete(msg.guild.id);
				}

				// ajouter une musique
				else if (funcs.check(msg, "request", 1, false))
					music.addMusic(msg.member, command.replace("request ",""));

				// retirer une musique
				else if (funcs.check(msg, "remove", 1, false))
					music.removeMusic(msg.guild, Number(command.replace("remove ",""))-1);

				// toggle la playlist (pause/resume)
				else if (funcs.check(msg, "toggle", 0, false))
					music.toggleMusic(msg.guild);

				// skip la musique actuelle
				else if (funcs.check(msg, "skip", 0, false)) {
					if (!music.playingInfo(msg.guild).file || config.owners.indexOf(msg.author.id) != -1)
						music.nextMusic(msg.guild);
					else
						msg.channel.send("You are not allowed to skip that !");
				}

				// clear la playlist
				else if (funcs.check(msg, "plclear", 0, false))
					music.clearPlaylist(msg.guild);

				// shuffle la playlist
				else if (funcs.check(msg, "plshuffle", 0, false))
					music.shufflePlaylist(msg.guild);

				// set le volume
				else if (funcs.check(msg, "volume", 1, false))
					music.setVolume(msg.guild, Number(command.replace("volume ","")));

				// afficher la playlist
				else if (funcs.check(msg, "playlist", 0, false)) {
					let playing = music.playingInfo(msg.guild);
					let playlist = music.playlistInfo(msg.guild);
					let embed = funcs.defaultEmbed().setThumbnail(playing.thumbnailURL);
					let timer2;
					if (!playing.file) {
						let timer = drgMusic.intToTime(playing.time);
						let end = drgMusic.intToTime(playing.length);
						embed.addField("Playing (" + timer.minutes + ":" + Math.floor(timer.seconds) + " / " + end.minutes + ":" + Math.floor(end.seconds) + ") - " + playing.title + " by " + playing.author.name, "Requested by " + playing.member);
					}
					else
						embed.addField("Playing - " + playing.title, "Requested by " + playing.member)
					for (let i = 0; i < playlist.length; i++) {
						if (!playlist[i].file) {
							timer2 = drgMusic.intToTime(playlist[i].length);
							embed.addField((i+1) + " - " + playlist[i].title + " by " + playlist[i].author.name + " (" + timer2.minutes + ":" + Math.floor(timer2.seconds) + ")", "Requested by " + playlist[i].member);
						}
						else
							embed.addField((i+1) + " - " + playlist[i].title, "Requested by " + playlist[i].member);
					}
					msg.channel.send("Here's the playlist:", embed);
				}

				// afficher la musique actuelle
				else if (funcs.check(msg, "playing", 0, false)) {
					let playing = music.playingInfo(msg.guild);
					let embed = funcs.defaultEmbed();
					let timer = drgMusic.intToTime(playing.time);
					let end = drgMusic.intToTime(playing.length);
					if (!playing.file) {
						embed.setThumbnail(playing.thumbnailURL)
						.addField("Title", playing.title, true)
						.addField("Author", playing.author.name + " (" + playing.author.channelURL + ")", true)
						.addField("Link", playing.link, true)
						.addField("Requested by", playing.member, true);
						msg.channel.send("Playing: ``" + timer.minutes + ":" + Math.floor(timer.seconds) + " / " + end.minutes + ":" + Math.floor(end.seconds) + " ("+ Math.floor((playing.time/playing.length)*100) + "%)``", embed);
					} else {
						embed.addField("File name", playing.title, true)
						.addField("Requested by", playing.member, true);
						msg.channel.send("Playing:", embed);
					}
				}

				// ajoute une musique par recherche
				else if (funcs.check(msg, "search", 1, false)) {
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
				else if (funcs.check(msg, "loop", 0, false))
					music.toggleLooping(msg.guild);

			}

			// -----------------------------------------------------------------------------------------------------------------------------------

			// affiche le menu d'aide
			if (funcs.check(msg, "help", 0, true)) {
				let i = 0;
				for (i; i < commandTypes.length; i++) {
					let help = funcs.defaultEmbed();
					for (let h = 0; h < commands.length; h++) {
						if (commands[h].type.equals(commandTypes[i]) && commands[h].show)
							help.addField(config.prefix + commands[h].name,commands[h].desc);
					} msg.author.send(commandTypes[i].title + " (" + help.fields.length + ")", help);
				}
			}

			// guild info
			else if (funcs.check(msg, "serverinfo", 0, false)) {
				if (!msg.member.hasPermission("MANAGE_GUILD"))
					throw new Error("notAllowedToGuildInfo");
				msg.channel.send("", funcs.showGuildInfo(msg.guild));
			}

			// channel info
			else if (funcs.check(msg, "channelinfo", 2, false)) {
				let channel;
				if (args.length == 0) {
					if (!msg.channel.permissionsFor(msg.member).has("MANAGE_CHANNELS"))
						throw new Error("notAllowedToChannelInfoThis");
					channel = msg.channel;
				} else {
					if (!msg.member.hasPermission("MANAGE_CHANNELS"))
						throw new Error("notAllowedToChannelInfo");
					channel = funcs.stringToChannel(command.replace("channelinfo ",""), msg.guild);
				}
				msg.channel.send("", funcs.showChannelInfo(channel));
			}

			// member info
			else if (funcs.check(msg, "memberinfo", 2, false)) {
				let member = msg.member;
				if (args.length > 0) {
					if (!msg.member.hasPermission("MANAGE_MEMBERS"))
						throw new Error("notAllowedToMemberInfo");
					member = funcs.stringToMember(command.replace("memberinfo ", ""), msg.guild);
				}
				msg.channel.send("", funcs.showMemberInfo(member));
			}

			// role info
			else if (funcs.check(msg, "roleinfo", 2, false)) {
				if (!msg.member.hasPermission("MANAGE_ROLES"))
					throw new Error("notAllowedToRoleInfo");
				let role = msg.member.highestRole;
				if (args.length > 0)
					role = funcs.stringToRole(command.replace("roleinfo ", ""), msg.guild);
				msg.channel.send("", funcs.showRoleInfo(role));
			}

			// bot info
			else if (funcs.check(msg, "info", 0, true)) {
				msg.channel.send("", funcs.botInfo(bot));
			}

			// -----------------------------------------------------------------------------------------------------------------------------------

			// voir ses stats de lancer de dé
			else if (funcs.check(msg, "rolls", 0, true)) {
				if (!dicePlayers.has(msg.author.id)) {
					msg.channel.send("You didn't do any rolls");
					return;
				} let str = "Your rolls:```";
				let dicesArray = Array.from(dicePlayers.get(msg.author.id).dices.values());
				for (let i = 0; i < dicesArray.length; i++)
					str += "\n" + dicesArray[i].toString();
				msg.channel.send(str + "```");
			}

			// lancer un dé
			else if (funcs.check(msg, "roll", 2, true)) {
				if (!dicePlayers.has(msg.author.id)) dicePlayers.set(msg.author.id, new types.DicePlayer());
				let max = 6;
				if (args.length == 1) max = Number(args[0]);
				if (!dicePlayers.get(msg.author.id).dices.has(max)) dicePlayers.get(msg.author.id).dices.set(max, new types.Dice(max));
				msg.reply(dicePlayers.get(msg.author.id).roll(max) + "/" + max + " (:game_die:)");
			}

			// envoyer un shitpost
			else if (funcs.check(msg, "shitpost", 0, true))
					msg.channel.send(shitpost.genShitpost());

			// envoyer une histoire
			else if (funcs.check(msg, "story", 0, true))
					msg.channel.send(shitpost.genStory());

			// chiffer un message
			else if (funcs.check(msg, "crypt", 1, true)) {
				let message;
				if (args[0].startsWith("k:"))
					message = crypt.getHandler().crypt(command.replace("crypt " + args[0] + " ",""), args[0].replace("k:",""));
				else message = crypt.getHandler().randomCrypt(command.replace("crypt ",""));
				msg.channel.send("Crypted message: " + tools.toCodeBlock(message.getCrypted()) + "Key: " + tools.toBlock(message.requestKey()));
			}

			// déchiffer un message
			else if (funcs.check(msg, "decrypt", 1, true)) {
				let decrypted = crypt.getHandler().decrypt(command.replace("decrypt " + args[0] + " ",""), args[0]);
				msg.channel.send("Decrypted message: " + tools.toCodeBlock(decrypted));
			}

			// rule34
			else if (funcs.checkTab(msg, ["r34", "rule34"], 1, true)) {
				if (msg.channel.type != "dm" && !msg.channel.nsfw)
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
			else if (funcs.check(msg, "cahrcg", 0, true)) {
				snekfetch.get("http://explosm.net/rcg").then(rep => {
					msg.channel.send({file:rep.text.split('<meta property="og:image" content="')[1].split('">')[0]});
				});
			}

			//random z0rde
			else if (funcs.check(msg, "z0r", 0, true)) {
				msg.channel.send("Enjoy ! http://z0r.de/" + tools.randomValue(7912) + " (earphone/headphone users beware)");
			}

			// random scp
			else if (funcs.check(msg, "rdscp", 0, true)) {
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
			else if (funcs.check(msg, "qrcode", 1, true)) {
				qrcode.toFile("./temp/qrcode.png", command.replace("qrcode ", ""), {margin : 1, scale : 8, color : {dark : "#202225FF", light : "#36393EFF"}}, function (err) {
					if (err) throw err;
					try {
						msg.channel.send("QRCode: " + tools.toBlock(command.replace("qrcode ", "")), {"file":"./temp/qrcode.png"});
					} catch (err) {
						console.error(err);
					}
				});
			}

			// waifu (SECRET COMMAND UNLESS YOU ARE READING THIS)
			else if (funcs.check(msg, "waifu", 0, true)) {
				if (msg.channel.type != "dm")
					msg.reply("your waifu doesn't exist and if she did she wouldn't like you.");
				else
					msg.channel.send("Your waifu doesn't exist and if she did she wouldn't like you.")
			}

			// dabbing
			else if (funcs.check(msg, "dabbing", 0, true)) {
				if (msg.author.id == process.env.NISID || msg.author.id == process.env.DRAGOID) {
					dabbing= !dabbing;
					if (dabbing)
						msg.channel.send("" + greendab);
					else
						msg.channel.send("" + reddab);
				}
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
		else if (err.message == "notAMember") msg.channel.send("This member doesn't exist.");
		else if (err.message == "notAChannel") msg.channel.send("This channel doesn't exist.");
		else if (err.message == "notARole") msg.channel.send("This role doesn't exist.");
		else if (err.message == "notAllowedToGuildInfo") msg.channel.send("You need to have the permission to manage the server.");
		else if (err.message == "notAllowedToChannelInfoThis") msg.channel.send("You need to have the permission to manage this channel.");
		else if (err.message == "notAllowedToChannelInfo") msg.channel.send("You need to have the permission to manage channels.");
		else if (err.message == "notAllowedToMemberInfo") msg.channel.send("You need to have the permission to manage .");
		else if (err.message == "notAllowedToRoleInfo") msg.channel.send("You need to have the permission to manage roles.");
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
		exports.bot = bot;
		reddab = bot.guilds.get("191560973922992128").emojis.get("382924168443854859");
		orangedab = bot.guilds.get("191560973922992128").emojis.get("382924182951952384");
		yellowdab = bot.guilds.get("191560973922992128").emojis.get("382924196629577733");
		greendab = bot.guilds.get("191560973922992128").emojis.get("382924250413269032");
		bluedab = bot.guilds.get("191560973922992128").emojis.get("382185235049086978");
		indigodab = bot.guilds.get("191560973922992128").emojis.get("382924258973581313");
		purpledab = bot.guilds.get("191560973922992128").emojis.get("382924299515985921");
		pinkdab = bot.guilds.get("191560973922992128").emojis.get("382931408953409538");
		whitedab = bot.guilds.get("191560973922992128").emojis.get("382931481930104855");
		blackdab = bot.guilds.get("191560973922992128").emojis.get("382931443627589633");
		rainbowdab = bot.guilds.get("191560973922992128").emojis.get("383928845570670592");
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
				if (funcs.check(msg, "setAvatar", 1, true))
					babybot.user.setAvatar(command.replace("setAvatar ",""));

				// changer le nom du bot
				if (funcs.check(msg, "setName", 1, true))
					babybot.user.setUsername(command.replace("setName ",""));

				// changer le jeu actuel du bot
				if (funcs.check(msg, "setGame", 1, true))
					babybot.user.setGame(command.replace("setGame ",""));

			}

			// répéter
			if (funcs.check(msg, "say", 1, true)) {
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

// SERVER
let server = http.createServer(function(req, res) {
  res.writeHead(200);
  res.write("BOUH!");
	res.end();
});
server.listen(80);
