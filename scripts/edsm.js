// REQUIRES
const snekfetch = require("snekfetch");
const Commander = require("./src/Commander.js");
const System = require("./src/System.js");
const EDSMMap = require("./src/EDSMMap.js");

const weakmapPrivates = new WeakMap();
function prv(object) {
	if (!weakmapPrivates.has(object))
		weakmapPrivates.set(object, {});
	return weakmapPrivates.get(object);
}

class EDSMHandler {
  constructor() {
    this.token = null;
    this.systems = new EDSMMap();
    this.bodies = new EDSMMap();
    this.stations = new EDSMMap();
    this.factions = new EDSMMap();
    for (let property of Object.keys(this))
      Object.defineProperty(this, property, {writable: false});
    this.fetchSystems("Sol");
    this.fetchSystems("Colonia");
  }
  async fetchCommander(name) {
    null;
  }
  async fetchSystems(name) {
    let res = await snekfetch.get("https://www.edsm.net/api-v1/systems?systemName=" + name + "&showId=1&showCoordinates=1&showPermit=1&showInformation=1");
    let data = JSON.parse(res.text);
    let systems = new EDSMMap();
    for (let info of data) {
      let system = new System(this, info);
      this.systems.set(system.id, system, system.name);
      systems.set(system.id, system, system.name);
    }
    return systems;
  }
	async knownSystem(name) {
		let res = await snekfetch.get("https://www.edsm.net/api-v1/systems?systemName=" + name + "&showId=1&showCoordinates=1&showPermit=1&showInformation=1");
    let data = JSON.parse(res.text);
		return data.length != 0;
	}

  // IMPORTANT SYSTEMS
  get SOL() {
    return this.systems.get("Sol");
  }
  get COLONIA() {
    return this.systems.get("Colonia");
  }
}

module.exports = EDSMHandler;
