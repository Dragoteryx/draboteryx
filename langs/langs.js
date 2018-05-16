const en = require("./lang_en.json");

class Lang {
  constructor(lg) {
    this.json = require("./lang_" + lg + ".json");
    let json = this.json;
    let parts = [];
    var proxy = new Proxy(function (...aliases) {
      let str = parts.join(".");
      parts = [];
      let str2;
      try {
        str2 = eval("json." + str);
        if (str2 === undefined) throw new Error();
      } catch(err) {
        try {
          str2 = eval("en." + str);
        } catch(err) {
          return str;
        }
      }
      if (str2 === undefined || str2 === null) return str;
      for (let i = 0; i < aliases.length; i += 2)
        str2 = str2.replaceAll(aliases[i], aliases[i+1]);      
      return str2;
    }, {
      has: () => true,
      get: function(object, name) {
        parts.push(name);
        return proxy;
      },
    });
    return proxy;
  }
}

module.exports = Lang;
