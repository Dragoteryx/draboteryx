/* jshint node:true, evil:true, asi:true, esversion:6*/
"use strict";

const discord = require("discord.js");
const fs = require("fs");

// valeur random entre min et max
exports.random= function(min, max) {
	return Math.floor(Math.random()*(min+max+1))-min;
}

// donner une valeur aléatoire entre 0 et max (inclus)
exports.randomValue = function(max) {
	return Math.floor(Math.random()*(max+1));
}

//donner une valeur aléatoire d'un tableau
exports.randTab = function(tab) {
	return tab[this.randomValue(tab.length-1)];
}

// convertir un String en List
exports.listToString = function(list) {
	let string = "";
	for (let i = 0; i < list.length; i++)
		string += list[i];
	return string;
}

// écrire dans un fichier
exports.fsWrite = function(file) {
	fs.writeFile("./" + file + ".json", JSON.stringify(eval(file)), (err) => {if(err) console.error(err)});
}

// passer le premier caractére d'un string en majuscule
exports.firstCharUpper = function(string) {
	return string[0].toUpperCase() + string.slice(1);
}
// vérifier qu'un string contient tout les éléments présents dans un array
exports.stringContainsAllArray = function(string, tab) {
	for (let i = 0; i < tab.length; i++)
		if (!string.toLowerCase().includes(tab[i].toLowerCase())) return false;
	return true;
}

// hash un objet (return un int)
exports.hash = function(obj) {
	let str = obj.toString();
	let hash = 0;
	for (let i = 0; i < str.length; i++) {
		hash += str.charCodeAt(i);
		hash = hash & hash;
	}
	return Math.abs(hash);
}

exports.toBlock = function(str) {
	while (str.includes("```"))
		str.replace("```","``");
	if (!str.startsWith("``") && !str.endsWith("``"))
	 	str = "``" + str + "``";
	else if (str.startsWith("``"))
		str += "``";
	else if (str.endsWith("``"))
		str = "``" + str;
	return str;
}

exports.toCodeBlock = function(str) {
	if (!str.startsWith("```") && !str.endsWith("```"))
	 	str = "```" + str + "```";
	else if (str.startsWith("```"))
		str += "```";
	else if (str.endsWith("```"))
		str = "```" + str;
	return str;
}
