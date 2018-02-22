const drabot = require("../drabot.js");
const tools = require("./tools.js");
const config = require("../config.js");

class TicTacToe {
  constructor(player1, player2) {
    this.player1 = {sign: "X", member: player1};
    this.player2 = {sign: "O", member: player2};
    Object.defineProperty(this, "channel", {writable: false});
    Object.defineProperty(this, "player1", {writable: false});
    Object.defineProperty(this, "player2", {writable: false});
    this.cases = new Array(10).fill("_");
    this.cases[0] = "Z";
    this.current = this.player1;
  }

  // PLAY
  fill(id) {
    if (this.finished) return "game already finished";
    if (id < 1 || id > 9) return "wrong index";
    if (this.cases[id] != "_") return "not empty";
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

  // INFO
  get finished() {
    for (let lign of TicTacToe.wligns) {
      let stats = this.lignStats(lign);
      if (stats.own == 3 || stats.enemy == 3)
        return true;
    }
    return false;
  }
  get full() {
    return this.cases.every(sign => sign != "_");
  }
  get embed() {
    let str = "```\n "+this.cases[7]+"   "+this.cases[8]+"   "+this.cases[9]+" \n\n";
  	str += " "+this.cases[4]+"   "+this.cases[5]+"   "+this.cases[6]+" \n\n";
  	str += " "+this.cases[1]+"   "+this.cases[2]+"   "+this.cases[3]+" \n```";
  	return tools.defaultEmbed().addField("Tic-Tac-Toe", str);
  }
  static get wligns() {
    return [[7, 8, 9], [4, 5, 6], [1, 2, 3], [7, 4, 1], [8, 5, 2], [9, 6, 3], [7, 5, 3], [1, 5, 9]];
  }
  static get grid() {
    let str = "```js\n 7   8   9 \n\n";
  	str += " 4   5   6 \n\n";
  	str += " 1   2   3 \n```";
  	return tools.defaultEmbed().addField("Tic-Tac-Toe", str);
  }
  lignStats(lign) {
    let enemy = this.current.sign == "X" ? "O" : "X";
    return Object.freeze({
      own: lign.reduce((acc, id) => this.cases[id] == this.current.sign ? acc+1 : acc, 0),
      enemy: lign.reduce((acc, id) => this.cases[id] == enemy ? acc+1 : acc, 0),
      empty: lign.reduce((acc, id) => this.cases[id] == "_" ? acc+1 : acc, 0)
    });
  }

  // THE BOT PLAYS
  random() {
    if (this.full) return null;
    let nb;
    do {
      nb = tools.random(1, 9);
    } while (this.cases[nb] != "_");
    return nb;
  }
  emptyinArray(cases) {
    return cases.reduce((acc, id) => this.cases[id] == "_" ? id : acc, null);
  }
  best() {
    for (let lign of TicTacToe.wligns) {
      let stats = this.lignStats(lign);
      if (stats.own == 2 && stats.empty == 1) return this.emptyinArray(lign);
    }
    for (let lign of TicTacToe.wligns) {
      let stats = this.lignStats(lign);
      if (stats.enemy == 2 && stats.empty == 1) return this.emptyinArray(lign);
    }
    for (let lign of TicTacToe.wligns) {
      let stats = this.lignStats(lign);
      if (stats.own == 1 && stats.empty == 2) return this.emptyinArray(lign);
    }
    let corner = this.emptyinArray([1, 3, 7, 9]);
    if (this.cases[5] == "_") return 5;
    else if (corner !== null) return corner;
    else return this.random();
  }
  static fetchMessage(msg) {
    let str = msg.embeds[0].fields[0].value.replace("js", "");
  	while (str.includes("```"))
  		str = str.replace("```", "");
  	while (str.includes(" "))
  		str = str.replace(" ", "");
  	let tab = str.split("\n");
  	str = tab[5] + tab[3] + tab[1];
  	return str.split("");
  }
}

async function command(msg) {
	if (msg.channel.playingttt) {
		msg.reply("please wait until the current game of Tic-Tac-Toe is finished.");
		return;
	}
  let other = null;
  let withbot = false;
  if (msg.content.split(" ").length != 1)
    other = (await tools.stringToMembers(msg.content.replace(config.prefix + "tictactoe ", ""), msg.guild)).shift();
  if (other === undefined) {
    msg.reply("there doesn't seem to be anyone called like that.");
    return;
  } else if (other !== null) {
    withbot = other.user.id == drabot.client.user.id;
    if (other.user.id == msg.author.id) {
      msg.reply("even though it would be an easy win, you can't play Tic-Tac-Toe alone.");
      return;
    }
  }
	msg.channel.playingttt = true;
  let msg2;
  if (!withbot) {
    if (other === null)
      await msg.channel.send(msg.member.displayed + " wants to play Tic-Tac-Toe. Does anyone want to play with him? Reply ``" + config.prefix + "tttplay`` within ``20`` seconds.");
    else
      await msg.channel.send(other.displayed + "? " + msg.member.displayed + " wants to play Tic-Tac-Toe with you. Reply ``" + config.prefix + "tttplay`` within ``20`` seconds.");
  	msg2 = await msg.channel.waitResponse({delay: 20000, function: msg2 => {
      if (other !== null && other.user.id != msg2.author.id) return;
  		return ((msg2.author.id != msg.author.id && msg2.content == config.prefix + "tttplay") || (msg2.author.id == msg.author.id && msg2.content == config.prefix + "tttbot"));
  	}});
  } else
    msg2 = await msg.reply("you want to play with me? Okay! :heart:");
	if (!msg2)
		msg.channel.send("Sorry" + msg.member.displayed + ", but it seems like no one wants to play Tic-Tac-Toe right now.");
	else {
		let players = [msg.member, msg2.member];
		let withbot = players.reduce((acc, cur) => !acc ? cur.user.id ==  drabot.client.user.id : true, false);
		msg.channel.send("Players: " + players[0].displayed + " and " + players[1].displayed + ".\nYou probably already know the rules but I'll repeat then anyway: you need to align three of your marks in a horizontal, vertical or diagonal row.\nWhen it is your turn, you have ``20`` seconds to reply with the number that corresponds to the position where you want to place your mark.", TicTacToe.grid);
		players.sort(() => Math.random() - 0.5);
		let ttt = new TicTacToe(players[0], players[1]);
		msg.channel.tictactoe = ttt;
		msg.channel.send("The first player is... ").then(async msg3 => {
			await tools.sleep(1000);
			msg3.edit(msg3.content + players[0].displayed + "!");
		})
		await tools.sleep(2000);
		let afk = false;
		while (!ttt.finished) {
			let msg3;
			if (ttt.current.member.user.id ==  drabot.client.user.id) {
				await msg.channel.send("It's my turn.", ttt.embed);
				await tools.sleep(1000);
			 	msg3 = await msg.channel.send(ttt.best());
			} else {
				if (!withbot) await msg.channel.send("It is now " + ttt.current.member.displayed + "'s turn.", ttt.embed);
				else await msg.channel.send("It's your turn, " + ttt.current.member.displayed + ".", ttt.embed);
				msg3 = await msg.channel.waitResponse({delay: 20000, function: msg3 => {
					if (msg3.author.id != ttt.current.member.user.id) return false;
					let choix = Math.floor(Number(msg3.content));
					if (isNaN(choix)) return false;
					if (choix < 1 || choix > 9) {
						msg.reply("you do know there are only 9 positions right?");
						return false;
					} else if (ttt.cases[choix] != "_") {
						msg.reply("this position is not empty.");
						return false;
					}
					return true;
				}});
			}
			if (!msg3) {
				if (!afk) {
					msg.channel.send(ttt.current.member + " waited for too long.");
					afk = true;
					ttt.pass();
				} else
					break;
			} else {
				ttt.fill(Math.floor(Number(msg3.content)));
				afk = false;
				if (!ttt.finished && ttt.full)
					break;
			}
		}
		if (ttt.finished) {
			if (ttt.current.member.user.id ==  drabot.client.user.id)
				msg.reply("thanks for letting me win! :heart:", ttt.embed);
			else {
				if (!withbot) msg.channel.send(ttt.current.member.displayed + " won the game. Well played!", ttt.embed);
				else msg.channel.send("Nice one " + ttt.current.member.displayed + "!", ttt.embed);
			}
		} else if (ttt.full)
			msg.channel.send("Well that's a draw!", ttt.embed);
		else
			msg.channel.send("Both players stopped playing, the game is finished.");
		delete msg.channel.tictactoe;
	}
	delete msg.channel.playingttt;
}

TicTacToe.command = command;
module.exports = TicTacToe;
