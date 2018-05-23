var log4js = require('log4js');
var needle = require('needle')
require('dotenv').config({ path: './config/.env' });

module.exports = function(Common) {

    DoSQL = function (SQL, resultFun, Connect) {
        EWTRACE(SQL);

        var dataSource = Connect;
        if (dataSource == undefined)
            dataSource = Common.app.datasources.main_DBConnect;

        if (resultFun == undefined)
            dataSource.connector.execute(SQL, function (err) {
                if (err) {
                    EWTRACEIFY(err);
                    throw err;
                }
            });
        else
            dataSource.connector.execute(SQL, resultFun);
    }

    /********************************************************* 
    * @Author: summer.ge 
    * @Date: 2017-08-24 13:48:31 
    * @Desc: 查询单条SQL，纳入数组后，由Promise.All统一执行
    * @Param: SQL           sql语法，可用；同时执行多条
    *         ResultObj     当前执行后返回的数据对象
    *         tx            事物对象
    *         Connect       数据库连接，如果不填则获取当前连接名为main_DBConnect
    *********************************************************/
   ExecuteSyncSQLResult = function (bsSQL, ResultObj, tx, Connect) {
    return new Promise(function (resolve, reject) {
        try {
            EWTRACE(bsSQL);
            var dataSource = Connect;
            if (dataSource == undefined)
                dataSource = Common.app.datasources.main_DBConnect;
            
            dataSource.connector.executeSQL(bsSQL, {}, { transaction: tx }, function (err, result) {
                if (err) {
                    reject(err);
                } else {
                    if (ResultObj)
                        ResultObj.Result = result;
                    resolve(result);
                }
            });
        } catch (ex) {
            reject(ex);
        }
    });
}
    stackInfo = function() {
        var path = require('path');
        var stackReg = /at\s+(.*)\s+\((.*):(\d*):(\d*)\)/i;
        var stackReg2 = /at\s+()(.*):(\d*):(\d*)/i;
        var stacklist = (new Error()).stack.split('\n').slice(3);
        var s = stacklist[0];
        var sp = stackReg.exec(s) || stackReg2.exec(s);
        var data = {};
        if (sp && sp.length === 5) {
            data.method = sp[1].substr(sp[1].indexOf('.') + 1);
            data.path = sp[2];
            data.line = sp[3];
            data.pos = sp[4];
            data.file = path.basename(data.path);
        }

        return data;
    }
    /**
     * 日志相关
     */
    log4js.configure({
        appenders: {
            console: {
                type: 'console'
            },
            debug: {
                type: 'file',
                filename: 'logs//cheese.log',
                layout: {
                    type: 'pattern',
                    pattern: '[%d{yyyy/MM/dd hh:mm:ss} pid:%z] [%p %X{user}] %m%n'
                },
                "maxLogSize": 10485760,
                "numBackups": 30
            }
        },
        categories: {
            default: {
                appenders: ['debug', 'console'],
                level: 'debug'
            }
        }
    });

    var logger = log4js.getLogger('debug');
    EWTRACEBEGIN = function() {
        logger.addContext('user', stackInfo()['method']);
        logger.info("BEGIN\r");
    }

    EWTRACEEND = function(obj) {

        logger.addContext('user', stackInfo()['method']);
        logger.info("END return:" + JSON.stringify(obj) + "\r");
        return obj;
    }

    EWTRACE = function(Message) {
        logger.addContext('user', stackInfo()['method']);
        logger.info(Message + "\r");
    }
    //接受参数
    EWTRACEIFY = function(Message) {
        logger.addContext('user', stackInfo()['method']);
        logger.warn(JSON.stringify(Message) + "\r");
    }
    //提醒
    EWTRACETIP = function(Message) {
        logger.addContext('user', stackInfo()['method']);
        logger.warn("Tip:" + JSON.stringify(Message) + "\r");
    }
    //错误
    EWTRACEERROR = function(Message) {
        logger.addContext('user', stackInfo()['method']);
        logger.error(+Message + "\r");
    }

    /**
     * 日期相关函数
     */
    Date.prototype.format = function(format) {
        var o = {
            "M+": this.getMonth() + 1, //month 
            "d+": this.getDate(), //day 
            "h+": this.getHours(), //hour 
            "m+": this.getMinutes(), //minute 
            "s+": this.getSeconds(), //second 
            "q+": Math.floor((this.getMonth() + 3) / 3), //quarter 
            "S": this.getMilliseconds() //millisecond 
        }
        if (/(y+)/.test(format)) {
            format = format.replace(RegExp.$1, (this.getFullYear() + "").substr(4 - RegExp.$1.length));
        }
        for (var k in o) {
            if (new RegExp("(" + k + ")").test(format)) {
                format = format.replace(RegExp.$1, RegExp.$1.length == 1 ? o[k] : ("00" + o[k]).substr(("" + o[k]).length));
            }
        }
        return format;
    }

    getWeChatToken = function(userInfo) {

        var jwt = require('jsonwebtoken');
        var rf = require("fs");
        var cert = rf.readFileSync("jwt_rsa_private_key.pem", "utf-8");

        return new Promise(function(resolve, reject) {
            jwt.sign(userInfo, cert, {
                algorithm: 'RS256',
                expiresIn: '1d'
            }, function(err, token) {
                if (err) {
                    reject(err);
                } else {
                    resolve(token);
                }
            });
        });

    }


    GetOpenIDFromToken = function(token) {
        var jwt = require('jwt-simple');
        var rf = require("fs");
        var secret = rf.readFileSync("jwt_rsa_public_key.pem", "utf-8");

        var decoded = null;

        try {
            decoded = jwt.decode(token, secret);
            EWTRACEIFY(decoded);
            return decoded;
        } catch (err) {
            throw (err);
        }
    }

    wx_GetNickName = function(openId) {
        return new Promise(function(resolve, reject) {
            var url = process.env.global_wxurl+"/nickname?appId="+process.env.wxAppID+"&openid=" + openId;
            console.log(url);
            needle.get(encodeURI(url), null, function(err, userInfo) {

                if (err) {
                    reject(err);
                } else {

                    resolve(userInfo.body);
                }
            });
        });
    }

    wx_CreateOrders = function(fee, openid) {
        return new Promise(function(resolve, reject) {
            var _fee = fee * 100;
            var url = process.env.global_wxurl+"/createorders?appId="+process.env.wxAppID+"&inside_no=0&fee="+_fee+"&notifyUrl="+process.env.pay_notify+"&openid="+openid;
            console.log(url);
            needle.get(encodeURI(url), null, function(err, userInfo) {

                if (err) {
                    reject(err);
                } else {

                    resolve(userInfo.body);
                }
            });
        });
    }    
};