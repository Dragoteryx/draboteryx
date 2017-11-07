# drg-music
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

#### What can it do ?
With this module, you can ask the bot to join and leave a voice channel, to request and play a Youtube video, to pause/resume, to set the volume, etc.
Most commands will require you to specify the guild where you want to execute the action.

The music handler will emit an event whenever something happens (eg. when the current song is finished or when the playlist is empty), and throw errors when it's trying to do something impossible. (eg. joining someone who isn't in a voice channel)

##### Join a voice channel
```js
music.join(member);
```
``member`` is the guild member that the bot will join.

Emits an event ``joined``, with the guild that the bot joined.

#### Leave a voice channel
```js
music.leave(guild);
```
Emits an event ``leaved``, with the guild that the bot leaved.

#### Add a Youtube video to the playlist
```js
music.addVideo(member, youtubeLink);
```
``member`` represents the guild member that requested the music.
``youtubeLink`` must be a Youtube video link.

Emits an event ``added``, with the guild where the music was added along with information about the music. (cf ``music.musicInfo(index)``)

#### Add a local file to the playlist
```js
music.addFile(member, filePath);
```
``member`` represents the guild member that requested the file.
``filePath`` represents the path of the file to play.

Emits an event ``added``, with the guild where the file was added along with information about the file.

#### Remove a Youtube video/file from the playlist
```js
music.removeMusic(guild, index);
```
``index`` represents the index of the music in the playlist. (cf ``music.playlistInfo()``)

Emits an event ``removed``, with the guild from where the music was removed along with information about the music.

#### Skip the current music
```js
music.nextMusic(guild);
```
If the playlist is empty, the bot will stop playing music.

Emits an event ``skipped``, with the guild where the current music was skipped along with information about the next music.

#### Shuffle the playlist
```js
music.shufflePlaylist(guild);
```
Emits an event ``shuffled``, with the guild where the playlist was shuffled.

#### Clear the playlist
```js
music.clearPlaylist(guild);
```
Emits an event ``cleared``, with the guild where the playlist was cleared.

#### Pause/resume the music
```js
music.pauseMusic(guild);
```
Emits an event ``paused``, with the guild where the music was paused.
```js
music.resumeMusic(guild);
```
Emits an event ``resumed``, with the guild where the music was resumed.
```js
music.toggleMusic(guild);
```
Alternates between resume and pause, either emits ``paused`` or ``resumed`` with the guild.

#### Set the volume
```js
music.setVolume(guild, volume);
```
``volume`` must be >= 0. By default, it's set to 100.

Emits an event ``volumechange`` along with the guild where the volume was changed, the new volume and the old one.

#### Set a music to loop
```js
music.toggleLooping(guild);
```
Whether or not the current music must repeat itself upon end.

Emits an event ``looping``, along with the guild where it was toggled, the current music and whether or not looping is toggled.

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
	musicChannels.get(guild.id).send("Now playing: ``" + music2.title + "`` by ``" + music2.author.name + "``. (requested by " + music2.member +")");
});

// ETC (other event listeners)

client.on("message", message => {

  if (message == "/join") {
    musicChannels.set(msg.guild.id, msg.channel);
    music.join(msg.member);
  }

  if (message == "/leave") {
    music.leave(msg.guild);
    musicChannels.delete(msg.guild.id);
  }

  if (message.startsWith("/request ")) {
    music.addMusic(message.member, message.replace("/request ",""));
  }

  // ETC (other commands)

});

client.login(MYBOTTOKEN);
```
