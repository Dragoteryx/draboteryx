"use strict";
const http = require("http");
const fs = require("fs");
const url = require("url");

let authorized = ["", "index.html", "unknown.html", "files/websitewallpaper.png", "style.css"];

// WEBSERVER
http.createServer((req, res) => {
	let page = req.url.replace("/", "").split("?")[0];
	console.log("[WEB] => " + page);
	if (authorized.includes(page)) {
		if (page == "") {
			res.writeHead(200, {"Content-Type": "text/html"});
			if (process.env.HEROKU !== undefined)
				res.end('<script language="javascript">document.location.href="https://draboteryx.herokuapp.com/index.html"</script>');
			else
				res.end('<script language="javascript">document.location.href="http://localhost/index.html"</script>');
		} else if (page.endsWith(".html")) {
			fs.readFile(page, (err, data) => {
				fs.readFile("headerfooter.html", (err, data2) => {
          let hf = new String(data2).split("<!--CUT-->");
          res.writeHead(200, {"Content-Type": "text/html"});
          res.end(new String(data).replace("<!--HEADER-->", hf[0]).replace("<!--FOOTER-->", hf[1]));
        });
			});
		} else if (page.endsWith(".css")) {
			fs.readFile(page, (err, data) => {
				if (err) throw err;
			  res.writeHead(200, {"Content-Type": "text/css"});
				res.end(data);
			});
		} else if (page.endsWith(".png")) {
			fs.readFile(page, (err, data) => {
				if (err) throw err;
			  res.writeHead(200, {"Content-Type": "image/png"});
				res.end(data);
			});
		}
	} else {
		console.log("[WEB] =X unknown/unauthorized page (" + page + ")");
		res.writeHead(404);
		if (process.env.HEROKU !== undefined)
			res.end('<script language="javascript">document.location.href="https://draboteryx.herokuapp.com/unknown.html"</script>');
		else
			res.end('<script language="javascript">document.location.href="http://localhost/unknown.html"</script>');
	}
}).listen(process.env.PORT);
console.log("[WEB] Web server ready, listening to port " + process.env.PORT);
