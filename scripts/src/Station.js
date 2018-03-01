const weakmapPrivates = new WeakMap();
function prv(object) {
	if (!weakmapPrivates.has(object))
		weakmapPrivates.set(object, {});
	return weakmapPrivates.get(object);
}

class Station {
  constructor(handler, system, obj) {
    prv(this).handler = handler;
    prv(this).faction = obj.controllingFaction;
    delete obj.id64;
    this.system = system;
    for (let property of Object.keys(obj)) {
      if (property == "controllingFaction")
        this.controllingFactionName = obj.controllingFaction.name;
      else if (property == "updateTime") {
        this.updateTime = {};
        for (let time of Object.keys(obj.updateTime))
          this.updateTime[time] = new Date(obj.updateTime[time]);
        this.updateTime = Object.freeze(this.updateTime);
      } else this[property] = Object.freeze(obj[property]);
    }
    for (let property of Object.keys(this))
			Object.defineProperty(this, property, {writable: false});
  }
  get controllingFaction() {
    if (!prv(this).faction)
      return undefined;
    return prv(this).handler.factions.get(prv(this).faction.id);
  }
}
Object.defineProperty(Station.prototype, "toString", {value: function() {return this.name}});

module.exports = Station;
