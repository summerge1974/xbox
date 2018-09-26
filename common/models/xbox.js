"use strict";
var _ = require("underscore");

module.exports = function(Xbox) {
  var app = require("../../server/server");
  app.DisableSystemMethod(Xbox);
  const util = require("util");
  Xbox.login = function(userToken, cb) {
    EWTRACEBEGIN();
    var token = userToken.token;
    EWTRACE("token:" + token);
    var OpenID = {};
    try {
      if (!_.isUndefined(token)) {
        OpenID = GetOpenIDFromToken(token);
        delete OpenID.exp;
        delete OpenID.iat;
      } else {
        OpenID.openid = "oFVZ-1Mf3yxWLWHQPE_3BhlVFnGU";
        OpenID.nickname = "葛岭";
      }
    } catch (err) {
      cb(
        err,
        EWTRACEEND({
          status: 0,
          result: ""
        })
      );
      return;
    }

    var bsSQL = "select * from xb_users where openid = '" + OpenID.openid + "'";

    DoSQL(bsSQL, function(err, result) {
      if (err) {
        cb(
          err,
          EWTRACEEND({
            status: 0,
            result: ""
          })
        );
      } else {
        if (result.length == 0) {
          bsSQL =
            "insert into xb_users(openid,name,headimage,isVip) values('" +
            OpenID.openid +
            "','" +
            OpenID.nickname +
            "',headimage = '" +
            OpenID.headimgurl +
            "',0)";
        } else {
          bsSQL =
            "update xb_users set name = '" +
            OpenID.nickname +
            "',headimage = '" +
            OpenID.headimgurl +
            "' where openid = '" +
            OpenID.openid +
            "'";
        }
        DoSQL(bsSQL);
        getWeChatToken(OpenID).then(function(resultToken) {
          cb(
            null,
            EWTRACEEND({
              status: 1,
              token: resultToken
            })
          );
        });
      }
    });
  };
  Xbox.remoteMethod("login", {
    http: {
      verb: "post"
    },
    description: "用户登录",
    accepts: {
      arg: "userToken",
      type: "object",
      http: {
        source: "body"
      },
      description: "{token:12345678}"
    },
    returns: {
      arg: "echostr",
      type: "object",
      root: true
    }
  });

  Xbox.setUserMobile = function(token, userInfo, cb) {
    var OpenID = {};
    try {
      OpenID = GetOpenIDFromToken(token);
      delete OpenID.exp;
      delete OpenID.iat;
    } catch (err) {
      cb(
        err,
        EWTRACEEND({
          status: 0,
          result: ""
        })
      );
      return;
    }

    var bsSQL =
      "select * from xb_regcode where mobile='" +
      userInfo.mobile +
      "' and regcode = " +
      userInfo.code +
      ";";

    DoSQL(bsSQL, function(err, result) {
      if (!_.isUndefined(result) && result.length > 0) {
        bsSQL =
          "update xb_users set mobile = " +
          userInfo.mobile +
          " where openid = '" +
          OpenID.openid +
          "'";
        DoSQL(bsSQL, function(err) {
          if (err) {
            cb(
              err,
              EWTRACEEND({
                status: 0,
                result: ""
              })
            );
          } else {
            cb(
              null,
              EWTRACEEND({
                status: 1,
                result: ""
              })
            );
          }
        });
      } else {
        cb(
          null,
          EWTRACEEND({
            status: 0,
            result: "验证码错误，请确认后重新输入"
          })
        );
      }
    });
  };

  Xbox.remoteMethod("setUserMobile", {
    http: {
      verb: "post"
    },
    description: "绑定⼿手机",
    accepts: [
      {
        arg: "token",
        type: "string",
        http: function(ctx) {
          var req = ctx.req;
          return req.headers.token;
        },
        description: "token"
      },
      {
        arg: "userInfo",
        type: "object",
        http: {
          source: "body"
        },
        description: '{"mobile":18958064659,"code":""}'
      }
    ],
    returns: {
      arg: "echostr",
      type: "object",
      root: true
    }
  });

  Xbox.sendVerifyCode = function(userInfo, cb) {
    var Random = {
      Result: 0
    };
    var bsSQL = "select usp_NewRandomNumber(4) as Random_Number";

    var pv = ExecuteSyncSQLResult(bsSQL, Random);
    pv.then(function() {
      bsSQL = "delete from xb_regcode where mobile='" + userInfo.mobile + "';";
      bsSQL +=
        "insert into xb_regcode(mobile, regcode) values('" +
        userInfo.mobile +
        "','" +
        Random.Result[0].Random_Number +
        "')";

      var smspv = SendSMS(userInfo.mobile, Random.Result[0].Random_Number);
      smspv.then(
        function() {
          DoSQL(bsSQL, function(err) {
            if (err) {
              cb(
                err,
                EWTRACEEND({
                  status: 0,
                  result: err.message
                })
              );
            } else {
              cb(
                null,
                EWTRACEEND({
                  status: 1,
                  result: ""
                })
              );
            }
          });
        },
        function(err) {
          cb(
            null,
            EWTRACEEND({
              status: 0,
              result: err.message
            })
          );
        }
      );
    });
  };
  Xbox.remoteMethod("sendVerifyCode", {
    http: {
      verb: "post"
    },
    description: "发送⼿手机验证码",
    accepts: {
      arg: "userInfo",
      type: "object",
      http: {
        source: "body"
      },
      description: "{mobile:18958064659}"
    },
    returns: {
      arg: "echostr",
      type: "object",
      root: true
    }
  });

  Xbox.getUserInfo = function(token, cb) {
    EWTRACEBEGIN();

    var OpenID = {};
    try {
      OpenID = GetOpenIDFromToken(token);
      delete OpenID.exp;
      delete OpenID.iat;
    } catch (err) {
      cb(
        err,
        EWTRACEEND({
          status: 0,
          result: ""
        })
      );
      return;
    }

    var bsSQL =
      "select openid as id,name,isVip,expireDate,mobile,headimage,latitude,longitude from xb_users where openid = '" +
      OpenID.openid +
      "'";

    DoSQL(bsSQL, function(err, result) {
      if (err) {
        cb(
          err,
          EWTRACEEND({
            status: 0,
            result: ""
          })
        );
      } else {
        if (result.length == 0) {
          cb(
            null,
            EWTRACEEND({
              status: 0,
              result: "用户未注册"
            })
          );
        } else {
          if (result[0].isVip == 0) {
            result[0].isVip = false;
          } else {
            result[0].isVip = true;
          }
          cb(
            null,
            EWTRACEEND({
              status: 1,
              result: result[0]
            })
          );
        }
      }
    });
  };
  Xbox.remoteMethod("getUserInfo", {
    http: {
      verb: "post"
    },
    description: "获取用户信息",
    accepts: {
      arg: "token",
      type: "string",
      http: function(ctx) {
        var req = ctx.req;
        return req.headers.token;
      },
      description: "token"
    },
    returns: {
      arg: "echostr",
      type: "object",
      root: true
    }
  });

  Xbox.getProducts = function(deviceInfo, token, cb) {
    EWTRACEBEGIN();

    console.log(deviceInfo);

    var OpenID = {};
    try {
      OpenID = GetOpenIDFromToken(token);
      delete OpenID.exp;
      delete OpenID.iat;
    } catch (err) {
      cb(
        err,
        EWTRACEEND({
          status: 0,
          result: ""
        })
      );
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

    bsSQL =
      "SELECT a.deviceId,a.cageId,a.bookId,b.categoryId,b.title,b.image,date_format(now(),'%Y-%m-%d') as startDate, date_format(date_add(now(), interval b.leaseDays day),'%Y-%m-%d') as endDate,a.schuser FROM xb_devicebooks a, xb_books b where a.bookid = b.bookid and a.deviceId like '" +
      _deviceId +
      "' order by a.cageId";
    var _booksList = {};
    ps.push(ExecuteSyncSQLResult(bsSQL, _booksList));

    bsSQL =
      "select a.categorieId as id, a.categoriename as name from xb_categories a where a.categorieId in (select categorieId from xb_devicebooks where deviceID like '" +
      _deviceId +
      "') ";
    var _bookcategories = {};
    ps.push(ExecuteSyncSQLResult(bsSQL, _bookcategories));

    bsSQL = "select name from xb_devices where deviceID = '" + _deviceId + "' ";
    var _deviceName = {};
    ps.push(ExecuteSyncSQLResult(bsSQL, _deviceName));

    Promise.all(ps).then(
      function() {
        if (_userInfo.Result.length == 0) {
          cb(
            null,
            EWTRACEEND({
              status: 0,
              result: "非关注公众号的客户不能借阅书籍，请尽快关注～"
            })
          );
        } else {
          var _result = {};
          _result.kindergartenName = "";
          if (_deviceName.Result.length > 0) {
            _result.kindergartenName = _deviceName.Result[0].name;
          }

          _result.categories = _bookcategories.Result;

          _result.books = [];

          _booksList.Result.forEach(function(item) {
            var find = _.find(_result.books, function(fitem) {
              return (
                fitem.deviceId == item.deviceId && fitem.cageId == item.cageId
              );
            });

            if (
              item.schuser ==
              "" /*||
              item.schuser == _userInfo.Result[0].mobile*/
            ) {
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
                _bookdetail.schuser = item.schuser;

                _book.details.push(_bookdetail);

                _result.books.push(_book);
              } else {
                var _bookdetail = {};
                _bookdetail.id = item.bookId;
                _bookdetail.title = item.title;
                _bookdetail.image = item.image;
                _bookdetail.schuser = item.schuser;

                find.details.push(_bookdetail);
              }
            }
          });

          cb(
            null,
            EWTRACEEND({
              status: 1,
              result: _result
            })
          );
        }
      },
      function(err) {
        cb(
          err,
          EWTRACEEND({
            status: 0,
            result: ""
          })
        );
      }
    );
  };
  Xbox.remoteMethod("getProducts", {
    http: {
      verb: "post"
    },
    description: "获取对应书柜的书籍",
    accepts: [
      {
        arg: "deviceInfo",
        type: "object",
        http: {
          source: "body"
        },
        description: "{deviceId:12345678}"
      },
      {
        arg: "token",
        type: "string",
        http: function(ctx) {
          var req = ctx.req;
          return req.headers.token;
        },
        description: "token"
      }
    ],
    returns: {
      arg: "echostr",
      type: "object",
      root: true
    }
  });

  Xbox.getProductDetail = function(bookIds, cb) {
    EWTRACEBEGIN();

    var _booklist = "";
    bookIds.forEach(function(item) {
      _booklist += item + ",";
    });
    if (_booklist.length >= 1) {
      _booklist = _booklist.substr(0, _booklist.length - 1);
    }

    var bsSQL =
      "select bookid as id, detailimages as image, title,author,press,price,date_format(now(),'%Y-%m-%d') as startDate, date_format(date_add(now(), interval leaseDays day),'%Y-%m-%d') as endDate from xb_books where bookid in (" +
      _booklist +
      ")";

    DoSQL(bsSQL, function(err, result) {
      if (err) {
        cb(
          err,
          EWTRACEEND({
            status: 0,
            result: ""
          })
        );
      } else {
        if (result.length == 0) {
          cb(
            null,
            EWTRACEEND({
              status: 0,
              result: "书籍信息未找到，请联系管理员"
            })
          );
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
        });

        cb(
          null,
          EWTRACEEND({
            status: 1,
            result: _book
          })
        );
      }
    });
  };
  Xbox.remoteMethod("getProductDetail", {
    http: {
      verb: "post"
    },
    description: "获取书籍详细信息",
    accepts: {
      arg: "bookIds",
      type: "object",
      http: {
        source: "body"
      },
      description: "[1,2,3]"
    },
    returns: {
      arg: "echostr",
      type: "object",
      root: true
    }
  });

  Xbox.reserveBook = function(bookId, token, cb) {
    EWTRACEBEGIN();

    var OpenID = {};
    try {
      OpenID = GetOpenIDFromToken(token);
      delete OpenID.exp;
      delete OpenID.iat;
    } catch (err) {
      cb(
        err,
        EWTRACEEND({
          status: 0,
          result: ""
        })
      );
      return;
    }

    var ps = [];
    var bsSQL =
      "select * from xb_devicebooks where deviceId=" +
      bookId.deviceId +
      " and cageId = " +
      bookId.cageId +
      " and schuser = ''";
    var _deviceBookInfo = {};
    ps.push(ExecuteSyncSQLResult(bsSQL, _deviceBookInfo));

    bsSQL =
      "select * from xb_users where openid = '" +
      OpenID.openid +
      "' and isvip = 1 and mobile <> ''";
    var _userInfo = {};
    ps.push(ExecuteSyncSQLResult(bsSQL, _userInfo));

    Promise.all(ps).then(
      function() {
        if (_userInfo.Result.length == 0) {
          cb(
            null,
            EWTRACEEND({
              status: 0,
              result: "当前会员非缴费会员，请升级为VIP"
            })
          );
          return;
        }
        if (_deviceBookInfo.Result.length == 0) {
          cb(
            null,
            EWTRACEEND({
              status: 0,
              result: "该书籍已经被其他会员借走"
            })
          );
          return;
        }

        bsSQL =
          "update xb_devicebooks set schtime = null, schuser = '' where schuser = '" +
          _userInfo.Result[0].mobile +
          "';update xb_devicebooks set schtime = now(), schuser = '" +
          _userInfo.Result[0].mobile +
          "' where deviceId=" +
          bookId.deviceId +
          " and cageId = " +
          bookId.cageId +
          " and schuser = ''";

        DoSQL(bsSQL, function(err) {
          if (err) {
            cb(
              err,
              EWTRACEEND({
                status: 0,
                result: ""
              })
            );
            return;
          } else {
            cb(
              null,
              EWTRACEEND({
                status: 1,
                result: "预约成功，请在明天24时前拿取书籍"
              })
            );
            return;
          }
        });
      },
      function(err) {
        cb(
          err,
          EWTRACEEND({
            status: 0,
            result: ""
          })
        );
        return;
      }
    );
  };
  Xbox.remoteMethod("reserveBook", {
    http: {
      verb: "post"
    },
    description: "预约书籍",
    accepts: [
      {
        arg: "bookId",
        type: "object",
        http: {
          source: "body"
        },
        description: "{deviceId:12345678,cageId:1}"
      },
      {
        arg: "token",
        type: "string",
        http: function(ctx) {
          var req = ctx.req;
          return req.headers.token;
        },
        description: "token"
      }
    ],
    returns: {
      arg: "echostr",
      type: "object",
      root: true
    }
  });

  Xbox.getReservedBook = function(userInfo, cb) {
    var ps = [];
    console.log(userInfo);
    var bsSQL =
      "select cageId,deviceId from xb_devicebooks where schuser = " +
      userInfo.mobile;
    var _deviceBookInfo = {};
    ps.push(ExecuteSyncSQLResult(bsSQL, _deviceBookInfo));

    bsSQL =
      "select * from xb_users where mobile = '" +
      userInfo.mobile +
      "' and isvip = 1";
    var _userInfo = {};
    ps.push(ExecuteSyncSQLResult(bsSQL, _userInfo));

    Promise.all(ps).then(
      function() {
        if (_userInfo.Result.length == 0) {
          cb(
            null,
            EWTRACEEND({
              status: 0,
              result: "您还不是VIP会员，请缴费后再次借阅"
            })
          );
          return;
        }

        if (_deviceBookInfo.Result.length == 0) {
          cb(
            null,
            EWTRACEEND({
              status: 0,
              result: "书籍信息未找到，请联系管理员"
            })
          );
          return;
        }

        var doorId = convertNumber(_deviceBookInfo.Result[0].cageId);
        EWTRACE(doorId);

        var socketList = app.get("m_socketList");

        var find = _.find(socketList, function(item) {
          return item.DeviceID == _deviceBookInfo.Result[0].deviceId;
        });
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
          console.log(
            "DeviceID:" +
              bookId.deviceId +
              ": DoorID：" +
              doorId +
              ", Data:" +
              _tmp +
              ", sendOver:" +
              sendOver
          );

          if (sendOver) {
            bsSQL =
              "insert into xb_userbooks(openid,bookid,startDate) select '" +
              OpenID.openid +
              "' as openid, bookid, now() from xb_devicebooks where deviceId=" +
              bookId.deviceId +
              " and cageId = " +
              bookId.cageId +
              ";";
            bsSQL +=
              "delete from xb_devicebooks where deviceId=" +
              bookId.deviceId +
              " and cageId = " +
              bookId.cageId +
              ";";

            bsSQL +=
              "update xb_users set lastDeviceId = '" +
              bookId.deviceId +
              "' where openid = '" +
              OpenID.openid +
              "';";

            DoSQL(bsSQL, function(err) {
              if (err) {
                cb(
                  err,
                  EWTRACEEND({
                    status: 0,
                    result: "借阅书籍失败，请联系管理员"
                  })
                );
              } else {
                cb(
                  null,
                  EWTRACEEND({
                    status: 1,
                    result: "借阅成功"
                  })
                );
              }
            });
          } else {
            cb(null, {
              status: 0,
              result: "借阅书籍失败，请联系管理员【send bad】"
            });
          }
        } else {
          cb(null, {
            status: 0,
            result: "device not find!"
          });
        }
      },
      function(err) {
        cb(
          err,
          EWTRACEEND({
            status: 0,
            result: ""
          })
        );
      }
    );
  };

  Xbox.remoteMethod("getReservedBook", {
    http: {
      verb: "post"
    },
    description: "取预约的书籍",
    accepts: {
      arg: "bookId",
      type: "object",
      http: {
        source: "body"
      },
      description: '{"mobile":18958064659}'
    },
    returns: {
      arg: "echostr",
      type: "object",
      root: true
    }
  });

  Xbox.borrowBook = function(bookId, token, cb) {
    EWTRACEBEGIN();

    var OpenID = {};
    try {
      OpenID = GetOpenIDFromToken(token);
      delete OpenID.exp;
      delete OpenID.iat;
    } catch (err) {
      cb(
        err,
        EWTRACEEND({
          status: 0,
          result: ""
        })
      );
      return;
    }
    var ps = [];
    var bsSQL =
      "select * from xb_devicebooks where deviceId=" +
      bookId.deviceId +
      " and cageId = " +
      bookId.cageId;
    var _deviceBookInfo = {};
    ps.push(ExecuteSyncSQLResult(bsSQL, _deviceBookInfo));

    bsSQL =
      "select * from xb_userbooks where openid = '" +
      OpenID.openid +
      "' and returnDate is null";
    var _userBookInfo = {};
    ps.push(ExecuteSyncSQLResult(bsSQL, _userBookInfo));

    bsSQL =
      "select * from xb_users where openid = '" +
      OpenID.openid +
      "' and isvip = 1";
    var _userInfo = {};
    ps.push(ExecuteSyncSQLResult(bsSQL, _userInfo));

    // bsSQL =
    //   "select * from xb_devicebooks where schuser in (select mobile from xb_users where openid = '" +
    //   OpenID.openid +
    //   "')";
    // var _reserveBookInfo = {};
    // ps.push(ExecuteSyncSQLResult(bsSQL, _reserveBookInfo));

    Promise.all(ps).then(
      function() {
        if (_userInfo.Result.length == 0) {
          cb(
            null,
            EWTRACEEND({
              status: 0,
              result: "您还不是VIP会员，请缴费后再次借阅"
            })
          );
          return;
        }

        if (_deviceBookInfo.Result.length == 0) {
          cb(
            null,
            EWTRACEEND({
              status: 0,
              result: "书籍信息未找到，请联系管理员"
            })
          );
          return;
        }
        if (_userBookInfo.Result.length != 0) {
          cb(
            null,
            EWTRACEEND({
              status: 0,
              result: "请先归还上次借阅的书籍后再次借阅"
            })
          );
          return;
        }
        // if (_reserveBookInfo.Result.length != 0) {
        //   cb(
        //     null,
        //     EWTRACEEND({
        //       status: 0,
        //       result: "请取走预约书籍，勿再次借阅"
        //     })
        //   );
        //   return;
        // }

        var doorId = convertNumber(bookId.cageId);
        EWTRACE(doorId);

        var socketList = app.get("m_socketList");

        var find = _.find(socketList, function(item) {
          return item.DeviceID == bookId.deviceId;
        });
        if (!_.isUndefined(find) || bookId.deviceId == "11111111") {
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

          var sendOver = true;
          if (bookId.deviceId != "11111111") {
            sendOver = find.userSocket.write(new Buffer(_tmp));
            console.log(
              "DeviceID:" +
                bookId.deviceId +
                ": DoorID：" +
                doorId +
                ", Data:" +
                _tmp +
                ", sendOver:" +
                sendOver
            );
          }
          if (sendOver) {
            bsSQL =
              "insert into xb_userbooks(openid,bookid,startDate) select '" +
              OpenID.openid +
              "' as openid, bookid, now() from xb_devicebooks where deviceId=" +
              bookId.deviceId +
              " and cageId = " +
              bookId.cageId +
              ";";
            bsSQL +=
              "delete from xb_devicebooks where deviceId=" +
              bookId.deviceId +
              " and cageId = " +
              bookId.cageId +
              ";";

            bsSQL +=
              "update xb_devicebooks set schuser = '' where schuser = '" +
              _userInfo.Result[0].mobile +
              "';";

            bsSQL +=
              "update xb_users set lastDeviceId = '" +
              bookId.deviceId +
              "' where openid = '" +
              OpenID.openid +
              "';";

            DoSQL(bsSQL, function(err) {
              if (err) {
                cb(
                  err,
                  EWTRACEEND({
                    status: 0,
                    result: "借阅书籍失败，请联系管理员"
                  })
                );
              } else {
                cb(
                  null,
                  EWTRACEEND({
                    status: 1,
                    result: "借阅成功"
                  })
                );
              }
            });
          } else {
            cb(null, {
              status: 0,
              result: "借阅书籍失败，请联系管理员【send bad】"
            });
          }
        } else {
          cb(null, {
            status: 0,
            result: "device not find!"
          });
        }
      },
      function(err) {
        cb(
          err,
          EWTRACEEND({
            status: 0,
            result: ""
          })
        );
      }
    );
  };
  Xbox.remoteMethod("borrowBook", {
    http: {
      verb: "post"
    },
    description: "获取书籍详细信息",
    accepts: [
      {
        arg: "bookId",
        type: "object",
        http: {
          source: "body"
        },
        description: "{id:1,deviceId:12345678,cageId:1}"
      },
      {
        arg: "token",
        type: "string",
        http: function(ctx) {
          var req = ctx.req;
          return req.headers.token;
        },
        description: "token"
      }
    ],
    returns: {
      arg: "echostr",
      type: "object",
      root: true
    }
  });

  Xbox.getBorrowList = function(token, cb) {
    EWTRACEBEGIN();

    var OpenID = {};
    try {
      OpenID = GetOpenIDFromToken(token);
      delete OpenID.exp;
      delete OpenID.iat;
    } catch (err) {
      cb(
        err,
        EWTRACEEND({
          status: 0,
          result: ""
        })
      );
      return;
    }

    var ps = [];

    var bsSQL =
      "SELECT c.bookId as id, c.title, c.author,date_format(a.schtime,'%Y-%m-%d') as startDate,'' as endDate ,'' as returnDate,c.image FROM xb_devicebooks a, xb_users b, xb_books c where b.mobile <> '' and c.bookid = a.bookid and a.schuser = b.mobile and b.openid = '" +
      OpenID.openid +
      "'";
    var _schList = {};
    ps.push(ExecuteSyncSQLResult(bsSQL, _schList));

    bsSQL =
      "SELECT b.bookId as id, b.title, b.author,date_format(a.startDate,'%Y-%m-%d') as startDate,date_format(date_add(a.startDate, interval b.leaseDays day),'%Y-%m-%d') as endDate ,date_format(a.returnDate,'%Y-%m-%d') as returnDate,b.image FROM xb_userbooks a, xb_books b where a.bookid = b.bookid and a.openid = '" +
      OpenID.openid +
      "' order by a.startDate desc";
    var _BorrowList = {};
    ps.push(ExecuteSyncSQLResult(bsSQL, _BorrowList));

    Promise.all(ps).then(
      function() {
        var _result = [];

        _BorrowList.Result.forEach(function(item) {
          var find = _.find(_result, function(fitem) {
            return (
              fitem.lease.startDate == item.startDate && fitem.preserve == false
            );
          });

          if (_.isUndefined(find)) {
            var _book = {};

            _book.books = [];
            var book = {};
            book.id = item.id;
            book.title = item.title;
            book.image = item.image;
            _book.preserve = false;
            _book.books.push(book);
            _book.lease = {};
            _book.lease.startDate = item.startDate;
            _book.lease.endDate = item.endDate;
            _book.lease.returnDate = null;
            if (!_.isNull(item.returnDate)) {
              _book.lease.returnDate = item.returnDate;
            }
            _result.push(_book);
          } else {
            var book = {};
            book.id = item.id;
            book.title = item.title;
            book.image = item.image;
            find.books.push(book);
          }
        });

        _schList.Result.forEach(function(item) {
          var find = _.find(_result, function(fitem) {
            return (
              fitem.lease.startDate == item.startDate && fitem.preserve == true
            );
          });

          if (_.isUndefined(find)) {
            var _book = {};

            _book.books = [];
            var book = {};
            book.id = item.id;
            book.title = item.title;
            book.image = item.image;
            _book.preserve = true;
            _book.books.push(book);
            _book.lease = {};
            _book.lease.startDate = item.startDate;
            _book.lease.endDate = item.endDate;
            _book.lease.returnDate = null;
            _result.push(_book);
          } else {
            var book = {};
            book.id = item.id;
            book.title = item.title;
            book.image = item.image;
            find.books.push(book);
          }
        });

        cb(
          null,
          EWTRACEEND({
            status: 1,
            result: _result
          })
        );
      },
      function(err) {
        cb(
          err,
          EWTRACEEND({
            status: 0,
            result: "借阅书籍失败，请联系管理员"
          })
        );
      }
    );
  };
  Xbox.remoteMethod("getBorrowList", {
    http: {
      verb: "post"
    },
    description: "得到借阅列表",
    accepts: {
      arg: "token",
      type: "string",
      http: function(ctx) {
        var req = ctx.req;
        return req.headers.token;
      },
      description: "token"
    },
    returns: {
      arg: "echostr",
      type: "object",
      root: true
    }
  });

  Xbox.getMembershipOptions = function(cb) {
    EWTRACEBEGIN();

    var bsSQL = "select id,name,price from xb_VIPPrice order by price";

    DoSQL(bsSQL, function(err, result) {
      if (err) {
        cb(
          err,
          EWTRACEEND({
            status: 0,
            result: ""
          })
        );
      } else {
        cb(
          null,
          EWTRACEEND({
            status: 1,
            result: result
          })
        );
      }
    });
  };
  Xbox.remoteMethod("getMembershipOptions", {
    http: {
      verb: "post"
    },
    description: "VIP收费价格表",
    returns: {
      arg: "echostr",
      type: "object",
      root: true
    }
  });

  Xbox.purchaseMemebership = function(memberShip, token, cb) {
    EWTRACEBEGIN();

    var OpenID = {};
    try {
      OpenID = GetOpenIDFromToken(token);
      delete OpenID.exp;
      delete OpenID.iat;
    } catch (err) {
      cb(
        err,
        EWTRACEEND({
          status: 0,
          result: ""
        })
      );
      return;
    }

    var bsSQL =
      "select price as price,buyTime from xb_VIPPrice where id = " +
      memberShip.id;

    DoSQL(bsSQL, function(err, result) {
      wx_CreateOrders(result[0].price, OpenID.openid).then(
        function(payout) {
          if (payout.return_code == "FAIL") {
            cb(null, {
              status: 0,
              result: payout
            });
            return;
          }
          bsSQL =
            "insert into xb_userOrders(openid,addtime,paystatus,fee,buytime,payorderid) values('" +
            OpenID.openid +
            "',now(),'payment'," +
            result[0].price +
            "," +
            result[0].buyTime +
            ",'" +
            payout.out_trade_no +
            "');";
          DoSQL(bsSQL, function(err) {
            if (!err) {
              cb(null, {
                status: 1,
                result: payout
              });
            } else {
              cb(null, {
                status: 0,
                result: ""
              });
            }
          });
        },
        function(err) {
          cb(err, {
            status: 0,
            result: ""
          });
        }
      );
    });
  };
  Xbox.remoteMethod("purchaseMemebership", {
    http: {
      verb: "post"
    },
    description: "支付",
    accepts: [
      {
        arg: "memberShip",
        type: "object",
        http: {
          source: "body"
        },
        description: "{id:1}"
      },
      {
        arg: "token",
        type: "string",
        http: function(ctx) {
          var req = ctx.req;
          return req.headers.token;
        },
        description: "token"
      }
    ],
    returns: {
      arg: "echostr",
      type: "object",
      root: true
    }
  });

  Xbox.getTestToken = function(cb) {
    EWTRACEBEGIN();
    console.log(process.env);

    var OpenID = {
      openid: "oFVZ-1Mf3yxWLWHQPE_3BhlVFnGU",
      nickname: "张三",
      sex: 1,
      language: "zh_CN",
      city: "Hangzhou",
      province: "Zhejiang",
      country: "China",
      headimgurl:
        "http://thirdwx.qlogo.cn/mmopen/vi_32/Q0j4TwGTfTJicLw2MkRZ4mT841tP9ItuXicPiaibibZ9ia5AxT4icS28uicEbK5wtVymkYEcodvUVWKsKia1koDnHoWoo9g/132",
      privilege: [],
      unionid: "oBQ4y01s_iPdv-NqE8zonMYFfuus"
    };

    getWeChatToken(OpenID).then(function(token) {
      cb(
        null,
        EWTRACEEND({
          status: 0,
          token: token
        })
      );
    });
  };

  Xbox.remoteMethod("getTestToken", {
    http: {
      verb: "post"
    },
    description: "获取测试token",
    returns: {
      arg: "echostr",
      type: "object",
      root: true
    }
  });

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
        detail.num = "0" + detail.num;
        _detail(detail);
      } else {
        return;
      }
    };

    var detail = {};
    detail.num = num;
    detail.n = n;
    _detail(detail);
    return detail.num;
  };

  function convertNumber(strboxId) {
    var byteNumber = "8A";
    var boxId = parseInt(strboxId);
    if (boxId - 10 <= 0) {
      byteNumber += "00";
      byteNumber += pad(boxId.toString(16).toUpperCase(), 2);
    } else {
      var page = parseInt((boxId - 10) / 40);
      byteNumber += pad(page + 1, 2);
      byteNumber += pad((boxId - 10 - page * 40).toString(16).toUpperCase(), 2);
    }
    byteNumber += "11";
    return byteNumber;
  }

  Xbox.openDoor = function(GetTicket, cb) {
    EWTRACE("openDoor Begin");

    var doorId = convertNumber(GetTicket.Data);
    EWTRACE(doorId);

    var socketList = app.get("m_socketList");

    var find = _.find(socketList, function(item) {
      return item.DeviceID == GetTicket.deviceId;
    });
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
      console.log(
        "DeviceID:" +
          GetTicket.deviceId +
          ": Data：" +
          doorId +
          ", sendOver:" +
          sendOver
      );

      cb(null, {
        status: 1,
        result: ""
      });
    } else {
      cb(null, {
        status: 0,
        result: "device not find!"
      });
    }
  };

  Xbox.remoteMethod("openDoor", {
    http: {
      verb: "post"
    },
    description: "获得Ticket",
    accepts: {
      arg: "GetTicket",
      type: "object",
      description: '{"deviceId":"11111111","Data":"1"}'
    },
    returns: {
      arg: "RegInfo",
      type: "object",
      root: true
    }
  });

  function Rad(d) {
    return (d * Math.PI) / 180.0; //经纬度转换成三角函数中度分表形式。
  }

  function GetDistance(lat1, lng1, lat2, lng2) {
    var radLat1 = Rad(lat1);
    var radLat2 = Rad(lat2);
    var a = radLat1 - radLat2;
    var b = Rad(lng1) - Rad(lng2);
    var s =
      2 *
      Math.asin(
        Math.sqrt(
          Math.pow(Math.sin(a / 2), 2) +
            Math.cos(radLat1) * Math.cos(radLat2) * Math.pow(Math.sin(b / 2), 2)
        )
      );
    s = s * 6378.137; // EARTH_RADIUS;
    s = Math.round(s * 10000) / 10000; //输出为公里
    //s=s.toFixed(4);
    return s;
  }

  Xbox.isNearDevice = function(lbsInfo, cb) {
    EWTRACEBEGIN();
    console.log(lbsInfo);

    var bsSQL =
      "select latitude,longitude from xb_devices where deviceId = " +
      lbsInfo.deviceId;

    DoSQL(bsSQL, function(err, result) {
      if (err || result.length == 0) {
        cb(null, {
          status: 0,
          result: "设备获取失败"
        });
      } else {
        console.log(result[0]);

        var distance = GetDistance(
          lbsInfo.latitude,
          lbsInfo.longitude,
          result[0].latitude,
          result[0].longitude
        );

        console.log("length:" + distance);
        if (distance >= 0.5) {
          cb(null, {
            status: 1,
            result: false
          });
        } else {
          cb(null, {
            status: 1,
            result: true
          });
        }
      }
    });
  };
  Xbox.remoteMethod("isNearDevice", {
    http: {
      verb: "post"
    },
    description: "用户登录",
    accepts: {
      arg: "lsbInfo",
      type: "object",
      http: {
        source: "body"
      },
      description: "{latitude:30.172501,longitude:120.076027,deviceId:11111111}"
    },
    returns: {
      arg: "echostr",
      type: "object",
      root: true
    }
  });

  Xbox.rename = function(cb) {
    EWTRACE("rename Begin");
    var shell = require("shelljs");

    shell.exec("echo hello ");

    var fs = require("fs");
    var data = fs.readFileSync(
      "//Users//geling//code//1//download.dat",
      "utf-8"
    );

    var index = data.split("\n");

    for (var i = 0; i < index.length; i++) {
      var name = index[i].split("@");

      var fname = name[6].replace("(", "[");
      fname = fname.replace("）", "]");
      fname = fname.replace(")", "]");
      fname = fname.replace(/ /g, "");
      var smv =
        "mv //Users//geling//code//1//" +
        name[1] +
        " //Users//geling//code//1//" +
        fname +
        ".mp3";
      console.log(smv);
      shell.exec(
        "mv //Users//geling//code//1//" +
          name[1] +
          " //Users//geling//code//1//" +
          fname +
          ".mp3"
      );
    }

    cb(null, { status: 1 });
  };

  Xbox.remoteMethod("rename", {
    http: { verb: "post" },
    description: "改名字",
    returns: { arg: "RegInfo", type: "object", root: true }
  });

  Xbox.getOnlineDevices = function(token, lbsInfo, cb) {
    EWTRACEBEGIN();
    console.log(lbsInfo);

    var OpenID = {};
    try {
      OpenID = GetOpenIDFromToken(token);
      delete OpenID.exp;
      delete OpenID.iat;
    } catch (err) {
      cb(
        err,
        EWTRACEEND({
          status: 0,
          result: ""
        })
      );
      return;
    }

    var bsSQL = "select deviceId, name,latitude,longitude,address from xb_devices";
    if (process.env.NODE_ENV != "test") {
      bsSQL += " where test = 0";
    }

    DoSQL(bsSQL, function(err, deviceList) {
      if (err || deviceList.length == 0) {
        cb(null, {
          status: 0,
          result: "设备获取失败"
        });
      } else {
        var result = {};
        result.lastActiveDevice = {};
        result.onlineDeviceList = [];

        deviceList.forEach(function(item) {
          item.distance = GetDistance(
            lbsInfo.latitude,
            lbsInfo.longitude,
            item.latitude,
            item.longitude
          );
        });

        bsSQL =
          "select ifnull(lastdeviceid,0) as lastDeviceId from xb_users where openid = '" +
          OpenID.openid +
          "'";
        DoSQL(bsSQL, function(err, userInfo) {
          var lastDeviceId = 0;
          if (userInfo.length >= 0) {
            lastDeviceId = userInfo[0].lastDeviceId;
          }

          deviceList.forEach(function(item) {
            if (item.deviceId == lastDeviceId) {
              result.lastActiveDevice = item;
              result.onlineDeviceList.push(item);
            } else {
              result.onlineDeviceList.push(item);
            }
          });
          result.onlineDeviceList = _.sortBy(
            result.onlineDeviceList,
            "distance"
          );
          cb(null, {
            status: 1,
            result: result
          });
        });
      }
    });
  };

  Xbox.remoteMethod("getOnlineDevices", {
    http: {
      verb: "post"
    },
    description: "用户登录",
    accepts: [
      {
        arg: "token",
        type: "string",
        http: function(ctx) {
          var req = ctx.req;
          return req.headers.token;
        }
      },
      {
        arg: "lsbInfo",
        type: "object",
        http: {
          source: "body"
        },
        description: '{"latitude":30.172501,"longitude":120.076027}'
      }
    ],
    returns: {
      arg: "echostr",
      type: "object",
      root: true
    }
  });
};
