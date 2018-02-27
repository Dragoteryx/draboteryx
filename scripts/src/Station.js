class Station {
  constructor(system, obj) {
    this.system = system;
    delete obj.id64;
    for (let property of Object.keys(obj))
      this[property] = obj[property];
    this.updateTime = {};
    for (let property of Object.keys(obj.updateTime))
      this.updateTime[property] = new Date(obj.updateTime[property]);
  }
}
Object.defineProperty(Station.prototype, "toString", {value: function() {return this.name}});

module.exports = Station;
