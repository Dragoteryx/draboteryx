"use strict";

// IMPORTS
const discord = require("discord.js");
const ytdl = require("ytdl-core");
const fs = require("fs");
const mm = require("musicmetadata");
const youtubeSearch = require("youtube-search");
const EventEmitter = require("events");
//const sc = require("node-soundcloud");

// GLOBALS

// FUNCTIONS
function sleep(ms) {
	return new Promise(resolve => setTimeout(resolve, ms));
}

function videoWebsite(str) {
	if (str.startsWith("https://www.youtube.com/watch?v=") || str.startsWith("https://youtu.be/"))
		return "Youtube";
	/*else if (str.startsWith("https://soundcloud.com/") && scInit)
		return "Soundcloud";
	else if (str.startsWith("http://www.dailymotion.com/video/") || str.startsWith("http://dai.ly/"))
		return "Dailymotion";
	else if (str.startsWith("http://www.nicovideo.jp/watch/") || str.startsWith("http://nico.ms/"))
		return "NicoNicoVideo";*/
	else throw new MusicError("unknownOrNotSupportedVideoWebsite");
}

function playYoutube(voiceConnection, link, passes) {
	return voiceConnection.playStream(ytdl(link, {filter:"audioonly"}), {passes: passes, bitrate:"auto"});
}

function queryYoutube(query, apiKey) {
	return new Promise((resolve, reject) => {
		youtubeSearch(query, {key: apiKey, maxResults: 1, type: "video"}, (err, res) => {
			if (err) reject(err);
			else if (res[0] !== undefined)
				resolve(res.shift().link);
			else
				reject(new Error("noResults"));
		});
	});
}

function youtubeInfo(link) {
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
				thumbnailURL: info.thumbnail_url,
				maxResThumbnailURL: info.thumbnail_url.replace("default.jpg", "maxresdefault.jpg"),
				length: Number(info.length_seconds)*1000,
				keywords: info.keywords
			}));
		}).catch(err => {
			reject(err);
		});
	});
}

function fileInfo(path) {
	return new Promise((resolve, reject) => {
		let readableStream = fs.createReadStream(path);
		let parser = mm(readableStream, {duration: true, fileSize: fs.statSync(path).size}, (err, metadata) => {
		  if (err) reject(err);
			else {
				readableStream.close();
				resolve(metadata);
			}
		});

	});
}

const weakmapPrivates = new WeakMap();
function prv(object) {
	if (!weakmapPrivates.has(object))
		weakmapPrivates.set(object, {});
	return weakmapPrivates.get(object);
}

//CLASSES
class MusicError extends Error {
	constructor(message) {
		super(message);
	}
}

class MusicHandler extends EventEmitter {
	constructor(client) {
		super();
		if (client === undefined)
			throw new Error("parameter 'client' is missing");
		if (!(client instanceof discord.Client))
			throw new Error("parameter 'client' must be a Client");
		client.on("voiceStateUpdate", (oldMember, newMember) => {
			let musicChannel = newMember.guild.me.voiceChannel;
			if (musicChannel === undefined) return;
			try {
				if (oldMember.voiceChannel === undefined && newMember.voiceChannel.id == musicChannel.id)
					this.emit("memberJoin", newMember, musicChannel);
			} catch(err) {null}
			try {
				if (oldMember.voiceChannel.id != musicChannel.id && newMember.voiceChannel.id == musicChannel.id)
					this.emit("memberJoin", newMember, musicChannel);
			} catch(err) {null}
			try {
				if (oldMember.voiceChannel.id == musicChannel.id && newMember.voiceChannel === undefined)
					this.emit("memberLeave", newMember, musicChannel);
			} catch(err) {null}
			try {
				if (oldMember.voiceChannel.id == musicChannel.id && newMember.voiceChannel.id != musicChannel.id)
					this.emit("memberLeave", newMember, musicChannel);
			} catch(err) {null}
		});
		let that = prv(this);
		that.client = client;
		that.playlists = new Map();
	}
	get client() {
		return prv(this).client;
	}
	get guilds() {
		let guilds = new discord.Collection();
		let that = prv(this);
		let ids = Array.from(that.playlists.keys());
		for (let id of ids)
			guilds.set(id, that.playlists.get(id).guild);
		return guilds;
	}
	join(member) {
		let that = prv(this);
		if (member === undefined) return Promise.reject(new Error("parameter 'member' is missing"));
		if (!(member instanceof discord.GuildMember)) return Promise.reject(new TypeError("parameter 'member' must be a GuildMember"));
		if (this.isConnected(member.guild))
			return Promise.reject(new MusicError("clientAlreadyInAVoiceChannel"));
		if (member.voiceChannel === undefined)
			return Promise.reject(new MusicError("memberNotInAVoiceChannel"));
		if (!member.voiceChannel.joinable)
			return Promise.reject(new MusicError("voiceChannelNotJoinable"));
		if (!member.voiceChannel.speakable)
			return Promise.reject(new MusicError("voiceChannelNotSpeakable"));
		if (member.voiceChannel.full)
			return Promise.reject(new MusicError("voiceChannelFull"));
		that.playlists.set(member.guild.id, {playlist: new Playlist(member.guild, that.client), guild: member.guild});
		that.playlists.get(member.guild.id).playlist.on("start", (guild, music) => {
			this.emit("start", guild, music);
			this.emit("start" + guild.id);
		});
		that.playlists.get(member.guild.id).playlist.on("next", (guild, music) => {
			this.emit("next", guild, music);
		});
		that.playlists.get(member.guild.id).playlist.on("empty", guild => {
			this.emit("empty", guild);
		});
		that.playlists.get(member.guild.id).playlist.on("end", (guild, music) => {
			this.emit("end", guild, music);
		});
		return member.voiceChannel.join();
	}
	leave(guild) {
		let that = prv(this);
		return new Promise((resolve, reject) => {
			if (guild === undefined) reject(new Error("parameter 'guild' is missing"));
			else if (!(guild instanceof discord.Guild)) reject(new TypeError("parameter 'guild' must be a Guild"));
			else if (!this.isConnected(guild)) reject(new MusicError("clientNotInAVoiceChannel"));
			else {
				that.playlists.get(guild.id).playlist.leaving = true;
				that.playlists.get(guild.id).playlist.reset();
				that.playlists.delete(guild.id);
				guild.me.voiceChannel.leave();
				resolve();
			}
		});
	}
	addMusic(request, member, options) {
		let that = prv(this);
		return new Promise((resolve, reject) => {
			if (request === undefined) reject(new Error("parameter 'request' is missing"));
			else if (typeof request != "string") reject(new TypeError("parameter 'request' must be a String"));
			else if (member === undefined) reject(new Error("parameter 'member' is missing"));
			else if (!(member instanceof discord.GuildMember)) reject(new TypeError("parameter 'member' must be a GuildMember"));
      else if (!this.isConnected(member.guild))
				reject(new MusicError("clientNotInAVoiceChannel"));
			else {
		    if (options === undefined) options = {};
		    if (options.type === undefined) options.type = "link";
		    if (options.passes === undefined) options.passes = 1;
		    if (options.type == "link") {
					try {
						let website = videoWebsite(request);
						if (website == "Youtube") {
							youtubeInfo(request).then(info => {
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
								that.playlists.get(member.guild.id).playlist.addMusic(music);
								resolve(music.info());
							}).catch(err => {
								if (err.message.includes("TypeError: Video id (") && err.message.includes(") does not match expected format (/^[a-zA-Z0-9-_]{11}$/)"))
									reject(new MusicError("invalidYoutubeLink"));
								else if (err.message == "This video is unavailable.")
									reject(new MusicError("unavailableYoutubeVideo"));
								else
									reject(err)
							});
						}
					} catch(err) {
						reject(err);
					}
		    } else if (options.type == "ytquery") {
					if (options.apiKey === undefined) reject(new Error("parameter 'options.apiKey' is missing"));
					else if (typeof request != "string") reject(new TypeError("parameter 'options.apiKey' must be a String"));
					else {
						queryYoutube(request, options.apiKey).then(link => {
							options.type = "link";
							resolve(this.addMusic(link, member, options));
						}).catch(reject);
					}
		    } else if (options.type == "file") {
					fileInfo(request).then(info => {
						let music = new Music(request, member, options.passes, true);
						music.length = Math.round(info.duration*1000);
						if (options.props !== undefined)
							music.props = options.props;
						that.playlists.get(member.guild.id).playlist.addMusic(music);
						resolve(music.info());
					}).catch(reject);
		    } else reject(new MusicError("options.type => '" + options.type + "' is not a valid option ('link', 'ytquery' or 'file')"));
			}
		});
	}
	removeMusic(guild, id) {
		let that = prv(this);
		return new Promise((resolve, reject) => {
			if (guild === undefined) reject(new Error("parameter 'guild' is missing"));
			else if (!(guild instanceof discord.Guild)) reject(new TypeError("parameter 'guild' must be a Guild"));
			else if (guild === undefined) reject(new Error("parameter 'id' is missing"));
			else if (!this.isConnected(guild)) reject(new MusicError("clientNotInAVoiceChannel"));
			else if (!this.isPlaying(guild)) reject(new MusicError("clientNotPlaying"));
			else if (id < 0) reject(new MusicError("invalidMusicIndex"));
			else if (id >= that.playlists.get(guild.id).playlist.list.length) reject(new MusicError("invalidMusicIndex"));
			else resolve(that.playlists.get(guild.id).playlist.list.splice(id, 1)[0].info());
		});
	}
	playNext(guild) {
		let that = prv(this);
		return new Promise((resolve, reject) => {
			if (guild === undefined) reject(new Error("parameter 'guild' is missing"));
			else if (!(guild instanceof discord.Guild)) reject(new TypeError("parameter 'guild' must be a Guild"));
			else if (!this.isConnected(guild)) reject(new MusicError("clientNotInAVoiceChannel"));
			else if (!this.isPlaying(guild)) reject(new MusicError("clientNotPlaying"));
			else {
				this.currentInfo(guild).then(current => {
					that.playlists.get(guild.id).playlist.looping = false;
					that.playlists.get(guild.id).playlist.paused = false;
					that.playlists.get(guild.id).playlist.dispatcher.end("playnext");
					resolve(that.playlists.get(guild.id).playlist.current.info());
				});
			}
		});
	}
	toggleLooping(guild) {
		let that = prv(this);
		return new Promise((resolve, reject) => {
			if (guild === undefined) reject(new Error("parameter 'guild' is missing"));
			else if (!(guild instanceof discord.Guild)) reject(new TypeError("parameter 'guild' must be a Guild"));
			else if (!this.isConnected(guild)) reject(new MusicError("clientNotInAVoiceChannel"));
			else if (!this.isPlaying(guild)) reject(new MusicError("clientNotPlaying"));
			else {
				let playlist = that.playlists.get(guild.id).playlist;
				playlist.pllooping = false;
				playlist.looping = !playlist.looping;
				resolve(playlist.looping);
			}
		});
	}
	togglePlaylistLooping(guild) {
		let that = prv(this);
		return new Promise((resolve, reject) => {
			if (guild === undefined) reject(new Error("parameter 'guild' is missing"));
			else if (!(guild instanceof discord.Guild)) reject(new TypeError("parameter 'guild' must be a Guild"));
			else if (!this.isConnected(guild)) reject(new MusicError("clientNotInAVoiceChannel"));
			else {
				let playlist = that.playlists.get(guild.id).playlist;
				playlist.looping = false;
				playlist.pllooping = !playlist.pllooping;
				resolve(playlist.pllooping);
			}
		});
	}
	clearPlaylist(guild) {
		let that = prv(this);
		return new Promise((resolve, reject) => {
			if (guild === undefined) reject(new Error("parameter 'guild' is missing"));
			else if (!(guild instanceof discord.Guild)) reject(new TypeError("parameter 'guild' must be a Guild"));
			else if (!this.isConnected(guild)) reject(new MusicError("clientNotInAVoiceChannel"));
			else if (!this.isPlaying(guild)) reject(new MusicError("clientNotPlaying"));
			else {
				let nb = that.playlists.get(guild.id).playlist.list.length;
				that.playlists.get(guild.id).playlist.list = [];
				resolve(nb);
			}
		});
	}
	shufflePlaylist(guild) {
		let that = prv(this);
		return new Promise((resolve, reject) => {
			if (guild === undefined) reject(new Error("parameter 'guild' is missing"));
			else if (!(guild instanceof discord.Guild)) reject(new TypeError("parameter 'guild' must be a Guild"));
			else if (!this.isConnected(guild)) reject(new MusicError("clientNotInAVoiceChannel"));
			else if (!this.isPlaying(guild)) reject(new MusicError("clientNotPlaying"));
			else if (that.playlists.get(guild.id).playlist.list.length == 0) reject(new MusicError("emptyPlaylist"));
			else {
				that.playlists.get(guild.id).playlist.list.sort(() => Math.random() - 0.5);
				resolve();
			}
		});
	}
	resume(guild) {
		let that = prv(this);
		return new Promise((resolve, reject) => {
			if (guild === undefined) reject(new Error("parameter 'guild' is missing"));
			else if (!(guild instanceof discord.Guild)) reject(new TypeError("parameter 'guild' must be a Guild"));
			else if (!this.isConnected(guild)) reject(new MusicError("clientNotInAVoiceChannel"));
			else if (!this.isPlaying(guild)) reject(new MusicError("clientNotPlaying"));
			else if (!this.isPaused(guild)) reject(new MusicError("musicNotPaused"));
			else {
				that.playlists.get(guild.id).playlist.dispatcher.resume();
				that.playlists.get(guild.id).playlist.paused = false;
				resolve(that.playlists.get(guild.id).playlist.current.info());
			}
		});
	}
	pause(guild) {
		let that = prv(this);
		return new Promise((resolve, reject) => {
			if (guild === undefined) reject(new Error("parameter 'guild' is missing"));
			else if (!(guild instanceof discord.Guild)) reject(new TypeError("parameter 'guild' must be a Guild"));
			else if (!this.isConnected(guild)) reject(new MusicError("clientNotInAVoiceChannel"));
			else if (!this.isPlaying(guild)) reject(new MusicError("clientNotPlaying"));
			else if (this.isPaused(guild)) reject(new MusicError("musicAlreadyPaused"));
			else {
				that.playlists.get(guild.id).playlist.dispatcher.pause();
				that.playlists.get(guild.id).playlist.paused = true;
				resolve(that.playlists.get(guild.id).playlist.current.info());
			}
		});
	}
	toggle(guild) {
		let that = prv(this);
		return new Promise((resolve, reject) => {
			if (guild === undefined) reject(new Error("parameter 'guild' is missing"));
			else if (!(guild instanceof discord.Guild)) reject(new TypeError("parameter 'guild' must be a Guild"));
			else if (!this.isConnected(guild)) reject(new MusicError("clientNotInAVoiceChannel"));
			else if (!this.isPlaying(guild)) reject(new MusicError("clientNotPlaying"));
			else {
				that.playlists.get(guild.id).playlist.paused = !that.playlists.get(guild.id).playlist.paused;
				if (that.playlists.get(guild.id).playlist.paused)
					that.playlists.get(guild.id).playlist.dispatcher.pause();
				else
					that.playlists.get(guild.id).playlist.dispatcher.resume();
				resolve(that.playlists.get(guild.id).playlist.paused);
			}
		});
	}
	setVolume(guild, volume) {
		let that = prv(this);
		return new Promise((resolve, reject) => {
			if (guild === undefined) reject(new Error("parameter 'guild' is missing"));
			else if (!(guild instanceof discord.Guild)) reject(new TypeError("parameter 'guild' must be a Guild"));
			else if (guild === undefined) reject(new Error("parameter 'volume' is missing"));
			else if (!this.isConnected(guild)) reject(new MusicError("clientNotInAVoiceChannel"));
			else if (volume < 0) reject(new MusicError("invalidVolume"));
			else {
				let old = this.getVolume(guild);
				that.playlists.get(guild.id).playlist.volume = volume;
				if (this.isPlaying(guild))
					that.playlists.get(guild.id).playlist.dispatcher.setVolume(volume/100.0);
				resolve(old);
			}
		});
	}
	isConnected(guild) {
		return prv(this).playlists.has(guild.id);
	}
	isPlaying(guild) {
		let that = prv(this);
		if (guild === undefined) throw new Error("parameter 'guild' is missing");
		if (!(guild instanceof discord.Guild)) throw new TypeError("parameter 'guild' must be a Guild");
		if (!this.isConnected(guild))
			return false;
		return that.playlists.get(guild.id).playlist.playing;
	}
	isPaused(guild) {
		let that = prv(this);
		if (guild === undefined) throw new Error("parameter 'guild' is missing");
		if (!(guild instanceof discord.Guild)) throw new TypeError("parameter 'guild' must be a Guild");
		if (!this.isPlaying(guild))
			return false;
		return that.playlists.get(guild.id).playlist.paused;
	}
	currentInfo(guild) {
		let that = prv(this);
		return new Promise((resolve, reject) => {
			if (guild === undefined) reject(new Error("parameter 'guild' is missing"));
			else if (!(guild instanceof discord.Guild)) reject(new TypeError("parameter 'guild' must be a Guild"));
			else if (!this.isConnected(guild)) reject(new MusicError("clientNotInAVoiceChannel"));
			else if (!this.isPlaying(guild)) reject(new MusicError("clientNotPlaying"));
			else {
				let info = Object.assign({}, that.playlists.get(guild.id).playlist.current.info());
				info.time = that.playlists.get(guild.id).playlist.dispatcher.time;
				resolve(Object.freeze(info));
			}
		});
	}
	playlistInfo(guild) {
		let that = prv(this);
		return new Promise((resolve, reject) => {
			if (guild === undefined) reject(new Error("parameter 'guild' is missing"));
			else if (!(guild instanceof discord.Guild)) reject(new TypeError("parameter 'guild' must be a Guild"));
			else if (!this.isConnected(guild)) reject(new MusicError("clientNotInAVoiceChannel"));
			else if (!this.isPlaying(guild)) reject(new MusicError("clientNotPlaying"));
			else {
				let tab = [];
				for (let music of that.playlists.get(guild.id).playlist.list)
					tab.push(music.info());
				resolve(tab);
			}
		});
	}
	getVolume(guild) {
		let that = prv(this);
		if (guild === undefined) throw new Error("parameter 'guild' is missing");
		if (!(guild instanceof discord.Guild)) throw new TypeError("parameter 'guild' must be a Guild");
		if (!this.isConnected(guild)) return undefined;
		return that.playlists.get(guild.id).playlist.volume;
	}
}

class Playlist extends EventEmitter {
	constructor(guild, client) {
		super();
		this.guild = guild;
		this.client = client;
		this.list = [];
		this.playing = false;
		this.paused = false;
		this.looping = false;
		this.pllooping = false;
		this.volume = 100;
		this.leaving = false;
	}
	async addMusic(music) {
		this.list.push(music);
		await sleep(500);
		if (!this.playing)
			this.playNext();
	}
	playNext() {
		if (!this.looping)
			this.current = this.list.shift();
		if (this.current !== undefined) {
			this.dispatcher = this.current.play();
			this.playing = true;
			this.dispatcher.setVolume(this.volume/100.0);
			this.dispatcher.once("start", () => {
				if (!this.leaving) this.emit("start", this.guild, this.current.info());
			});
			this.dispatcher.once("end", async () => {
				await sleep(500);
				if (this.pllooping)
					this.list.push(this.current);
				if (!this.leaving) this.emit("end", this.guild, this.current.info());
				this.playNext();
			});
			if (!this.looping)
				if (!this.leaving) this.emit("next", this.guild, this.current.info());
		} else {
			this.reset();
			if (!this.leaving) this.emit("empty", this.guild);
		}
	}
	reset() {
		if (this.dispatcher !== undefined)
			this.dispatcher.end("killing playlist");
		this.dispatcher = undefined;
		this.playing = false;
		this.paused = false;
		this.current = undefined;
		this.looping = false;
		this.pllooping = false;
	}
}

class Music {
	constructor(link, member, passes, file) {
		this.link = link;
		if (file) {
			this.title = this.link.split("/").pop();
			this.length = 0;
		} else this.website = videoWebsite(this.link);
		this.member = member;
		this.passes = passes;
		this.file = file;
	}
	play() {
		if (!this.file) {
			if (this.website == "Youtube")
				return playYoutube(this.member.guild.voiceConnection, this.link, this.passes);
			else if (this.website == "Soundcloud")
				return playSoundcloud(this.member.guild.voiceConnection, this.link, this.passes);
		}
		else
			return this.member.guild.voiceConnection.playFile(this.link, {passes: this.passes, bitrate:"auto"});
	}
	info() {
		if (!this.file) {
			if (this.website == "Youtube") {
				return Object.freeze({
					title: this.title,
					link: this.link,
					description: this.description,
					author: Object.freeze(this.author),
					thumbnailURL: this.thumbnailURL,
					maxResThumbnailURL: this.thumbnailURL.replace("default.jpg", "maxresdefault.jpg"),
					length: this.length,
					time: 0,
					keywords: Object.freeze(this.keywords),
					file: false,
					website: "Youtube",
					member: this.member,
					props: Object.freeze(this.props)
				});
			}
		} else {
			return Object.freeze({
				title: this.title,
				path: this.link,
				length: this.length,
				time: 0,
				file: true,
				member: this.member,
				props: this.props
			});
		}
	}
}

// MODULES
MusicHandler.videoWebsite = videoWebsite;
MusicHandler.playYoutube = playYoutube;
MusicHandler.youtubeInfo = youtubeInfo;
MusicHandler.queryYoutube = queryYoutube;

module.exports = MusicHandler;
