const WebSocket = require("ws");
const EventEmitter = require("events");

const privates = new WeakMap();
function prv(object) {
	if (!privates.has(object))
		privates.set(object, {});
	return privates.get(object);
}
class ListenMoe extends EventEmitter {
	constructor(name, gateway, stream) {
		super();
		let that = prv(this);
		this.name = name;
		this.type = "listen.moe"
		this.data = null;
		that.gateway = gateway;
		that.stream = stream;
		that.websocket = null
		that.sendHeartbeat = null;
		this.websocketConnection();
	}
	get title() {
		return this.data.song.title;
	}
	heartbeat(websocket, ms) {
		prv(this).sendHeartbeat = setInterval(() => {
			websocket.send(JSON.stringify({op: 9}));
		}, ms);
	}
	websocketConnection() {
		let that = prv(this);
		if (that.websocket) {
			that.websocket.close();
			that.websocket = null;
		}
		that.websocket = new WebSocket(that.gateway);
		that.websocket.onopen = () => {
			clearInterval(that.sendHeartbeat);
			that.websocket.send(JSON.stringify({op: 0, d: {auth: null}}));
		}
		that.websocket.onmessage = msg => {
			if (!msg.data.length) return;
			try {
				var res = JSON.parse(msg.data);
			} catch (error) {
				return;
			}
			if (res.op == 0) return this.heartbeat(that.websocket, res.d.heartbeat);
			if (res.op == 1 && ["TRACK_UPDATE", "TRACK_UPDATE_REQUEST", "QUEUE_UPDATE"].some(val => val == res.t)) {
				this.data = res.d;
				this.emit("update");
			}
		}
		that.websocket.onclose = err => {
			if (err) {
				clearInterval(that.sendHeartbeat);
				if (!err.wasClean)
					setTimeout(() => this.websocketConnection(), 5000);
			}
			clearInterval(that.sendHeartbeat);
		}
	}
	stream(voiceConnection, options) {
		return voiceConnection.playStream(prv(this).stream, options);
	}
}

module.exports = {
	jpop: new ListenMoe("Listen.moe JPOP", "wss://listen.moe/gateway", "async:https://listen.moe/opus"),
	kpop: new ListenMoe("Listen.moe KPOP", "wss://listen.moe/kpop/gateway", "async:https://listen.moe/kpop/opus")
}
