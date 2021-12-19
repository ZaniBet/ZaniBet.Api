var express = require('express');
var mongoose = require('mongoose');
var router = express.Router();
var passport = require('passport');
var moment = require('moment');
var validator = require('validator');
var CustomError = require('../../lib/customerror');
var utils  = require('../../lib/utils.js');
var config = require('../../config/global.js');
var FB = require('fb');
var mailer = require('../../lib/mailer');
var uniqid = require('uniqid');
//moment.locale('fr');
var async = require('async');
const chalk = require('chalk');
const chalkInit = chalk.green;
const chalkTask = chalk.cyan;
const chalkDone = chalk.blue;
const chalkError = chalk.bold.red;
const chalkWarning = chalk.bold.yellow;

var User = mongoose.model('User');
var Grille = mongoose.model('Grille');
var Competition = mongoose.model('Competition');
var GameTicket = mongoose.model('GameTicket');
var Fixture = mongoose.model('Fixture');


router.get('/test/league/:competition_id', function(req, res){

/*
- Récupérer le nombre de grilles jouées pour le match
- Calculer la répartition des pronostics
- Identifier les meilleures joueurs
*/

var competitionId = req.params.competition_id;

async.waterfall([
  function(done){
    GameTicket.find({ competition: competitionId }, { openDate: { $gt: moment().utc().startOf('day'), $lt: moment().utc().endOf('day') } }, function(err, gametickets){
      if (err){
        return done(err);
      } else if (gametickets.length == 0){
        return done("Aucun ticket de jeu");
      } else {
        return done(null, gametickets);
      }
    });
  },

  function(gametickets, done){

  }

], function(err, result){

});

});

router.get('/test/fixture/:fixture_id', function(req, res){

/*
- Récupérer le nombre de grilles jouées pour le match
- Calculer la répartition des pronostics
- Identifier les meilleures joueurs
*/

var fixtureId = req.params.fixture_id;

async.waterfall([
  function(done){
    GameTicket.findOne({ fixtures: { $in: [fixtureId] }, type: "SINGLE", resultDate: { $gt: moment().utc().startOf('day') } }, function(err, gt){
      if (err){
        return done(err);
      } else if (gt == null){
        return done("Le ticket n'existe pas");
      } else {
        return done(null, gt);
      }
    });
  },

  function(gameticket, done){
    Grille.find({ gameTicket: gameticket._id }, function(err, grilles){
      if (err){
        return done(err);
      } else if (grilles == null || grilles.length == 0){
        return done("Il n'y a aucune grille");
      } else {
        console.log(grilles.length);
        return done(null, grilles);
      }
    });
  },

  function(grilles, done){

    var betStats = {
      "1N2": { 0: 0, 1: 0, 2: 0},
      "LESS_MORE_GOAL": { 0: 0, 1: 0, 2: 0},
      "BOTH_GOAL": { 0: 0, 1: 0, 2: 0},
      "FIRST_GOAL": { 0: 0, 1: 0, 2: 0}
    };

    async.eachLimit(grilles, 1, function(grille, eachGrille){
      for (var i = 0; i < grille.bets.length; i++){
        switch (grille.bets[i].type) {
          case "1N2":
            console.log("1N2", grille.bets[i].result);
            if (grille.bets[i].result == 0){
              betStats["1N2"]['0'] += 1;
            } else if (grille.bets[i].result == 1){
              betStats["1N2"]['1'] += 1;
            } else if (grille.bets[i].result == 2){
              betStats["1N2"]['2'] += 1;
            }
            break;
          default:
        }
      }
      return eachGrille();
    }, function(err){
      if (err){
        return done(err);
      }
      console.log(betStats);
      return done(null, betStats);
    });

  }

], function(err, result){
  if (err){
    console.log(err);
    return res.status(500).json(err);
  } else {
    return res.status(200).json("OK");
  }
});

});

module.exports = router;
