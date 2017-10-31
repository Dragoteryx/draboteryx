"use strict";

// CONSTANTES
const tools = require("./tools.js");
const sha1 = require("sha1");
const funcs = require("./funcs.js");

// FUNCTIONS

// randomize string
function randomToUp(str) {
	let str2 = "";
	for (let i = 0; i < str.length; i++) {
		if (tools.randomValue(2) == 2) str2 += str[i].toUpperCase();
		else str2 += str[i];
	} return str2;
}

// generate a random key
function genKey(size) {
	return "DrG-" + funcs.genRandomHash(size);
}

// CLASSES

// singleton
let crypting = null;
exports.getHandler = function() {
	if (crypting == null)
		crypting = new CryptHandler();
	return crypting;
}

function CryptHandler() {
	var map = new Map();
	var sizeKey = 10;
	// return un message chiffré avec sa clé aléatoire + le message non crypté
	this.genKey = function() {
		return genKey(sizeKey);
	}
	// chiffrer un message sans clé
	this.randomCrypt = function(message) {
		return this.crypt(message, genKey(sizeKey));
	}
	// return un message chiffré avec sa clé + le message non crypté
	this.crypt = function(message, key) {
		var crypt = new CryptedMessage(message, key);
		map.set(sha1(key+crypt.getCrypted()), crypt);
		return map.get(sha1(key+crypt.getCrypted()));
	}
	// déchiffre un message crypté si la clé est valide
	this.decrypt = function(crypted, key) {
		if (map.has(sha1(key+crypted)))
			if (crypted == map.get(sha1(key+crypted)).getCrypted()) return map.get(sha1(key+crypted)).getMessage(key);
		throw new Error("incorrectKey");
	}
}

function CryptedMessage(message, key) {
	var crypted = sha1(message);
	for (let i = 0; i < tools.hash(key)%255; i++)
		crypted = sha1(crypted);
	crypted = randomToUp(crypted);
	var hash = sha1(key);
	var message = message;
	var key = key
	var requested = false;
	// return le message crypté
	this.getCrypted = function() {
		return crypted;
	}
	// return le hash de la clé
	this.getHash = function() {
		return hash;
	}
	// return le message si la clé est correcte
	this.getMessage = function(key) {
		if (sha1(key) == hash) return message;
		else throw new Error("wrongKey");
	}
	// récupérer la clé (usage unique)
	this.requestKey = function() {
		if (!requested) {
			requested = !requested;
			return key;
		} throw new Error("alreadyRequestedKey");
	}
}
