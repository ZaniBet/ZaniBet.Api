var express = require('express');
var mongoose = require('mongoose');
var router = express.Router();
var passport = require('passport');
var moment = require('moment');
var requestify = require('requestify');
var mongojs = require('mongojs');
var async = require('async');


var fs = require('fs');
// include the node module
//var wkhtmltox = require("wkhtmltox");
// instantiate a new converter.
//var converter = new wkhtmltox();
//converter.wkhtmltoimage = '/usr/local/bin/wkhtmltoimage';

var Client = mongoose.model('Client');
var Competition = mongoose.model('Competition');
var Team = mongoose.model('Team');
var Fixture = mongoose.model('Fixture');
var GameTicket = mongoose.model('GameTicket');
var User = mongoose.model('User');
var Reward = mongoose.model('Reward');
var Help = mongoose.model('Help');
var Grille = mongoose.model('Grille');

router.get('/', function(req, res){
  async.parallel({
    one: function(callback){
      User.count(function(err, count){
        callback(null, count);
      });
    },
    two: function(callback){
      Grille.count(function(err, count){
        callback(null, count);
      });
    }
  }, function(err, result){
    console.log('Count result',result);
    return res.render('admin/index', { activePage: "dashboard" });
  });
});



module.exports = router;
