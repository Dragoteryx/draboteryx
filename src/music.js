"use strict";

// IMPORTS
const discord = require("discord.js");
const ytdl = require("ytdl-core");
const fs = require("fs");
const mm = require("musicmetadata");
const YoutubeAPI = require("simple-youtube-api");
const EventEmitter = require("events");

// GLOBALS
const messages = Object.freeze({
	notConnected: "the client is not in a voice channel.",
	notPlaying: "the client is not playing.",
	invalidMusicIndex: "invalid music index.",
	musicNotPaused: "the music is not paused.",
	musicAlreadyPaused: "the music is already paused.",
	memberNotInVoiceChannel: "the member is not in a voice channel.",
	guildAlreadyJoined: "the client already joined a voice channel in this guild.",
	voiceChannelNotJoinable: "the client can't join this voice channel",
	voiceChannelNotSpeakable: "the client is not allowed to speak in this voice channel",
	voiceChannelFull: "the voice channel is full.",
	websiteNotSupported: "this website is not supported.",
	emptyPlaylist: "the playlist is empty.",
	invalidVolume: "the volume must be > 0.",
	noQueryResults: "the query returned no results."
});
let apiKey = null;
let youtube = null;
let errYtbApiKey = "you must provide a valid Youtube API Key using '.setYoutubeApiKey' to use this function.";

// UTIL FUNCTIONS
const sleep = (ms = 1000) => new Promise(resolve => setTimeout(resolve, ms));
function missingParam(name, info = "") {
	throw new Error("parameter '" + name + "' is undefined." + (info.length == 0 ? "" : " (" + info + ")"));
}

// FUNCTIONS
function setYoutubeApiKey(newApiKey = "") {
	apiKey = newApiKey;
	youtube = apiKey == "" ? null : new YoutubeAPI(apiKey);
}
function getYoutubeApiKey() {
	return apiKey;
}

function videoWebsite(str = "") {
	if (str.startsWith("https://www.youtube.com/watch?v=") || str.startsWith("https://youtu.be/"))
		return "Youtube";
	/*else if (str.startsWith("https://soundcloud.com/"))
		return "Soundcloud";
	else if (str.startsWith("http://www.dailymotion.com/video/") || str.startsWith("http://dai.ly/"))
		return "Dailymotion";
	else if (str.startsWith("http://www.nicovideo.jp/watch/") || str.startsWith("http://nico.ms/"))
		return "NicoNicoVideo";*/
	else return undefined;
}

function playYoutube(voiceConnection = missingParam("voiceConnection"), link = missingParam("link"), options = {}) {
	return voiceConnection.playStream(ytdl(link, {filter:"audioonly"}), options);
}

async function queryYoutube(query = missingParam("query"), nb = 1) {
	if (youtube === null) throw new Error(errYtbApiKey);
	let res =	await youtube.searchVideos(query, nb);
	let videos = [];
	for (let video of res) {
		video = await video.fetch();
		videos.push({title: video.title, link: video.url, authorName: video.channel.title, length: video.durationSeconds*1000});
	}
	return videos;
}

async function youtubePlaylist(link = missingParam("link")) {
	if (youtube === null) throw new Error(errYtbApiKey);
	let playlist = await youtube.getPlaylist(link);
	let res = await playlist.getVideos();
	let videos = [];
	for (let video of res) {
		videos.push({title: video.title, link: video.url});
	}
	return {title: playlist.title, videos: videos};
}

async function youtubeInfo(link = missingParam("link")) {
	let info = await ytdl.getInfo(link);
	return {
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
	};
}

async function fileInfo(path = missingParam("path")) {
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

const pls = new Map();
function getPlaylist(guild, client) {
	let bool = false;
	if (!pls.has(guild.id)) {
		pls.set(guild.id, new InternalPlaylist(guild, client));
		bool = true;
	}
	return {pl: pls.get(guild.id), first: bool};
}

const privates = new WeakMap();
function prv(object) {
	if (!privates.has(object))
		privates.set(object, {});
	return privates.get(object);
}

//CLASSES
class DrGMusicError extends Error {
	constructor(message) {
		super(message);
		this.name = "DrGMusicError";
	}
}

class MusicHandler extends EventEmitter {

	constructor(client = missingParam("client")) {
		super();
		let that = prv(this);
		that.ready = new Map();
		if (client.musicHandler !== undefined)
			throw new Error("a Discord Client can't be linked to more than one MusicHandler.");
		client.musicHandler = this;
		client.on("voiceStateUpdate", (oldMember, newMember) => {
			if (!this.isConnected(oldMember.guild)) return;
			let musicChannel = oldMember.guild.me.voiceChannel;
			let movements = (voiceChannel1, voiceChannel2) => (voiceChannel1 === undefined || voiceChannel1.id != musicChannel.id) && voiceChannel2 !== undefined && voiceChannel2.id == musicChannel.id;
			if (oldMember.user.id == client.user.id && that.ready.has(oldMember.guild.id))
				this.emit("clientMove", oldMember.voiceChannel, newMember.voiceChannel);
			else if (movements(oldMember.voiceChannel, newMember.voiceChannel))
				this.emit("memberJoin", newMember, newMember.voiceChannel);
			else if (movements(newMember.voiceChannel, oldMember.voiceChannel))
				this.emit("memberLeave", newMember, oldMember.voiceChannel);
		});
		that.playlists = new Map();
		this.client = client;
		Object.defineProperty(this, "client", {writable: false});
	}
	get guilds() {
		let guilds = new discord.Collection();
		let that = prv(this);
		let ids = Array.from(that.playlists.keys());
		for (let id of ids)
			guilds.set(id, that.playlists.get(id).guild);
		return guilds;
	}
	get channels() {
		let guilds = this.guilds;
		let channels = new discord.Collection();
		for (let guild of guilds) {
			let channel = guild[1].me.voiceChannel;
			channels.set(channel.id, channel);
		}
		return channels;
	}
	get playlists() {
		let playlists = new discord.Collection();
		let that = prv(this);
		let ids = Array.from(that.playlists.keys());
		for (let id of ids)
			playlists.set(id, that.playlists.get(id).playlist.simplified);
		return playlists;
	}
	async join(tojoin = missingParam("tojoin", "GuildMember or VoiceChannel")) {
		let that = prv(this);
		let voiceChannel;
		if (tojoin instanceof discord.GuildMember)
			voiceChannel = tojoin.voiceChannel
		else if (!(tojoin instanceof discord.VoiceChannel))
			throw new TypeError("'tojoin' must be an instance of GuildMember or VoiceChannel.");
		else voiceChannel = tojoin;
		if (voiceChannel === undefined) throw new DrGMusicError(messages.memberNotInVoiceChannel);
		if (this.isConnected(voiceChannel.guild)) throw new DrGMusicError(messages.guildAlreadyJoined);
		if (!voiceChannel.joinable) throw new DrGMusicError(messages.voiceChannelNotJoinable);
		if (!voiceChannel.speakable) throw new DrGMusicError(messages.voiceChannelNotSpeakable);
		if (voiceChannel.full) throw new DrGMusicError(messages.voiceChannelFull);
		let playlist = getPlaylist(tojoin.guild, this.client);
		playlist.pl.handler = this;
		playlist.pl.joinedAt = new Date();
		playlist.pl.leaving = false;
		voiceChannel.guild.playlist = playlist.pl.simplified;
		that.playlists.set(voiceChannel.guild.id, {playlist: playlist.pl, guild: voiceChannel.guild});
		if (playlist.first) {
			playlist.pl.on("start", (guild, music) => {
				this.emit("start", playlist.pl.simplified, music);
			});
			playlist.pl.on("next", (guild, music) => {
				this.emit("next", playlist.pl.simplified, music);
			});
			playlist.pl.on("empty", guild => {
				this.emit("empty", playlist.pl.simplified);
			});
			playlist.pl.on("end", (guild, music) => {
				this.emit("end", playlist.pl.simplified, music);
			});
		}
		let joinPromise = voiceChannel.join();
		joinPromise.then(() => {
			that.ready.set(tojoin.guild.id, true);
		});
		return joinPromise;
	}
	async leave(guild = missingParam("guild")) {
		let that = prv(this);
		if (!this.isConnected(guild)) throw new DrGMusicError(messages.notConnected);
		that.playlists.get(guild.id).playlist.leaving = true;
		that.playlists.get(guild.id).playlist.reset();
		that.playlists.delete(guild.id);
		that.ready.delete(guild.id);
		guild.me.voiceChannel.leave();
	}
	async add(request = missingParam("request", "Youtube link, Youtube query or path to file"), member = missingParam("member", "GuildMember who requested the music"), options = {}) {
		let that = prv(this);
    if (!this.isConnected(member.guild)) throw new DrGMusicError(messages.notConnected);
    if (options.type === undefined) options.type = "link";
    if (options.passes === undefined) options.passes = 1;
    if (options.type == "link") {
			let website = videoWebsite(request);
			if (website === undefined) throw new DrGMusicError(messages.websiteNotSupported);
			else if (website == "Youtube") {
				let info = await youtubeInfo(request);
				let music = new Music(request, member, options.passes, false);
        music.title = info.title;
				music.description = info.description;
				music.author = {
					name: info.author.name,
					avatarURL: info.author.avatarURL,
					channelURL: info.author.channelURL
				}
				music.thumbnailURL = info.thumbnailURL;
				music.maxResThumbnailURL = info.maxResThumbnailURL;
				music.length = info.length;
				music.keywords = info.keywords;
        if (options.props !== undefined)
					music.props = options.props;
				that.playlists.get(member.guild.id).playlist.add(music);
				return music.info;
			}
    } else if (options.type == "ytquery") {
			let videos = await queryYoutube(request);
			if (videos.length == 0) throw new Error(messages.noQueryResults);
			options.type = "link";
			return this.add(videos[0].link, member, options);
		} else if (options.type == "file") {
			let info = await fileInfo(request);
			let music = new Music(request, member, options.passes, true);
			music.length = Math.round(info.duration*1000);
			if (options.props !== undefined)
				music.props = options.props;
			that.playlists.get(member.guild.id).playlist.add(music);
		 	return music.info;
    } else throw new DrGMusicError("options.type => '" + options.type + "' is not a valid option ('link', 'ytquery' or 'file')");
	}
	async remove(guild = missingParam("guild"), index = missingParam("index", "index of the music in the playlist")) {
		let that = prv(this);
		if (!this.isConnected(guild)) throw new DrGMusicError(messages.notConnected);
		if (!this.isPlaying(guild)) throw new DrGMusicError(messages.notPlaying);
		if (index < 0) throw new DrGMusicError(messages.invalidMusicIndex);
		if (index >= that.playlists.get(guild.id).playlist.list.length) throw new DrGMusicError(messages.invalidMusicIndex);
		return that.playlists.get(guild.id).playlist.list.splice(index, 1)[0].info;
	}
	async playNext(guild = missingParam("guild")) {
		let that = prv(this);
		if (!this.isConnected(guild)) throw new DrGMusicError(messages.notConnected);
		if (!this.isPlaying(guild)) throw new DrGMusicError(messages.notPlaying);
		let current = this.currentInfo(guild);
		that.playlists.get(guild.id).playlist.looping = false;
		that.playlists.get(guild.id).playlist.paused = false;
		that.playlists.get(guild.id).playlist.dispatcher.end("playnext");
		return current;
	}
	async skip(guild = missingParam("guild")) {
		return this.playNext(guild);
	}
	async clear(guild = missingParam("guild")) {
		let that = prv(this);
		if (!this.isConnected(guild)) throw new DrGMusicError(messages.notConnected);
		if (!this.isPlaying(guild)) throw new DrGMusicError(messages.notPlaying);
		let nb = that.playlists.get(guild.id).playlist.list.length;
		that.playlists.get(guild.id).playlist.list = [];
		return nb;
	}
	async shuffle(guild = missingParam("guild")) {
		let that = prv(this);
		if (!this.isConnected(guild)) throw new DrGMusicError(messages.notConnected);
		if (!this.isPlaying(guild)) throw new DrGMusicError(messages.notPlaying);
		if (that.playlists.get(guild.id).playlist.list.length == 0) throw new DrGMusicError(messages.emptyPlaylist);
		that.playlists.get(guild.id).playlist.list.sort(() => Math.random() - 0.5);
	}
	async resume(guild = missingParam("guild")) {
		let that = prv(this);
		if (!this.isConnected(guild)) throw new DrGMusicError(messages.notConnected);
		if (!this.isPlaying(guild)) throw new DrGMusicError(messages.notPlaying);
		if (!this.isPaused(guild)) throw new DrGMusicError(messages.musicNotPaused);
		that.playlists.get(guild.id).playlist.dispatcher.resume();
		that.playlists.get(guild.id).playlist.paused = false;
		return that.playlists.get(guild.id).playlist.current.info;
	}
	async pause(guild = missingParam("guild")) {
		let that = prv(this);
		if (!this.isConnected(guild)) throw new DrGMusicError(messages.notConnected);
		if (!this.isPlaying(guild)) throw new DrGMusicError(messages.notPlaying);
		if (this.isPaused(guild)) throw new DrGMusicError(messages.musicAlreadyPaused);
		that.playlists.get(guild.id).playlist.dispatcher.pause();
		that.playlists.get(guild.id).playlist.paused = true;
		return that.playlists.get(guild.id).playlist.current.info;
	}
	async togglePaused(guild = missingParam("guild")) {
		let that = prv(this);
		if (!this.isConnected(guild)) throw new DrGMusicError(messages.notConnected);
		if (!this.isPlaying(guild)) throw new DrGMusicError(messages.notPlaying);
		that.playlists.get(guild.id).playlist.paused = !that.playlists.get(guild.id).playlist.paused;
		if (that.playlists.get(guild.id).playlist.paused)
			that.playlists.get(guild.id).playlist.dispatcher.pause();
		else
			that.playlists.get(guild.id).playlist.dispatcher.resume();
		return that.playlists.get(guild.id).playlist.paused;
	}
	async toggleLooping(guild = missingParam("guild")) {
		let that = prv(this);
		if (!this.isConnected(guild)) throw new DrGMusicError(messages.notConnected);
		if (!this.isPlaying(guild)) throw new DrGMusicError(messages.notPlaying);
		let playlist = that.playlists.get(guild.id).playlist;
		playlist.pllooping = false;
		playlist.looping = !playlist.looping;
		return playlist.looping;
	}
	async togglePlaylistLooping(guild = missingParam("guild")) {
		let that = prv(this);
		if (!this.isConnected(guild)) throw new DrGMusicError(messages.notConnected);
		let playlist = that.playlists.get(guild.id).playlist;
		playlist.looping = false;
		playlist.pllooping = !playlist.pllooping;
		return playlist.pllooping;
	}
	async setVolume(guild = missingParam("guild"), volume = missingParam("volume", "> 0")) {
		let that = prv(this);
		if (!this.isConnected(guild)) throw new DrGMusicError(messages.notConnected);
		if (volume < 0) throw new DrGMusicError(messages.invalidVolume);
		let old = this.getVolume(guild);
		that.playlists.get(guild.id).playlist.volume = volume;
		if (this.isPlaying(guild))
			that.playlists.get(guild.id).playlist.dispatcher.setVolume(volume/100.0);
		return old;
	}

	//------------
	isConnected(guild = missingParam("guild")) {
		return prv(this).playlists.has(guild.id);
	}
	isPlaying(guild = missingParam("guild")) {
		let that = prv(this);
		if (!this.isConnected(guild))
			return false;
		return that.playlists.get(guild.id).playlist.playing;
	}
	isPaused(guild = missingParam("guild")) {
		let that = prv(this);
		if (!this.isPlaying(guild))
			return false;
		return that.playlists.get(guild.id).playlist.paused;
	}
	isLooping(guild = missingParam("guild")) {
		let that = prv(this);
		if (!this.isPlaying(guild))
			return false;
		return that.playlists.get(guild.id).playlist.looping;
	}
	isPlaylistLooping(guild = missingParam("guild")) {
		let that = prv(this);
		if (!this.isConnected(guild))
			return false;
		return that.playlists.get(guild.id).playlist.pllooping;
	}
	currentInfo(guild = missingParam("guild")) {
		let that = prv(this);
		if (!this.isConnected(guild)) return undefined;
		if (!this.isPlaying(guild)) return null;
		let info = that.playlists.get(guild.id).playlist.current.info;
		info.time = that.playlists.get(guild.id).playlist.dispatcher.time;
		return info;
	}
	playlistInfo(guild = missingParam("guild")) {
		let that = prv(this);
		if (!this.isConnected(guild)) return undefined;
		let tab = [];
		for (let music of that.playlists.get(guild.id).playlist.list)
			tab.push(music.info);
		return tab;
	}
	getVolume(guild = missingParam("guild")) {
		let that = prv(this);
		if (!this.isConnected(guild)) return undefined;
		return that.playlists.get(guild.id).playlist.volume;
	}
}



class Playlist {
	constructor(playlist) {
		prv(this).playlist = playlist;
		this.guild = prv(this).playlist.guild;
		this.firstJoinedAt = playlist.joinedAt;
		this.firstJoinedTimestamp = this.firstJoinedAt.getTime();
		Object.defineProperty(this, "guild", {writable: false});
		Object.defineProperty(this, "firstJoinedAt", {writable: false});
		Object.defineProperty(this, "firstJoinedTimestamp", {writable: false});
	}
	get channel() {
		return this.guild.me.voiceChannel;
	}
	get lastJoinedAt() {
		return prv(this).playlist.joinedAt;
	}
	get lastJoinedTimestamp() {
		return this.lastJoinedAt.getTime();
	}
	get connected() {
		return prv(this).playlist.handler.isConnected(this.guild);
	}
	get playing() {
		return prv(this).playlist.handler.isPlaying(this.guild);
	}
	get paused() {
		return prv(this).playlist.handler.isPaused(this.guild);
	}
	set paused(paused) {
		if (paused)
			prv(this).playlist.handler.pause(this.guild).catch(console.error);
		else
			prv(this).playlist.handler.resume(this.guild).catch(console.error);
	}
	get looping() {
		return prv(this).playlist.handler.isLooping(this.guild);
	}
	set looping(looping) {
		if (this.playing && typeof looping == "boolean") {
			if (looping)
				prv(this).playlist.pllooping = false;
			prv(this).playlist.looping = looping;
		}
	}
	get playlistLooping() {
		return prv(this).playlist.handler.isPlaylistLooping(this.guild);
	}
	set playlistLooping(pllooping) {
		if (this.connected && typeof pllooping == "boolean") {
			if (pllooping)
				prv(this).playlist.looping = false;
			prv(this).playlist.pllooping = pllooping;
		}
	}
	get current() {
		return prv(this).playlist.handler.currentInfo(this.guild);
	}
	get info() {
		return prv(this).playlist.handler.playlistInfo(this.guild);
	}
	get volume() {
		return prv(this).playlist.handler.getVolume(this.guild);
	}
	set volume(newv) {
		prv(this).playlist.handler.setVolume(this.guild, newv).catch(console.error);
	}
	async join(tojoin) {
		return prv(this).playlist.handler.join(tojoin);
	}
	async leave() {
		return prv(this).playlist.handler.leave(this.guild);
	}
	async add(request, member, options) {
		return prv(this).playlist.handler.add(request, member, options);
	}
	async remove(index) {
		return prv(this).playlist.handler.remove(this.guild, index);
	}
	async playNext() {
		return prv(this).playlist.handler.playNext(this.guild);
	}
	async skip() {
		return this.playNext();
	}
	async clear() {
		return prv(this).playlist.handler.clearPlaylist(this.guild);
	}
	async shuffle() {
		return prv(this).playlist.handler.shufflePlaylist(this.guild);
	}
}

class InternalPlaylist extends EventEmitter {
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
		this.joinedAt = new Date();
		this.simplified = new Playlist(this);
	}
	async add(music) {
		music._playlist = this;
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
				if (!this.leaving) this.emit("start", this.guild, this.current.info);
			});
			this.dispatcher.once("end", async () => {
				await sleep(500);
				if (this.pllooping)
					this.list.push(this.current);
				if (!this.leaving) this.emit("end", this.guild, this.current.info);
				this.playNext();
			});
			if (!this.looping)
				if (!this.leaving) this.emit("next", this.guild, this.current.info);
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
		this.list = [];
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
				return playYoutube(this.member.guild.voiceConnection, this.link, {passes: this.passes, bitrate:"auto"});
			else if (this.website == "Soundcloud")
				return playSoundcloud(this.member.guild.voiceConnection, this.link, this.passes);
		}
		else
			return this.member.guild.voiceConnection.playFile(this.link, {passes: this.passes, bitrate: "auto"});
	}
	get playlist() {
		return this._playlist.simplified;
	}
	get info() {
		if (!this.file) {
			if (this.website == "Youtube") {
				return {
					title: this.title,
					link: this.link,
					description: this.description,
					author: this.author,
					thumbnailURL: this.thumbnailURL,
					maxResThumbnailURL: this.maxResThumbnailURL,
					length: this.length,
					time: 0,
					keywords: this.keywords,
					file: false,
					website: "Youtube",
					member: this.member,
					props: this.props,
					playlist: this.playlist
				}
			}
		} else {
			return {
				title: this.title,
				path: this.link,
				length: this.length,
				time: 0,
				file: true,
				member: this.member,
				props: this.props,
				playlist: this.playlist
			}
		}
	}
}

// MODULES
MusicHandler.videoWebsite = videoWebsite;
MusicHandler.playYoutube = playYoutube;
MusicHandler.youtubeInfo = youtubeInfo;
MusicHandler.queryYoutube = queryYoutube;
MusicHandler.youtubePlaylist = youtubePlaylist;
MusicHandler.setYoutubeApiKey = setYoutubeApiKey;
MusicHandler.getYoutubeApiKey = getYoutubeApiKey;
MusicHandler.errorMessages = messages;
module.exports = MusicHandler;
