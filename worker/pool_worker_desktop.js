var WebSocket = require("ws");
var net = require('net');
var fs = require('fs');
var MongoClient = require('mongodb').MongoClient;
var async = require('async');
var requestify = require('requestify');
var moment = require('moment');
var uniqid = require('uniqid');
var GCM = require('../lib/gcm');

var server = "wss://zhash.zanibet.com:5242";
//var server = "ws://192.168.1.10:5242";
const W3CWebSocket = require('websocket').w3cwebsocket;
const WebSocketAsPromised = require('websocket-as-promised');

const wsp = new WebSocketAsPromised(server, {
  createWebSocket: url => new W3CWebSocket(url),
  packMessage: data => JSON.stringify(data),
  unpackMessage: message => JSON.parse(message),
  attachRequestId: (data, requestId) => Object.assign({requestId: requestId}, data), // attach requestId to message as `id` field
  extractRequestId: data => data && data.requestId,
});

wsp.open().then(function(){
  MongoClient.connect(process.env.DB_URI, function(err, db) {
    console.log("Connected successfully to server");
    console.log("-----> Start pool_desktop_worker.js <-----");
    poolJob(db).then(function(res){
      wsp.close();
      db.close();
      console.log("-----> Pool Worker Desktop Job Done <-----");
    }).catch(function(err){
      console.log(err);
      wsp.close();
      db.close();
    });
  });
}, function(err){
  console.log("Impossible de se connecter au wss");
});

// If we are dev env, load dotenv
if (process.env.NODE_ENV != "production"){
  require('dotenv').config();
}

var poolJob = function(db){
  return new Promise(function(resolve, reject){
    var User = db.collection('user');
    var Transaction = db.collection('transaction');

    async.waterfall([

      function(done){
        var allstats_message = { identifier: "allstats" };
        wsp.sendRequest(allstats_message).then(function(response){
          //console.log(response.stats);
          return done(null, response.stats);
        }).catch(function(err){
          //console.log(err);
          return done(err);
        });
      },

      function(stats, done){
        async.eachLimit(stats, 1, function(stat, eachStat){
          // Transaction waterfall
          async.waterfall([

            // Ask user stats
            function(done){
              User.findOne({ email: stat.userid }, function(err, user){
                if (err){
                  return done(err);
                } else if (user == null) {
                  return done("user not exists");
                } else {
                  return done(null, user);
                }
              });
            },

            // Initier une transaction
            function(user, done){
              var transactionRef = uniqid();
              Transaction.insertOne({ createdAt: moment().utc().toDate(),
                updatedAt: moment().utc().toDate(),
                type: "ZaniHash",
                source: "ZaniAnalytics",
                sourceRef: transactionRef,
                sourceKind: "ZaniAnalytics",
                destination: user._id,
                destinationKind: "User",
                amount: parseInt(stat.value),
                status: "initial",
                currency: "ZaniHash"
              }, function(err, result){
                if (err){
                  return done(err);
                } else {
                  return done(null, transactionRef);
                }
              });
            },

            // Récupérer la transaction dernièrement créé et commencer à procéder à son traitement
            function(transactionRef, done){
              var _transaction;
              Transaction.findOne({ type: "ZaniHash", sourceRef: transactionRef, status: "initial" })
              .then(function(transaction){
                if (transaction == null) throw "La transaction n'existe pas";
                _transaction = transaction;
                //console.log(_transaction);
                return Transaction.updateOne({ _id: transaction._id, status: "initial" }, { $set: { status: "pending", updatedAt: moment().utc().toDate() } });
              }).then(function(result){
                if (result.modifiedCount == 1){
                  // Créditer l'user
                  return User.updateOne({ _id: _transaction.destination, pendingTransactions: { $ne: _transaction._id } }, { $inc: { "wallet.totalZaniHash": parseInt(_transaction.amount), "wallet.zaniHash": parseInt(_transaction.amount)}, $push: { pendingTransactions: _transaction._id }, $set: { updatedAt: moment().utc().toDate() } });
                } else {
                  throw "Impossible d'initier la transaction : " + _transaction._id;
                }
              }).then(function(result){
                return done(null, _transaction);

                /*if (result.modifiedCount == 1){
                  // L'user a été crédité
                  var resetuserstats_message = { identifier: "resetuserstats", userid: stat.userid };
                  wsp.sendRequest(resetuserstats_message).then(function(response){
                    return done(null, _transaction);
                  }, function(err){
                    console.log("Une erreur c'est produite lors de l'envoi de la commande de reset !");
                    return done(null, _transaction);
                  });
                } else {
                  return done("Impossible de créditer le compte du parrain : " + referrer._id);
                }*/
              }, function(err){
                return done(err);
              });
            },

            // Finaliser la transaction
            function(transaction, done){
              Transaction.updateOne({ _id: transaction._id, status: "pending" }, { $set: { updatedAt: moment().utc().toDate(), status: "applied" } }).then(function(result){
                if (result.modifiedCount == 1){
                  // La transaction a été mise à jour
                  return User.updateOne({ _id: transaction.destination }, { $pull: { pendingTransactions: transaction._id } });
                } else {
                  throw "Impossible de finaliser la transaction :" + transaction._id;
                }
              }).then(function(result){
                if (result.modifiedCount == 1){
                  // Les transactions en attente de l'utilisateur ont été mises à jour
                  return Transaction.updateOne({ _id: transaction._id, status: "applied" }, { $set: { updatedAt: moment().utc().toDate(), status: "done" } });
                } else {
                  throw "Impossible de mettre à jour les transactions de l'utilisateur :" + transaction.destination;
                }
              }).then(function(){
                //GCM.sendSingleMessage([user.fcmToken], "ZaniBet", String(transaction.amount) + " ZaniHashs viennent d'être crédités sur votre compte.");
                return done(null);
              }, function(err){
                return done(err);
              });
            }

          ], function(err, result){
            if (err){
              return eachStat(null);
            } else {
              return eachStat(null);
            }
          });
        }, function(err){
          if (err){
            return done(err);
          } else {
            return done("OK");
          }
        });
      }
    ], function(err, result){
      if (err){
        return reject(err);
      } else {
        return resolve(result);
      }
    });

  });
};
