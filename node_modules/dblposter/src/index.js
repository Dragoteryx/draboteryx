const bind = require("./Bind");
const { EventEmitter } = require("events");

/**
 * The DBLPoster
 * @class DBLPoster
 * @extends {EventEmitter}
 */
class DBLPoster extends EventEmitter {
	/**
	 * Creates an instance of DBLPoster.
	 * @param {string} apiKey The API Key provded by discordbots.org
	 * @param {DiscordJS.Client|Eris|DiscordIO.Client|DiscordIE.Client} client The client you want to bind to
	 * @memberof DBLPoster
	 */
	constructor (apiKey, client) {
		super();
		Object.defineProperty(this, "_apiKey", {
			value: apiKey,
			enumerable: false,
		});
		this.client = client;
	}

	/**
	 * Binds the poster to the client.
	 * @param {string} [paramName="dblPoster"] The value that determines the accessible
	 * poster instance on the client
	 * @param {DiscordJS.Client|Eris|DiscordIO.Client|DiscordIE.Client} [client=this.client] Optional client to bind to,
	 * if you haven't added it in the constructor
	 * @memberof DBLPoster
	 * @chainable
	 */
	bind (paramName = "dblPoster", client = this.client) {
		if (this._apiKey === "" || this._apiKey === null || !this._apiKey || typeof this._apiKey !== "string") {
			throw new Error(`The API key is either not specified, or is not a string.`);
		}
		if (!client) throw new RangeError(`You need to provide a client to bind to, either in the constructor of dblposter or in the bind function!`);
		this.client = client;
		this.paramName = paramName;
		this.client[this.paramName] = this;
		bind(this.client, paramName);
		return this;
	}

	/**
	 * Destroys the DBLPoster's interval.
	 * @returns {DBLPoster}
	 * @memberof DBLPoster
	 * @chainable
	 */
	destroy () {
		if (this.client && this.client[this.paramName]) {
			if (this.client[this.paramName]._interval) {
				clearInterval(this.client[this.paramName]._interval);
				this.client[this.paramName]._interval = null;
			}
			this.client[this.paramName] = null;
			// Null out the param name
			this.paramName = null;
		}
		return this;
	}

	/**
	 * Runs a manual post of the current bot stats.
	 * @memberof DBLPoster
	 * @returns {void}
	 */
	post () {
		const paramName = this.paramName;
		this.destroy().bind(paramName);
	}
}

module.exports = DBLPoster;
