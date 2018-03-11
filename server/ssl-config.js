var path = require('path'),
fs = require("fs");
exports.privateKey = fs.readFileSync(path.join(__dirname, './private/style.man-kang.key')).toString();
exports.certificate = fs.readFileSync(path.join(__dirname, './private/style.man-kang.pem')).toString();