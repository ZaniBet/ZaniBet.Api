var express = require('express');
var mongoose = require('mongoose');
var router = express.Router();
var passport = require('passport');
var moment = require('moment');
var requestify = require('requestify');
var mongojs = require('mongojs');
var async = require('async');

moment.locale('fr');

var Client = mongoose.model('Client');
var User = mongoose.model('User');

router.put('/users/fixReferral', function(req, res){

  User.updateMany({ $or: [{"referral.coinPerMultiTicketPlay": { $exists: false } }, { "referral.coinPerMultiTicketPlay": { $lt: 6 } }], role: "user" }, { $set: {  "referral.coinPerMultiTicketPlay": 5, "referral.coinRewardPercent": 10 } }, function(err, result){
    if (err){
      console.log(err);
      return res.status(500).json(err);
    } else {
      console.log(result);
      return res.status(200).json(result);
    }
  });

});

router.put('/users/fixAnalytics', function(req, res){

  User.updateMany({ updatedAt: { $gt: moment().utc().subtract(1, 'day') }, zaniHashEnabled: false }, { $set: {  zaniHashEnabled: true } }, function(err, result){
    if (err){
      console.log(err);
      return res.status(500).json(err);
    } else {
      console.log(result);
      return res.status(200).json(result);
    }
  });

});

module.exports = router;
