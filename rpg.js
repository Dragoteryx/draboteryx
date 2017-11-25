/* jshint node:true, evil:true, asi:true, esversion:6*/
"use strict";

function Player(user, name, force, dex, int) {
  this.user = user;
  this.name = name;
  this.money = 100.0;
  this.force = force;
  this.dex = dex;
  this.int = int;
  this.unspent = 0;
  this.lvl = 1;
  this.maxHealth = () => this.force*2 + this.dex*1.5 + this.int;
  this.health = this.maxHealth();
  this.lvlUp = choice => {
    if (choice == "force" && this.force != 0)
      this.force++;
    else if (choice == "dex" && this.dex != 0)
      this.dex++;
    else if (choice == "int" && this.int != 0)
      this.int++;
    else
      this.unspent++;
    this.lvl++;
  }
  this.inventory = [];
}

function Item(name, desc, price) {
  this.name = name;
  this.desc = desc;
  this.buyPrice = price;
  this.sellPrice = price*0.66;
  this.giveToPlayer = player => {
    player.inventory.push(this);
    player.money -= this.buyPrice;
  }
  this.sellFromPlayer = player => {
    player.inventory.remove(this);
    player.money += this.sellPrice;
  }
}

function Weapon() {
  Item.call(this);

}

Weapon.prototype = Object.create(Item.prototype);
Weapon.prototype.constructor = Weapon;

function Potion() {
  Item.call(this);

}

Potion.prototype = Object.create(Potion.prototype);
Potion.prototype.constructor = Potion;

function Spell(name, desc, minl, effect) {
  this.name = name;
  this.desc = desc;
  this.minLevel = minl;
  this.effect = effect;
}
