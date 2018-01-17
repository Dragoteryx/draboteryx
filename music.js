module.exports = function(client) {
  if (client === undefined)
    throw new Error("missingParameter: client");
  var playlists = new Map();

  // ACTIONS
  this.join = async member => {
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
		playlists.get(member.guild.id).playlist.on("finished", (guild, music) => {
			this.emit("finished", guild, music);
		});
		let join = await member.voiceChannel.join();
    if (join instanceof Error) return Promise.reject(join);
    return Promise.resolve();
  }
  this.leave = guild => {
    return new Promise((resolve, reject) => {
			if (!this.isConnected(guild))
				reject(new Error("clientNotInAVoiceChannel"));
			guild.me.voiceChannel.leave();
			playlists.delete(guild.id);
			resolve();
		});
  }
  this.addMusic = options => {
    return new Promise(async (resolve, reject) => {try {
      if (!this.isConnected(member.guild))
				reject(new Error("clientNotInAVoiceChannel"));
      if (options === undefined) reject(new Error("missingParameter: options"));
      if (options.type === undefined) options.type = "link";
      if (options.passes === undefined) options.passes = 1;

      // LINKS
      if (options.type == "link") {
        if (options.link === undefined) reject(new Error("missingParameter: options.link"));
        let info = await ytdl.getInfo(link);
        if (info instanceof Error) reject(info);
        let music = new Music(link, member, options.passes);
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
        if (options.props !== undefined)
					music.props = options.props;
				playlists.get(member.guild.id).playlist.add(music);
				resolve(Object.freeze(music.info()));
      }

      // YOUTUBE QUERIES
      else if (options.type == "ytquery") {

      }

      // LOCAL FILES
      else if (options.type == "file") {

      }

      //invalid options.type
      else reject(new Error("invalidParameter: options.type => " + options.type + " is not a valid option ('link', 'ytquery' or 'file')"));
    } catch(err) {
      reject(err)
    }});
  }

  // INFOS
  this.isConnected = guild => {
    return playlists.has(guild.id);
  }
  this.isPlaying = guild => {
    if (!this.isConnected(guild))
      return false;
    return playlists.get(guild.id).isPlaying();
  }
}

function Playlist(guild, client) {
  var loop = client.setInterval(() => {
    console.log("lol");
  }, 1000);
}

function Music(link, member, passes) {
  this.link = link;
  this.member = member;
  this.passes = passes;
  this.info = () => {

  }
}
