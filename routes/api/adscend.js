var express = require('express');
var mongoose = require('mongoose');
var router = express.Router();
var passport = require('passport');
var moment = require('moment');
var validator = require('validator');
var CustomError = require('../../lib/customerror');
var utils  = require('../../lib/utils.js');
var config = require('../../config/global.js');
var uniqid = require('uniqid');
var async = require('async');
var GCM = require('../../lib/gcm');

var User = mongoose.model('User');
var Transaction = mongoose.model('Transaction');

router.get('/adscend/jetons', function(req, res){
  console.log('Adscend query :',req.query);

  var userId = req.query.sub1;
  var transactionId = req.query.tid;
  var rewards = req.query.currency;
  var comission = req.query.rate;
  var offerId = req.query.offerid;
  var offerName = req.query.name;
  var status = req.query.status;
  var ip = req.query.ip;

  var _transactionAlreadyExist = false;
  var _currentUser = null;
  async.waterfall([
    function(done){
      User.findOne({ _id: userId }, function(err, user){
        if (err){
          console.log("Adscend Fail :", err);
          return done("KO");
        } else if (user == null){
          console.log("Adscend Fail : User doesn't exists :", userId);
          return done("KO");
        } else {
          _currentUser = user;
          return done(null);
        }
      });
    },

    function(done){
      Transaction.findOne({ source: "Adscend", sourceKind: "AdsNetwork", sourceRef: transactionId }, function(err, transaction){
        if (err){
          console.log("Adscend Fail : Impossible de vérifier si la transaction existe déjà -", offerId);
          return done("KO");
        } else if (transaction != null){
          console.log("Adscend Fail : La transaction existe déjà.");
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
        source: "Adscend",
        sourceRef: transactionId,
        amount: parseInt(rewards),
        status: "pending"
      }).then(function(transaction){
        return User.updateOne({ _id: transaction.destination }, { $inc: { jeton: transaction.amount } });
      }).then(function(updateOp){
        console.log(updateOp);
        if (updateOp.nModified == 1){
          if (_currentUser.locale != null && _currentUser.locale == "fr"){
            GCM.sendSingleMessage([_currentUser.fcmToken], "ZaniBet", String(rewards) + " Jetons viennent d'être crédités sur votre compte suite à une mission Adscend.");
          } else if (_currentUser.locale != null && _currentUser.locale == "pt"){
            GCM.sendSingleMessage([_currentUser.fcmToken], "ZaniBet", String(rewards) + " Fichas acabaram de ser creditados em sua conta após uma missão Adscend.");
          } else{
            GCM.sendSingleMessage([_currentUser.fcmToken], "ZaniBet", String(rewards) + " Chips have just been credited to your account following an Adscend mission.");
          }
        }
        return done(null);
      }, function(err){
        console.log(err);
        return done("KO");
      });
    }

  ], function(err, result){
    if (err){
      if (_transactionAlreadyExist) return res.status(200).json(transactionId + ":ALE");
      return res.status(500).json(transactionId + ":KO");
    } else {
      return res.status(200).json(transactionId + ":OK");
    }
  });

});

module.exports = router;
