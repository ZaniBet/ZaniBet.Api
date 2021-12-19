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
var Grille = mongoose.model('Grille');
var GameTicket = mongoose.model('GameTicket');
var User = mongoose.model('User');
var Reward = mongoose.model('Reward');
var SocialTask = mongoose.model('SocialTask');

// Corriger le problème de null value
router.put('/grilles/fixBetsData', function(req, res){
  Grille.updateOne({ _id: mongoose.Types.ObjectId("5a16041f258cad001435a02d") }, { $unset: { "bets.$[element]._id": "" } }, { "arrayFilters": [{ "element._id": { $exists: true } }], "multi": true }).then(function(result){
    console.log(result);
    return res.status(200).json(result);
  }, function(err){
    console.log(err);
    return res.status(500).json(err);
  });
});

router.delete('/grilles/canceled', function(req, res){

  Grille.count({ status: 'canceled', type: 'SIMPLE' }, function(err, result){
    if (err){
      return res.status(500).json(err);
    }
    console.log(result);
    return res.status(200).json(result);
  });

});

/*
* Supprimer les grilles terminées et jouées il y a plus de 4 mois
*/
router.delete('/grilles/single/old', function(req, res){

  Grille.deleteMany({ $or: [ { status: 'loose' }, { status: 'win' }, { status: 'canceled' } ], type: 'SIMPLE', createdAt: { $lt: moment().utc().subtract(2, 'months') } }).exec(function(err, result){
    if (err){
      return res.status(500).json(err);
    }
    console.log(result);
    return res.status(200).json(result);
  });

});

/*
* Supprimer les grilles terminées et jouées il y a plus de 4 mois
*/
router.delete('/grilles/multi/old', function(req, res){

  Grille.deleteMany({ $or: [ { status: 'loose' }, { status: 'canceled' } ], type: 'MULTI', createdAt: { $lt: moment().utc().subtract(2, 'months') } }, function(err, count){
    if (err){
      return res.status(500).json(err);
    }
    console.log(count);
    return res.status(200).json(count);
  });

});

module.exports = router;
