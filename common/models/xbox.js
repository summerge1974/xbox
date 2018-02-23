'use strict';
var _ = require('underscore');

module.exports = function(Xbox) {
    var app = require('../../server/server');
    app.DisableSystemMethod(Xbox);

    Xbox.login = function(token, cb) {
        EWTRACEBEGIN();

        var OpenID = {};
        try {
            OpenID = GetOpenIDFromToken(token);
            delete OpenID.exp;
            delete OpenID.iat;
        } catch (err) {
            cb(err, EWTRACEEND({
                status: 0,
                "result": ""
            }));
            return;
        }

        var bsSQL = "select * from xb_users where openid = '" + OpenID.openid + "'";

        DoSQL(bsSQL, function(err, result) {
            if (err) {
                cb(err, EWTRACEEND({
                    status: 0,
                    "result": ""
                }));
            } else {

                if (result.length == 0) {
                    bsSQL = "insert into xb_users(openid,name,isVip) values('" + OpenID.openid + "','" + OpenID.nickname + "',0)";
                } else {
                    bsSQL = "update xb_users set name = '" + OpenID.nickname + "' where openid = '" + OpenID.openid + "'";
                }
                DoSQL(bsSQL);
                getWeChatToken(OpenID).then(function(resultToken) {

                    cb(null, EWTRACEEND({
                        status: 1,
                        "token": resultToken
                    }));
                })
            }
        })
    }
    Xbox.remoteMethod(
        'login', {
            http: {
                verb: 'post'
            },
            description: '用户登录',
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


    Xbox.getUserInfo = function(token, cb) {
        EWTRACEBEGIN();

        var OpenID = {};
        try {
            OpenID = GetOpenIDFromToken(token);
            delete OpenID.exp;
            delete OpenID.iat;
        } catch (err) {
            cb(err, EWTRACEEND({
                status: 0,
                "result": ""
            }));
            return;
        }

        var bsSQL = "select name,isVip,expireDate from xb_users where openid = '" + OpenID.openid + "'";

        DoSQL(bsSQL, function(err, result) {
            if (err) {
                cb(err, EWTRACEEND({
                    status: 0,
                    "result": ""
                }));
            } else {

                cb(null, EWTRACEEND({
                    status: 1,
                    "result": result
                }));
            }
        })
    }
    Xbox.remoteMethod(
        'getUserInfo', {
            http: {
                verb: 'post'
            },
            description: '获取用户信息',
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

    Xbox.getBooks = function(deviceInfo, token, cb) {
        EWTRACEBEGIN();

        var OpenID = {};
        try {
            OpenID = GetOpenIDFromToken(token);
            delete OpenID.exp;
            delete OpenID.iat;
        } catch (err) {
            cb(err, EWTRACEEND({
                status: 0,
                "result": ""
            }));
            return;
        }

        var ps = [];
        var bsSQL = "select * from xb_users where isVip = 1 and openid = '" + OpenID.openid + "'";
        var _userInfo = {};
        ps.push(ExecuteSyncSQLResult(bsSQL, _userInfo));

        bsSQL = "SELECT a.deviceId,a.cageId,a.bookId,b.categoryId,b.title,b.image,now() as startDate, date_add(now(), interval b.leaseDays day) as endDate FROM xb_devicebooks a, xb_books b where a.bookid = b.bookid and a.deviceId = " + deviceInfo.deviceId + " order by a.cageId";
        var _booksList = {};
        ps.push(ExecuteSyncSQLResult(bsSQL, _booksList));

        bsSQL = "select a.categorieId as id, a.categoriename as name from xb_categories a where a.categorieId in (select categorieId from xb_devicebooks where deviceID = " + deviceInfo.deviceId + ") ";
        var _bookcategories = {};
        ps.push(ExecuteSyncSQLResult(bsSQL, _bookcategories));


        Promise.all(ps).then(function() {

            if (_userInfo.Result.length == 0) {
                cb(null, EWTRACEEND({
                    status: 0,
                    "result": "非VIP客户不能借阅书籍，请尽快升级权限～"
                }));
            } else {

                var _result = {};
                _result.categories = _bookcategories.Result;
                _result.books = [];

                _booksList.Result.forEach(function(item) {
                    var _book = {};
                    _book.deviceId = item.deviceId;
                    _book.cageId = item.cageId;
                    _book.id = item.bookId;
                    _book.title = item.title;
                    _book.image = item.image;
                    _book.lease = {};
                    _book.lease.startDate = item.startDate;
                    _book.lease.endDate = item.endDate;

                    _result.books.push(_book);
                })

                cb(null, EWTRACEEND({
                    status: 1,
                    "result": _result
                }));
            }


        }, function(err) {
            cb(err, EWTRACEEND({
                status: 0,
                "result": ""
            }));
        });
    }
    Xbox.remoteMethod(
        'getBooks', {
            http: {
                verb: 'post'
            },
            description: '获取对应书柜的书籍',
            accepts: [{
                arg: 'deviceInfo',
                type: 'object',
                http: {
                    source: 'body'
                },
                description: '{deviceId:12345678}'
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

    Xbox.getBookDetail = function(bookId, cb) {
        EWTRACEBEGIN();

        var bsSQL = "select bookid as id, detailimages as images, title,author,press,price,now() as startDate, date_add(now(), interval leaseDays day) as endDate from xb_books where bookid = " + bookId.id;

        DoSQL(bsSQL, function(err, result) {
            if (err) {
                cb(err, EWTRACEEND({
                    status: 0,
                    "result": ""
                }));
            } else {

                if (result.length == 0) {
                    cb(null, EWTRACEEND({
                        status: 0,
                        "result": "书籍信息未找到，请联系管理员"
                    }));
                    return;
                }

                var _book = {};
                _book.id = result[0].id;
                _book.title = result[0].title;
                _book.images = result[0].images;
                _book.press = result[0].press;
                _book.price = result[0].price;
                _book.lease = {};
                _book.lease.startDate = result[0].startDate;
                _book.lease.endDate = result[0].endDate;
                cb(null, EWTRACEEND({
                    status: 1,
                    "result": _book
                }));
            }
        })
    }
    Xbox.remoteMethod(
        'getBookDetail', {
            http: {
                verb: 'post'
            },
            description: '获取书籍详细信息',
            accepts: {
                arg: 'bookId',
                type: 'object',
                http: {
                    source: 'body'
                },
                description: '{id:1}'
            },
            returns: {
                arg: 'echostr',
                type: 'object',
                root: true
            }

        }
    );

    Xbox.borrowBook = function(bookId, token, cb) {
        EWTRACEBEGIN();

        var OpenID = {};
        try {
            OpenID = GetOpenIDFromToken(token);
            delete OpenID.exp;
            delete OpenID.iat;
        } catch (err) {
            cb(err, EWTRACEEND({
                status: 0,
                "result": ""
            }));
            return;
        }
        var ps = [];
        var bsSQL = "select * from xb_devicebooks where bookid = " + bookId.id + " and deviceId=" + bookId.deviceId + " and cageId = " + bookId.cageId;
        var _deviceBookInfo = {};
        ps.push(ExecuteSyncSQLResult(bsSQL, _deviceBookInfo));

        bsSQL = "select * from xb_userbooks where openid = '" + OpenID.openid + "' and returnDate is null";
        var _userBookInfo = {};
        ps.push(ExecuteSyncSQLResult(bsSQL, _userBookInfo));

        Promise.all(ps).then(function() {

            if (_deviceBookInfo.Result.length == 0) {
                cb(null, EWTRACEEND({
                    status: 0,
                    "result": "书籍信息未找到，请联系管理员"
                }));
                return;
            }
            if (_userBookInfo.Result.length != 0) {
                cb(null, EWTRACEEND({
                    status: 0,
                    "result": "请先归还上次借阅的书籍后再次借阅"
                }));
                return;
            }

            bsSQL = "insert into xb_userbooks(openid,bookid,startDate) values('" + OpenID.openid + "'," + bookId.id + ", now());";
            bsSQL += "delete from xb_devicebooks where bookid = " + bookId.id + " and deviceId=" + bookId.deviceId + " and cageId = " + bookId.cageId;

            DoSQL(bsSQL, function(err) {
                if (err) {
                    cb(err, EWTRACEEND({
                        status: 0,
                        "result": "借阅书籍失败，请联系管理员"
                    }));
                } else {
                    cb(null, EWTRACEEND({
                        status: 1,
                        "result": "借阅成功"
                    }));
                }
            })

        }, function(err) {
            cb(err, EWTRACEEND({
                status: 0,
                "result": ""
            }));
        });
    }
    Xbox.remoteMethod(
        'borrowBook', {
            http: {
                verb: 'post'
            },
            description: '获取书籍详细信息',
            accepts: [{
                arg: 'bookId',
                type: 'object',
                http: {
                    source: 'body'
                },
                description: '{id:1,deviceId:12345678,cageId:1}'
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


    Xbox.getBorrowList = function(token, cb) {
        EWTRACEBEGIN();

        var OpenID = {};
        try {
            OpenID = GetOpenIDFromToken(token);
            delete OpenID.exp;
            delete OpenID.iat;
        } catch (err) {
            cb(err, EWTRACEEND({
                status: 0,
                "result": ""
            }));
            return;
        }

        var bsSQL = "SELECT b.bookId as id, b.title,a.startDate,date_add(a.startDate, interval b.leaseDays day) as endDate ,a.returnDate FROM xb_userbooks a, xb_books b where a.bookid = b.bookid and a.openid = '" + OpenID.openid + "' order by a.startDate desc limit 30";
        DoSQL(bsSQL, function(err, result) {

            if (err) {
                cb(err, EWTRACEEND({
                    status: 0,
                    "result": "借阅书籍失败，请联系管理员"
                }));
            } else {
                var _result = [];
                result.forEach(function(item) {
                    var _book = {};
                    _book.id = item.id;
                    _book.book = {};
                    _book.book.id = item.id;
                    _book.book.title = item.title;
                    _book.lease = {};
                    _book.lease.startDate = item.startDate;
                    _book.lease.endDate = item.endDate;
                    if (!_.isNull(item.returnDate)) {
                        _book.lease.returnDate = item.returnDate;
                    }
                    _result.push(_book);
                })

                cb(null, EWTRACEEND({
                    status: 1,
                    "result": _result
                }));
            }

        });
    };
    Xbox.remoteMethod(
        'getBorrowList', {
            http: {
                verb: 'post'
            },
            description: '得到借阅列表',
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


    Xbox.getMembershipOptions = function(cb) {
        EWTRACEBEGIN();

        var bsSQL = "select id,name,price from xb_VIPPrice order by price";

        DoSQL(bsSQL, function(err, result) {
            if (err) {
                cb(err, EWTRACEEND({
                    status: 0,
                    "result": ""
                }));
            } else {

                cb(null, EWTRACEEND({
                    status: 1,
                    "token": result
                }));
            }
        })
    }
    Xbox.remoteMethod(
        'getMembershipOptions', {
            http: {
                verb: 'post'
            },
            description: 'VIP收费价格表',
            returns: {
                arg: 'echostr',
                type: 'object',
                root: true
            }

        }
    );

    Xbox.purchaseMemebership = function(memberShip, token, cb) {
        EWTRACEBEGIN();

        var OpenID = {};
        try {
            OpenID = GetOpenIDFromToken(token);
            delete OpenID.exp;
            delete OpenID.iat;
        } catch (err) {
            cb(err, EWTRACEEND({
                status: 0,
                "result": ""
            }));
            return;
        }        

        var bsSQL = "select price * 100 as price,buyTime from xb_VIPPrice where id = " + memberShip.id;

        DoSQL(bsSQL, function(err, result) {
            wx_CreateOrders(result[0].price).then(function(payout) {

                if ( payout.return_code == 'FAIL'){
                    cb(null, {
                        status: 0,
                        "result": payout
                    });
                    return;
                }
                bsSQL = "insert into xb_userOrders(openid,addtime,paystatus,fee,buytime,payorderid) values('"+OpenID.openid+"',now(),'payment',"+result[0].price+","+result[0].buyTime + ",'"+payout.out_trade_no+"');";
                DoSQL(bsSQL, function(err){
                    if ( !err ){
                        cb(null, {
                            status: 1,
                            "result": payout
                        });
                    }else{
                        cb(null, {
                            status: 0,
                            "result": ""
                        });
                    }
                })


            }, function(err) {
                cb(err, {
                    status: 0,
                    "result": ""
                });
            });
        });
    }
    Xbox.remoteMethod(
        'purchaseMemebership', {
            http: {
                verb: 'post'
            },
            description: '支付',
            accepts: [{
                arg: 'memberShip',
                type: 'object',
                http: {
                    source: 'body'
                },
                description: '{id:1}'
            },{
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