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


router.get('/transactions', passport.authenticate('bearer', { session: false }), function(req, res){
  var currentUser = req.user;

  Transaction.find({ type: { $in: ['Referral-Coin', 'Referral-Jeton', 'Referral-Grid-Multi'] }, destination: currentUser._id, status: 'done' })
  .select('_id createdAt type updatedAt type description amount status sourceRef')
  .sort({ "createdAt": -1 })
  .limit(100)
  .exec().then(function(transactions){
    //console.log(transactions[0].source);
    return res.status(200).json(transactions);
  }, function(err){
    return res.status(500).json(new CustomError(500, -1, "Erreur Interne", "Une erreur interne c'est produite, merci de réesayer ultérieurement ou contacter le support si le problème persiste."));
  });
});

router.get('/transactions/referral', passport.authenticate('bearer', { session: false }), function(req, res){
  var currentUser = req.user;

  Transaction.find({ type: { $in: ['Referral-Coin', 'Referral-Jeton', 'Referral-Grid-Multi'] }, destination: currentUser._id, status: 'done' })
  .select('_id createdAt type updatedAt type description amount status sourceRef')
  .sort({ "createdAt": -1 })
  .limit(50)
  .exec().then(function(transactions){
    //console.log(transactions[0].source);
    return res.status(200).json(transactions);
  }, function(err){
    return res.status(500).json(new CustomError(500, -1, "Erreur Interne", "Une erreur interne c'est produite, merci de réesayer ultérieurement ou contacter le support si le problème persiste."));
  });
});

router.get('/transactions/zanihash', passport.authenticate('bearer', { session: false }), function(req, res){
  var currentUser = req.user;

  Transaction.find({ type: { $in: ['Play-Tournament', 'ZaniHash', 'Tournament'] }, destination: currentUser._id, status: 'done', currency: { $ne: "ZaniCoin"} })
  .select('_id createdAt type updatedAt type description amount status sourceRef sourceKind')
  .sort({ "createdAt": -1 })
  .limit(50)
  .exec()
  .then(function(transactions){
    return res.status(200).json(transactions);
  }, function(err){
    return res.status(500).json(new CustomError(500, -1, "Erreur Interne", "Une erreur interne c'est produite, merci de réesayer ultérieurement ou contacter le support si le problème persiste."));
  });
});

module.exports = router;
