const overwatchProfiles = new Map();

function fetchOWStats(username, discriminator) {
	return new Promise((resolve, reject) => {
		let link = "https://owapi.net/api/v3/u/" + username + "-" + discriminator + "/blob";
		link.fetchHTTP().then(res => {
			resolve(JSON.parse(res.text));
		}).catch(reject);
	});
}

exports.fetchOW = (username, discriminator, cache) => {
  if (cache === undefined) cache = true;
	return new Promise(async (resolve, reject) => {
    try {
      let profile;
			if (overwatchProfiles.has(username + "#" + discriminator))
				profile = overwatchProfiles.get(username + "#" + discriminator);
			else {
				let stats = await fetchOWStats(username, discriminator);
        if (cache)
				    overwatchProfiles.set(username + "#" + discriminator, stats);
				profile = stats;
			}
      resolve(profile.eu);
		} catch(err) {
			reject(err);
		}
	});
}

exports.fetchOWPlaytimes = profile => {
  let heroes = Object.getOwnPropertyNames(profile.heroes.playtime.quickplay);
  let mosts = [];
  let playtimes = [];
  while (true) {
    let most;
    let playtime = 0;
    for (let hero of heroes) {
      if (profile.heroes.playtime.quickplay[hero] > playtime && !mosts.includes(hero)) {
        most = hero;
        playtime = profile.heroes.playtime.quickplay[hero];
      }
    }
    if (most === undefined)
      break;
    mosts.push(most);
    playtimes.push({name: most, playtime: playtime});
  }
  return playtimes;
}

exports.fetchWF = platform => {
	return new Promise((resolve, reject) => {
		if (!["pc", "ps4", "xb1"].includes(platform)) {
			reject(new Error("invalid platform"));
			return;
		}
		let link = "http://content.PLATFORM.warframe.com/dynamic/worldState.php";
		link = link.replace("PLATFORM", platform).replace(".pc.", ".");
		link.fetchHTTP().then(res => {
			resolve(JSON.parse(res.text));
		}).catch(reject);
	});
}
