const tools = require("./tools.js");

class TicTacToe {
  constructor(channel, player1, player2) {
    this.player1 = {sign: "X", member: player1};
    this.player2 = {sign: "O", member: player2};
    this.channel = channel;
    this.cases = [];
    for (let i = 0; i < 9; i++)
      this.cases.push(" ");
    this.current = this.player1;
  }
  fill(id) {
    if (this.finished) return "game ended";
    if (id < 0 || id > 8) return "wrong index";
    if (this.cases[id] != " ") return "not empty";
    this.cases[id] = this.current.sign;
    if (this.finished) return "game ended";
    this.pass();
    return "next player";
  }
  pass() {
    if (this.current.member.user.id == this.player1.member.user.id)
      this.current = this.player2;
    else
      this.current = this.player1;
  }
  get finished() {
    let tab = [0, 3, 6];
    for (let id of tab) {
      if (this.cases[id] == this.cases[id+1] && this.cases[id+1] == this.cases[id+2] && this.cases[id] != " ")
        return true;
    }
    tab = [0, 1, 2];
    for (let id of tab) {
      if (this.cases[id] == this.cases[id+3] && this.cases[id+3] == this.cases[id+6] && this.cases[id] != " ")
        return true;
    }
    return ((this.cases[0] == this.cases[4] && this.cases[4] == this.cases[8]) || (this.cases[2] == this.cases[4] && this.cases[4] == this.cases[6])) && this.cases[4] != " ";
  }
  get embed() {
    let str = "```\n "+this.cases[0]+"   "+this.cases[1]+"   "+this.cases[2]+"\n\n";
  	str += " "+this.cases[3]+"   "+this.cases[4]+"   "+this.cases[5]+"\n\n";
  	str += " "+this.cases[6]+"   "+this.cases[7]+"   "+this.cases[8]+"\n```";
  	return tools.defaultEmbed().addField("Tic-Tac-Toe", str);
  }
  get grid() {
    let str = "```js\n 1   2   3\n\n";
  	str += " 4   5   6\n\n";
  	str += " 7   8   9\n```";
  	return tools.defaultEmbed().addField("Tic-Tac-Toe", str);
  }
  get empty() {
    let nb = 0;
    for (let tcase of this.cases)
      if (tcase == " ") nb++
    return nb;
  }
}

module.exports = TicTacToe;
