const discord = require("discord.js");
const tools = require("./tools.js");

Object.defineProperty(discord.User.prototype, "fetchMoney", {
  value: async function() {
    if (this._money === undefined) {
      let data = await this.fetchData();
      if (data.money === undefined) this._money = 0;
      else this._money = data.money;
    }
    return this._money;
  }
});

Object.defineProperty(discord.User.prototype, "money", {
  get: function() {
    if (this.owner) return Infinity;
    else return this._money;
  },
  set: function(value) {
    if (this.owner) return;
    this._money = value;
    this.sendData({money: value});
  }
});

Object.defineProperty(discord.User.prototype, "giveMoney", {
  value: function(user, value) {
    if (this.id == user.id) return true;
    if (!tools.validNumber(value, 0)) return false;
    this.money -= value;
    user.money += value;
    return true;
  }
});

Object.defineProperty(discord.User.prototype, "takeMoney", {
  value: function(user, value) {
    return user.giveMoney(this, value);
  }
})
