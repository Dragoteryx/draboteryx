# drg-music
![Drg Music](https://nodei.co/npm/drg-music.png?downloads=true&stars=true)

A single file module to easily manage Discord music bots using Discord.js

## How to use ?
First, you need to require the module.
```js
const drgMusic = require("drg-music");
```
Then, you must create a new MusicHandler.
```js
const music = new drgMusic.MusicHandler(client);
```
``client`` represents your Discord.js client (your bot).

Then, you'll need to interact with the MusicHandler you just created.
However some functions do not require the use of a MusicHandler.

#### What can it do ?
With this module, you can ask the bot to join and leave a voice channel, to request and play a Youtube video, to pause/resume, to set the volume, etc.
Most commands will require you to specify the guild where you want to execute the action.

Most methods include a callback function as a parameter.
The music handler will emit an event whenever something happens (eg. when the current song is finished or when the playlist is empty), and throw errors when it's trying to do something impossible. (eg. joining someone who isn't in a voice channel)

##### Join a voice channel
```js
music.join(member, callback);
```
``member`` is the guild member that the bot will join.

#### Leave a voice channel
```js
music.leave(guild, callback);
```

#### Add a Youtube video to the playlist using the link
```js
music.addMusic(member, youtubeLink, callback);
```
``member`` represents the guild member that requested the music.
``youtubeLink`` must be a Youtube video link.

The callback lets you interact with the music that was added.

#### Add a Youtube video to the playlist using a query
```js
music.addYoutubeQuery(member, query, youtubeAPIKey, callback);
```
To get a Youtube API key follow this tutorial : https://www.slickremix.com/docs/get-api-key-for-youtube/.

The callback lets you interact with the music that was added. (cf ``music.musicInfo(index)``)

#### Add a local file to the playlist
```js
music.addFile(member, filePath, callback);
```
``member`` represents the guild member that requested the file.
``filePath`` represents the path of the file to play.

The callback lets you interact with the file that was added.

#### Remove a Youtube video/file from the playlist
```js
music.removeMusic(guild, index, callback);
```
``index`` represents the index of the music in the playlist.

The callback lets you interact with the music that got removed.

#### Skip the current music
```js
music.nextMusic(guild, callback);
```
If the playlist is empty, the bot will stop playing music.

The callback lets you interact with the music that was skipped.

#### Shuffle the playlist
```js
music.shufflePlaylist(guild, callback);
```

#### Clear the playlist
```js
music.clearPlaylist(guild, callback);
```

#### Pause/resume the music
```js
music.pauseMusic(guild, callback);
```
The callback lets you interact with the current music.
```js
music.resumeMusic(guild, callback);
```
The callback lets you interact with the current music.
```js
music.toggleMusic(guild, callback);
```
The callback lets you know whether or not the playlist got paused, as well as interact with the current music.

#### Set the volume
```js
music.setVolume(guild, volume, callback);
```
``volume`` must be >= 0. By default, it's set to 100.

The callback lets interact with the old volume.

#### Set a music to loop
```js
music.toggleLooping(guild, callback);
```
Whether or not the current music must repeat itself upon end.

The callback lets you know whether or not the playlist is looping.

### Useful commands
Those commands are used to ask something to the handler.

#### Is the bot connected ?
```js
music.isConnected(guild);
```
Returns a boolean, ``true`` if the bot is connected to a voice channel, ``false`` otherwise.

#### Is the bot playing a music ?
```js
music.isPlaying(guild);
```
Returns a boolean, ``true`` if the bot is playing a music, ``false`` otherwise. Throws an error if the bot is not connected.

#### Is the bot paused ?
```js
music.isPaused(guild);
```
Returns a boolean, ``true`` if the bot is paused, ``false`` otherwise. Throws an error if the bot is not playing.

#### Is the bot looping the current music ?
```js
music.isLooping(guild);
```
Returns a boolean, ``true`` if the bot is looping the current music, ``false`` otherwise. Throws an error if the bot is not playing.

#### What is the playlist ?
```js
music.playlistInfo(guild);
```
Returns an array containing information about every song in the playlist, ordered by queue order. Throws an error if the bot is not playing.

#### What is the size of the playlist ?
```js
music.playlistSize(guild);
```
Returns the number of songs in the playlist. Throws an error if the bot is not playing.

#### Is the playlist empty ?
```js
music.isPlaylistEmpty(guild);
```
Whether or not the playlist is empty. Throws an error if the bot is not playing.

#### How many time remaning before the end of the playlist ?
```js
music.remainingTime(guild);
```
The time remaining before the playlist ends, in milliseconds.

#### Information about a music in the playlist
```js
music.musicInfo(guild, index);
```
Returns information about a music in the playlist. eg.
```js
{
  title: 'Me at the zoo', // the title of the video
  description: 'The first video on YouTube. Maybe it\'s time to go back to the zoo? The name of the music playing in the background is Darude - Sandstorm.', // the description of the video
  author: // the channel that uploaded the video
   { name: 'jawed',
     avatarURL: 'https://yt3.ggpht.com/-5rLAp8qGoEY/AAAAAAAAAAI/AAAAAAAAAAA/LtzVhVaf_do/s88-c-k-no-mo-rj-c0xffffff/photo.jpg',
     channelURL: 'https://www.youtube.com/channel/UC4QobU6STFB0P71PMvOGN5A' },
  thumbnailURL: 'https://i.ytimg.com/vi/jNQXAC9IVRw/default.jpg', // the thumbnail of the video
  length: 19000, // the length of the video (in milliseconds)
  link: 'https://www.youtube.com/watch?v=jNQXAC9IVRw', // the link of the video
  member: SOMEONE // the guild member that requested the video
  file: false, // whether or not this music is a local file
  time: 2500 // the time since this video has been playing (in milliseconds)
}
```
``index`` is the index of the music in the playlist. (cf ``music.playlistInfo(guild)``)
Local file will have most of those properties ``undefined``. (only ``title``, ``link`` and ``member`` are available on a local file)

#### Information about the current music
```js
music.playingInfo(guild);
```
Returns information about the current music.

### Other functions
Those functions do not require the use of a MusicHandler.

#### Convert milliseconds to a timer
```js
let timer = drgMusic.millisecondsToTime(milliseconds);
```
For example:
```js
let milliseconds = 1000;
let timer = drgMusic.millisecondsToTime(milliseconds);
console.log(timer); // 0:01
```

### Events
* When the current music is finished, an event ``finished`` is emitted with the guild and the music.
* When playing the next music, an event ``next`` is emitted with the guild and the next music.
* When the current music is finished and the playlist is empty, an event ``empty`` is emitted with the guild.

### Errors
* memberNotInAVoiceChannel : when the bot is trying to join a member who is not connected in a voice channel
* voiceChannelNotJoinable : when the bot is trying to join a voice channel it can't join
* voiceChannelNotSpeakable : when the bot is trying to join a voice channel in which it's not allowed to speak
* voiceChannelFull : when the bot is trying to join a voice channel which is full
* clientAlreadyInAVoiceChannel : when someone requested the bot to join but it's already connected in a voice channel
* clientNotInAVoiceChannel : when the bot tries to do something requiring being connected while it's not (eg. leaving a voice channel)
* unknownOrNotSupportedVideoWebsite : trying to request a link not from Youtube
* notPlayingMusic : when the bots tries to do something requiring playing while it's not (eg. pausing)
* invalidVolume : volume must be at least 0, no upper limit
* emptyPlaylist : when the bot is trying to do something which requires the playlist not to be empty
* invalidPlaylistIndex : trying to access a bigger index than the playlist's size (eg. trying to delete the 3rd music when there are only 2 songs in the playlist)

## Example
Here is an example of a Discord bot using this module. You can also check my bot DraBOTeryx which is using this plugin here : https://github.com/Dragoteryx/draboteryx
```js
const Discord = require("discord.js");
const drgMusic = require("drg-music");

const client = new Discord.Client();
const music = new drgMusic.MusicHandler(client);
let musicChannels = new Map();

music.on("next", (guild, music2) => {
	musicChannels.get(guild.id).send("Now playing: " + music2.title + " by" + music2.author.name + ". (requested by " + music2.member +")");
});
music.on("empty", guild => {
	musicChannels.get(guild.id).send("The playlist is empty.");
});

client.on("message", message => {

  if (message == "/join") {
    musicChannels.set(msg.guild.id, msg.channel);
    music.join(msg.member, () => {
      msg.channel.send("Hello, I'm here to play you some music :)");
    });
  }

  if (message == "/leave") {
    music.leave(msg.guild, () => {
      msg.channel.send("Goodbye :)");
    });
    musicChannels.delete(msg.guild.id);
  }

  if (message.startsWith("/request ")) {
    music.addMusic(message.member, message.replace("/request ",""), added => {
      msg.channel.send("The music " + added.title + " was added to the playlist.");
    });
  }

  // ETC (other commands)

});

client.login(MYBOTTOKEN);
```
