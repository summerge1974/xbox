"use strict";

module.exports = function(Wechatevent) {
  var app = require("../../server/server");
  app.DisableSystemMethod(Wechatevent);
  var _ = require("underscore");
  const needle = require("needle");
  var xbox = require('./xbox');

  Wechatevent.CreateWXMenu = function(cb) {
    EWTRACE("CreateWXMenu Begin");

    var menu = require("../../config/menu");
    require("dotenv").config({
      path: "./config/.env"
    });
    var url =
      process.env.global_wxurl + "/createmenu?appId=" + process.env.wxAppID;
    needle.post(
      encodeURI(url),
      menu.menu,
      {
        json: true
      },
      function(err, resp) {
        // you can pass params as a string or as an object.
        if (err) {
          //cb(err, { status: 0, "result": "" });
          EWTRACE(err.message);
          cb(err, {
            status: 1,
            result: ""
          });
        } else {
          console.log(resp.body);
          cb(null, {
            status: 0,
            result: resp.body
          });
        }
      }
    );
    EWTRACE("CreateWXMenu End");
  };

  Wechatevent.remoteMethod("CreateWXMenu", {
    http: {
      verb: "post"
    },
    description: "创建微信菜单",
    returns: {
      arg: "AddDoctor",
      type: "object",
      root: true
    }
  });

  Wechatevent.remoteMethod("CreateWechatQRCode", {
    http: {
      verb: "get"
    },
    description: "生成公众号二维码",
    accepts: {
      arg: "iccid",
      type: "string",
      description: "898602b11816c0389700"
    },
    returns: {
      arg: "p",
      type: "object",
      root: true
    }
  });

  Wechatevent.wxnotify = function(a, cb) {
    console.log("wxnotify");
    var param = a.xml;
    param.nstr = a.xml.out_trade_no[0];
    var trade_type = a.xml.trade_type[0];
    var return_code = param.return_code[0];
    var result_code = param.result_code[0];

    if (return_code == "SUCCESS" && result_code == "SUCCESS") {
      var _orderid = a.xml.out_trade_no[0];
      var _openid = a.xml.openid[0];
      var bsSQL =
        "update xb_userOrders set paystatus = 'commit' where payorderid = '" +
        _orderid +
        "';";
      bsSQL +=
        "update xb_users set isvip = 1,expiredate = date_add(now(),interval 1 year) where openid = '" +
        _openid +
        "'";

      DoSQL(bsSQL, function(err, result) {
        if (err) {
          var backXml =
            '<xml xmlns="eshine"><return_code><![CDATA[SUCCESS]]></return_code><return_msg><![CDATA[]]></return_msg></xml>';
          cb(null, backXml, "text/xml; charset=utf-8");
        } else {
          var backXml =
            '<xml xmlns="eshine"><return_code><![CDATA[SUCCESS]]></return_code><return_msg><![CDATA[]]></return_msg></xml>';
          cb(null, backXml, "text/xml; charset=utf-8");
        }
      });
    }
  };

  // server.js 文件头必须包含这两句话，否则xml无法解析
  //var xmlparser = require('express-xml-bodyparser');
  //app.use(xmlparser());
  Wechatevent.remoteMethod("wxnotify", {
    http: {
      verb: "post"
    },
    description: "微信支付通知(bm_Company)",
    accepts: [
      {
        arg: "a",
        type: "xml",
        description: "wx-pay-back",
        http: {
          source: "body"
        }
      }
    ],
    returns: [
      {
        arg: "body",
        type: "file",
        root: true
      },
      {
        arg: "Content-Type",
        type: "string",
        http: {
          target: "header"
        }
      }
    ]
  });

  Wechatevent.ValidateWechatEvent = function(req, res, cb) {
    EWTRACE("ValidateWechatEvent Begin");
    console.log(req.body.xml);
    console.log(req.query);

    var q = req.query;
    var openid = q.openid; //微信加密签名

    var xml = req.body.xml;
    var _eventKey = "";
    if (!_.isUndefined(req.body.xml.eventkey)) {
        _eventKey = req.body.xml.eventkey[0];
    }

    if ( xml.event[0] == "LOCATION"){
      updateLBS(xml.latitude[0], xml.longitude[0],xml.fromusername[0]);
    }

    res.write(new Buffer("").toString("UTF-8"));
    res.end();
  };

  Wechatevent.remoteMethod("ValidateWechatEvent", {
    http: {
      verb: "post"
    },
    description: "微信服务器验证",
    accepts: [
      {
        arg: "req",
        type: "object",
        http: function(ctx) {
          return ctx.req;
        },
        description: '{"token":""}'
      },
      {
        arg: "res",
        type: "object",
        http: function(ctx) {
          return ctx.res;
        },
        description: '{"token":""}'
      }
    ],
    returns: {
      arg: "echostr",
      type: "number",
      root: true
    }
  });


  function updateLBS(latitude, longitude, openid) {
    EWTRACEBEGIN();
    var bsSQL = "update xb_user set latitude = " + latitude + ", longitude = "+ longitude + 
    " where openid = '"+openid+"'";
    DoSQL(bsSQL, function(err) {
      
    });
  };  
};
