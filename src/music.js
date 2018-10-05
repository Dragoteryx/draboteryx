const discord = require("discord.js");
const EventEmitter = require("events");

const ytdl = require("ytdl-core");
const YoutubeAPI = require("simple-youtube-api");
const fs = require("fs");
const musicmetadata = require("musicmetadata");

const messages = Object.freeze({
  notConnected: "the client is not connected.",
  notPlaying: "the client is not playing."
});

const privates = new WeakMap();
function prv(object) {
	if (!privates.has(object))
		privates.set(object, {});
	return privates.get(object);
}
class PlaylistError extends Error {
  constructor(playlist, ...args) {
    super(args);
    this.name = "PlaylistError";
    this.playlist = playlist;
  }
}
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

Object.defineProperty(discord.Guild.prototype, "playlist", {
  get: function() {
    if (!this._playlist) {
      this._playlist = new Playlist(this)
      Object.defineProperty(this, "_playlist", {
        writable: false,
        enumerable: false
      });
    }
    return this._playlist;
  }
});

class Playlist extends EventEmitter {
  constructor(guild) {
    super();
    let that = prv(this);
    this.current = null;
    this.pending = new PlaylistArray(this);
    that.playing = false;
    that.dispatcher = null;
    that.looping = false;
    that.pllooping = false;
    that.volume = 1;
    this.maxVolume = Infinity;
    this.guild = guild;
    this.client = guild.client;
    Object.defineProperty(this, "pending", {
      configurable: false,
      writable: false
    });
    Object.defineProperty(this, "guild", {
      configurable: false,
      writable: false
    });
    Object.defineProperty(this, "client", {
      configurable: false,
      writable: false
    });
  }

  join(voiceChannel) {
    return voiceChannel.join();
  }
  leave() {
    if (!this.connected)
      throw new PlaylistError(this, messages.notConnected);
    let that = prv(this);
    let channel = this.guild.me.voiceChannel;
    this.stopping = true;
    channel.leave();
    this.current = undefined;
    this.pending.clear();
    that.playing = false;
    that.dispatcher = null;
    that.looping = false;
    that.pllooping = false;
    that.volume = 1;
    return channel;
  }

  next() {
    let that = prv(this);
    if (!this.connected)
      throw new PlaylistError(this, messages.notConnected);
    else if (!this.dispatching) {
      this.current = this.looping ? this.current : this.pending.shift();
      if (this.current) {
        that.playing = true;
        that.dispatcher = this.current.play(this.guild.me.voiceChannel.connection);
        that.dispatcher.setVolume(that.volume);
        that.dispatcher.on("start", () => {
          this.emit("start", this.current);
          this.client.emit("playlistStart", this, this.current);
        });
        that.dispatcher.on("end", async () => {
          if (!this.stopping) {
            await sleep(500);
            this.emit("end", this.current);
            this.client.emit("playlistEnd", this, this.current);
            if (that.pllooping)
              this.pending.push(this.current);
            this.next();
          } else delete this.stopping;
        });
        if (!this.looping) {
          this.emit("next", this.current);
          this.client.emit("playlistNext", this, this.current);
        }
      } else {
        that.playing = false;
        this.emit("empty");
        this.client.emit("playlistEmpty", this);
        this.current = undefined;
        this.pending.clear();
        that.playing = false;
        that.dispatcher = null;
        that.looping = false;
        that.pllooping = false;
      }
    } else {
      this.looping = false;
      that.dispatcher.end("skip")
    }
  }

  get looping() {
    if (!this.playing) return undefined;
    return prv(this).looping;
  }
  set looping(bool) {
    if (!this.connected)
      throw new PlaylistError(this, messages.notConnected);
    if (!this.playing)
      throw new PlaylistError(this, messages.notPlaying);
    let that = prv(this);
    that.pllooping = bool ? false : that.pllooping;
    that.looping = bool ? true : false;
  }

  get playlistLooping() {
    if (!this.playing) return undefined;
    return prv(this).pllooping;
  }
  set playlistLooping(bool) {
    if (!this.connected)
      throw new PlaylistError(this, messages.notConnected);
    if (!this.playing)
      throw new PlaylistError(this, messages.notPlaying);
    let that = prv(this);
    that.looping = bool ? false : that.looping;
    that.pllooping = bool ? true : false;
  }

  get volume() {
    if (!this.connected) return undefined;
    return prv(this).volume;
  }
  set volume(volume) {
    if (!this.connected)
      throw new PlaylistError(this, messages.notConnected);
    let that = prv(this);
    volume = Number(volume);
    if (isNaN(volume)) volume = that.volume;
    if (volume < 0) volume = 0;
    if (volume > this.maxVolume) volume = this.maxVolume;
    that.volume = volume;
    if (this.dispatching)
      that.dispatcher.setVolume(volume);
  }

  get paused() {
    if (!this.dispatching) return undefined;
    return prv(this).dispatcher.paused;
  }
  set paused(bool) {
    if (!this.connected)
      throw new PlaylistError(this, messages.notConnected);
    if (!this.playing)
      throw new PlaylistError(this, messages.notPlaying);
    let that = prv(this);
    if (this.dispatching) {
      if (bool) that.dispatcher.pause();
      else that.dispatcher.resume();
    }
  }

  get id() {
    return this.guild.id;
  }
  get connected() {
    return this.guild.me.voiceChannelID ? true : false;
  }
  get playing() {
    if (!this.connected) return undefined;
    return prv(this).playing;
  }
  get dispatching() {
    let that = prv(this);
    return !!that.dispatcher && !that.dispatcher.destroyed;
  }
  get channel() {
    return this.guild.me.voiceChannel;
  }
  get time() {
    if (!this.dispatching) return undefined;
    return prv(this).dispatcher.time;
  }
}

class PlaylistArray extends Array {
  constructor(playlist) {
    super();
    this.playlist = playlist;
    Object.defineProperty(this, "playlist", {
      configurable: false,
      writable: false
    });
  }
  push(...music) {
    super.push(...music);
    if (!this.playlist.playing && this.length != 0)
      this.playlist.next();
  }
  clear() {
    let length = this.length;
    this.length = 0;
    return length;
  }
  shuffle() {
    this.sort(() => Math.random() > 0.5);
  }
}

class YoutubeVideo {
  constructor(object) {
    Object.assign(this, object);
  }
  play(voiceConnection) {
    return voiceConnection.playStream(ytdl(this.link, {filter:"audioonly"}), this.options);
  }
}

class MusicFile {
  constructor(object) {
    Object.assign(this, object);
  }
  play(voiceConnection) {
    return voiceConnection.playFile(this.path, this.options);
  }
}

module.exports = {
  youtube: {
    fetchVideo: async link => {
      let info = await ytdl.getInfo(link);
    	return new YoutubeVideo({
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
    	});
    },
    query: async (query, apiKey, nb = 5) => {
    	let youtube = new YoutubeAPI(apiKey);
    	let res =	await youtube.searchVideos(query, nb);
    	let videos = [];
    	for (let video of res) {
    		video = await video.fetch();
    		videos.push({title: video.title, link: video.url, authorName: video.channel.title, length: video.durationSeconds*1000});
    	}
    	return videos;
    },
    fetchPlaylist: async (link, apiKey) => {
    	let youtube = new YoutubeAPI(apiKey);
    	let playlist = await youtube.getPlaylist(link);
    	let res = await playlist.getVideos();
    	let videos = [];
    	for (let video of res)
    		videos.push({title: video.title, link: video.url});
    	return {title: playlist.title, videos: videos};
    }
  },
  misc: {
    fetchFile: path => {
      return new Promise((resolve, reject) => {
    		let readableStream = fs.createReadStream(path);
    		let parser = musicmetadata(readableStream, {duration: true, fileSize: fs.statSync(path).size}, async (err, metadata) => {
          readableStream.close();
    		  if (err) reject(err);
    			else resolve(new MusicFile({
            path: path,
            name: path.split("/").pop(),
            length: music.length = Math.round(metadata.duration*1000),
            metadata: metadata
          }));
    		});
    	});
    }
  }
}
