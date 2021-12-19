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
var Help = mongoose.model('Help');

router.get('/helps', passport.authenticate('bearer', { session: false }), function(req, res){

  var currentUser = req.user;
  var lang = "fr";
  if (currentUser.locale != null && currentUser.locale == "en"){
    lang = "en";
  } else if (currentUser.locale != null && currentUser.locale == "es"){
    lang = "es";
  } else if (currentUser.locale != null && currentUser.locale == "pt"){
    lang = "pt";
  } else if (currentUser.locale != null && currentUser.locale == "fr"){
    lang = "fr";
  } else if (currentUser.locale == null){
    lang = "fr";
  } else {
    lang = "en";
  }

  Help.find({ lang: lang }).sort({ priority: 1 }).then(function(helps){
    return res.status(200).json(helps);
  }, function(err){
    return res.status(500).json(err);
  })
});


module.exports = router;
