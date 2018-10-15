const crypto = require("crypto-js");

const noise = ["0","1","2","3","4","5","6","7","8","9",
"a","b","c","d","e","f","g","h","i","j","k","l","m","n","o","p","q","r","s","t","u","v","w","x","y","z",
"A","B","C","D","E","F","G","H","I","J","K","L","M","N","O","P","Q","R","S","T","U","V","W","X","Y","Z"
];

module.exports = {
	genNoise: length => {
		let str = "";
		for (let i = 0; i < length; i++)
			str += noise.random();
		return str;
	},
	encrypt: (message, key) => crypto.AES.encrypt(message, key).toString(),
	decrypt: (crypted, key) => crypto.AES.decrypt(crypted, key).toString(crypto.enc.Utf8)
}
