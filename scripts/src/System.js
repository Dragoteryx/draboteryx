const snekfetch = require("snekfetch");
const CelestialBody = require("./CelestialBody.js");
const Station = require("./Station.js");
const Faction = require("./Faction.js");
const EDSMMap = require("./EDSMMap.js");

const weakmapPrivates = new WeakMap();
function prv(object) {
	if (!weakmapPrivates.has(object))
		weakmapPrivates.set(object, {});
	return weakmapPrivates.get(object);
}

class System {
  constructor(handler, obj) {
		prv(this).handler = handler;
		this.id = obj.id;
		this.name = obj.name;
		this.coordinates = Object.freeze(obj.coords);
		this.coordsLocked = obj.coordsLocked;
		this.requirePermit = obj.requirePermit;
		this.permitName = this.requirePermit ? obj.permitName : null;
		this.information = obj.information instanceof Array ? null : Object.freeze(obj.information);
		for (let property of Object.keys(this))
			Object.defineProperty(this, property, {writable: false});
    this.bodies = null;
    this.stations = null;
		this.factions = null;
    this.traffic = null;
    this.deaths = null;
  }
	get controllingFaction() {
		if (!this.information.faction)
      return undefined;
    return prv(this).handler.factions.get(this.information.faction);
	}
	get coords() {
		return this.coordinates;
	}
	async fetchAll() {
		let fetched = {};
		fetched.bodies = await this.fetchBodies()
		fetched.stations = await this.fetchStations();
		fetched.factions = await this.fetchFactions();
		fetched.traffic = await this.fetchTraffic();
		fetched.deaths = await this.fetchDeaths();
		return fetched;
	}
  async fetchBodies() {
    let res = await snekfetch.get("https://www.edsm.net/api-system-v1/bodies?systemName=" + this.name + "&systemId=" + this.id);
    let data = JSON.parse(res.text).bodies;
		if (data === undefined)
			return null;
    this.bodies = new EDSMMap();
    for (let info of data) {
			let body = new CelestialBody(prv(this).handler, this, info);
      this.bodies.set(body.id, body, body.name);
			prv(this).handler.bodies.set(body.id, body, body.name);
		}
    return this.bodies;
  }
  async fetchStations() {
    let res = await snekfetch.get("https://www.edsm.net/api-system-v1/stations?systemName=" + this.name + "&systemId=" + this.id);
    let data = JSON.parse(res.text).stations;
		if (data === undefined)
			return null;
    this.stations = new EDSMMap();
    for (let info of data) {
			let station = new Station(prv(this).handler, this, info);
      this.stations.set(station.id, station, station.name);
			prv(this).handler.stations.set(station.id, station, station.name);
		}
    return this.stations;
  }
	async fetchFactions() {
		let res = await snekfetch.get("https://www.edsm.net/api-system-v1/factions?systemName=" + this.name + "&systemId=" + this.id);
    let data = JSON.parse(res.text).factions;
		if (data === undefined)
			return null;
		this.factions = new EDSMMap();
		for (let info of data) {
			let faction = new Faction(prv(this).handler, info);
      this.factions.set(faction.id, faction, faction.name);
			prv(this).handler.factions.set(faction.id, faction, faction.name);
		}
		return this.factions;
	}
  async fetchTraffic() {
    let res = await snekfetch.get("https://www.edsm.net/api-system-v1/traffic?systemName=" + this.name + "&systemId=" + this.id);
    let data = JSON.parse(res.text);
		if (data.traffic === undefined || data.breakdown === undefined)
			return null;
    this.traffic = Object.freeze({total: data.traffic.total, week: data.traffic.week, day: data.traffic.day, breakdown: Object.freeze(data.breakdown)});
    return this.traffic;
  }
  async fetchDeaths() {
    let res = await snekfetch.get("https://www.edsm.net/api-system-v1/deaths?systemName=" + this.name + "&systemId=" + this.id);
		let data = JSON.parse(res.text).deaths;
		if (data === undefined)
			return null;
    this.deaths = Object.freeze(data);
    return this.deaths;
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

module.exports = System;
