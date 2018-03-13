'use strict';

module.exports = function(Xboxmanager) {
    var _ = require('underscore');

    var app = require('../../server/server');
    app.DisableSystemMethod(Xboxmanager);
    const needle = require('needle')
    require('dotenv').config({
        path: './config/.env'
    });

    Xboxmanager.login = function(userInfo, cb) {
        EWTRACEBEGIN();

        var url = "https://api.weixin.qq.com/sns/jscode2session?appid=" + process.env.wxProductAppID + "&secret=" + process.env.wxProductSecret + "&js_code=" + userInfo.code + "&grant_type=authorization_code";
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
                                bsSQL = "insert into xb_manager(openid,deviceid) values('" + userInfo.openid + "','')";
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


        cb(null, EWTRACEEND({
            status: 1,
            "result": ""
        }));

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
                description: '{devceId:12345678,cageId:1}'
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
};