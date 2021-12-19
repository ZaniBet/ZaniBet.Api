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

router.get('/ironsource/jetons', function(req, res){
  console.log(req.query);
  var userId = req.query.appUserId;
  var rewards = req.query.rewards;
  var eventId = req.query.eventId;

  async.waterfall([
    function(done){
      User.findOne({ _id: userId }, function(err, user){
        if (err){
          console.log("IronSource Fail :", err);
          return done("KO");
        } else if (user == null){
          console.log("IronSource Fail : User doesn't exists :", userId);
          return done("KO");
        } else {
          return done(null);
        }
      });
    },

    function(done){
      Transaction.findOne({ sourceKind: "AdsNetwork", source: "IronSource", sourceRef: eventId }, function(err, transaction){
        if (err){
          console.log("IronSource Fail : Impossible de vérifier si la transaction existe déjà -", eventId);
          return done("KO");
        } else if (transaction != null){
          console.log("IronSource Fail : La transaction existe déjà.");
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
        source: "IronSource",
        sourceRef: eventId,
        amount: parseInt(rewards),
        status: "pending"
      }).then(function(transaction){
        return User.updateOne({ _id: transaction.destination }, { $inc: { jeton: transaction.amount } });
      }).then(function(updateOp){
        console.log(updateOp);
        return done(null);
      }, function(err){
        console.log(err);
        return done("KO");
      });
    }

  ], function(err, result){
    if (err){
      return res.status(500).json(eventId + ":KO");
    } else {
      return res.status(200).json(eventId + ":OK");
    }
  });

});

module.exports = router;
