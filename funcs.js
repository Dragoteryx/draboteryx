"use strict";

const tools = require("./tools.js");
const hashSigns = ["0","1","2","3","4","5","6","7","8","9",
"a","b","c","d","e","f","g","h","i","j","k","l","m","n","o","p","q","r","s","t","u","v","w","x","y","z",
"A","B","C","D","E","F","G","H","I","J","K","L","M","N","O","P","Q","R","S","T","U","V","W","X","Y","Z"
];
// generate a random hash
exports.genRandomHash = function(size) {
	let str = "";
	for (let i = 0; i < size; i++)
		str += tools.randTab(hashSigns);
	return str;
}

// logger une commande
exports.log = function(msg, str, type) {
	let toLog = "";
	if (type == "command") {
		if (msg.channel.type != "dm") toLog += "[LOG] (" + msg.guild.name + " / #"+ msg.channel.name + ") " + msg.member.displayName + " : " + msg.content;
		else toLog += "[LOG] (DM) " + msg.author.username + " : " + msg.content;
	} else if (type == "admin") {
		if (msg.channel.type != "dm") toLog += "[ADMINLOG] (" + msg.guild.name + " / #"+ msg.channel.name + ") " + msg.member.displayName + " : " + msg.content;
		else toLog += "[ADMINLOG] (DM) " + msg.author.username + " : " + msg.content;
	}
	console.log(toLog);
}

// envoyer un message lorsque la demande est incomprise puis supprimer le message (+ la demande)
exports.wakannai = function(msg) {
	let responses = ["what ? I didn't understand","uh ? Could you repeat please ?", "wakannai yo","this doesn't make any sense","but... drabot.exe has stopped working : incorrect parameters"];
	msg.channel.send(tools.firstCharLowerToUpper(tools.randTab(responses)));
}

// 0 => sans arguments, 1 => avec arguments, 2 => avec/sans arguments
exports.check = function(command, str, only) {
	if (only == 0) return command == str;
	else if (only == 1) return command.startsWith(str + " ");
	else if (only == 2) return command.startsWith(str);
	else throw new Error("checkOnlyZeroOneTwo");
}
