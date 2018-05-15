class Poker {
  constructor(users = []) {
    this.players = new Map();
    this.deck = PokerDeck.fullDeck;
    users.forEach(user => {
      let player = new PokerPlayer(user);
      for (let i = 0; i <2; i++)
        player.deck.push(this.deck.pickRandom());
      player.deck.orderByValue();
      this.players.set(user.id, player);
    });
    this.common = new PokerDeck();
    for (let i = 0; i < 5; i++)
      this.common.push(this.deck.pickRandom());
  }
}

class PokerPlayer {
  constructor(user) {
    this.user = user;
    this.deck = new PokerDeck();
  }
}

class PokerDeck extends Array {
  constructor(cards = []) {
    super();
    cards.forEach(card => {
      this.push(card);
    });
  }
  pickRandom() {
    return this.shuffle().shift();
  }
  orderByValue() {
    this.sort((card1, card2) => card2.compareTo(card1));
    return this;
  }
  info(game) {
    let cards = new PokerDeck();
    this.forEach(card => {
      cards.push(card);
    });
    game.common.forEach(card => {
      cards.push(card);
    })
    cards.orderByValue();
    return Object.freeze({
      highest: cards[0].value
    });
  }
  static get fullDeck() {
    let cards = [];
    for (let i = 0; i < 4; i++) {
      cards = cards.concat([
        new PokerCard(i, "1", 13),
        new PokerCard(i, "2", 1),
        new PokerCard(i, "3", 2),
        new PokerCard(i, "4", 3),
        new PokerCard(i, "5", 4),
        new PokerCard(i, "6", 5),
        new PokerCard(i, "7", 6),
        new PokerCard(i, "8", 7),
        new PokerCard(i, "9", 8),
        new PokerCard(i, "10", 9),
        new PokerCard(i, "V", 10),
        new PokerCard(i, "Q", 11),
        new PokerCard(i, "K", 12)
      ]);
    }
    return new PokerDeck(cards);
  }
}

class PokerCard {
  constructor(colornb, number, value) {
    this.color = PokerCard.colors[colornb%4];
    this.number = number;
    this.value = value;
  }
  compareTo(card) {
    return this.value - card.value;
  }
  toString() {
    return this.number + this.color.icon;
  }
  static get colors() {
    return [
      {name: "Heart", icon: ":hearts:"},
      {name: "Diamond", icon: ":diamonds:"},
      {name: "Club", icon: ":clubs:"},
      {name: "Spade", icon: ":spades:"}
    ];
  }
}

async function command(msg) {
  let game = new Poker([msg.author]);
  let river = game.common;
  let cards = game.players.get(msg.author.id).deck;
  msg.channel.send("River:\n" + (() => {
    let str = "";
    river.forEach(card => {
      str += card + "   ";
    });
    return str;
  })());
  msg.channel.send("Your deck:\n" + (() => {
    let str = "";
    cards.forEach(card => {
      str += card + "   ";
    });
    return str;
  })());
  console.dir(cards.info(game), {colors: true});
}

module.exports = {
  command: command
};
