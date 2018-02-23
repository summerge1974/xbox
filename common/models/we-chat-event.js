'use strict';

module.exports = function(Wechatevent) {
    var app = require('../../server/server');
    app.DisableSystemMethod(Wechatevent);

    Wechatevent.test = function(cb){
        EWTRACEBEGIN();

        EWTRACE("message Info")

        cb(null, EWTRACEEND({ code: 1, "message": "" }));
    } 
    Wechatevent.remoteMethod(
        'test',
        {
            http: { verb: 'post' },
            description: '微信服务器验证',
            returns: { arg: 'echostr', type: 'number', root: true }

        }
    ); 

    Wechatevent.wxnotify = function (a, cb) {
        console.log("wxnotify");
        var param = a.xml;
        param.nstr = a.xml.out_trade_no[0];
        var trade_type = a.xml.trade_type[0];
        var return_code = param.return_code[0];
        var result_code = param.result_code[0];

        if (return_code == "SUCCESS" && result_code == "SUCCESS") {

            var _orderid = a.xml.out_trade_no[0];

            var bsSQL = "update xb_userOrders set paystatus = 'commit' where payorderid = '" + _orderid + "'";

            DoSQL(bsSQL).then(function () {
                var backXml = '<xml xmlns="eshine"><return_code><![CDATA[SUCCESS]]></return_code><return_msg><![CDATA[]]></return_msg></xml>';
                cb(null, backXml, 'text/xml; charset=utf-8');
            }, function (err) {
                var backXml = '<xml xmlns="eshine"><return_code><![CDATA[SUCCESS]]></return_code><return_msg><![CDATA[]]></return_msg></xml>';
                cb(null, backXml, 'text/xml; charset=utf-8');
            })
        }

    }

    // server.js 文件头必须包含这两句话，否则xml无法解析
    //var xmlparser = require('express-xml-bodyparser');
    //app.use(xmlparser());
    Wechatevent.remoteMethod(
        'wxnotify',
        {
            http: { verb: 'post' },
            description: '微信支付通知(bm_Company)',
            accepts: [
                {
                    arg: 'a',
                    type: 'xml',
                    description: "wx-pay-back",
                    http: { source: 'body' }
                }
            ],
            returns: [{ arg: 'body', type: 'file', root: true }, { arg: 'Content-Type', type: 'string', http: { target: 'header' } }]
        }
    );    

    Wechatevent.ValidateWechatEvent = function (req, res, cb) {

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
                    AddFamilyUser(req, res, cb);
                } else {
                    regUser(req, res, cb);
                }

            }

            if (_event == 'unsubscribe') {
                unregUser(req, res, cb);
            }

            if (_event == 'CLICK') {
                if (_eventKey == "Create_Token") {
                    GetWXNickName(req.body.xml.fromusername[0]).then(function (result) {
                        GetTokenFromOpenID(result).then(function (token) {
                            EWTRACE(token);
                        })
                    }, function (err) {

                    });
                }


                if (_eventKey == 'SOS_Notify') {
                    EWTRACE("call WXClick_SOS");
                    WXClick_SOS_NotifyLBS(req, res, cb);
                }

                if (_eventKey == 'firstUser' || _eventKey == 'PWV') {
                    WXClick_Notify_firstUser(req, res, _eventKey);
                }
            }
            if (_event == 'location_select') {
                if (_eventKey == 'SOS_Notify') {
                    EWTRACE("call WXClick_SOS");
                    WXClick_SOS(req, res, cb);
                }
            }

            if (_event == 'LOCATION') {
                UpdateUserLBS(req.body.xml);
            }
        }
        else {
            res.write(new Buffer("").toString("UTF-8"));
            res.end();
        }

    };

    Wechatevent.remoteMethod(
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
