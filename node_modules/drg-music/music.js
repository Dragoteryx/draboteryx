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
	let hours = 0;
	while (seconds >= 60) {
		seconds -= 60;
		minutes++;
	}
	while (minutes >= 60) {
		minutes -= 60;
		hours++;
	}
	seconds = Math.floor(seconds);
	if (seconds < 10)
		seconds = "0" + seconds;
	if (hours != 0) {
		if (minutes < 10)
			minutes = "0" + minutes;
			return hours + ":" + minutes + ":" + seconds;
	} else
		return minutes + ":" + seconds;
}

exports.playYoutube = (link, voiceConnection, passes) => {
	return voiceConnection.playStream(ytdl(link, {filter:"audioonly"}), {passes: passes, bitrate:"auto"});
}

exports.youtubeInfo = link => {
	return ytdl.getInfo(link).then(info => {
		let music = {
			title: info.title,
			description: info.description,
			author: {
				name: info.author.name,
				avatarURL: info.author.avatar,
				channelURL: info.author.channel_url
			},
			thumbnailURL: info.thumbnail_url,
			length: Number(info.length_seconds)*1000,
			link: link
		};
		return Promise.resolve(music);
	}, err => {
		return Promise.reject(err);
	});
}

exports.queryYoutube = (query, ytbApiKey) => {
	return new Promise((resolve, reject) => {
		youtubeSearch(query, {key: ytbApiKey, maxResults: 1, type: "video"}, (err, res) => {
			if (err) reject(err);
			else resolve(res[0].link);
		});
	});
}

exports.queryYoutubeInfo = async (query, ytbApiKey) => {
	let link = await exports.queryYoutube(query, ytbApiKey);
	return await exports.youtubeInfo(link);
}

//CLASSES
exports.MusicHandler = function(cl) {
	EventEmitter.call(this);
	var playlists = new Map();
	var client = cl;

	// INFOS HANDLER
	this.getClient = () => client;
	this.joined = () => Array.from(playlists.keys());
	this.nbJoined = () => playlists.size;

	// METHODES PLAYLIST
	// rejoindre le vocal -------------------------------------------------------------------------
	this.join = member => {
		if (this.isConnected(member.guild))
			return Promise.reject(new Error("clientAlreadyInAVoiceChannel"));
		if (member.voiceChannel === null)
			return Promise.reject(new Error("memberNotInAVoiceChannel"));
		if (!member.voiceChannel.joinable)
			return Promise.reject(new Error("voiceChannelNotJoinable"));
		if (!member.voiceChannel.speakable)
			return Promise.reject(new Error("voiceChannelNotSpeakable"));
		if (member.voiceChannel.full)
			return Promise.reject(new Error("voiceChannelFull"));
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
		return Promise.resolve();
	}

	// quitter le vocal -------------------------------------------------------------------------
	this.leave = guild => {
		if (!this.isConnected(guild))
			return Promise.reject(new Error("clientNotInAVoiceChannel"));
		playlists.get(guild.id).kill();
		guild.me.voiceChannel.leave();
		playlists.delete(guild.id);
		return Promise.resolve();
	}

	// ajouter une musique -------------------------------------------------------------------------
	this.addMusic = async (request, member, options) => {

		// verifier options
		let keys = [];
		if (options !== undefined)
			keys = Object.keys(options);

		// verifier connection
		if (!this.isConnected(member.guild))
			return Promise.reject(new Error("clientNotInAVoiceChannel"));

		// what type of input ?
		if (options === undefined)
			options = {};
		if (options.type === undefined)
			options.type = "link";

		// add the music to the playlist

		// link
		if (options.type == "link") {
			let info = await ytdl.getInfo(request);
			if (info instanceof Error)
				return Promise.reject(info);
			let music;
			if (!keys.includes("passes"))
				music = new Music(request, member, false, 1);
			else
				music = new Music(request, member, false, Number(options.passes));
			music.title = info.title;
			music.description = info.description;
			music.author = {
				name : info.author.name,
				avatarURL : info.author.avatar,
				channelURL : info.author.channel_url
			}
			music.thumbnailURL = info.thumbnail_url;
			music.length = Number(info.length_seconds)*1000;
			music.time = 0;
			if (keys.includes("props"))
				music.props = options.props;
			playlists.get(member.guild.id).add(music);
			return Promise.resolve(music.info());
		}

		// local file
		else if (options.type == "file") {
			let music;
			if (!keys.includes("passes"))
				music = new Music(request, member, true, 1);
			else
				music = new Music(request, member, true, Number(options.passes));
			if (keys.includes("props"))
				music.props = options.props;
			playlists.get(member.guild.id).add(music);
			return Promise.resolve(music.info());
		}

		// youtube query
		else if (options.type == "query") {
			let link = await exports.queryYoutube(request, options.ytbApiKey);
			if (link instanceof Error)
				return Promise.reject(link);
			options.type = "link";
			return this.addMusic(link, member, options);
		} else
			return Promise.reject(new Error("invalidInputType"));
	}

	// remove a music from the playlist -------------------------------------------------------------------------
	this.removeMusic = (guild, index) => {
		if (!this.isConnected(guild))
			return Promise.reject(new Error("clientNotInAVoiceChannel"));
		if (this.isPlaylistEmpty(guild))
			return Promise.reject(new Error("emptyPlaylist"));
		if (index < 0 || index >= playlists.get(guild.id).size())
			return Promise.reject(new Error("invalidPlaylistIndex"));
		return Promise.resolve(playlists.get(guild.id).remove(index).info());
	}

	// skip a music -------------------------------------------------------------------------
	this.nextMusic = guild => {
		if (!this.isConnected(guild))
			return Promise.reject(new Error("clientNotInAVoiceChannel"));
		if (!this.isPlaying(guild))
			return Promise.reject(new Error("notPlayingMusic"));
		let current = this.playingInfo(guild);
		playlists.get(guild.id).skip();
		return Promise.resolve(current);
	}

	// shuffle a playlist -------------------------------------------------------------------------
	this.shufflePlaylist = guild => {
		if (!this.isConnected(guild))
			return Promise.reject(new Error("clientNotInAVoiceChannel"));
		if (this.isPlaylistEmpty(guild))
			return Promise.reject(new Error("emptyPlaylist"));
		playlists.get(guild.id).shuffle();
		return Promise.resolve();
	}

	// clear a playlist -------------------------------------------------------------------------
	this.clearPlaylist = guild => {
		if (!this.isConnected(guild))
			return Promise.reject(new Error("clientNotInAVoiceChannel"));
		if (this.isPlaylistEmpty(guild))
			return Promise.reject(new Error("emptyPlaylist"));
		playlists.get(guild.id).clear();
		return Promise.resolve();
	}

	// pause/resume -------------------------------------------------------------------------
	this.toggleMusic = guild => {
		if (!this.isConnected(guild))
			return Promise.reject(new Error("clientNotInAVoiceChannel"));
		if (!this.isPlaying(guild))
			return Promise.reject(new Error("notPlayingMusic"));
		return Promise.resolve(playlists.get(guild.id).toggle());
	}

	// pause -------------------------------------------------------------------------
	this.pauseMusic = guild => {
		if (!this.isConnected(guild))
			return Promise.reject(new Error("clientNotInAVoiceChannel"));
		if (!this.isPlaying(guild))
			return Promise.reject(new Error("notPlayingMusic"));
		try {
			playlists.get(guild.id).pause();
		} catch(err) {
			return Promise.reject("musicNotPaused");
		}
		return Promise.resolve();
	}

	// resume -------------------------------------------------------------------------
	this.resumeMusic = guild => {
		if (!this.isConnected(guild))
			return Promise.reject(new Error("clientNotInAVoiceChannel"));
		if (!this.isPlaying(guild))
			return Promise.reject(new Error("notPlayingMusic"));
		try {
			playlists.get(guild.id).resume();
		} catch(err) {
			return Promise.reject("musicAlreadyPaused");
		}
		return Promise.resolve(this.playingInfo(guild));
	}

	// set volume -------------------------------------------------------------------------
	this.setVolume = (guild, volume) => {
		if (!this.isConnected(guild))
			return Promise.reject(new Error("clientNotInAVoiceChannel"));
		if (volume < 0)
			return Promise.reject(new Error("invalidVolume"));
		return Promise.resolve(playlists.get(guild.id).setVolume(volume));
	}

	// toggle looping -------------------------------------------------------------------------
	this.toggleLooping = guild => {
		if (!this.isConnected(guild))
			return Promise.reject(new Error("clientNotInAVoiceChannel"));
		if (!this.isPlaying(guild))
			return Promise.reject(new Error("notPlayingMusic"));
		return Promise.resolve(playlists.get(guild.id).toggleLooping());
	}

	// INFOS PLAYLIST -------------------------------------------------------------------------
	this.isConnected = guild => playlists.has(guild.id);
	this.isPlaying = guild => {
		if (!this.isConnected(guild))
			return false;
		return playlists.get(guild.id).isPlaying();
	}
	this.isPaused = guild => {
		if (!this.isPlaying(guild))
			return false;
		return playlists.get(guild.id).isPaused();
	}
	this.isLooping = guild => {
		if (!this.isPlaying(guild))
			return false;
		return playlists.get(guild.id).isLooping();
	}
	this.playlistInfo = guild => {
		if (!this.isPlaying(guild))
			throw new Error("notPlayingMusic");
		return playlists.get(guild.id).info();
	}
	this.playingInfo = guild => {
		if (!this.isPlaying(guild))
			throw new Error("notPlayingMusic");
		return playlists.get(guild.id).playingInfo();
	}
	this.playlistSize = guild => {
		if (!this.isConnected(guild))
			throw new Error("clientNotInAVoiceChannel");
		return playlists.get(guild.id).size();
	}
	this.isPlaylistEmpty = guild => {
		if (!this.isConnected(guild))
			return false;
		return playlists.get(guild.id).isEmpty();
	}
	this.musicInfo = (guild, index) => {
		if (playlists.get(guild.id).size() == 0)
			throw new Error("emptyPlaylist");
		if (index < 0 || index >= playlists.get(guild.id).size())
			throw new Error("invalidPlaylistIndex");
		return playlists.get(guild.id).musicInfo(index);
	}
	this.remainingTime = guild => {
		if (!this.isConnected(guild))
			throw new Error("clientNotInAVoiceChannel");
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

function Music(link, member, file, passes) {
	if (!file)
		this.website = exports.videoWebsite(link);
	else
		this.title = link.split("/").pop();
	this.link = link;
	this.member = member;
	this.file = file;
	this.passes = passes;
	this.play = () => {
		if (!this.file) {
			if (this.website == "Youtube")
				return exports.playYoutube(this.link, this.member.guild.me.voiceChannel.connection, this.passes);
			else if (this.website == "Dailymotion")
				return this.member.guild.me.voiceChannel.connection.playStream(null);
			else if (this.website == "NicoNicoVideo")
				return this.member.guild.me.voiceChannel.connection.playStream(null);
		} else
			return this.member.guild.me.voiceChannel.connection.playFile(this.link);
	}
	this.info = () => {
		let object;
		if (!this.file)
			object = {
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
			object = {
				name : this.title,
				path : this.link,
				member : this.member,
				file : true
			};
		if (this.props !== undefined)
			object.props = this.props;
		return object;
	}
	this.remainingTime = () => {
		if (this.file)
			return this.length - this.time;
		else
			return
	}
}
