class TicTacToe {
  constructor(channel, member1, member2) {
    this._channel = channel;
    this.player1 = new Player(member1, "X", this);
    this.player2 = new Player(member2, "O", this);
    this.currentPlayer = this.player1;
    this.gamestate = [];
    for (let i = 0; i < 9; i++)
      this.gamestate.push("_");
    let diags = [[7, 5, 3], [1, 5, 9]];
    let lines = [[7, 8, 9], [4, 5, 6], [1, 2, 3], [7, 4, 1], [8, 5, 2], [9, 6, 3]]
    diags.shuffle();
    tab.shuffle();
    this.lines = diags.concat(lines);
  }
  switchPlayer() {
    if (this.player1.isCurrentPlayer)
      this.currentPlayer = this.player2;
    else this.currentPlayer = this.player1;
  }
  play(i) {
    if (i < 1 || i > 9) return false;
    if (this.gamestate[i-1] != "_") return false;
    this.gamestate[i-1] = this.currentPlayer.symbol;
    return true;
  }
  lineStats(line) {
    this.enemySymbol = this.currentPlayer.symbol == "X" ? "O" : "X";
    return {
      own: line.reduce((acc, i) => this.gamestate[i-1] == this.currentPlayer.symbol ? acc+1 : acc, 0),
      enemy: line.reduce((acc, i) => this.gamestate[i-1] == this.enemySymbol ? acc+1 : acc, 0),
      empty: line.reduce((acc, i) => this.gamestate[i-1] == "_" ? acc+1 : acc, 0)
    }
  }
  emptyOnLine(line) {
    let stats = this.lineStats(line);
    for (let i of line)
      if (this.gamestate[i-1] == "_") return i;
    return null;
  }
  get bestMove() {
    for (let line of this.lines) {
      let stats = this.lineStats(line);
      if (stats.own == 2) return this.emptyOnLine(line);
    }
    for (let line of this.lines) {
      let stats = this.lineStats(line);
      if (stats.enemy == 2) return this.emptyOnLine(line);
    }
    let center = 5;
    if (this.gamestate[center-1] == "_") return center;
    for (let i of [1, 3, 7, 9].shuffle())
      if (this.gamestate[i-1] == "_") return i;
    for (let i of [2, 4, 6, 8].shuffle())
      if (this.gamestate[i-1] == "_") return i;
    return NaN;
  }
  get currentGrid() {
    let str = "```\n "+this.gamestate[6]+"   "+this.gamestate[7]+"   "+this.gamestate[8]+" \n\n";
  	str += " "+this.gamestate[3]+"   "+this.gamestate[4]+"   "+this.gamestate[5]+" \n\n";
  	str += " "+this.gamestate[0]+"   "+this.gamestate[1]+"   "+this.gamestate[2]+" \n```";
  	return tools.defaultEmbed().addField("Tic-Tac-Toe", str);
  }
  get exampleGrid() {
    let str = "```js\n 7   8   9 \n\n";
  	str += " 4   5   6 \n\n";
  	str += " 1   2   3 \n```";
  	return tools.defaultEmbed().addField("Tic-Tac-Toe", str);
  }
  get finished() {

  }
}

class Player {
  constructor(member, symbol, ttt) {
    this.member = member;
    this.symbol = symbol;
    this._ttt = ttt;
  }
  equals(player) {
    return this.symbol == player.symbol;
  }
  get isCurrentPlayer() {
    return this._ttt.currentPlayer.equals(this);
  }
}
