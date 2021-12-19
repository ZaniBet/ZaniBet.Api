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

var Payout = mongoose.model('Payout');
var Reward = mongoose.model('Reward');
var User = mongoose.model('User');

router.get('/payouts', passport.authenticate('bearer', { session: false }), function(req, res){
  var currentUser = req.user;

  Payout.find({ user: currentUser._id }).sort({ createdAt: -1 }).populate({ path: 'target',
     populate: {
       path: 'gameTicket',
       model: 'GameTicket'
     } }).then(function(payouts){
    //console.log(payouts);
    return res.status(200).json(payouts);
  }, function(err){
    return res.status(500).json(err);
  });
});

// Créer une demande de paiement d'une récompense
router.post('/payout/reward', passport.authenticate('bearer', { session: false }), function(req, res){
  var currentUser = req.user;
  var rewardId = req.body._id;

  var _reward;

  Reward.findOne({ _id: rewardId }).exec().then(function(reward){
    //console.log('reward', reward);
    if (reward == null){
      throw "Reward not exists";
    } else if (currentUser.point < reward.price){
      throw "Crédit insuffisant";
    }

    // Décrédité l'utilisateur
    _reward = reward;
    currentUser.point -= reward.price;
    return currentUser.save();
  }).then(function(user){
    var reference = uniqid.process('PAY-'); // 16 bytes
    var paymentAddress = "";
    if (_reward.brand == "Bitcoin"){
      paymentAddress = currentUser.bitcoin;
    } else if (_reward.brand == "PayPal"){
      paymentAddress = currentUser.paypal;
    } else {
      paymentAddress = currentUser.email;
    }

    Payout.create({
      reference: reference,
      user: user._id,
      kind: 'Reward',
      target: _reward._id,
      amount: _reward.value, // deprecated
      rewardCost: _reward.price, //deprecated
      description: _reward.name, // deprecated
      "invoice.firstname": currentUser.firstname,
      "invoice.lastname": currentUser.lastname,
      "invoice.address": currentUser.address.street + " - " + currentUser.address.city + " " + currentUser.address.zipcode + " - " + currentUser.address.country,
      "invoice.paymentMethod": _reward.brand,
      "invoice.paymentAddress": paymentAddress,
      "invoice.price": _reward.price,
      "invoice.amount": _reward.value
    }, function(err, payout){
      console.log(err);
      if (err) throw "La création de votre demande de paiement à échoué.";
      res.status(200).json(payout);
    });
  }, function(err){
    //console.log(err);
    res.status(500).json(err);
  });
});

module.exports = router;
