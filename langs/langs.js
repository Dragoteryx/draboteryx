class Lang {
  constructor(...jsonFiles) {
    let parts = [];
    var proxy = new Proxy(function(...aliases) {
      let partsJoined = parts.join(".");
      parts = [];
      let str = jsonFiles.reduceRight((acc, jsonFile) => {
        try {
          let str = eval("jsonFile." + partsJoined);
          return str !== undefined && str !== null ? str : acc;
        } catch(err) {
          return acc;
        }      
      }, partsJoined);
      if (str) for (let i = 0; i < aliases.length; i += 2)
        str = str.replaceAll(aliases[i], aliases[i+1]);
      return str;
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
