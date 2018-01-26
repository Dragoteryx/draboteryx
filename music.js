"use strict";

// IMPORTS
const ytdl = require("ytdl-core");
const youtubeSearch = require("youtube-search");
const EventEmitter = require("events");

//EXPORTS
exports.videoWebsite = str => {
	if (str.startsWith("https://www.youtube.com/watch?v=") || str.startsWith("https://youtu.be/"))
		return "Youtube";
	/*else if (str.startsWith("http://www.dailymotion.com/video/") || str.startsWith("http://dai.ly/"))
		return "Dailymotion";
	else if (str.startsWith("http://www.nicovideo.jp/watch/") || str.startsWith("http://nico.ms/"))
		return "NicoNicoVideo";*/
	else throw new Error("unknownOrNotSupportedVideoWebsite");
}

exports.playYoutube = (voiceConnection, link, passes) => {
	return voiceConnection.playStream(ytdl(link, {filter:"audioonly"}), {passes: passes, bitrate:"auto"});
}

exports.youtubeInfo = link => {
	return new Promise((resolve, reject) => {
		ytdl.getInfo(link).then(info => {
			resolve(Object.freeze({
				title: info.title,
				link: link,
				description: info.description,
				author: {
					name: info.author.name,
					avatarURL: info.author.avatar,
					channelURL: info.author.channel_url
				},
				thumbnailURL: info.thumbnail_url.replace("default.jpg", "maxresdefault.jpg"),
				length: Number(info.length_seconds)*1000,
				keywords: info.keywords
			}));
		}, err => {
			reject(err);
		});
	});
}

exports.queryYoutube = (query, apiKey) => {
	return new Promise((resolve, reject) => {
		youtubeSearch(query, {key: apiKey, maxResults: 1, type: "video"}, (err, res) => {
			if (err) reject(err);
			else resolve(res.shift().link);
		});
	});
}

//CLASSES
exports.MusicHandler = function(client) {
	EventEmitter.call(this);
	if (client === undefined)
		throw new Error("MissingParameter: client");
	var playlists = new Map();
	this.getClient = () => client;
	this.joined = () => {
		let guilds = new Map();
		let ids = Array.from(playlists.keys());
		for (let id of ids)
			guilds.set(id, playlists.get(id).guild);
		return guilds;
	}
	this.nbJoined = () => playlists.size;
	this.join = member => {
		if (this.isConnected(member.guild))
			return Promise.reject(new Error("clientAlreadyInAVoiceChannel"));
		if (member.voiceChannel === undefined)
			return Promise.reject(new Error("memberNotInAVoiceChannel"));
		if (!member.voiceChannel.joinable)
			return Promise.reject(new Error("voiceChannelNotJoinable"));
		if (!member.voiceChannel.speakable)
			return Promise.reject(new Error("voiceChannelNotSpeakable"));
		if (member.voiceChannel.full)
			return Promise.reject(new Error("voiceChannelFull"));
		playlists.set(member.guild.id, {playlist: new Playlist(member.guild, client), guild: member.guild});
		playlists.get(member.guild.id).playlist.on("next", (guild, music) => {
			this.emit("next", guild, music);
		});
		playlists.get(member.guild.id).playlist.on("empty", guild => {
			this.emit("empty", guild);
		});
		playlists.get(member.guild.id).playlist.on("end", (guild, music) => {
			this.emit("end", guild, music);
		});
		member.voiceChannel.join();
		return Promise.resolve();
	}
	this.leave = guild => {
		return new Promise((resolve, reject) => {
			if (guild === undefined) reject(new Error("MissingParameter: request"));
			else if (!this.isConnected(guild))
				reject(new Error("clientNotInAVoiceChannel"));
			else {
				playlists.get(guild.id).playlist.kill();
				guild.me.voiceChannel.leave();
				playlists.delete(guild.id);
				resolve();
			}
		});
	}
	this.addMusic = (request, member, options) => {
		return new Promise((resolve, reject) => {
			if (request === undefined) reject(new Error("MissingParameter: request"));
			else if (member === undefined) reject(new Error("MissingParameter: member"));
      else if (!this.isConnected(member.guild))
				reject(new Error("clientNotInAVoiceChannel"));
			else {
		    if (options === undefined) options = {};
		    if (options.type === undefined) options.type = "link";
		    if (options.passes === undefined) options.passes = 1;
		    if (options.type == "link") {
		      exports.youtubeInfo(request).then(info => {
						let music = new Music(request, member, options.passes, false);
		        music.title = info.title;
						music.description = info.description;
						music.author = {
							name: info.author.name,
							avatarURL: info.author.avatarURL,
							channelURL: info.author.channelURL
						}
						music.thumbnailURL = info.thumbnailURL;
						music.length = info.length;
						music.keywords = info.keywords;
		        if (options.props !== undefined)
							music.props = options.props;
						playlists.get(member.guild.id).playlist.addMusic(music);
						resolve(music.info());
					}).catch(reject);
		    } else if (options.type == "ytquery") {
					if (options.apiKey === undefined) reject(new Error("MissingParameter: options.apiKey"));
					else {
						exports.queryYoutube(request, options.apiKey).then(link => {
							options.type = "link";
							resolve(this.addMusic(link, member, options));
						}).catch(reject);
					}
		    } else if (options.type == "file") {
					let music = new Music(request, member, options.passes, true);
					if (options.props !== undefined)
						music.props = options.props;
					playlists.get(member.guild.id).playlist.addMusic(music);
					resolve(music.info());
		    } else reject(new Error("InvalidParameter: options.type => '" + options.type + "' is not a valid option ('link', 'ytquery' or 'file')"));
			}
		});
	}
	this.playNext = guild => {
		return new Promise((resolve, reject) => {
			if (guild === undefined) reject(new Error("MissingParameter: request"));
			else if (!this.isConnected(guild)) reject(new Error("clientNotInAVoiceChannel"));
			else if (!this.isPlaying(guild)) reject(new Error("clientNotPlaying"));
			else {
				let current = playlists.get(guild.id).playlist.current;
				playlists.get(guild.id).playlist.dispatcher.end();
				resolve(current.info());
			}
		});
	}
	this.toggleLooping = guild => {
		return new Promise((resolve, reject) => {
			if (guild === undefined) reject(new Error("MissingParameter: request"));
			else if (!this.isConnected(guild)) reject(new Error("clientNotInAVoiceChannel"));
			else if (!this.isPlaying(guild)) reject(new Error("clientNotPlaying"));
			else {
				let playlist = playlists.get(guild.id).playlist;
				playlist.looping = !playlist.looping;
				resolve(playlist.looping);
			}
		});
	}
	this.isConnected = guild => playlists.has(guild.id);
	this.isPlaying = guild => {
		if (!this.isConnected(guild))
			return false;
		return playlists.get(guild.id).playlist.playing;
	}
	this.currentInfo = guild => {
		return new Promise((resolve, reject) => {
			if (guild === undefined) reject(new Error("MissingParameter: request"));
			else if (!this.isConnected(guild)) reject(new Error("clientNotInAVoiceChannel"));
			else if (!this.isPlaying(guild)) reject(new Error("clientNotPlaying"));
			else resolve(playlists.get(guild.id).playlist.current.info());
		});
	}
}

exports.MusicHandler.prototype = Object.create(EventEmitter.prototype);
exports.MusicHandler.prototype.constructor = exports.MusicHandler;

function Playlist(guild, client) {
	EventEmitter.call(this);
	this.guild = guild;
	this.client = client;
	this.list = [];
	this.toNext = false;
	this.playing = false;
	this.paused = false;
	this.looping = false;
	this.addMusic = music => {
		this.list.push(music);
		if (!this.playing)
			this.toNext = true;
	}
	this.playNext = () => {
		this.toNext = false;
		if (!this.looping)
			this.current = this.list.shift();
		if (this.current !== undefined) {
			this.dispatcher = this.current.play();
			this.playing = true;
			//dispatcher.setVolume(this.volume/100.0);
			this.dispatcher.once("end", () => {
				this.toNext = true;
				this.emit("end", this.guild, this.current.info());
			});
			if (!this.looping)
				this.emit("next", this.guild, this.current.info());
		} else {
			this.reset();
			this.emit("empty", this.guild);
		}
	}
	this.reset = () => {
		if (this.dispatcher !== undefined)
			this.dispatcher.end();
		this.dispatcher = undefined;
		this.playing = false;
		this.current = undefined;
	}
	this.kill = () => {
		this.reset();
		clearInterval(this.loop);
	}
	this.loop = this.client.setInterval(() => {
		if (this.toNext)
			setTimeout(this.playNext, 1000);
		this.toNext = false;
	}, 1000);
}

Playlist.prototype = Object.create(EventEmitter.prototype);
Playlist.prototype.constructor = Playlist;

function Music(link, member, passes, file) {
	this.link = link;
	this.member = member;
	this.passes = passes;
	this.file = file;
	this.play = () => {
		if (!this.file) {
			let website = exports.videoWebsite(this.link);
			if (website == "Youtube")
				return exports.playYoutube(this.member.guild.me.voiceChannel.connection, this.link, this.passes);
		}
		else
			return this.member.guild.me.voiceChannel.connection.playFile(this.link, {passes: this.passes, bitrate:"auto"});
	}
	this.info = () => {
		if (!this.file) {
			return Object.freeze({
				title: this.title,
				link: this.link,
				description:  this.description,
				author: this.author,
				thumbnailURL: this.thumbnailURL,
				length: this.length,
				keywords: this.keywords,
				file: false,
				member: this.member,
				props: this.props
			});
		} else {
			return Object.freeze({
				title: this.title,
				path: this.link,
				file: true,
				member: this.member,
				props: this.props
			});
		}
	}
}
