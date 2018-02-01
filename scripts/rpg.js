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
let entityId = 1;

// CLASSES
class World {
  constructor() {
    prv(this).entities = new Map();
    prv(this).players = [];
    prv(this).items = new Map();
  }
  addEntity(options) {
    let that = prv(this);
    let entity = new Entity(entityId);
    that.entities.set(entityId, entity);
    entityId++;
    return entity;
  }
  addItem(options) {
    let that = prv(this);
    let item = new Item(itemId);
    that.items.set(itemId, item);
    itemId++;
    return item;
  }
  get entities() {
    let that = prv(this);
    let entities = new Map();
    for (let entity of that.entities)
      entities.set(entity[0], entity[1]);
    return entities;
  }
  get items() {
    let that = prv(this);
    let items = new Map();
    for (let item of that.items)
      items.set(item[0], item[1]);
    return items;
  }
  get players() {
    let that = prv(this);
    let players = new discord.Collection();
    for (let id of that.players) {
      let player = that.entities.get(id);
      players.set(player.user.id, player);
    }
    return players;
  }
}

class Entity extends EventEmitter {
  constructor(id, stats) {
    super();
		let that = prv(this);
		that.id = id;
		if (stats === undefined)
			stats = {};
		if (stats.maxhealth === undefined)
			stats.maxhealth = (force, dex, int, lvl) => (force*3+dex*2+int)*lvl;
		if (stats.force === undefined)
			stats.force = 0;
		if (stats.dexterity === undefined)
			stats.dexterity = 0;
		if (stats.intellect === undefined)
			stats.intellect = 0;
		if (stats.lvl === undefined)
			stats.lvl = 1;
		prv(this).maxhealth = stats.maxhealth;
		this.name = stats.name;
		this.force = stats.force;
		this.dexterity = stats.name;
		this.intellect = stats.intellect;
		prv(this).lvl = stats.lvl;
  }
	get id() {
		return prv(this).id;
	}
	get lvl() {
		return prv(this).lvl;
	}
	set lvl(value) {
		let that = prv(this);
		let old = that.lvl;
		prv(this).lvl = value;
	}
	get maxhealth() {
		return prv(this).maxhealth(this.force, this.dexterity, this.intellect, this.lvl);
	}
	set maxhealth(maxhealth) {
		if (!(maxhealth instanceof Function))
			throw new TypeError("parameter 'maxhealth' must be a Function");
		prv(this).maxhealth = maxhealth;
	}
  get health() {
    return prv(this).health;
  }
  set health(value) {
    value = Number(value);
    prv(this).health = value;
    if (value <= 0)
      this.kill();
  }
  kill() {
    prv(this).health = 0;
    this.emit("death");
  }
  get player() {
    return false;
  }
}

class Player extends Entity {
  constructor(user, id, stats) {
		super(id, stats);
		prv(this).user = user;
		user.player = this;
  }
	get user() {
		return prv(this).user;
	}
  get player() {
    return true;
  }
}

class Item {
  constructor(id, options) {
    prv(this).id = id;
    this.name = options.name;
    this.description = options.description;
    this.price = options.price;
    this.weight = options.weight;
  }
  get id() {
    return prv(this).id;
  }
  get desc() {
    return this.description;
  }
  set desc(value) {
    this.description = value;
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

module.exports = World;
let bobby = new Player({}, 1, {});
let woof = new Entity(2, {});
