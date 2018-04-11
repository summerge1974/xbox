'use strict';

module.exports = function(Xboxmanager) {
    var _ = require('underscore');
    var sha1 = require('sha1');
    
    var app = require('../../server/server');
    app.DisableSystemMethod(Xboxmanager);
    const needle = require('needle')
    require('dotenv').config({
        path: './config/.env'
    });

    Xboxmanager.login = function(userInfo, cb) {
        EWTRACEBEGIN();

        var url = "https://api.weixin.qq.com/sns/jscode2session?appid=" + process.env.wxProductProjectAppID + "&secret=" + process.env.wxProductProjectSecret + "&js_code=" + userInfo.code + "&grant_type=authorization_code";
        EWTRACE(url);

        needle.get(encodeURI(url), {}, function(err, resp) {

            
            if (err) {

                cb(err, EWTRACEEND({
                    status: 0,
                    "token": err.message
                }));
            } else {

                var userInfo = JSON.parse(resp.body);
                if ( !_.isUndefined(userInfo.errcode ))
                {
                    cb(null, EWTRACEEND({
                        status: 0,
                        "token": userInfo.errmsg
                    }));
                    return;
                }
                getWeChatToken(JSON.parse(resp.body)).then(function(resultToken) {
                    EWTRACE(resp.body);
                    var bsSQL = "select * from xb_manager where openid = '" + userInfo.openid + "'";
                    DoSQL(bsSQL, function(err, result) {

                        if (err) {
                            cb(err, EWTRACEEND({
                                status: 0,
                                "token": err.message
                            }));
                        } else {
                            if (result.length == 0) {
                                bsSQL = "insert into xb_manager(openid,deviceid) values('" + userInfo.openid + "','11111111')";
                                DoSQL(bsSQL);
                            }

                            cb(null, EWTRACEEND({
                                status: 1,
                                "token": resultToken
                            }));
                        }
                    })

                })
            }
        });

    }
    Xboxmanager.remoteMethod(
        'login', {
            http: {
                verb: 'post'
            },
            description: '管理员登录',
            accepts: {
                arg: 'userInfo',
                type: 'object',
                http: {
                    source: 'body'
                },
                description: '{code:11111111}'
            },
            returns: {
                arg: 'echostr',
                type: 'object',
                root: true
            }

        }
    );


    Xboxmanager.getUserInfo = function(token, cb) {
        EWTRACEBEGIN();

        var OpenID = {};
        try {
            OpenID = GetOpenIDFromToken(token);
        } catch (err) {
            cb(err, EWTRACEEND({
                status: 0,
                "result": ""
            }));
            return;
        }

        var bsSQL = "select name,phone,deviceid from xb_manager where openid = '" + OpenID.openid + "'";
        DoSQL(bsSQL, function(err, result) {
            if (err) {
                cb(err, EWTRACEEND({
                    status: 0,
                    "result": ""
                }));
            } else {
                cb(err, EWTRACEEND({
                    status: 1,
                    "result": result
                }));
            }
        });

    }
    Xboxmanager.remoteMethod(
        'getUserInfo', {
            http: {
                verb: 'post'
            },
            description: '管理员登录',
            accepts: {
                arg: 'token',
                type: 'string',
                http: function(ctx) {
                    var req = ctx.req;
                    return req.headers.token;
                },
                description: 'token'
            },
            returns: {
                arg: 'echostr',
                type: 'object',
                root: true
            }

        }
    );

    Xboxmanager.getUserReturn = function(userInfo, token, cb) {
        EWTRACEBEGIN();

        var OpenID = {};
        try {
            OpenID = GetOpenIDFromToken(token);
        } catch (err) {
            cb(err, EWTRACEEND({
                status: 0,
                "result": ""
            }));
            return;
        }

        var bsSQL = "select openid,a.bookid,b.title,b.author,startDate,date_add(startDate, interval 30 day) as endDate from xb_userbooks a, xb_books b where a.bookid = b.bookid and openid = '" + userInfo.id + "' and returndate is null";
        DoSQL(bsSQL, function(err, result) {
            if (err) {
                cb(err, EWTRACEEND({
                    status: 0,
                    "result": ""
                }));
            } else {
                if ( result.length == 0 ){
                    cb(null, EWTRACEEND({
                        status: 0,
                        "result": "用户未借书或已还清~"
                    }));
                    return;
                }

                var _result = {};

                _result.id = userInfo.id;
                _result.lease = {};
                _result.lease.startDate = result[0].startDate;
                _result.lease.endDate = result[0].endDate;
                _result.details = [];

                result.forEach(function(item) {

                    var _detail = {};
                    _detail.id = item.bookid;
                    _detail.title = item.title;
                    _detail.author = item.author;
                    _result.details.push(_detail);
                })


                cb(null, EWTRACEEND({
                    status: 1,
                    "result": _result
                }));
            }
        });

    }
    Xboxmanager.remoteMethod(
        'getUserReturn', {
            http: {
                verb: 'post'
            },
            description: '得到用户未还的图书包',
            accepts: [{
                arg: 'userInfo',
                type: 'object',
                http: {
                    source: 'body'
                },
                description: '{id:12345678}'
            }, {
                arg: 'token',
                type: 'string',
                http: function(ctx) {
                    var req = ctx.req;
                    return req.headers.token;
                },
                description: 'token'
            }],
            returns: {
                arg: 'echostr',
                type: 'object',
                root: true
            }

        }
    );

    Xboxmanager.confirmUserReturn = function(userInfo, token, cb) {
        EWTRACEBEGIN();

        var OpenID = {};
        try {
            OpenID = GetOpenIDFromToken(token);
        } catch (err) {
            cb(err, EWTRACEEND({
                status: 0,
                "result": ""
            }));
            return;
        }

        var bsSQL = "update xb_userbooks set returndate = now() where openid = '" + userInfo.id + "' and returndate is null";
        DoSQL(bsSQL, function(err, result) {
            if (err) {
                cb(err, EWTRACEEND({
                    status: 0,
                    "result": ""
                }));
            } else {

                cb(null, EWTRACEEND({
                    status: 1,
                    "result": ""
                }));
            }
        });

    }
    Xboxmanager.remoteMethod(
        'confirmUserReturn', {
            http: {
                verb: 'post'
            },
            description: '确认图书包归还',
            accepts: [{
                arg: 'userInfo',
                type: 'object',
                http: {
                    source: 'body'
                },
                description: '{id:oFVZ-1Mf3yxWLWHQPE_3BhlVFnGU}'
            }, {
                arg: 'token',
                type: 'string',
                http: function(ctx) {
                    var req = ctx.req;
                    return req.headers.token;
                },
                description: 'token'
            }],
            returns: {
                arg: 'echostr',
                type: 'object',
                root: true
            }

        }
    );

    Xboxmanager.getCageList = function(deviceInfo, token, cb) {
        EWTRACEBEGIN();

        var OpenID = {};
        try {
            OpenID = GetOpenIDFromToken(token);
        } catch (err) {
            cb(err, EWTRACEEND({
                status: 0,
                "result": ""
            }));
            return;
        }

        var bsSQL = "SELECT cageid,a.bookid as id,b.title,b.image,b.author FROM xb_devicebooks a, xb_books b where a.bookid = b.bookid and deviceid = '" + deviceInfo.id + "' order by cageid";
        DoSQL(bsSQL, function(err, result) {
            if (err) {
                cb(err, EWTRACEEND({
                    status: 0,
                    "result": ""
                }));
            } else {
                var _result = {};

                _result.totalCount = 90;
                _result.emptyList = [];
                _result.partialList = [];

                for (var i = 1; i <= 90; i++) {
                    var _filter = _.filter(result, function(fitem) {
                        return fitem.cageid == i;
                    })

                    var _detail = {};
                    _detail.id = i;
                    _detail.details = [];

                    if (_.isEmpty(_filter)) {
                        _result.emptyList.push(_detail);
                    } else {
                        _detail.details = _filter;
                        _result.partialList.push(_detail);
                    }
                }

                cb(null, EWTRACEEND({
                    status: 1,
                    "result": _result
                }));
            }
        });

    }
    Xboxmanager.remoteMethod(
        'getCageList', {
            http: {
                verb: 'post'
            },
            description: '获取抽屉列表',
            accepts: [{
                arg: 'deviceInfo',
                type: 'object',
                http: {
                    source: 'body'
                },
                description: '{id:12345678}'
            }, {
                arg: 'token',
                type: 'string',
                http: function(ctx) {
                    var req = ctx.req;
                    return req.headers.token;
                },
                description: 'token'
            }],
            returns: {
                arg: 'echostr',
                type: 'object',
                root: true
            }

        }
    );

    Xboxmanager.openCage = function(deviceInfo, token, cb) {
        EWTRACEBEGIN();

        var OpenID = {};
        try {
            OpenID = GetOpenIDFromToken(token);
        } catch (err) {
            cb(err, EWTRACEEND({
                status: 0,
                "result": ""
            }));
            return;
        }

        var bsSQL = "select deviceId from xb_manager where openid = '" + OpenID.openid + "'";
        DoSQL(bsSQL, function(err, result) {


            if ( result.length == 0 ){
                cb(err, EWTRACEEND({
                    status: 0,
                    "result": ""
                }));
                return;                
            }
            var _deviceId = result[0].deviceId;


            var doorId = deviceInfo.cageId;
            EWTRACE(doorId);

            var socketList = app.get('m_socketList');

            var find = _.find(socketList, function(item) {
                return item.DeviceID == _deviceId;
            })
            if (!_.isUndefined(find)) {
                // 计算二进制BCC校验码，放入发送的最后一个字节中
                var _tmp = Str2Bytes(doorId);

                var _val = undefined;
                for (var i in _tmp) {
                    if (_.isUndefined(_val)) {
                        _val = _tmp[i];
                    } else {
                        _val ^= _tmp[i];
                    }
                }
                _tmp.push(_val);
                // 计算二进制BCC校验码，放入发送的最后一个字节中

                var sendOver = find.userSocket.write(new Buffer(_tmp));
                console.log('DeviceID:' + _deviceId + ": Data：" + doorId + ", sendOver:" + sendOver);

                cb(null, {
                    status: 1,
                    "result": ""
                });
            } else {
                cb(null, {
                    status: 0,
                    "result": "device not find!"
                });
            }


            cb(null, EWTRACEEND({
                status: 1,
                "result": ""
            }));
        });
    }
    Xboxmanager.remoteMethod(
        'openCage', {
            http: {
                verb: 'post'
            },
            description: '打开抽屉',
            accepts: [{
                arg: 'deviceInfo',
                type: 'object',
                http: {
                    source: 'body'
                },
                description: '{cageId:1}'
            }, {
                arg: 'token',
                type: 'string',
                http: function(ctx) {
                    var req = ctx.req;
                    return req.headers.token;
                },
                description: 'token'
            }],
            returns: {
                arg: 'echostr',
                type: 'object',
                root: true
            }

        }
    );

    Xboxmanager.putToCage = function(deviceInfo, token, cb) {
        EWTRACEBEGIN();

        var OpenID = {};
        try {
            OpenID = GetOpenIDFromToken(token);
        } catch (err) {
            cb(err, EWTRACEEND({
                status: 0,
                "result": ""
            }));
            return;
        }

        var bsSQL = "select bookid as id, title,image,author from xb_books where barcode = '" + deviceInfo.isbn + "'";

        DoSQL(bsSQL, function(err, result) {

            if (err) {
                cb(err, EWTRACEEND({
                    status: 0,
                    "result": err.message
                }));
            } else {
                if (result.length == 0) {
                    cb(null, EWTRACEEND({
                        status: 0,
                        "result": "条形码未找到"
                    }));
                } else {
                    bsSQL = "insert into xb_devicebooks(deviceid,cageid,bookid) values('" + deviceInfo.deviceId + "','" + deviceInfo.cageId + "'," + result[0].id + ");";
                    DoSQL(bsSQL, function(err) {
                        if (err) {
                            cb(err, EWTRACEEND({
                                status: 0,
                                "result": err.message
                            }));
                        } else {

                            bsSQL = "select "+deviceInfo.cageId+" as cageId, b.bookId,b.title,b.image,b.author from xb_devicebooks a, xb_books b where a.bookid = b.bookid and deviceid = '" + deviceInfo.deviceId + "' and cageid = " + deviceInfo.cageId;
                            DoSQL(bsSQL,function(err, resultbox){
                                if ( err ){
                                    cb(err, EWTRACEEND({
                                        status: 0,
                                        "result": err.message
                                    }));
                                }else{
                                    cb(null, EWTRACEEND({
                                        status: 1,
                                        "result": resultbox
                                    }));
                                }

                            })

                        }
                    })

                }


            }
        })


    }
    Xboxmanager.remoteMethod(
        'putToCage', {
            http: {
                verb: 'post'
            },
            description: '书放回抽屉',
            accepts: [{
                arg: 'deviceInfo',
                type: 'object',
                http: {
                    source: 'body'
                },
                description: '{devceId:12345678,cageId:1,isbn:9787887880697}'
            }, {
                arg: 'token',
                type: 'string',
                http: function(ctx) {
                    var req = ctx.req;
                    return req.headers.token;
                },
                description: 'token'
            }],
            returns: {
                arg: 'echostr',
                type: 'object',
                root: true
            }

        }
    );


    function Str2Bytes(str) {
        var pos = 0;
        var len = str.length;
        if (len % 2 != 0) {
            return null;
        }
        len /= 2;
        var hexA = new Array();
        for (var i = 0; i < len; i++) {
            var s = str.substr(pos, 2);
            var v = parseInt(s, 16);
            hexA.push(v);
            pos += 2;
        }
        return hexA;
    }

    function Str2Bytes10(str) {
        var pos = 0;
        var len = str.length;
        if (len % 2 != 0) {
            return null;
        }
        len /= 2;
        var hexA = new Array();
        for (var i = 0; i < len; i++) {
            var s = str.substr(pos, 2);
            var v = parseInt(s, 10);
            hexA.push(v);
            pos += 2;
        }
        return hexA;
    }



    var pad = function pad(num, n) {

        var _detail = function(detail) {
            var len = detail.num.toString().length;
            if (len < detail.n) {
                detail.num = '0' + detail.num;
                _detail( detail )
            }else{
                return ;
            }
        }  

        var detail = {};
        detail.num = num;
        detail.n = n;
        _detail(detail);
        return detail.num;

    }

    function convertNumber(strboxId) {

        var byteNumber = '8A';
        var boxId = parseInt(strboxId);
        if (boxId - 10 <= 0) {
            byteNumber += '00';
            byteNumber += pad(boxId.toString(16).toUpperCase(), 2);
        } else {
            var page = parseInt((boxId - 10) / 40);
            byteNumber += pad(page + 1, 2);
            byteNumber += pad((boxId - 10 - (page) * 40).toString(16).toUpperCase(), 2);
        }
        byteNumber += '11';
        return byteNumber;
    }

    Xboxmanager.openDoor = function(GetTicket, cb) {
        EWTRACE("openDoor Begin");

        var doorId = convertNumber(GetTicket.Data);
        // var _tmp = 'NBES,ID=22222222,STATE=FIRST';
        // var _obj = _tmp.substr(4);     
        EWTRACE(doorId);

        var socketList = app.get('m_socketList');

        var find = _.find(socketList, function(item) {
            return item.DeviceID == GetTicket.deviceId;
        })
        if (!_.isUndefined(find)) {
            // 计算二进制BCC校验码，放入发送的最后一个字节中
            var _tmp = Str2Bytes(doorId);

            var _val = undefined;
            for (var i in _tmp) {
                if (_.isUndefined(_val)) {
                    _val = _tmp[i];
                } else {
                    _val ^= _tmp[i];
                }
            }
            _tmp.push(_val);
            // 计算二进制BCC校验码，放入发送的最后一个字节中

            var sendOver = find.userSocket.write(new Buffer(_tmp));
            console.log('DeviceID:' + GetTicket.deviceId + ": Data：" + doorId + ", sendOver:" + sendOver);

            cb(null, {
                status: 1,
                "result": ""
            });
        } else {
            cb(null, {
                status: 0,
                "result": "device not find!"
            });
        }

    };

    Xboxmanager.remoteMethod(
        'openDoor', {
            http: {
                verb: 'post'
            },
            description: '获得Ticket',
            accepts: {
                arg: 'GetTicket',
                type: 'object',
                description: '{"deviceId":"11111111","Data":"1"}'
            },
            returns: {
                arg: 'RegInfo',
                type: 'object',
                root: true
            }
        }
    );    


    Xboxmanager.ValidateWechatEvent = function (req, res, cb) {

        var token = 'zhiliankeji999';
        var q = req.query;
        var signature = q.signature; //微信加密签名  
        var nonce = q.nonce; //随机数  
        var timestamp = q.timestamp; //时间戳  
        var echostr = q.echostr; //随机字符串  

        EWTRACE('signature: ' + signature);
        EWTRACE('echostr: ' + echostr);
        EWTRACE('timestamp: ' + timestamp);
        EWTRACE('nonce: ' + nonce);
        

        var str = [timestamp + '', nonce + '', token].sort().join('');
        EWTRACE('加密前Str: ' + str);
        EWTRACE('加密后Str: ' + sha1(str));

        if (sha1(str) == signature) {

            res.writeHeader(200, { 'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8' })
            res.write(new Buffer(echostr).toString("UTF-8"));
            res.end();
            EWTRACE('Send OK');

        } else {
            res.writeHeader(200, { 'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8' })
            res.write(new Buffer("false").toString("UTF-8"));
            res.end();
            EWTRACE('Send OK');
        }
    };

    Xboxmanager.remoteMethod(
        'ValidateWechatEvent',
        {
            http: { verb: 'get' },
            description: '微信服务器验证',
            accepts: [{
                arg: 'req', type: 'object',
                http: function (ctx) {
                    return ctx.req;
                },
                description: '{"token":""}'
            },
            {
                arg: 'res', type: 'object',
                http: function (ctx) {
                    return ctx.res;
                },
                description: '{"token":""}'
            }
            ],
            returns: { arg: 'echostr', type: 'number', root: true }

        }
    );
     

    Xboxmanager.ValidateWechatEvent = function (req, res, cb) {

        EWTRACE("ValidateWechatEvent Begin")
        console.log(req.body.xml);

        var q = req.query;
        var openid = q.openid; //微信加密签名  

        if (!_.isEmpty(req.body.xml.event)) {
            EWTRACE("Event:" + req.body.xml.event[0]);
            var _event = req.body.xml.event[0];
            EWTRACE(_event);
            var _eventKey = "";
            if (!_.isEmpty(req.body.xml.eventkey)) {
                _eventKey = req.body.xml.eventkey[0];
            }
            res.write(new Buffer("").toString("UTF-8"));
            res.end();

            if (_event == 'subscribe' || _event == 'SCAN') {
                EWTRACE("EventKey:" + _eventKey);
                if (_eventKey.substr(0, 7) == 'family_') {
                    //AddFamilyUser(req, res, cb);
                } else {
                    //regUser(req, res, cb);
                }

            }

            if (_event == 'unsubscribe') {
                //unregUser(req, res, cb);
            }
        }
        else {
            res.write(new Buffer("").toString("UTF-8"));
            res.end();
        }

    };

    Xboxmanager.remoteMethod(
        'ValidateWechatEvent',
        {
            http: { verb: 'post' },
            description: '微信服务器验证',
            accepts: [{
                arg: 'req', type: 'object',
                http: function (ctx) {
                    return ctx.req;
                },
                description: '{"token":""}'
            },
            {
                arg: 'res', type: 'object',
                http: function (ctx) {
                    return ctx.res;
                },
                description: '{"token":""}'
            }
            ],
            returns: { arg: 'echostr', type: 'number', root: true }

        }
    );    
};