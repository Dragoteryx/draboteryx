/* jshint node:true, evil:true, asi:true, esversion:6*/
"use strict";

exports.mysql = require("mysql");
exports.mysql.connect(process.env.JAWSDB_URL);
