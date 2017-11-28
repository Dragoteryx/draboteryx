/* jshint node:true, evil:true, asi:true, esversion:6*/
"use strict";

// IMPORTS
const ytdl = require("ytdl-core");
const youtubeSearch = require("youtube-search");
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

exports.millisecondsToTime = int => {
	let seconds = int/1000;
	let minutes = 0;
	while (seconds >= 60) {
		seconds -= 60;
		minutes++;
	}
	seconds = Math.floor(seconds);
	if (seconds < 10)
		seconds = "0" + seconds;
	return minutes + ":" + seconds;
}

//CLASSES
exports.MusicHandler = function(cl) {
	if (cl === undefined)
		throw new Error("missingParameter: client");
	EventEmitter.call(this);
	var playlists = new Map();
	var client = cl;

	// INFOS HANDLER
	this.getClient = () => client;
	this.joined = () => Array.from(playlists.keys());
	this.nbJoined = () => playlists.size;

	// METHODES PLAYLIST
	this.join = (member, callback) => {
		if (member === undefined)
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
		playlists.get(member.guild.id).on("next", (guild, music) => {
			this.emit("next", guild, music);
		});
		playlists.get(member.guild.id).on("empty", guild => {
			this.emit("empty", guild);
		});
		playlists.get(member.guild.id).on("finished", (guild, music) => {
			this.emit("finished", guild, music);
		});
		member.voiceChannel.join();
		callback();
		return this;
	}
	this.leave = (guild, callback) => {
		if (guild === undefined)
			throw new Error("missingParameter: guild");
		if (!this.isConnected(guild))
			throw new Error("clientNotInAVoiceChannel");
		playlists.get(guild.id).kill();
		guild.me.voiceChannel.leave();
		playlists.delete(guild.id);
		callback();
		return this;
	}
	this.addMusic = (member, link, callback) => {
		if (member === undefined)
			throw new Error("missingParameter: member");
		if (link === undefined)
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
			callback(music.info());
		});
		return this;
	}
	this.addFile = (member, path, callback) => {
		if (member === undefined)
			throw new Error("missingParameter: member");
		if (path === undefined)
			throw new Error("missingParameter: path");
		if (!this.isConnected(member.guild))
			throw new Error("clientNotInAVoiceChannel");
		let music = new Music(path, member, true);
		playlists.get(member.guild.id).add(music);
		callback(music.info());
		return this;
	}
	this.addYoutubeQuery = (member, query, ytbApiKey, callback) => {
		if (member === undefined)
			throw new Error("missingParameter: member");
		if (query === undefined)
			throw new Error("missingParameter: query");
		if (ytbApiKey === undefined)
			throw new Error("missingParameter: youtube API key");
		while (query.includes(" "))
			query = query.replace(" ", "+");
			youtubeSearch(query, {maxResults : 10, key : ytbApiKey}, (err, rep) => {
				if (err) throw err;
					let link = "";
					for (let i = 0; i < 10; i++)
						if (rep[i].kind == "youtube#video" && link == "")
							link += rep[i].link;
					if (link != "")
						this.addMusic(member, link, callback);
					else
						throw new Error("youtubeQueryNoResults");
			});
	}
	this.removeMusic = (guild, index, callback) => {
		if (guild === undefined)
			throw new Error("missingParameter: guild");
		if (index === undefined)
			throw new Error("missingParameter: index");
		if (!this.isConnected(guild))
			throw new Error("clientNotInAVoiceChannel");
		if (playlists.get(guild.id).size() == 0)
			throw new Error("emptyPlaylist");
		if (index < 0 || index >= playlists.get(guild.id).size())
			throw new Error("invalidPlaylistIndex");
		callback(playlists.get(guild.id).remove(index).info());
		return this;
	}
	this.nextMusic = (guild, callback) => {
		if (guild === undefined)
			throw new Error("missingParameter: guild");
		if (!this.isPlaying(guild))
			throw new Error("notPlayingMusic");
		callback(this.playingInfo(guild));
		playlists.get(guild.id).skip();
		return this;
	}
	this.shufflePlaylist = (guild, callback) => {
		if (guild === undefined)
			throw new Error("missingParameter: guild");
		if (this.isPlaylistEmpty(guild))
			throw new Error("emptyPlaylist");
		playlists.get(guild.id).shuffle();
		callback();
		return this;
	}
	this.clearPlaylist = (guild, callback) => {
		if (guild === undefined)
			throw new Error("missingParameter: guild");
		if (this.isPlaylistEmpty(guild))
			throw new Error("emptyPlaylist");
		playlists.get(guild.id).clear();
		callback();
		return this;
	}
	this.toggleMusic = (guild, callback) => {
		if (guild === undefined)
			throw new Error("missingParameter: guild");
		if (!this.isPlaying(guild))
			throw new Error("notPlayingMusic");
		callback(playlists.get(guild.id).toggle(), this.playingInfo(guild));
		return this;
	}
	this.pauseMusic = (guild, callback) => {
		if (guild === undefined)
			throw new Error("missingParameter: guild");
		if (!this.isPlaying(guild))
			throw new Error("notPlayingMusic");
		playlists.get(guild.id).pause();
		callback(this.playingInfo(guild));
		return this;
	}
	this.resumeMusic = (guild, callback) => {
		if (guild === undefined)
			throw new Error("missingParameter: guild");
		if (!this.isPlaying(guild))
			throw new Error("notPlayingMusic");
		playlists.get(guild.id).resume();
		callback(this.playingInfo(guild));
		return this;
	}
	this.setVolume = (guild, volume, callback) => {
		if (guild === undefined)
			throw new Error("missingParameter: guild");
		if (volume === undefined)
			throw new Error("missingParameter: volume");
		if (!this.isConnected(guild))
			throw new Error("clientNotInAVoiceChannel");
		if (volume < 0)
			throw new Error("invalidVolume");
		callback(playlists.get(guild.id).setVolume(volume));
		return this;
	}
	this.toggleLooping = (guild, callback) => {
		if (guild === undefined)
			throw new Error("missingParameter: guild");
		if (!this.isPlaying(guild))
			throw new Error("notPlayingMusic");
		callback(playlists.get(guild.id).toggleLooping(), this.playingInfo(guild));
		return this;
	}

	// INFOS PLAYLIST
	this.isConnected = guild => playlists.has(guild.id);
	this.isPlaying = guild => {
		if (guild === undefined)
			throw new Error("missingParameter: guild");
		if (!this.isConnected(guild))
			throw new Error("clientNotInAVoiceChannel");
		return playlists.get(guild.id).isPlaying();
	}
	this.isPaused = guild => {
		if (guild === undefined)
			throw new Error("missingParameter: guild");
		if (!this.isPlaying(guild))
			throw new Error("notPlayingMusic");
		return playlists.get(guild.id).isPaused();
	}
	this.isLooping = guild => {
		if (guild === undefined)
			throw new Error("missingParameter: guild");
		if (!this.isPlaying(guild))
			throw new Error("notPlayingMusic");
		return playlists.get(guild.id).isLooping();
	}
	this.playlistInfo = guild => {
		if (guild === undefined)
			throw new Error("missingParameter: guild");
		if (!this.isPlaying(guild))
			throw new Error("notPlayingMusic");
		return playlists.get(guild.id).info();
	}
	this.playingInfo = guild => {
		if (guild === undefined)
			throw new Error("missingParameter: guild");
		if (!this.isPlaying(guild))
			throw new Error("notPlayingMusic");
		return playlists.get(guild.id).playingInfo();
	}
	this.playlistSize = guild => {
		if (guild === undefined)
			throw new Error("missingParameter: guild");
		if (!this.isConnected(guild))
			throw new Error("clientNotInAVoiceChannel");
		return playlists.get(guild.id).size();
	}
	this.isPlaylistEmpty = guild => {
		if (guild === undefined)
			throw new Error("missingParameter: guild");
		if (!this.isConnected(guild))
			throw new Error("clientNotInAVoiceChannel");
		return playlists.get(guild.id).isEmpty();
	}
	this.musicInfo = (guild, index) => {
		if (guild === undefined)
			throw new Error("missingParameter: guild");
		if (index === undefined)
			throw new Error("missingParameter: guild");
		if (playlists.get(guild.id).size() == 0)
			throw new Error("emptyPlaylist");
		if (index < 0 || index >= playlists.get(guild.id).size())
			throw new Error("invalidPlaylistIndex");
		return playlists.get(guild.id).musicInfo(index);
	}
	this.remainingTime = guild => {
		if (guild === undefined)
			throw new Error("missingParameter: guild");
		if (!this.isConnected(guild))
			throw new Error("clientNotInAVoiceChannel");
		if (this.isPlaylistEmpty(guild))
			return 0;
		else
			return playlists.get(guild.id).remainingTime();
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
	this.toggleLooping = () => {
		loop = !loop;
		return loop;
	}
	this.add = music => {
		list.push(music);
		if (!this.isPlaying())
			toNext = true;
	}
	this.remove = index => {
		return list.splice(index, 1)[0];
	}
	this.skip = () => {
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
		if (this.isPaused())
			return this.resume();
		else
			return this.pause();
	}
	this.pause = () => {
		if (this.isPaused())
			throw new Error("musicNotPaused");
		dispatcher.pause();
		return true;
	}
	this.resume = () => {
		if (!this.isPaused())
			throw new Error("musicAlreadyPaused");
		dispatcher.resume();
		return false;
	}
	this.shuffle = () => {
		list.sort(() => Math.random() - 0.5);
	}
	this.clear = () => {
		list = [];
	}
	this.setVolume = set => {
		let oldVolume = volume;
		volume = set;
		if (dispatcher != null)
			dispatcher.setVolume(volume/100.0);
		return oldVolume;
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
	this.isPlaying = () => current != undefined && dispatcher != null;
	this.isPaused = () => dispatcher.paused;
	this.size = () => list.length;
	this.isEmpty = () => list.length == 0;
	this.musicInfo = index => list[index].info();
	this.isLooping = () => loop;
	this.remainingTime = () => {
		let remaining = 0;
		if (this.isPlaying)
			remaining += current.length-dispatcher.time;
		for (let music of list)
			remaining += music.length;
		return remaining;
	}
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
