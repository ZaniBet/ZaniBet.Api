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
router.put('/fixtures/fixAutoScore', function(res, res){
  Fixture.updateMany({ "result.auto": { $exists: false } }, { $set: { "result.auto": true } }).then(function(result){
    console.log(result);
    return res.status(200).json(result);
  }, function(err){
    console.log(err);
    return res.status(500).json(err);
  });
});

// Corriger le problème de null value
router.put('/fixtures/fixZscore', function(req, res){
  Fixture.find({ $or: [ { zScore: 0 }, { zScore: { $exists: false } } ] }).exec(function(err, fixtures){
    if (err) return res.status(500).json(err);
    async.each(fixtures, function(fix, eachFixture){
      Fixture.updateOne({ _id: fix._id }, { $set: { zScore: chance.integer({ min: 100, max: 300 }) } }).exec(function(err, result){
        if (err){
          return eachFixture(err);
        } else {
          return eachFixture(null);
        }
      });
    }, function(err){
      if (err){
        return res.status(500).json(err);
      } else {
        return res.status(200).json("OK");
      }
    });
  });
  /*Fixture.updateMany({ "zScore": { $exists: false } }, { $set: { "zScore": chance.integer({ min: 100, max: 300 }) } }).then(function(result){
    console.log(result);
    return res.status(200).json(result);
  }, function(err){
    console.log(err);
    return res.status(500).json(err);
  });*/
});

router.put('/fixtures/fixName', function(req, res){
  Fixture.find({ name: null }).populate('homeTeam awayTeam').exec(function(err, fixtures){
    async.each(fixtures, function(fixture, eachFixture){
      Fixture.updateOne({ _id: fixture._id }, { $set: { name: fixture.homeTeam.name + " - " + fixture.awayTeam.name } }, function(err, result){
        if (err){
          return eachFixture(err);
        } else {
          console.log("Resultat de la mise à jour :", result.nModified);
          return eachFixture();
        }
      });
    }, function(err){
      if (err){
        console.log(err);
        return res.status(500).json(err);
      } else {
        return res.status(200).json("OK");
      }
    });
  });
});

module.exports = router;
