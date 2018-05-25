var path = require('path'),
fs = require("fs");
exports.privateKey = fs.readFileSync(path.join(__dirname, './private/xbox.key')).toString();
exports.certificate = fs.readFileSync(path.join(__dirname, './private/xbox.pem')).toString();