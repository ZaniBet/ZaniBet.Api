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

var User = mongoose.model('User');
var Transaction = mongoose.model('Transaction');

router.get('/ayetstudios', function(req, res){
  console.log('AyetStudios query :',req.query);

  var userId = req.query.uid;
  var transactionId = req.query.transaction_id;
  var rewards = req.query.currency_amount;
  var comission = req.query.payout;
  var offerId = req.query.offer_id;
  var offerName = req.query.offer_name;
  var ip = req.query.ip;

  var _transactionAlreadyExist = false;

  async.waterfall([
    function(done){
      User.findOne({ _id: userId }, function(err, user){
        if (err){
          console.log("AyetStudios Fail :", err);
          return done("KO");
        } else if (user == null){
          console.log("AyetStudios Fail : User doesn't exists :", userId);
          return done("KO");
        } else {
          return done(null);
        }
      });
    },

    function(done){
      Transaction.findOne({ sourceKind: "AyetStudios", source: transactionId }, function(err, transaction){
        if (err){
          console.log("AyetStudios Fail : Impossible de vérifier si la transaction existe déjà -", offerId);
          return done("KO");
        } else if (transaction != null){
          console.log("AyetStudios Fail : La transaction existe déjà.");
          _transactionAlreadyExist = true;
          return done("KO");
        } else {
          return done(null);
        }
      });
    },

    function(done){
      Transaction.create({ user: userId, type: "Jeton", from: "AyetStudios", fromId: transactionId, amount: rewards, status: "pending" }).then(function(transaction){
        return User.updateOne({ _id: transaction.user }, { $inc: { jeton: transaction.amount } });
      }).then(function(updateOp){
        console.log(updateOp);
        return done(null);
      }, function(err){
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
