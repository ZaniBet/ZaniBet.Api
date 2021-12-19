var express = require('express');
var mongoose = require('mongoose');
var router = express.Router();
var passport = require('passport');
var moment = require('moment');
var requestify = require('requestify');
var mongojs = require('mongojs');
var async = require('async');
var memjs = require('memjs');

var mc = memjs.Client.create(process.env.MEMCACHIER_SERVERS, {
  failover: true,  // default: false
  timeout: 1,      // default: 0.5 (seconds)
  keepAlive: true  // default: false
});
//moment.locale('fr');

var Client = mongoose.model('Client');
var Competition = mongoose.model('Competition');
var Team = mongoose.model('Team');
var Fixture = mongoose.model('Fixture');
var GameTicket = mongoose.model('GameTicket');
var Reward = mongoose.model('Reward');
var Payout = mongoose.model('Payout');

// Récupérer la liste des récompenses disponible
router.get('/rewards', passport.authenticate('bearer', { session: false }), function(req, res){
  var cacheKey = "rewards_zanicoin_v3";
  mc.get(cacheKey, function(err, rewards){
    if (rewards != null && rewards.length > 0){
      //console.log("Return cache for key :", cacheKey);
      rewards = JSON.parse(rewards.toString());
      return res.status(200).json(rewards);
    } else {
      Reward.find({ currency: "ZaniCoin", active: true })
      .sort({ value: 1 })
      .select('_id value name brand price')
      .exec()
      .then(function(rewards){
        mc.set(cacheKey, JSON.stringify(rewards), { expires: 600 }, function(err, val){
          //console.log("Set cache for cache key:", cacheKey);
          return res.status(200).json(rewards);
        });
      }, function(err){
        return res.status(500).json(new CustomError(500, -1, "Erreur Interne", "Une erreur interne c'est produite, merci de réesayer ultérieurement ou contacter le support si le problème persiste."));
      });
    }
  });
});

router.get('/rewards/zh', passport.authenticate('bearer', { session: false }), function(req, res){
  var cacheKey = "rewards_zanihash";
  mc.get(cacheKey, function(err, rewards){
    if (rewards != null && rewards.length > 0){
      //console.log("Return cache for key :", cacheKey);
      rewards = JSON.parse(rewards.toString());
      return res.status(200).json(rewards);
    } else {
      Reward.find({ currency: "ZaniHash", active: true})
      .sort({ value: 1 })
      .select('_id name brand price value')
      .exec()
      .then(function(rewards){
        mc.set(cacheKey, JSON.stringify(rewards), { expires: 600 }, function(err, val){
          //console.log("Set cache for cache key:", cacheKey);
          return res.status(200).json(rewards);
        });
      }, function(err){
        return res.status(500).json(new CustomError(500, -1, "Erreur Interne", "Une erreur interne c'est produite, merci de réesayer ultérieurement ou contacter le support si le problème persiste."));
      });
    }
  });
});


module.exports = router;
