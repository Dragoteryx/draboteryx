const weakmapPrivates = new WeakMap();
function prv(object) {
	if (!weakmapPrivates.has(object))
		weakmapPrivates.set(object, {});
	return weakmapPrivates.get(object);
}

class CelestialBody {
  constructor(handler, system, obj) {
    prv(this).handler = handler;
    prv(this).discovery = obj.discovery;
    delete obj.id64;
    this.system = system;
    for (let property of Object.keys(obj)) {
      if (property == "updateTime")
        this.updateTime = new Date(obj.updateTime);
      else if (property != "discovery")
        this[property] = Object.freeze(obj[property]);
    }
    for (let property of Object.keys(this))
			Object.defineProperty(this, property, {writable: false});
  }
  get discovery() {
    if (prv(this).discovery === undefined)
      return undefined;
    return Object.freeze({
      commanderName: prv(this).discovery.commander,
      commander: prv(this).handler.commanders.get(prv(this).discovery.commander),
      date: new Date(obj.discovery.date)
    });
  }
}
Object.defineProperty(CelestialBody.prototype, "toString", {value: function() {return this.name}});

module.exports = CelestialBody;
