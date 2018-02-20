const noise = ["0","1","2","3","4","5","6","7","8","9",
"a","b","c","d","e","f","g","h","i","j","k","l","m","n","o","p","q","r","s","t","u","v","w","x","y","z",
"A","B","C","D","E","F","G","H","I","J","K","L","M","N","O","P","Q","R","S","T","U","V","W","X","Y","Z"
];

exports.genNoise = length => {
	let str = "";
	for (let i = 0; i < length; i++)
		str += noise.random();
	return str;
}

let cryptings = new Map();

exports.crypt = (message, key) => {
  let crypted = exports.genNoise(36);
  cryptings.set(crypted + "/" + key, message);
  return crypted;
}

exports.decrypt = (crypted, key) => {
  return cryptings.get(crypted + "/" + key);
}
