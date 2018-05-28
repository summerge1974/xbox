var path = require('path'),
fs = require("fs");

//sudo vi ~/.bash_profile
//export NODE_ENV=maomaochong 
console.log(process.env.NODE_ENV);

if ( process.env.NODE_ENV == 'maomaochong'){
    exports.privateKey = fs.readFileSync(path.join(__dirname, './private/maomaochong.key')).toString();
    exports.certificate = fs.readFileSync(path.join(__dirname, './private/maomaochong.pem')).toString();
}else{
    exports.privateKey = fs.readFileSync(path.join(__dirname, './private/xbox.key')).toString();
    exports.certificate = fs.readFileSync(path.join(__dirname, './private/xbox.pem')).toString();    
}
