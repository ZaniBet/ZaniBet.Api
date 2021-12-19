var express = require('express');
var mongoose = require('mongoose');
var router = express.Router();
var passport = require('passport');
var moment = require('moment');
var requestify = require('requestify');
var mongojs = require('mongojs');
var async = require('async');
var crypto = require('crypto');
var util = require('util');
var uniqid = require('uniqid');

var Client = mongoose.model('Client');
var Competition = mongoose.model('Competition');
var Team = mongoose.model('Team');
var Fixture = mongoose.model('Fixture');
var GameTicket = mongoose.model('GameTicket');
var Grille = mongoose.model('Grille');
var User = mongoose.model('User');
var Transaction = mongoose.model('Transaction');


router.get('/pollfish', function(req, res){
  var secretKey = "4f3ffcda-5ae2-4ae9-b98c-1433d2147f6c";

  var cpa = req.query.cpa;
  var debug = req.query.debug;
  var deviceId = req.query.device_id;
  var userId = req.query.request_uuid;
  var signature = req.query.signature;
  var timestamp = req.query.timestamp;
  var impressionId = req.query.tx_id;

  if (debug){
    console.log("Pollfish debug :", debug);
    //var concatedQuery = cpa + debug + deviceId + userId + signature + timestamp + impressionId;
    return res.status(500).json("debug");
    var concatedQuery = cpa + ":" + deviceId + ":" + userId + ":" + timestamp +  ":" + impressionId;
  } else {
    var concatedQuery = cpa + ":" + deviceId + ":" + userId + ":" + timestamp +  ":" + impressionId;
  }
  //console.log("concatedQuery =", concatedQuery);
  var hashString = crypto.createHmac("sha1", secretKey).update(concatedQuery).digest("base64");
  console.log("Pollfish userId =", userId);
  console.log("Pollfish transactionId =", impressionId);
  console.log("Pollfish hashString =", hashString);
  console.log("Pollfish verifier =", signature);

  //If hashes match impression is valid
  if (signature.toUpperCase() === hashString.toUpperCase()) {
    var _currentUser;
    var _transactionAlreadyExist;

    async.waterfall([
      function(done){
        User.findOne({ _id: userId }, function(err, user){
          if (err){
            console.log("Pollfish Fail :", err);
            return done("KO");
          } else if (user == null){
            console.log("Pollfish Fail : User doesn't exists :", userId);
            return done("KO");
          } else {
            _currentUser = user;
            return done(null);
          }
        });
      },

      function(done){
        Transaction.findOne({ source: "Pollfish", sourceKind: "AdsNetwork", sourceRef: impressionId }, function(err, transaction){
          if (err){
            console.log("Pollfish Fail : Impossible de vérifier si la transaction existe déjà -", offerId);
            return done("KO");
          } else if (transaction != null){
            console.log("Pollfish Fail : La transaction existe déjà.");
            _transactionAlreadyExist = true;
            return done("KO");
          } else {
            return done(null);
          }
        });
      },

      function(done){
        Transaction.create({
          type: "Jeton",
          destinationKind: "User",
          destination: userId,
          sourceKind: "AdsNetwork",
          source: "Pollfish",
          sourceRef: impressionId,
          amount: Math.round((cpa/100)*250),
          status: "pending"
        }).then(function(transaction){
          return User.updateOne({ _id: transaction.destination }, { $inc: { jeton: transaction.amount } }).exec();
        }).then(function(updateOp){
          console.log("Pollfish update", updateOp);

          process.nextTick(function(){
            console.log("Pollfish done");
            done(null);
          });
        }, function(err){
          console.log("Error :", err);
          process.nextTick(function(){
            console.log("Pollfish KO");
            done("KO");
          });
        });
      }

    ], function(err, result){
      if (err){
        if (_transactionAlreadyExist) return res.status(200).json(impressionId + ":ALE");
        return res.status(500).json(impressionId + ":KO");
      } else {
        return res.status(200).json(impressionId + ":OK");
      }
    });
  } else {
    console.log("Pollfish Error : Unable to verify transaction !");
    return res.status(500).json("OK");
  }
});

module.exports = router;
