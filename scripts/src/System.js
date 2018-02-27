const snekfetch = require("snekfetch");
const CelestialBody = require("./CelestialBody.js");
const Station = require("./Station.js");
const Faction = require("./Faction.js");

const weakmapPrivates = new WeakMap();
function prv(object) {
	if (!weakmapPrivates.has(object))
		weakmapPrivates.set(object, {});
	return weakmapPrivates.get(object);
}

class SystemsMap {
  constructor() {
    prv(this).map = new Map();
    prv(this).index = new Map();
    this.fetch("Sol");
    this.fetch("Colonia");
  }
  get(val, type) {
    if (val === undefined)
      throw new Error("'val' is undefined");
    if (typeof val != "string" && typeof val != "number")
      throw new Error("'val' must be a String or a Number");
    if (type === undefined)
      type = "name";
    if (type == "name") {
      let systems = [];
      for (let id of prv(this).index.get(val))
        systems.push(prv(this).map.get(id));
      return systems;
    }
    else if (type == "id")
      return prv(this).map.get(val);
    else
      throw new Error("Invalid type: 'name' or 'id'");

  }
  async fetch(name) {
    if (name === undefined)
      throw new Error("'name' is undefined");
    if (typeof name != "string")
      throw new Error("'name' must be a String");
    let res = await snekfetch.get("https://www.edsm.net/api-v1/systems?systemName=" + name + "&showId=1&showCoordinates=1&showPermit=1&showInformation=1");
    let data = JSON.parse(res.text);
    let systems = [];
    if (data.length == 0)
      return systems;
    for (let info of data) {
      let system = new System(info)
      prv(this).map.set(system.id, system);
      systems.push(system);
    }
    let ids = [];
    for (let system of systems)
      ids.push(system.id);
    prv(this).index.set(name, ids);
    return systems;
  }

  // IMPORTANT SYSTEMS
  get SOL() {
    return this.get("Sol").shift();
  }
  get COLONIA() {
    return this.get("Colonia").shift();
  }
}

class System {
  constructor(obj) {
    this.name = obj.name;
    this.id = obj.id;
    this.coordinates = obj.coords === undefined ? null : Object.freeze(obj.coords);
    this.requirePermit = obj.requirePermit;
    this.permitName = this.requirePermit ? obj.permitName : null;
    this.information = obj.information instanceof Array ? null : Object.freeze(obj.information);
    for (let property of Object.keys(this))
      Object.defineProperty(this, property, {writable: false});
    this.bodies = new Map();
    this.stations = new Map();
    this.factions = new Map();
    this.traffic = null;
    this.deaths = null;
    Object.defineProperty(this, "coords", {value: this.coordinates});
  }
  async fetchBodies() {
    let res = await snekfetch.get("https://www.edsm.net/api-system-v1/bodies?systemName=" + this.name + "&systemId=" + this.id);
    let data = JSON.parse(res.text).bodies;
    this.bodies = new Map();
    for (let info of data)
      this.bodies.set(info.name, new CelestialBody(this, info));
    return this.bodies;
  }
  async fetchStations() {
    let res = await snekfetch.get("https://www.edsm.net/api-system-v1/stations?systemName=" + this.name + "&systemId=" + this.id);
    let data = JSON.parse(res.text).stations;
    this.stations = new Map();
    for (let info of data)
      this.stations.set(info.name, new Station(this, info));
    return this.stations;
  }
  async fetchFactions() {
    let res = await snekfetch.get("https://www.edsm.net/api-system-v1/factions?systemName=" + this.name + "&systemId=" + this.id);
    let data = JSON.parse(res.text);
    this.factions = new Map();
    for (let info of data.factions) {
      let faction = new Faction(this, info);
      if (faction.id == data.controllingFaction.id)
        faction.controllingFaction = true;
      this.factions.set(faction.name, faction);
    }
    return this.factions;
  }
  async fetchTraffic() {
    let res = await snekfetch.get("https://www.edsm.net/api-system-v1/traffic?systemName=" + this.name + "&systemId=" + this.id);
    let data = JSON.parse(res.text);
    this.traffic = Object.freeze({total: data.traffic.total, week: data.traffic.week, day: data.traffic.day, breakdown: Object.freeze(data.breakdown)});
    return this.traffic;
  }
  async fetchDeaths() {
    let res = await snekfetch.get("https://www.edsm.net/api-system-v1/deaths?systemName=" + this.name + "&systemId=" + this.id);
    this.deaths = Object.freeze(JSON.parse(res.text).deaths);
    return this.deaths;
  }
  async sphere(minRadius, maxRadius) {
    if (minRadius === undefined)
      throw new Error("'minRadius' is undefined")
    if (maxRadius === undefined) {
      maxRadius = minRadius;
      minRadius = 0;
    }
    if (maxRadius < 0 || maxRadius > 200)
      throw new Error("'maxRadius' must be comprised within 0 and 200'");
    if (minRadius < 0 || minRadius > maxRadius)
      throw new Error("'minRadius' must be comprised within 0 and 'maxRadius''");
    let info = await snekfetch.get("https://www.edsm.net/api-v1/sphere-systems?systemName=" + this.name + "&radius=" + maxRadius + "&minRadius= " + minRadius + "&showId=1&showCoordinates=1&showPermit=1&showInformation=1");
    info = JSON.parse(info.text);
    let systems = new Map();
    for (let system of info)
      systems.set(info.name, new System(system));
    return systems;
  }
  async cube(size) {
    if (minRadius === undefined)
      throw new Error("'size' is undefined")
    if (size < 0 || size > 200)
      throw new Error("'size' must be comprised within 0 and 200'");
    let info = await snekfetch.get("https://www.edsm.net/api-v1/sphere-systems?systemName=" + this.name + "&size=" + size + "&showId=1&showCoordinates=1&showPermit=1&showInformation=1");
    info = JSON.parse(info.text);
    let systems = new Map();
    for (let system of info)
      systems.set(info.name, new System(system));
    return systems;
  }
  distance(other) {
    if (!(other instanceof System))
      return null;
    if (this.coords === null || other.coords === null)
      return null;
    return Math.sqrt(Math.pow(this.coords.x - other.coords.x, 2) + Math.pow(this.coords.y - other.coords.y, 2) + Math.pow(this.coords.z - other.coords.z, 2));
  }
}
Object.defineProperty(System.prototype, "toString", {value: function() {return this.name}});

module.exports = new SystemsMap();
