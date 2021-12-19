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


router.get('/competitions',  passport.authenticate('bearer', { session: false }), function(req, res){
  var cacheKey = "competitions_v1";
  mc.get(cacheKey, function(err, competitions){
    if (competitions != null && competitions.length > 0){
      //console.log("Return cache for key:", cacheKey);
      competitions = JSON.parse(competitions.toString());
      return res.status(200).json(competitions);
    } else {

      Competition.aggregate([
        { $match: { active: true, isCurrentSeason: true } },
        //{ $project: { "_id": 1, "code": 1, "name": 1, "logo": 1, "country": 1, "division": 1 } },
        { $group: { _id: null, league: { $addToSet: { code: "$code", season: "$season", name: "$name", logo: "$logo", country: "$country", division: "$division" } } } },
        { $unwind:  "$league" },
        { $replaceRoot: { newRoot: "$league" } }
      ]).exec(function(err, competitions){
        if (err){
          return res.status(500).json("KO");
        }
        competitions.map(c => c._id = c.code + "-" + String(c.season));
        //console.log(competitions);
        mc.set(cacheKey, JSON.stringify(competitions), { expires: 600 }, function(err, val){
          //console.log("Set cache for cache key:", cacheKey);
          return res.status(200).json(competitions);
        });
      });
    }
  });
});

router.get('/competitions/topic', passport.authenticate('bearer', { session: false }), function(req, res){
  var cacheKey = "competitions_matchday";
  mc.get(cacheKey, function(err, competitions){
    if (competitions != null && competitions.length > 0){
      //console.log("Return cache for key:", cacheKey);
      competitions = JSON.parse(competitions.toString());
      return res.status(200).json(competitions);
    } else {
      Competition.find({ active: true, isCurrentSeason: true, availableGames: { $elemMatch: { type: "MATCHDAY", active: true } } })
      .select('_id name logo country division')
      .sort({ country: 1 })
      .exec()
      .then(function(competitions){
        mc.set(cacheKey, JSON.stringify(competitions), { expires: 600 }, function(err, val){
          //console.log("Set cache for cache key:", cacheKey);
          return res.status(200).json(competitions);
        });
      }, function(err){
        console.log(err);
        return res.status(500).json("KO");
      });
    }
  });
});

/*
* Récupérer le classement d'une compétition
*/
router.get('/competitions/:competitionId/standings', passport.authenticate('bearer', { session: false }), function(req, res){
  var competitionId = req.params.competitionId;

  Competition.findOne({ _id: competitionId, standings: { $not: { $elemMatch: { team: null } } } })
  .select('_id standings')
  .sort({ 'standings.position': 1 })
  .populate('standings.team')
  .exec()
  .then(function(competition){
    if ( competition == null ){
      return res.status(500).json("KO");
    }
    var leagueStandingArr = [];
    competition.standings.forEach(function(ls){
      leagueStandingArr.push(ls);
    });
    return res.status(200).json(leagueStandingArr);
  }, function(err){
    console.log(err);
    return res.status(500).json("KO");
  });
});

module.exports = router;
