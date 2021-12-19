var express = require('express');
var mongoose = require('mongoose');
var router = express.Router();
var passport = require('passport');
var moment = require('moment');
var requestify = require('requestify');
var mongojs = require('mongojs');
var async = require('async');
var FootballDataApi = require('../../fetcher/footballdata');
var SportMonks = require('../../fetcher/sportmonks');
var Chance = require('chance');
var chance = new Chance();

const chalk = require('chalk');
const chalkInit = chalk.green;
const chalkTask = chalk.cyan;
const chalkDone = chalk.blue;
const chalkError = chalk.bold.red;
const chalkWarning = chalk.bold.yellow;


var Client = mongoose.model('Client');
var Competition = mongoose.model('Competition');
var Team = mongoose.model('Team');
var Fixture = mongoose.model('Fixture');
var GameTicket = mongoose.model('GameTicket');
var User = mongoose.model('User');
var Reward = mongoose.model('Reward');
var SocialTask = mongoose.model('SocialTask');

// Corriger le problème de null value
router.put('/reward/fixCurrency', function(req, res){
  Reward.updateMany({ brand: { $in: ["PayPal", "Amazon"] } }, { $set: { currency: "ZaniCoin" } }).then(function(result){
    console.log(result);
    return res.status(200).json(result);
  }, function(err){
    console.log(err);
    return res.status(500).json(err);
  });
});


module.exports = router;
