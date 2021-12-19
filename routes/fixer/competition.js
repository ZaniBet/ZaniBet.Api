var express = require('express');
var mongoose = require('mongoose');
var router = express.Router();
var passport = require('passport');
var moment = require('moment');
var requestify = require('requestify');
var mongojs = require('mongojs');
var async = require('async');
var uniqid = require('uniqid');

moment.locale('fr');

var Client = mongoose.model('Client');
var User = mongoose.model('User');
var Payout = mongoose.model('Payout');
var Competition = mongoose.model('Competition');
var GameTicket = mongoose.model('GameTicket');

/*
* Définir le code (identifiant d'un championnat)
*/
router.put('/competitions/fixCode', function(req, res){

  async.waterfall([
    function(done){
      Competition.find().exec(function(err, competitions){
        if (err){
          return done(err);
        }
        done(null, competitions);
      });
    },

    function(competitions, done){
      async.eachLimit(competitions, 1, function(competition, eachCompetition){
        var code = competition._id.split('-');
        Competition.updateOne({ _id: competition._id }, { $set: { code: code[0] } }, function(err, result){
          if (err){
            return eachCompetition(err);
          }
          console.log("Resultat de la mise à jour pour la competition :", competition._id, result);
          eachCompetition();
        });
      }, function(err){
        if (err){
          return done(err);
        }

        done(null, "OK");
      });
    }

  ], function(err, result){
    if (err){
      console.log(err);
      return res.status(500).json(err);
    }

    res.status(200).json("OK");
  });

});

/*
*
*/
router.put('/competitions/fixLogo', function(req, res){
  async.waterfall([
    function(done){
      Competition.find().exec(function(err, competitions){
        if (err){
          return done(err);
        }
        done(null, competitions);
      });
    },

    function(competitions, done){
      async.eachLimit(competitions, 1, function(competition, eachCompetition){
        var logo = "https://www.zanibet.com/mob/competition_logo/" + competition.code.toLowerCase() + "_logo.png";
        Competition.updateOne({ _id: competition._id }, { $set: { logo: logo } }, function(err, result){
          if (err){
            return eachCompetition(err);
          }
          console.log("Résultat de la mise à jour de la league", competition.name, ":", result);
          eachCompetition();
        });
      }, function(err){
        if (err){
          return done(err);
        }
        done(null, "OK");
      });
    }
  ], function(err, result){
    if (err){
      return res.status(500).json(err);
    }
    res.status(200).json("OK");
  });
});


/*
* Définir le classement de l'équipe nationnal des compétitions
*/
router.put('/competitions/fixNationalRanking', function(req, res){

  async.waterfall([

    function(done){
      Team.find({ isNational: true })
    }

  ], function(err, result){
    if (err){
      return res.status(500).json(err);
    }
    return res.status(200).json(result);
  });

});

/*
* Désactiver toutes les compétitions et ticket à venir pour les compétitions qui
* ne sont pas incluses
*/
router.put('/competitions/massiveDisable', function(req, res){

  var allowedLeagues = [
    "LIGUE1-2018",
    "EREDIVISIE-2018",
    "BUNDESLIGA1-2018",
    "SERIEAITA-2018",
    "PLEAGUE-2018",
    "LIGANOS-2018",
    "LALIGA-2018",
    "SUPERLIG-2018",
    "EFLCHAMPIONSHIP-2018",
    "PROLEAGUE-2018",
    "ALLSVENSKAN-2018",
    "ELITESERIEN-2018",
    "TIPICOBUNDESLIGA-2018",
    "PLEAGUEUKR-2018",
    "CHAMPIONSLEAGUE-2018",
    "EUROPALEAGUE-2018",
    "PLEAGUERUS-2018",
    "LEAGUEONE-2018",
    "SCOTTPRE-2018"
  ];

  async.waterfall([
    function(done){
      Competition.find({ _id: { $nin: allowedLeagues }, active: true, isCurrentSeason: true }).exec(function(err, competitions){
        if (err){
          return done(err);
        }
        done(null, competitions);
      });
    },

    function(competitions, done){
      console.log(competitions.length);
      GameTicket.remove({ competition: { $in: competitions }, status: "close" }, function(err, gametickets){
        if (err){
          return done(err);
        }
        console.log(gametickets);
        return done(null, "OK");
      });
    }

  ], function(err, result){
    if (err){
      return res.status(500).json(err);
    }
    res.status(200).json("OK");
  });
});


module.exports = router;
