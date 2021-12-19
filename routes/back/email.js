var express = require('express');
var mongoose = require('mongoose');
var router = express.Router();
var passport = require('passport');
var moment = require('moment');
var requestify = require('requestify');
var mongojs = require('mongojs');
var async = require('async');
var mailer = require('../../lib/mailer');

var Client = mongoose.model('Client');
var Competition = mongoose.model('Competition');
var Team = mongoose.model('Team');
var Fixture = mongoose.model('Fixture');
var GameTicket = mongoose.model('GameTicket');
var User = mongoose.model('User');
var Reward = mongoose.model('Reward');
var Help = mongoose.model('Help');
var Payout = mongoose.model('Payout');

router.get('/email/preview/welcome', function(req, res){
  User.findOne().exec(function(err, user){
    if (err) return res.send(err);
    return res.render('emails/welcome', { user: user });
  });
});

router.get('/email/preview/reset-password', function(req, res){
  User.findOne().exec(function(err, user){
    if (err) return res.send(err);
    return res.render('emails/resetPassword', { user: user });
  });
});

router.get('/email/preview/confirm-email', function(req, res){
  User.findOne().exec(function(err, user){
    if (err) return res.send(err);
    //mailer.sendConfirmEmail(res, user);
    return res.render('emails/confirm-email-en', { user: user });
  });
});

router.get('/email/preview/resetpasswordconfirm', function(req, res){
  User.findOne().exec(function(err, user){
    if (err) return res.send(err);
    return res.render('emails/resetPasswordConfirm', { user: user });
  });
});

router.get('/email/preview/jackpotalert', function(req, res){
  Payout.findOne({ kind: "Grille" }).sort({'createdAt': -1}).populate('user').populate({ path: 'target', populate: {
    path: 'gameTicket'
  }}).exec(function(err, payout){
    if (err) return res.send(err);
    return res.render('emails/jackpotAlert', { payout: payout, user: payout.user });
  });
});

router.get('/email/preview/paypalreward', function(req, res){
  Payout.findOne({ kind: "Reward" }).sort({'createdAt': -1}).populate('user').populate({ path: 'target', populate: {
    path: 'reward'
  }}).exec(function(err, payout){
    if (err) return res.send(err);
    return res.render('emails/payout-reward-pt', { payout: payout, user: payout.user });
  });
});

router.post('/email/preview/paypalreward', function(req, res){
  var email = req.body.email;
  var payout = req.body.payout;

  Payout.findOne({ _id: payout, kind: "Reward" }).sort({'createdAt': -1}).populate('user').populate({
    path: 'target',
    populate: {
      path: 'reward'
    }
  }).exec(function(err, payout){
    //console.log(payout);
    if (err) return res.send(err);
    mailer.sendPaypalReward(res, payout, email).then(function(response){
      //console.log(response);
      return res.status(200).json(response);
    }, function(err){
      console.log(err);
      return res.status(500).json(err);
    });
  });
});

router.post('/email/preview/jackpotalert', function(req, res){
  var email = req.body.email;

  Payout.findOne({ kind: "Grille" }).sort({'createdAt': -1}).populate('user').populate({
    path: 'target',
    populate: {
      path: 'gameTicket'
    }
  }).exec(function(err, payout){
    if (err) return res.send(err);
    mailer.sendJackpotAlert(res, payout).then(function(response){
      console.log(response);
      return res.status(200).json(response);
    }, function(err){
      console.log(err);
      return res.status(500).json(err);
    });
  });
});


router.post('/email/preview/welcome', function(req, res){
  var email = req.body.email;

  User.findOne().exec(function(err, user){
    if (err) return res.send(err);
    mailer.sendWelcomeMail(res, email, user).then(function(response){
      console.log(response);
      return res.status(200).json(response);
    }, function(err){
      console.log(err);
      return res.status(500).json(err);
    });
  });
});

router.post('/email/preview/resetpasswordconfirm', function(req, res){
  User.findOne().exec(function(err, user){
    if (err) return res.send(err);
    mailer.sendResetPasswordConfirm(res, user).then(function(response){
      console.log(response);
      return res.status(200).json(response);
    }, function(err){
      console.log(err);
      return res.status(500).json(err);
    });
  });
});


router.get('/email/preview/payout-reward', function(req, res){
  Payout.findOne({ kind: "Reward" }).sort({'createdAt': -1}).populate('user').populate({
    path: 'target',
    populate: {
      path: 'reward'
    }
  }).exec(function(err, payout){
    if (err) return res.send(err);
    return res.render('emails/payout-reward-en', { user: payout.user, payout: payout });
  });
});

router.get('/email/preview/payout-jackpot', function(req, res){
  Payout.findOne({ kind: "Grille" }).sort({'createdAt': -1}).populate('user').populate({
    path: 'target',
    populate: {
      path: 'grille gameTicket',
    }
  }).exec(function(err, payout){
    if (err) return res.send(err);
    console.log(payout.target);
    return res.render('emails/payout-jackpot-en', { user: payout.user, payout: payout });
  });
});

module.exports = router;
