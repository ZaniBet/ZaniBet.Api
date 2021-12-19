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
var Competition = mongoose.model('Competition');
var Team = mongoose.model('Team');
var Fixture = mongoose.model('Fixture');
var GameTicket = mongoose.model('GameTicket');
var Reward = mongoose.model('Reward');
var Payout = mongoose.model('Payout');

// Récupérer la liste des récompenses disponible
router.get('/rewards', passport.authenticate('bearer', { session: false }), function(req, res){

  Reward.find({ currency: "ZaniCoin", brand: { $ne: "Bitcoin" }, active: true })
  .sort({ "amount.euro": 1 })
  .select('_id amount name brand price')
  .exec()
  .then(function(rewards){
    return res.status(200).json(rewards);
  }, function(err){
    return res.status(500).json(new CustomError(500, -1, "Erreur Interne", "Une erreur interne c'est produite, merci de réesayer ultérieurement ou contacter le support si le problème persiste."));
  });
});


module.exports = router;
