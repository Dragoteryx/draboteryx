class Faction {
  constructor(system, obj) {
    this.system = system;
    console.dir(obj, {colors: true})
    delete obj.id64;
    for (let property of Object.keys(obj))
      this[property] = obj[property];
    this.lastUpdate = new Date(obj.lastUpdate);
    this.controllingFaction = false;
  }
}
Object.defineProperty(Faction.prototype, "toString", {value: function() {return this.name}});

module.exports = Faction;
