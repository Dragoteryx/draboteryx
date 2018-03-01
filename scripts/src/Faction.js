const weakmapPrivates = new WeakMap();
function prv(object) {
	if (!weakmapPrivates.has(object))
		weakmapPrivates.set(object, {});
	return weakmapPrivates.get(object);
}


class Faction {
  constructor(handler, obj) {
    prv(this).handler = handler;
    delete obj.id64;
    for (let property of Object.keys(obj)) {
      this[property] = Object.freeze(obj[property]);
      Object.defineProperty(this, property, {writable: false})
    }
  }
}
Object.defineProperty(Faction.prototype, "toString", {value: function() {return this.name}});

module.exports = Faction;
