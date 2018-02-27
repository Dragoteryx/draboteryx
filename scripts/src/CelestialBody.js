class CelestialBody {
  constructor(system, obj) {
    this.system = system;
    delete obj.id64;
    for (let property of Object.keys(obj))
      this[property] = obj[property];
    this.updateTime = new Date(obj.updateTime);
  }
}
Object.defineProperty(CelestialBody.prototype, "toString", {value: function() {return this.name}});

module.exports = CelestialBody;
