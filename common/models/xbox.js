'use strict';
var _ = require('underscore');

module.exports = function(Xbox) {
    var app = require('../../server/server');
    app.DisableSystemMethod(Xbox);
    const util = require('util');
    Xbox.login = function(userToken, cb) {
        EWTRACEBEGIN();
        var token = userToken.token;
        EWTRACE("token:" + token);
        var OpenID = {};
        try {
            if ( !_.isUndefined(token)){

                OpenID = GetOpenIDFromToken(token);
                delete OpenID.exp;
                delete OpenID.iat;
            }
            else{
                OpenID.openid = "oFVZ-1Mf3yxWLWHQPE_3BhlVFnGU";
                OpenID.nickname = "葛岭"
            }

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
                    bsSQL = "insert into xb_users(openid,name,isVip) values('" + OpenID.openid + "','" + OpenID.nickname + "',1)";
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
                arg: 'userToken',
                type: 'object',
                http: {
                    source: 'body'
                },
                description: '{token:12345678}'
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

        var bsSQL = "select openid as id,name,isVip,expireDate from xb_users where openid = '" + OpenID.openid + "'";

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
                        "result": "用户未注册"
                    }));
                } else {
                    cb(null, EWTRACEEND({
                        status: 1,
                        "result": result[0]
                    }));
                }

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

    Xbox.getProducts = function(deviceInfo, token, cb) {
        EWTRACEBEGIN();

        EWTRACE(deviceInfo)

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

        var _deviceId = "12345678";
        if (!_.isUndefined(deviceInfo.deviceId)) {
            _deviceId = deviceInfo.deviceId;
        }

        var ps = [];
        var bsSQL = "select * from xb_users where openid = '" + OpenID.openid + "'";
        var _userInfo = {};
        ps.push(ExecuteSyncSQLResult(bsSQL, _userInfo));

        bsSQL = "SELECT a.deviceId,a.cageId,a.bookId,b.categoryId,b.title,b.image,now() as startDate, date_add(now(), interval b.leaseDays day) as endDate FROM xb_devicebooks a, xb_books b where a.bookid = b.bookid and a.deviceId like '%" + _deviceId + "%' order by a.cageId";
        var _booksList = {};
        ps.push(ExecuteSyncSQLResult(bsSQL, _booksList));

        bsSQL = "select a.categorieId as id, a.categoriename as name from xb_categories a where a.categorieId in (select categorieId from xb_devicebooks where deviceID like '%" + _deviceId + "%') ";
        var _bookcategories = {};
        ps.push(ExecuteSyncSQLResult(bsSQL, _bookcategories));


        Promise.all(ps).then(function() {

            if (_userInfo.Result.length == 0) {
                cb(null, EWTRACEEND({
                    status: 0,
                    "result": "非关注公众号的客户不能借阅书籍，请尽快关注～"
                }));
            } else {

                var _result = {};
                _result.categories = _bookcategories.Result;

                _result.books = [];

                _booksList.Result.forEach(function(item) {


                    var find = _.find(_result.books, function(fitem) {

                        return fitem.deviceId == item.deviceId && fitem.cageId == item.cageId;
                    })

                    if (_.isUndefined(find)) {

                        var _book = {};
                        _book.deviceId = item.deviceId;
                        _book.categoryId = item.categoryId;
                        _book.cageId = item.cageId;
                        _book.lease = {};
                        _book.lease.startDate = item.startDate;
                        _book.lease.endDate = item.endDate;

                        _book.details = [];

                        var _bookdetail = {};
                        _bookdetail.id = item.bookId;
                        _bookdetail.title = item.title;
                        _bookdetail.image = item.image;

                        _book.details.push(_bookdetail);

                        _result.books.push(_book);
                    } else {
                        var _bookdetail = {};
                        _bookdetail.id = item.bookId;
                        _bookdetail.title = item.title;
                        _bookdetail.image = item.image;

                        find.details.push(_bookdetail);

                    }

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
        'getProducts', {
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

    Xbox.getProductDetail = function(bookIds, cb) {
        EWTRACEBEGIN();

        var _booklist = "";
        bookIds.forEach(function(item) {
            _booklist += item + ',';
        })
        if (_booklist.length >= 1) {
            _booklist = _booklist.substr(0, _booklist.length - 1);
        }

        var bsSQL = "select bookid as id, detailimages as image, title,author,press,price,now() as startDate, date_add(now(), interval leaseDays day) as endDate from xb_books where bookid in (" + _booklist + ")";

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

                _book.lease = {};
                _book.lease.startDate = result[0].startDate;
                _book.lease.endDate = result[0].endDate;
                _book.detail = [];

                result.forEach(function(item) {
                    var _bookdetail = {};
                    _bookdetail.id = item.id;
                    _bookdetail.title = item.title;
                    _bookdetail.image = item.image;
                    _bookdetail.press = item.press;
                    _bookdetail.price = item.price;
                    _bookdetail.author = item.author;
                    _book.detail.push(_bookdetail);
                })

                cb(null, EWTRACEEND({
                    status: 1,
                    "result": _book
                }));
            }
        })
    }
    Xbox.remoteMethod(
        'getProductDetail', {
            http: {
                verb: 'post'
            },
            description: '获取书籍详细信息',
            accepts: {
                arg: 'bookIds',
                type: 'object',
                http: {
                    source: 'body'
                },
                description: '[1,2,3]'
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
        var bsSQL = "select * from xb_devicebooks where deviceId=" + bookId.deviceId + " and cageId = " + bookId.cageId;
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

            var doorId = convertNumber(bookId.cageId);   
            EWTRACE(doorId);
    
            var socketList = app.get('m_socketList');
    
            var find = _.find(socketList, function(item) {
                return item.DeviceID == bookId.deviceId;
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
                console.log('DeviceID:' + bookId.deviceId + ": DoorID：" + doorId +", Data:"+ _tmp + ", sendOver:" + sendOver);
            
                if ( sendOver ){
                    bsSQL = "insert into xb_userbooks(openid,bookid,startDate) select '" + OpenID.openid + "' as openid, bookid, now() from xb_devicebooks where deviceId=" + bookId.deviceId + " and cageId = " + bookId.cageId + ";";
                    bsSQL += "delete from xb_devicebooks where deviceId=" + bookId.deviceId + " and cageId = " + bookId.cageId;
        
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
                }
                else{
                    cb(null, {
                        status: 0,
                        "result": "借阅书籍失败，请联系管理员【send bad】"
                    });
                }

            } else {
                cb(null, {
                    status: 0,
                    "result": "device not find!"
                });
            }            



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

        var bsSQL = "SELECT b.bookId as id, b.title, b.author,a.startDate,date_add(a.startDate, interval b.leaseDays day) as endDate ,a.returnDate FROM xb_userbooks a, xb_books b where a.bookid = b.bookid and a.openid = '" + OpenID.openid + "' order by a.startDate desc limit 30";
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
                    "result": result
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

        var bsSQL = "select price as price,buyTime from xb_VIPPrice where id = " + memberShip.id;

        DoSQL(bsSQL, function(err, result) {
            wx_CreateOrders(result[0].price, OpenID.openid).then(function(payout) {

                if (payout.return_code == 'FAIL') {
                    cb(null, {
                        status: 0,
                        "result": payout
                    });
                    return;
                }
                bsSQL = "insert into xb_userOrders(openid,addtime,paystatus,fee,buytime,payorderid) values('" + OpenID.openid + "',now(),'payment'," + result[0].price + "," + result[0].buyTime + ",'" + payout.out_trade_no + "');";
                DoSQL(bsSQL, function(err) {
                    if (!err) {
                        cb(null, {
                            status: 1,
                            "result": payout
                        });
                    } else {
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


    Xbox.getTestToken = function(cb) {
        EWTRACEBEGIN();

        var OpenID = {
            openid: 'oFVZ-1Mf3yxWLWHQPE_3BhlVFnGU',
            nickname: '张三',
            sex: 1,
            language: 'zh_CN',
            city: 'Hangzhou',
            province: 'Zhejiang',
            country: 'China',
            headimgurl: 'http://thirdwx.qlogo.cn/mmopen/vi_32/Q0j4TwGTfTJicLw2MkRZ4mT841tP9ItuXicPiaibibZ9ia5AxT4icS28uicEbK5wtVymkYEcodvUVWKsKia1koDnHoWoo9g/132',
            privilege: [],
            unionid: 'oBQ4y01s_iPdv-NqE8zonMYFfuus'
        };

        getWeChatToken(OpenID).then(function(token) {
            cb(null, EWTRACEEND({
                status: 0,
                "token": token
            }));
        })
    }

    Xbox.remoteMethod(
        'getTestToken', {
            http: {
                verb: 'post'
            },
            description: '获取测试token',
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

    Xbox.openDoor = function(GetTicket, cb) {
        EWTRACE("openDoor Begin");

        var doorId = convertNumber(GetTicket.Data);   
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

    Xbox.remoteMethod(
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

};