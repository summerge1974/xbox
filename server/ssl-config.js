var path = require('path'),
fs = require("fs");
exports.privateKey = fs.readFileSync(path.join(__dirname, './private/maomaochong.key')).toString();
exports.certificate = fs.readFileSync(path.join(__dirname, './private/maomaochong.pem')).toString();