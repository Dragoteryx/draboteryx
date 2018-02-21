const drabot = require("../drabot.js");
const tools = require("./tools.js");
const config = require("../config.js");

class TicTacToe {
  constructor(channel, player1, player2) {
    this.player1 = {sign: "X", member: player1};
    this.player2 = {sign: "O", member: player2};
    this.channel = channel;
    this.cases = [];
    for (let i = 0; i < 9; i++)
      this.cases.push("_");
    this.current = this.player1;
  }
  fill(id) {
    if (this.finished) return "game already finished";
    if (id < 0 || id > 8) return "wrong index";
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
  get finished() {
    let tab = [6, 3, 0];
    for (let id of tab) {
      if (this.cases[id] == this.cases[id+1] && this.cases[id+1] == this.cases[id+2] && this.cases[id] != "_")
        return true;
    }
    tab = [6, 7, 8];
    for (let id of tab) {
      if (this.cases[id] == this.cases[id-3] && this.cases[id-3] == this.cases[id-6] && this.cases[id] != "_")
        return true;
    }
    return ((this.cases[0] == this.cases[4] && this.cases[4] == this.cases[8]) || (this.cases[2] == this.cases[4] && this.cases[4] == this.cases[6])) && this.cases[4] != "_";
  }
  get embed() {
    let str = "```\n "+this.cases[6]+"   "+this.cases[7]+"   "+this.cases[8]+" \n\n";
  	str += " "+this.cases[3]+"   "+this.cases[4]+"   "+this.cases[5]+" \n\n";
  	str += " "+this.cases[0]+"   "+this.cases[1]+"   "+this.cases[2]+" \n```";
  	return tools.defaultEmbed().addField("Tic-Tac-Toe", str);
  }
  static grid() {
    let str = "```js\n 7   8   9 \n\n";
  	str += " 4   5   6 \n\n";
  	str += " 1   2   3 \n```";
  	return tools.defaultEmbed().addField("Tic-Tac-Toe", str);
  }
  get empty() {
    let nb = 0;
    for (let tcase of this.cases)
      if (tcase == "_") nb++
    return nb;
  }
  stringify() {
    return JSON.stringify(this.cases);
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
  random() {
    let nb;
    do {
      nb = tools.random(1, 9);
    } while (this.cases[nb] != "_");
    return nb+1;
  }
  best() {
    return this.random();
  }
}

async function command(msg) {
	if (msg.channel.playingttt) {
		msg.reply("please wait until the current game of Tic-Tac-Toe is finished.");
		return;
	}
	msg.channel.playingttt = true;
	await msg.channel.send(msg.member + " wants to play Tic-Tac-Toe. Does anyone want to play with him? Reply ``" + config.prefix + "tttplay`` within ``20`` seconds.");
	let msg2 = await msg.channel.waitResponse({delay: 20000, function: msg2 => {
		return (msg2.author.id != msg.author.id && msg2.content == config.prefix + "tttplay" && !msg.author.bot);
	}});
	if (!msg2)
		msg.channel.send("Sorry " + msg.member + ", but it seems like no one wants to play Tic-Tac-Toe right now.");
	else {
		let players = [msg.member, msg2.member];
		let withbot = players.reduce((acc, cur) => !acc ? cur.user.id ==  drabot.client.user.id : true, false);
		msg.channel.send("Players: " + players[0] + " and " + players[1] + ".\nYou probably already know the rules but I'll repeat then anyway: you need to align three of your marks in a horizontal, vertical or diagonal row.\nWhen it is your turn, you have ``20`` seconds to reply with the number that corresponds to the position where you want to place your mark.", TicTacToe.grid());
		players.sort(() => Math.random() - 0.5);
		let ttt = new TicTacToe(msg.channel.send, players[0], players[1]);
		msg.channel.tictactoe = ttt;
		msg.channel.send("The first player is... ").then(async msg3 => {
			await tools.sleep(1000);
			msg3.edit(msg3.content + players[0] + "!");
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
				if (!withbot) await msg.channel.send("It is now " + ttt.current.member + "'s turn.", ttt.embed);
				else await msg.channel.send("It's your turn, " + ttt.current.member + ".", ttt.embed);
				msg3 = await msg.channel.waitResponse({delay: 20000, function: msg3 => {
					if (msg3.author.id != ttt.current.member.user.id) return false;
					let choix = Math.floor(Number(msg3.content));
					if (isNaN(choix)) return false;
					if (choix < 1 || choix > 9) {
						msg.reply("you do know there are only 9 positions right?");
						return false;
					} else if (ttt.cases[choix-1] != "_") {
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
				ttt.fill(Math.floor(Number(msg3.content))-1);
				afk = false;
				if (!ttt.finished && ttt.empty == 0)
					break;
			}
		}
		if (ttt.finished) {
			if (ttt.current.member.user.id ==  drabot.client.user.id)
				msg.channel.send("I never thought I could win against you!", ttt.embed);
			else {
				if (!withbot) msg.channel.send(ttt.current.member + " won the game. Well played!", ttt.embed);
				else msg.channel.send("Nice one " + ttt.current.member + "!", ttt.embed);
			}
		} else if (ttt.empty == 0)
			msg.channel.send("Well that's a draw!", ttt.embed);
		else
			msg.channel.send("Both players stopped playing, the game is finished.");
		delete msg.channel.tictactoe;
	}
	delete msg.channel.playingttt;
}

TicTacToe.command = command;
module.exports = TicTacToe;
