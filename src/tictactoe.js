class TicTacToe {
  constructor(channel, user1, user2) {
    this.channel = channel;
    this.player1 = new Player(user1, "X");
    this.player2 = new Player(user2, "O");
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
    if (this.currentPlayer.equals(this.player1))
      this.currentPlayer = this.player2;
    else this.currentPlayer = this.player1;
  }
  play(number) {
    if (this.gamestate[number] == "_") {
      this.gamestate[number] = this.currentPlayer.symbol;
      this.switchPlayer();
      return true;
    } else return false;
  }
  lineStats(line) {
    this.enemySymbol = this.currentPlayer.symbol = "X" ? "O" : "X";
    return {
      own: line.reduce((acc, val) => this.gamestate[val] == this.currentPlayer.symbol ? acc+1 : acc, 0),
      enemy: line.reduce((acc, val) => this.gamestate[val] == this.enemySymbol ? acc+1 : acc, 0),
      empty: line.reduce((acc, val) => this.gamestate[val] == "_" ? acc+1 : acc, 0)
    }
  }
  get bestMove() {
    for (let line of this.lines) {
      let stats = this.lineStats(line);
      if (stats.own == 2)
    }
  }
}

class Player {
  constructor(user, symbol) {
    this.user = user;
    this.symbol = symbol;
  }
  equals(player) {
    return this.symbol == player.symbol;
  }
}
