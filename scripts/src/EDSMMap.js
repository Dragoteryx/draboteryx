const weakmapPrivates = new WeakMap();
function prv(object) {
	if (!weakmapPrivates.has(object))
		weakmapPrivates.set(object, {});
	return weakmapPrivates.get(object);
}

class EDSMMap extends Map {
  constructor() {
    super();
    prv(this).indexes = new Map();
  }
  get(val) {
    let that = prv(this);
    if (typeof val == "string" && that.indexes.has(val.toLowerCase()))
      return super.get(that.indexes.get(val.toLowerCase())[0]);
    return super.get(val);
  }
  set(key, val, alias) {
    let that = prv(this);
    if (typeof alias == "string") {
      alias = alias.toLowerCase();
      if (!that.indexes.has(alias))
        that.indexes.set(alias, []);
      if (!that.indexes.get(alias).includes(key))
        that.indexes.get(alias).push(key);
    }
    super.set(key, val);
    return this;
  }
  has(val) {
    if (typeof val == "string")
      return prv(this).indexes.has(val.toLowerCase()) || super.has(val);
    return super.has(val);
  }
  clear() {
    prv(this).indexes.clear();
    return super.clear();
  }
}

module.exports = EDSMMap;
