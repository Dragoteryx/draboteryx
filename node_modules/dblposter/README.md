<div>
	<br />
	<p>
		<a href="https://www.npmjs.com/package/dblposter"><img src="https://img.shields.io/npm/v/dblposter.svg?maxAge=3600" alt="NPM version" /></a>
		<a href="https://www.npmjs.com/package/dblposter"><img src="https://img.shields.io/npm/dt/dblposter.svg?maxAge=3600" alt="NPM downloads" /></a>
		<a href="https://david-dm.org/KingDGrizzle/dblposter"><img src="https://img.shields.io/david/KingDGrizzle/dblposter.svg?maxAge=3600" alt="Dependencies" /></a>
	</p>
	<p>
    		<a href="https://nodei.co/npm/dblposter/"><img src="https://nodei.co/npm/dblposter.png?downloads=true&stars=true" alt="NPM info"></a>
  	</p>
</div>

# DBLPoster
A simple to use poster for DiscordBotList stats, when you just want to post stats without much fussing around!

## Getting Started

It's super easy to get started with dblposter! Let's guide you through the steps you need to do to be sending stats automatically in no time!

First, you have to install the module. So...
```bash
npm i dblposter

# Or if you are using yarn

yarn add dblposter
```

After that's done, all you have to do is:

- Add `const dbl = require("dblposter")` in your main client class above everything
	- Keep in mind this has to be your main file in which you create the client, not the file you run if you have them split, or are sharding.
	- Also, dblposter will handle shard posting of all kinds for you. Just remember to attach it to each shard client. (or to the main Eris client if you're using Eris and its internal sharding)
- After creating the client via `new Client` (or whichever method is used by your chosen library), add the following code:
```js
// Assuming client is your variable name for the client,
// otherwise just change it as fit.
const poster = new dbl("DBL_API_KEY_GOES_HERE", client);

// This will bind the poster to your client and start posting automatically.
poster.bind();
```
- That's it! No, seriously!

## In-Depth Details

Ok, if you've reached this point, you're probably curios about exactly what this library can do.

First, let's talk about the `bind` function above. It takes two parameters:

| Parameter Name |                           Type                          | Default     | Description                                                                          |
|:--------------:|:-------------------------------------------------------:|-------------|--------------------------------------------------------------------------------------|
|    paramName   |                          String                         | dblPoster   | The property which will get attached to the client in order to handle timers.        |
|     client     | DiscordJS.Client or Eris or DiscordIO.Client or DiscordIE.Client | this.client | The client to bind to, defaulting to the client provided in the constructor, if any. |

Say you don't want to have that property name because it is easy to guess. You could run `bind("myParamName")` and dblposter would attach it using `myParamName`

If you didn't pass in a client in the `new dbl` constructor, you can pass it in bind too! Just remember, if you don't want the paramName to be changed, you'll have to do something like `bind(null, client)`.

### Please note!

While dblposter does add a property to the client, all the property has is your cached API Key, and the interval used to send the statistics. Nothing else is added, and no data is received from your client. I understand why some might be concerned, but [here are the lines that handle the bind.](https://github.com/KingDGrizzle/dblposter/blob/master/src/index.js#L34-L44)

## Other Details

We send stats every **30 minutes**, since that's what DiscordBots require for automatic libraries.

dblposter also has a `post` method, which, as it's name suggests, does a post for you.
> Note that this will reset the internal interval.

If you ever want to destroy dblposter (clear the internal interval, for shutdown or just to stop posting stats all together), there is the `destroy` function. Run it and, voila. The interval gets stopped, dblposter removes itself from your client, nulls the paramName (meaning you'll have to re-add it in `bind` should you call it after destroying)

> Inside Reveal: We use the destroy function ourselves when you run the `post` function, but we save the paramName before hand.

And in the end, dblposter extends EventEmitter, and has 2 possible events:

| Event Name |   Event Params  | Description                                                                                                                                                                                        |
|:----------:|:---------------:|----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
|   posted   |                 | The post was successfully done. Use this event if you want to log that the post was successful.                                                                                                    |
|    error   | Snekfetch.Response | The post couldn't finish. The returned property from the event is a [Snekfetch Response Object](https://snekfetch.js.org/?api=snekfetch#Snekfetch.SnekfetchResponse) containing more informations. |

To access it, it's as easy as:
```js
client.dblPoster.on("posted", () => {
	console.log("Woop! My stats were posted");
});

client.dblPoster.on("error", err => {
	// We recommend you check what the error was.
	// Access the status, and body property from the err object.
	console.log("Oh noes! I got an error!", err);
});
```

If you provided a different paramName in `bind`, just replace `dblPoster` from that snippet above with your param name.

## Error Message Explaining

When running `bind`, if something isn't right, you will receive an error.

|                                                  Message                                                 |                                                                  Meaning                                                                  |
|:--------------------------------------------------------------------------------------------------------:|:-----------------------------------------------------------------------------------------------------------------------------------------:|
|                         The API key is either not specified, or is not a string.                         |    Where you constructed dblposter using `new poster`, you didn't provide an API Key or it wasn't a string. Double check and try again.   |
| You need to provide a client to bind to, either in the constructor of dblposter or in the bind function! | You didn't provide a client in the dblposter constructor (`new poster("API_KEY", client)`) or in the bind function (`bind(null, client)`) |
