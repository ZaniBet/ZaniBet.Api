var express = require('express');
var mongoose = require('mongoose');
var router = express.Router();
var passport = require('passport');
var moment = require('moment');
var requestify = require('requestify');
var mongojs = require('mongojs');
var async = require('async');

var GameTicket = mongoose.model('GameTicket');
var Team = mongoose.model('Team');

router.get('/data/images', passport.authenticate('bearer', { session: false }), function(req, res){
  var imagesArr = [];
  async.parallel([
    function(callback){
      GameTicket.distinct("picture" , function(err, pictures){
        if (err) return callback();
        pictures.forEach(function(picture){
          //console.log(picture);
          imagesArr.push(picture);
        });
        callback();
      });
    },
    function(callback){
      Team.distinct( "logo", function(err, logos){
        if (err) return callback();
        logos.forEach(function(logo){
          imagesArr.push(logo);
        });
        callback();
      });
    }
  ], function(err, result){
    if (err) return res.status(500).json(err);
    return res.status(200).json(imagesArr);
  });
});

router.get('/data/settings', passport.authenticate('bearer', { session: false }), function(req, res){
  var currentUser = req.user;
  var twitter = "@ZaniBet";

  if (currentUser.locale == "fr"){

  } else if (currentUser.locale == "pt"){

  } else if (currentUser.locale == "es"){

  } else {

  }

  var settings = [
    { setting: 'jeton_video_ads_period', value: process.env.JETON_VIDEO_HOUR_DELAY },
    { setting: 'jeton_per_video', value: process.env.JETON_PAYOUT },
    { setting: 'free_jeton_per_day', value: process.env.DAILY_JETON_REWARD },
    { setting: 'welcome_zanicoin_reward', value: process.env.ZANICOIN_WELCOME_REWARD },
    { setting: 'analytics_key', value: process.env.ZANIANALYTICS_API_KEY },
    { setting: 'analytics_bp', value: 95 },
    { setting: 'average_reward_payment', value: 4 },
    { setting: 'average_jackpot_payment', value: 30 },
    { setting: 'poll_conversion', value: process.env.USD_TO_CHIPS },
    { setting: 'zanibet_twitter', value: twitter }
  ];
  //console.log(settings);
  return res.status(200).json(settings);
});

module.exports = router;
