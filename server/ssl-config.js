var path = require('path'),
fs = require("fs");

//NODE_ENV=test pm2 start server/server.js --name 'xbox'
// 新服务器pm2 启动时，需要制定环境变量
console.log(process.env.NODE_ENV);

if ( process.env.NODE_ENV == 'maomaochong'){
    exports.privateKey = fs.readFileSync(path.join(__dirname, './private/maomaochong.key')).toString();
    exports.certificate = fs.readFileSync(path.join(__dirname, './private/maomaochong.pem')).toString();
}else{
    exports.privateKey = fs.readFileSync(path.join(__dirname, './private/xbox.key')).toString();
    exports.certificate = fs.readFileSync(path.join(__dirname, './private/xbox.pem')).toString();    
}
