var express = require('express');
var mongoose = require('mongoose');
var router = express.Router();
var passport = require('passport');
var moment = require('moment');
var requestify = require('requestify');
var mongojs = require('mongojs');
var async = require('async');
var uniqid = require('uniqid');

moment.locale('fr');

var Client = mongoose.model('Client');
var User = mongoose.model('User');
var Payout = mongoose.model('Payout');


router.put('/payouts/fixReference', function(req, res){

  async.waterfall([

    function(done){
      Payout.find().exec(function(err, payouts){
        if (err){
          return done(err);
        } else {
          return done(null, payouts);
        }
      });
    },

    function(payouts, done){
      async.eachLimit(payouts, 1, function(payout, eachPayout){
        /*if (payout.kind == "Reward"){
          var reference = uniqid.process('PAY-');
        } else if (payout.kind == "Grille"){
          var reference = uniqid.process('PAY-'); // 16 bytes
        } else {
          return eachPayout("Unknown payout !");
        }*/

        var reference = uniqid.process('PAY-'); // 16 bytes

        Payout.updateOne({ _id: payout._id }, { $set: { reference: reference } }, function(err, result){
          if (err){
            return eachPayout(err);
          }

          return eachPayout();
        });
      }, function(err){
        if (err){
          return done(err);
        } else {
          return done(null, "OK");
        }
      });
    }

  ], function(err, result){
    if (err){
      return res.status(500).json(err);
    } else {
      return res.status(200).json(result);
    }
  });

});

router.put('/payouts/fixInvoice', function(req, res){

  async.waterfall([

    function(done){
      Payout.find({ invoice: { $exists: false } }).populate('user').exec(function(err, payouts){
        if (err){
          return done(err);
        } else {
          return done(null, payouts);
        }
      });
    },

    function(payouts, done){
      async.eachLimit(payouts, 1, function(payout, eachPayout){

        if (payout.user == null){
          console.log("NO USER", payout);
          return eachPayout();
        }

        if (!('paypal' in payout.user) || typeof payout.user.paypal == 'undefined'){
          console.log("NO PAYPAL", payout.user);
          return eachPayout();
        }

        if (payout.kind == "Reward"){
          var price = payout.rewardCost;
        } else if (payout.kind == "Grille"){
          var price = 0;
        } else {
          return eachPayout("Unknown payout !");
        }

        var paymentMethod = payout.description;
        if (payout.description == "Bitcoin"){
          var paymentAddress = payout.user.bitcoin;
        } else if (payout.description == "PayPal"){
          var paymentAddress = payout.user.paypal;
        } else {
          var paymentAddress = payout.user.email;
          paymentMethod = "PayPal";
        }

        Payout.updateOne({ _id: payout._id }, { $set: {
          "invoice.firstname": payout.user.firstname,
          "invoice.lastname": payout.user.lastname,
          "invoice.address": payout.user.address.street + " - " + payout.user.address.city + " " + payout.user.address.zipcode + " - " + payout.user.address.country,
          "invoice.paymentMethod": paymentMethod,
          "invoice.paymentAddress": paymentAddress,
          "invoice.price": price,
          "invoice.amount": payout.amount
        } }, function(err, result){
          if (err){
            return eachPayout(err);
          }

          return eachPayout();
        });
      }, function(err){
        if (err){
          return done(err);
        } else {
          return done(null, "OK");
        }
      });
    }

  ], function(err, result){
    if (err){
      return res.status(500).json(err);
    } else {
      return res.status(200).json(result);
    }
  });

});


module.exports = router;
