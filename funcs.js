"use strict";
const types = require("./types.js");
const tools = require("./tools.js");
const utilityType = new types.CommandType("utility", ":wrench: Utility commands");
const funType = new types.CommandType("fun", ":bowling: Fun commands");
const musicType = new types.CommandType("music", ":microphone: Music commands");
const nsfwType = new types.CommandType("nsfw", ":cucumber: NSFW commands");
const commandTypes = [utilityType, funType, musicType, nsfwType];

module.exports = {
  initCommands: commands => {
    commands.setCommand("test", () => {console.log("[TEST] It works!")}, {ownerOnly: true});
    commands.setCommand("help", msg => sendHelpEmbeds(msg), {arguments: "none", props:
    new types.Command("help", "you probably know what this command does or else you wouldn't be reading this", utilityType, true)});
    commands.setCommand("info", msg => tools.showInfo().then(embed => {
    	msg.channel.send("", embed);
    }), {arguments: "none", props:
    new types.Command("info", "info about me", utilityType, true)});
    commands.setCommand("shitpost", msg => {msg.channel.send(shitpost.genShitpost())}, {arguments: "none", props:
    new types.Command("shitpost", "generates a random shitpost", funType, true)});
  }
}
