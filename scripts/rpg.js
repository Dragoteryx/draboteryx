/* jshint node:true, evil:true, asi:true, esversion:6*/
"use strict";

// IMPORTS
const discord = require("discord.js");
const EventEmitter = require("events");

// CONSTS
const weakmapPrivates = new WeakMap();
function prv(object) {
	if (!weakmapPrivates.has(object))
		weakmapPrivates.set(object, {});
	return weakmapPrivates.get(object);
}

// GLOBALS
let itemId = 1;

// CLASSES
class Entity extends EventEmitter {
  constructor(name, stats, inventory) {
    this.name = name;
    this.stats = Object.seal({

    });
    prv(this).health = stats.maxHealth;
    this.inventory = Object.seal({

    });
  }
}
class Player extends EventEmitter {
  constructor(user, stats) {
    this.user = user;
    user.player = this;
    if (stats === undefined)
      stats = {};
    if (stats.maxHealth === undefined)
      stats.maxHealth = 100;
    this.stats = Object.seal(stats);

    this.inventory = Object.seal({
      weapon: null,
      armor: null,
      arrows: [],
      potions: [],
      items: []
    });
  }
}

class Item {
  constructor(name, description, price, weight) {
    this.id = itemId;
    itemId++;
    this.name = name;
    this.description = description;
    this.price = price;
    this.weight = weight;
  }
  get desc() {
    return this.description;
  }
  set desc(value) {
    this.description = value;
  }
  test() {
    return null;
  }
}

class Weapon extends Item {

}

class Arrow extends Item {

}

class Armor extends Item {

}

class Potion extends Item {

}
