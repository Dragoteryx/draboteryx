const sendData = require("./SendData");

let DISCORDIE = false;
let ALREADY_READY = false;

module.exports = (client, paramName) => {
	if (ALREADY_READY) {
		onReady(client, paramName);
	} else if (client.Dispatcher) {
		DISCORDIE = true;
		client.Dispatcher.once("GATEWAY_READY", () => onReady(client, paramName));
	} else {
		client.once("ready", () => onReady(client, paramName));
	}
};

function onReady (client, paramName) {
	ALREADY_READY = true;
	sendData.send(client, paramName, DISCORDIE);
	const interval = setInterval(() => {
		sendData.send(client, paramName, DISCORDIE);
	}, 1800000);
	interval.unref();
	Object.defineProperty(client[paramName], "_interval", {
		value: interval,
		writable: true,
		enumerable: false,
	});
}
