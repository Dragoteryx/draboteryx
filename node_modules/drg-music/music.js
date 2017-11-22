/* jshint node:true, evil:true, asi:true, esversion:6*/
"use strict";

// IMPORTS
const discord = require("discord.js");
const ytdl = require("ytdl-core");
const EventEmitter = require("events");

// VARIABLES


//FUNCTIONS
exports.videoWebsite = str => {
	if (str.startsWith("https://www.youtube.com/watch?v=") || str.startsWith("https://youtu.be/"))
		return "Youtube";
	/*else if (str.startsWith("http://www.dailymotion.com/video/") || str.startsWith("http://dai.ly/"))
		return "Dailymotion";
	else if (str.startsWith("http://www.nicovideo.jp/watch/") || str.startsWith("http://nico.ms/"))
		return "NicoNicoVideo";*/
	else throw new Error("unknownOrNotSupportedVideoWebsite");
}

exports.intToTime = int => {
	let seconds = int*1000;
	let minutes = 0;
	while (seconds <= 60) {
		seconds -= 60;
		minutes++;
	}
	return {minutes : minutes, seconds : seconds};
}

//CLASSES
exports.MusicHandler = function(cl) {
	if (cl == undefined)
		throw new Error("missingParameter: client");
	EventEmitter.call(this);
	var playlists = new Map();
	var client = cl;

	// INFOS HANDLER
	this.getClient = () => client;
	this.joined = () => Array.from(playlists.keys());
	this.nbJoined = () => playlists.size;

	// METHODES PLAYLIST
	this.join = member => {
		if (member == undefined)
			throw new Error("missingParameter: member");
		if (this.isConnected(member.guild))
			throw new Error("clientAlreadyInAVoiceChannel");
		if (member.voiceChannel == null)
			throw new Error("memberNotInAVoiceChannel");
		if (!member.voiceChannel.joinable)
			throw new Error("voiceChannelNotJoinable");
		if (!member.voiceChannel.speakable)
			throw new Error("voiceChannelNotSpeakable");
		if (member.voiceChannel.full)
			throw new Error("voiceChannelFull");
		playlists.set(member.guild.id, new Playlist(member.guild, client));
		this.emit("joined", member.guild);
		playlists.get(member.guild.id).on("added", (guild, music) => {
			this.emit("added", guild, music);
		});
		playlists.get(member.guild.id).on("removed", (guild, music) => {
			this.emit("removed", guild, music);
		});
		playlists.get(member.guild.id).on("next", (guild, music) => {
			this.emit("next", guild, music);
		});
		playlists.get(member.guild.id).on("empty", guild => {
			this.emit("empty", guild);
		});
		playlists.get(member.guild.id).on("paused", guild => {
			this.emit("paused", guild);
		});
		playlists.get(member.guild.id).on("resumed", guild => {
			this.emit("resumed", guild);
		});
		playlists.get(member.guild.id).on("shuffled", guild => {
			this.emit("shuffled", guild);
		});
		playlists.get(member.guild.id).on("cleared", guild => {
			this.emit("cleared", guild);
		});
		playlists.get(member.guild.id).on("skipped", (guild, music) => {
			this.emit("skipped", guild, music);
		});
		playlists.get(member.guild.id).on("finished", (guild, music) => {
			this.emit("finished", guild, music);
		});
		playlists.get(member.guild.id).on("volumechange", (guild, newVolume, oldVolume) => {
			this.emit("volumechange", guild, newVolume, oldVolume);
		});
		member.voiceChannel.join();
		return this;
	}
	this.leave = guild => {
		if (guild == undefined)
			throw new Error("missingParameter: guild");
		if (!this.isConnected(guild))
			throw new Error("clientNotInAVoiceChannel");
		this.emit("leaved", guild);
		playlists.get(guild.id).kill();
		guild.me.voiceChannel.leave();
		playlists.delete(guild.id);
		return this;
	}
	this.addMusic = (member, link) => {
		if (member == undefined)
			throw new Error("missingParameter: member");
		if (link == undefined)
			throw new Error("missingParameter: link");
		if (!this.isConnected(member.guild))
			throw new Error("clientNotInAVoiceChannel");
		exports.videoWebsite(link);
		ytdl.getInfo(link, (err, info) => {
			if (err) throw err;
			let music = new Music(link, member, false);
			music.title = info.title;
			music.description = info.description;
			music.author = {
				name : info.author.name,
				avatarURL : info.author.avatar,
				channelURL : info.author.channel_url
			}
			music.thumbnailURL = info.thumbnail_url;
			music.length = Number(info.length_seconds)*1000;
			playlists.get(member.guild.id).add(music);
		});
	}
	this.addFile = (member, path) => {
		if (member == undefined)
			throw new Error("missingParameter: member");
		if (path == undefined)
			throw new Error("missingParameter: path");
		if (!this.isConnected(member.guild))
			throw new Error("clientNotInAVoiceChannel");
		playlists.get(member.guild.id).add(new Music(path, member, true));
		return this;
	}
	this.removeMusic = (guild, index) => {
		if (guild == undefined)
			throw new Error("missingParameter: guild");
		if (index == undefined)
			throw new Error("missingParameter: index");
		if (!this.isConnected(guild))
			throw new Error("clientNotInAVoiceChannel");
		if (playlists.get(guild.id).size() == 0)
			throw new Error("emptyPlaylist");
		if (index < 0 || index >= playlists.get(guild.id).size())
			throw new Error("invalidPlaylistIndex");
		playlists.get(guild.id).remove(index);
		return this;
	}
	this.nextMusic = guild => {
		if (guild == undefined)
			throw new Error("missingParameter: guild");
		if (!this.isPlaying(guild))
			throw new Error("notPlayingMusic");
		playlists.get(guild.id).skip();
		return this;
	}
	this.shufflePlaylist = guild => {
		if (guild == undefined)
			throw new Error("missingParameter: guild");
		if (this.isPlaylistEmpty(guild))
			throw new Error("emptyPlaylist");
		playlists.get(guild.id).shuffle();
		return this;
	}
	this.clearPlaylist = guild => {
		if (guild == undefined)
			throw new Error("missingParameter: guild");
		if (this.isPlaylistEmpty(guild))
			throw new Error("emptyPlaylist");
		playlists.get(guild.id).clear();
		return this;
	}
	this.toggleMusic = guild => {
		if (guild == undefined)
			throw new Error("missingParameter: guild");
		if (!this.isPlaying(guild))
			throw new Error("notPlayingMusic");
		playlists.get(guild.id).toggle();
		return this;
	}
	this.pauseMusic = guild => {
		if (guild == undefined)
			throw new Error("missingParameter: guild");
		if (!this.isPlaying(guild))
			throw new Error("notPlayingMusic");
		playlists.get(guild.id).pause();
		return this;
	}
	this.resumeMusic = guild => {
		if (guild == undefined)
			throw new Error("missingParameter: guild");
		if (!this.isPlaying(guild))
			throw new Error("notPlayingMusic");
		playlists.get(guild.id).resume();
		return this;
	}
	this.setVolume = (guild, volume) => {
		if (guild == undefined)
			throw new Error("missingParameter: guild");
		if (volume == undefined)
			throw new Error("missingParameter: volume");
		if (!this.isConnected(guild))
			throw new Error("clientNotInAVoiceChannel");
		if (volume < 0)
			throw new Error("invalidVolume");
		playlists.get(guild.id).volume(volume);
		return this;
	}
	this.toggleLooping = guild => {
		if (guild == undefined)
			throw new Error("missingParameter: guild");
		if (!this.isPlaying(guild))
			throw new Error("notPlayingMusic");
		playlists.get(guild.id).toggleLoop();
		this.emit("looping", guild, this.playingInfo(guild), this.isLooping(guild));
		return this;
	}

	// INFOS PLAYLIST
	this.isConnected = guild => playlists.has(guild.id);
	this.isPlaying = guild => {
		if (guild == undefined)
			throw new Error("missingParameter: guild");
		if (!this.isConnected(guild))
			throw new Error("clientNotInAVoiceChannel");
		return playlists.get(guild.id).playing();
	}
	this.isPaused = guild => {
		if (guild == undefined)
			throw new Error("missingParameter: guild");
		if (!this.isPlaying(guild))
			throw new Error("notPlayingMusic");
		return playlists.get(guild.id).paused();
	}
	this.isLooping = guild => {
		if (guild == undefined)
			throw new Error("missingParameter: guild");
		if (!this.isPlaying(guild))
			throw new Error("notPlayingMusic");
		return playlists.get(guild.id).looping();
	}
	this.playlistInfo = guild => {
		if (guild == undefined)
			throw new Error("missingParameter: guild");
		if (!this.isPlaying(guild))
			throw new Error("notPlayingMusic");
		return playlists.get(guild.id).info();
	}
	this.playingInfo = guild => {
		if (guild == undefined)
			throw new Error("missingParameter: guild");
		if (!this.isPlaying(guild))
			throw new Error("notPlayingMusic");
		return playlists.get(guild.id).playingInfo();
	}
	this.playlistSize = guild => {
		if (guild == undefined)
			throw new Error("missingParameter: guild");
		if (!this.isConnected(guild))
			throw new Error("clientNotInAVoiceChannel");
		return playlists.get(guild.id).size();
	}
	this.isPlaylistEmpty = guild => {
		if (guild == undefined)
			throw new Error("missingParameter: guild");
		if (!this.isConnected(guild))
			throw new Error("clientNotInAVoiceChannel");
		return playlists.get(guild.id).empty();
	}
	this.musicInfo = (guild, index) => {
		if (guild == undefined)
			throw new Error("missingParameter: guild");
		if (index == undefined)
			throw new Error("missingParameter: guild");
		if (playlists.get(guild.id).size() == 0)
			throw new Error("emptyPlaylist");
		if (index < 0 || index >= playlists.get(guild.id).size())
			throw new Error("invalidPlaylistIndex");
		return playlists.get(guild.id).musicInfo(index);
	}
}

exports.MusicHandler.prototype = Object.create(EventEmitter.prototype);
exports.MusicHandler.prototype.constructor = exports.MusicHandler;

function Playlist(gld, cl) {
	EventEmitter.call(this);
	var guild = gld;
	var list = [];
	var dispatcher = null;
	var current;
	var toNext = false;
	var volume = 100;
	var client = cl;
	var loop = false;

	// METHODES
	this.loop = () => {
		if (toNext)
			this.playNext();
	}
	this.toggleLoop = () => {
		loop = !loop;
	}
	this.add = music => {
		list.push(music);
		this.emit("added", guild, music.info());
		if (!this.playing())
			toNext = true;
	}
	this.remove = index => {
		this.emit("removed", guild, list.splice(index, 1)[0].info());
	}
	this.skip = () => {
		this.emit("skipped", guild, current.info());
		loop = false;
		dispatcher.end();
	}
	this.playNext = () => {
		toNext = false;
		dispatcher = null;
		if (!loop)
			current = list.shift();
		if (current != undefined) {
			dispatcher = current.play();
			dispatcher.setVolume(volume/100.0);
			dispatcher.once("end", () => {
				toNext = true;
				this.emit("finished", guild, current.info());
			})
			this.emit("next", guild, current.info());
		} else {
			this.reset();
			this.emit("empty", guild);
		}
	}
	this.toggle = () => {
		if (this.paused())
			this.resume();
		else
			this.pause();
	}
	this.pause = () => {
		if (this.paused())
			throw new Error("musicNotPaused");
		dispatcher.pause();
		this.emit("paused", guild);
	}
	this.resume = () => {
		if (!this.paused())
			throw new Error("musicAlreadyPaused");
		dispatcher.resume();
		this.emit("resumed", guild);
	}
	this.shuffle = () => {
		list.sort(() => Math.random() - 0.5);
		this.emit("shuffled", guild);
	}
	this.clear = () => {
		list = [];
		this.emit("cleared", guild);
	}
	this.volume = set => {
		this.emit("volumechange", guild, set, volume);
		volume = set;
		if (dispatcher != null)
			dispatcher.setVolume(volume/100.0);
	}
	this.reset = () => {
		list = [];
		if (dispatcher != null)
			dispatcher.end();
		dispatcher = null;
		current = undefined;
	}
	this.kill = () => {
		this.reset();
		client.clearInterval(interval);
	}

	// INFOS
	this.info = () => {
		let list2 = [];
		for (let music of list)
			list2.push(music.info());
		return list2;
	}
	this.playingInfo = () => {
		let info = current.info();
		info.time = dispatcher.time;
		return info;
	}
	this.playing = () => current != undefined && dispatcher != null;
	this.paused = () => dispatcher.paused;
	this.size = () => list.length;
	this.empty = () => list.length == 0;
	this.musicInfo = index => list[index].info();
	this.looping = () => loop;
	var interval = client.setInterval(this.loop, 1000);
}

Playlist.prototype = Object.create(EventEmitter.prototype);
Playlist.prototype.constructor = Playlist;

function Music(link, member, file) {
	if (!file) {
		this.website = exports.videoWebsite(link);
		this.title = undefined;
	} else {
		this.website = undefined;
		this.title = link.split("/").pop();
	}
	this.link = link;
	this.member = member;
	this.description = undefined;
	this.author = {
		name : undefined,
		avatarURL : undefined,
		channelURL : undefined
	};
	this.thumbnailURL = undefined;
	this.length = 0;
	this.file = file;
	this.play = () => {
		if (!this.file) {
			if (this.website == "Youtube")
				return this.member.guild.me.voiceChannel.connection.playStream(ytdl(this.link, {filter:"audioonly"}));
			else if (this.website == "Dailymotion")
				return this.member.guild.me.voiceChannel.connection.playStream(null);
			else if (this.website == "NicoNicoVideo")
				return this.member.guild.me.voiceChannel.connection.playStream(null);
		} else
			return this.member.guild.me.voiceChannel.connection.playFile(this.link);
	}
	this.info = () => {
		if (!this.file)
			return {
				title : this.title,
				description : this.description,
				author : this.author,
				thumbnailURL : this.thumbnailURL,
				length : this.length,
				link : this.link,
				member : this.member,
				file : false
			};
		else
			return {
				title : this.title,
				link : this.link,
				member : this.member,
				file : true
			}
	}
}
