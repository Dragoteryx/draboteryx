const discord = require("discord.js");
const tools = require("./tools.js");

const MAX_VALUE = 999999999;

Object.defineProperty(discord.User.prototype, "money", {
  get: function() {
    if (this.owner) return Infinity;
    else if (this._money > MAX_VALUE) return MAX_VALUE;
    else return this._money;
  },
  set: function(value) {
    if (this.owner) return;
    if (value > MAX_VALUE) value = MAX_VALUE;
    this._money = value;
    this.sendData({money: value});
  }
});

Object.defineProperty(discord.User.prototype, "giveMoney", {
  value: function(user, value) {
    if (!tools.validNumber(value, 0)) return false;
    if (this.id == user.id) return true;
    this.money -= value;
    user.money += value;
    return true;
  }
});

Object.defineProperty(discord.User.prototype, "takeMoney", {
  value: function(user, value) {
    return user.giveMoney(this, value);
  }
});

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

Object.defineProperty(discord.Guild.prototype, "fetchMoney", {
  value: async function() {
    let fetched = await this.fetchMembers();
    let members = Array.from(fetched.members.values());
    return Promise.all(members.map(member => member.user.fetchMoney()));
  }
});

module.exports = {
  MAX_VALUE: MAX_VALUE
}
