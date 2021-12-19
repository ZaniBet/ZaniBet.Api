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
//// instantiate a new converter.
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

router.get('/designer', function(req, res){
  res.send('toto');
});

router.post('/designer', function(req, res){

  var template = req.body.template;
  var format = req.body.format;

  /*converter.image(fs.createReadStream('public/' + template), { format: format })
      .pipe(fs.createWriteStream("foo." + format))
      .on("finish", function(){
        return res.status(200).json("OK");
      });*/
      /*.on("error", function(err){
        console.log(err);
      });*/
});

module.exports = router;
