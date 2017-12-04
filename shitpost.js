/* jshint node:true, evil:true, asi:true, esversion:6*/
"use strict";

const tools = require("./tools.js");
const EventEmitter = require("events");

exports.ShitpostHandler = function() {
	EventEmitter.call(this);
	this.genShitpost = () => {
		let texte = tools.randTab(exports.begin);
		let const_name = tools.randTab(exports.names);
		for (let i = 0; i < 15; i++) {
			texte = texte
			.replace("$cname", const_name);
			texte = shitpostReplace(texte);
		}
		return tools.firstCharUpper(texte);
	}
	this.findShitpost = strings => {
		let done = false;
		let shitpost;
		for (let i = 0; i <= 100000 && !done; i++) {
			shitpost = this.genShitpost();
			done = tools.stringContainsAllArray(shitpost, strings);
		} if (done)
			return Promise.resolve(shitpost);
		return Promise.reject("shitpostNotFound");
	}
	this.genStory = () => {
		let hero = tools.randTab(exports.names);
		let friend = tools.randTab(exports.names);
		let enemy = tools.randTab(exports.names);
		let minion = tools.randTab(exports.names);
		let rareItem = tools.randTab(exports.items);
		let corp = tools.randTab(exports.entreprises);
		let where = tools.randTab(exports.pays);
		let enemyGoal = tools.randTab(exports.goals);
		let texte = "$storyStart $storyMiddle $storyEnding";
		for (let i = 0; i < 15; i++) {
			texte = texte
			.replace("$storyStart", tools.randTab(exports.storyStarts))
			.replace("$storyMiddle", tools.randTab(exports.storyMiddle))
			.replace("$storyEnding", tools.randTab(exports.storyEndings))
			.replace("$hero", hero)
			.replace("$friend", friend)
			.replace("$enemy", enemy)
			.replace("$minion", minion)
			.replace("$rareItem", rareItem)
			.replace("$corp", corp)
			.replace("$where", where)
			.replace("$enemyGoal", enemyGoal)
			texte = shitpostReplace(texte);
		} return tools.firstCharUpper(texte);
	}
}

function shitpostReplace(str) {
	let texte = str;
	for (let i = 0; i < 30; i++) {
		texte = texte
		.replace("$end", tools.randTab(exports.end))
		.replace("$name", tools.randTab(exports.names))
		.replace("$drink", tools.randTab(exports.drinks))
		.replace("$food", tools.randTab(exports.foods))
		.replace("$adj", tools.randTab(exports.adjs))
		.replace("$entr", tools.randTab(exports.entreprises))
		.replace("$group", tools.randTab(exports.groups))
		.replace("$item", tools.randTab(exports.items))
		.replace("$loc", tools.randTab(exports.locs))
		.replace("$nb", (tools.randomValue(9)))
		.replace("$goal", tools.randTab(exports.goals))
		.replace("$event", tools.randTab(exports.events))
		.replace("$pays", tools.randTab(exports.pays))
		.replace("$movie", tools.randTab(exports.movies))
		.replace("$warcry", tools.randTab(exports.warcries))
		.replace("$action", tools.randTab(exports.actions))
		.replace("$game", tools.randTab(exports.games))
		.replace("$town", tools.randTab(exports.towns))
	}
	return texte;
}

exports.ShitpostHandler.prototype = Object.create(EventEmitter.prototype);
exports.ShitpostHandler.prototype.constructor = exports.ShitpostHandler;

exports.storyStarts = [
	"Once upon a time,",
	"A long time ago,",
	"$town, 19$nb$nb."
];

exports.storyMiddle = [
	"$enemy asked his minion $minion to retrieve $rareItem so he could destroy the world $goal, but $hero, with the help of his ally and friend $friend got it first !"
];

exports.storyEndings = [
	"And this is how $hero saved $where !",
	"And this is how $hero saved the world !"
];

exports.begin = [
	"My Senpai told me that $end.",
	"Did you know that $end?",
	"Thanks to science, we now know that $end.",
	"I wanted to tell you that $end.",
	"You might not believe me, but $end.",
	"I'm almost certain that $end.",
	"I think $end.",
	"Listen : $end.",
	"You are not forced to agree with me, but $end.",
	"I'm pleased to tell you that $end.",
	"I'm sorry to inform you that $end.",
	"To be honest, I think $end.",
	"According to Fox News, $end.",
	"According to the police, $end.",
	"Some rumors say that $end.",
	"An ancient prophecy tells that $end.",
	"Someone told me that $end.",
	"Gaben, our lord and savior, told me that $end.",
	"Meanwhile, in a parallel universe, $end.",
	"It is written that only $end.",
	"Just a daily reminder that $end.",
	"I'm coming from the future to tell you that $end.",
	"How come $end?",
	"This is absolute truth : $end.",
	"You can't deny that $end.",
	"You can't disagree with me when I say that $end.",
	"This is truth : $end.",
	"Somehow, $end.",
	"Some rumors at $entr say that $end.",
	"According to $name, $end.",
	"I bet you $item that $end.",
	"You thought it was $name, but it was me, Dio !",
	"Look up in the sky ! It's a bird ! It's a plane ! It's $name !",
	"I was told by $name that $end.",
	"It would be so cool if $event didn't happen.",
	"I'm wondering how the world would be if $event did not happen.",
	"$end. Crazy, right?",
	"Tell me that $end, or I'll murder you.",
	"For some reason, $end.",
	"It would be fun if $end.",
	"Would you rather $action or $action?"
];
exports.end = [
	"$name's favorite drink is $drink",
	"$name's favorite food is $food",
	"$cname is love, $cname is life",
	"$name works for $entr",
	"$entr headquarters are located $loc",
	"$name is $name",
	"$name is $adj",
	"$name is $adj and $adj",
	"$name doesn't need to poop",
	"$name is better than you",
	"$name doesn't like you",
	"$name hates you",
	"$name loves you",
	"$name would like $goal",
	"$entr would like $goal",
	"$name has no soul",
	"$name needs healing",
	"$name needs $item",
	"$name lives $loc",
	"$name and $name live $loc",
	"$name is searching for $item",
	"$name's treasure is hidden $loc",
	"$name doesn't exist",
	"$name wants $goal",
	"$name looks better than you",
	"$name is your master",
	"$name is not as dumb as $name",
	"$name is not as smart as $name",
	"$name is cooler than $name",
	"$name is faster than $name",
	"$name is better than $name",
	"$name killed $name",
	"$name ate $name",
	"$name ate $food",
	"$name ate $item",
	"$name kicked $name",
	"$name hates $name",
	"$name likes $name",
	"$name loves $name",
	"$name hates $food",
	"$name likes $food",
	"$name loves $food",
	"$name hates $drink",
	"$name likes $drink",
	"$name loves $drink",
	"$name is scared of $name",
	"$name hates $group",
	"$name likes $group",
	"$name loves $group",
	"$name is scared of $group",
	"$name slept with $name",
	"$name should be contained by the SCP Foundation",
	"$name died for his country",
	"$name has found $item",
	"$name has $item",
	"$name doesn't have $item",
	"$name gave $item to $name",
	"$name gave $item to $name $goal",
	"$name is married with $name",
	"$name has stolen $item",
	"$item was created by $name",
	"$name and $name allied themselves $goal",
	"$entr and $entr allied themselves $goal",
	"$name and $entr allied themselves $goal",
	"$name came into possession of $item",
	"$goal, you need $goal first",
	"$name can help you $goal",
	"$goal, you will need the help of $name",
	"$nb + $nb = $nb",
	"the easiest way $goal is $goal",
	"$item is powered using $item",
	"$name caused $event",
	"$entr caused $event",
	"there's a museum about $name $loc",
	"there's a museum about $entr $loc",
	"there's a museum about $group $loc",
	"there's a museum about $food $loc",
	"there's a museum about $drink $loc",
	"$event happenned $loc",
	"$name created $item $goal",
	"$movie is $name's favorite movie",
	"$movie will predict the future",
	"$movie is the best movie ever",
	"$movie is the worst movie ever",
	"$movie is my favorite movie",
	"1 $cname + 1 $cname = 2 $cnames",
	"$end, and $end"
];
exports.names = [
	"Dragoteryx",
	"Senpai",
	"Senpai's sister",
	"Donald Trump",
	"Shrek",
	"Gollum",
	"Obi-Wan Kenobi",
	"Dracula",
	"Darth Vader",
	"the Doctor",
	"Tracer",
	"Reaper",
	"Torbjörn",
	"Winston",
	"D.Va",
	"Bastion",
	"my penis",
	"the Internet",
	"Mecha Hitler",
	"Putin",
	"the Cookie Monster",
	"the Dovahkiin",
	"Alduin",
	"GLaDOS",
	"Chell",
	"Nicolas Cage",
	"Chuck Norris",
	"the Twitter bird",
	"Aristotle",
	"McCree",
	"Flowey",
	"Sans",
	"PAPYRUS",
	"Harry Potter",
	"Voldemort",
	"Genji",
	"Link",
	"Ganondorf",
	"a Warframe",
	"Stalin",
	"Lenin",
	"SpongeBob SquarePants",
	"John Cena",
	"Dio",
	"Sakamoto-senpai",
	"a ghoul",
	"a werewolf",
	"a horse",
	"a bird",
	"a shark",
	"a nazi",
	"a shitposter",
	"a bitch",
	"a bot",
	"a vampire",
	"a brony",
	"your father",
	"your mother",
	"your brother",
	"your sister",
	"SCP-173",
	"SCP-682",
	"SCP-096",
	"SCP-106",
	"a child",
	"a zombie",
	"Gaben",
	"Adolf Hitler",
	"the Furher",
	"Sylvester Stalin",
	"VLT",
	"Spyro",
	"Crash",
	"Gandalf",
	"Bilbo",
	"Frodo",
	"Dumbledore",
	"Sauron",
	"Batman",
	"Bruce Wayne",
	"Little King John",
	"Iron Man",
	"Tony Stark",
	"Superman",
	"Clark Kent",
	"Spider-Man",
	"Peter Parker",
	"Francescomania",
	"your waifu",
	"Terry Crews",
	"Jeff Kaplan",
	"Mario",
	"Luigi",
	"Rick",
	"Morty",
	"Aperture Science test subject n°$nb$nb$nb$nb",
	"D-$nb$nb$nb$nb",
	"a headcrab",
	"a xenomorph",
	"your shitty waifu",
	"Kung Fury",
	"Paarthurnax",
	"the President of the United States"
];
exports.adjs = [
	"dead",
	"ugly",
	"beautiful",
	"clever",
	"dumb",
	"evil",
	"not a bot, contrary to me",
	"the best waifu",
	"the best Warframe",
	"the best Overwatch hero",
	"a better Putin",
	"delicious",
	"out",
	"a lie",
	"not true",
	"gay",
	"true"
];
exports.foods = [
	"kebabs",
	"wieners",
	"bananas",
	"flowers",
	"cheese",
	"rotten fish",
	"fish",
	"potatoes",
	"tomatoes",
	"curry with rice",
	"chicken"
];
exports.drinks = [
	"bleach",
	"Coca Cola",
	"Sprite",
	"Pepsi",
	"Orangina",
	"Mountain Dew",
	"vodka"
];
exports.groups = [
	"black people",
	"ghouls",
	"vampires",
	"werewolves",
	"white people",
	"dead people",
	"zombies",
	"children",
	"dogs",
	"cats",
	"animals",
	"birds",
	"squirrels",
	"jews",
	"the employees of $entr",
	"nazis"
];
exports.entreprises = [
	"Black Mesa",
	"the SCP Foundation",
	"Aperture Science",
	"the VLT Corporation",
	"the Internet",
	"the Third Reich",
	"Overwatch",
	"Twitter",
	"Valve",
	"the Illuminati",
	"the Team Benediction",
	"Wayne Enterprise",
	"the Ku Klux Klan",
	"the KKK",
	"the DrG Company"
];
exports.locs = [
	"in a pineapple under the sea",
	"in my swamp",
	"in my ass",
	"in Hogwarts",
	"on Jupiter",
	"under your bed",
	"in the Wayne manor",
	"in $entr headquarters",
	"inside my car battery",
	"on Mercury",
	"next to Trump's wall",
	"in the ISS",
	"behind you",
	"in $pays",
	"in $ville"
];
exports.items = [
	"the One Ring to rule them all",
	"a flower",
	"a golden penis",
	"a nuke",
	"Meinkampf",
	"the cake",
	"a magic wand",
	"a Twitter account",
	"the Tardis",
	"a sock",
	"a pair of socks",
	"an apple",
	"a big black dick",
	"a cooler full of organs",
	"AIDS",
	"$nb wishes",
	"infinite wishes",
	"potato knishes",
	"SCP-294",
	"a Ferrari",
	"a Lamborghini",
	"the worst car ever",
	"a german Panzer IV Ausf. H",
	"a soviet T-34",
	"a sword",
	"a bow",
	"a M416",
	"an AK-47",
	"a Barrett M98B",
	"a RPG-7",
	"the Holy Bible",
	"a nuclear reactor",
	"$name's personal diary",
	"a Gravity Gun",
	"a Portal Gun",
	"the Aperture Science Handheld Portal Device",
	"the Zero Point Energy Field Manipulator",
	"the DeLorean",
	"$name's penis",
	"$game",
	"a cup of $drink"
];
exports.goals = [
	"to destroy $item",
	"to find $item",
	"to be as cool as me",
	"to be as cool as $name",
	"to kill you",
	"to eat you",
	"to kill $name",
	"to eat $name",
	"to kill all $group",
	"to eat all $group",
	"to defeat $name"
];
exports.events = [
	"the zombie apocalypse",
	"the end of the world",
	"Donald Trump becoming President of the United States",
	"the nuclear war between $entr and $entr",
	"the war between $entr and $entr",
	"the nuclear war between $pays and $pays",
	"the war between $pays and $pays",
	"the nuclear war between $pays and $entr",
	"the war between $pays and $entr",
	"World War 1",
	"World War 2",
	"World War 3",
	"the apocalypse",
	"the Steam Summer Sale",
	"the weekend",
	"the Sombra ARG",
	"the Emoji Movie"
];
exports.pays = [
	"France",
	"United Kingdom",
	"United States",
	"Germany",
	"MURICA",
	"Nazi Germany",
	"North Korea",
	"Japan",
	"China",
	"India"
];
exports.towns = [
	"Paris",
	"London",
	"Tokyo",
	"New York",
	"San Francisco",
	"Dublin",
	"Berlin",
	"Auschwitz",
];
exports.movies = [
	"Cars 2",
	"Shrek",
	"Shrek 2",
	"the Emoji Movie",
	"Batman V Superman",
	"Suicide Squad",
	"the Avengers",
	"Dragonball Evolution",
	"House of the Dead",
	"Transformers 3",
	"Fast and Furious $nb$nb",
	"Tetris",
	"Kung Fury"
];
exports.warcries = [
	"SQUADALA! WE'RE OFF!",
	"THIS IS SPARTA!",
	""
];

exports.actions = [
	"kill $name",
	"eat $name",
	"marry $name",
	"drink $drink",
	"eat $food",
	"steal $item",
	"buy $item",
	"fuck $name",
	"join $entr",
	"get fired from $entr",
	"work for $entr",
	"die",
	"sleep",
	"cook $food",
	"met $name"
];

exports.games = [
	"Skyrim",
	"Warframe",
	"Overwatch",
	"Half-Life 3",
	"League of Legends",
	"Minecraft",
	"Starbound",
	"Undertale",
	"Portal 2",
	"Left 4 Dead 2",
	"Garry's Mod",
	"The Forest",
	"Besiege",
	"Interloper",
	"Spore"
]
