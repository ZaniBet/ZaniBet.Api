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

moment.locale('fr');

var Client = mongoose.model('Client');
var Competition = mongoose.model('Competition');
var Team = mongoose.model('Team');
var Fixture = mongoose.model('Fixture');
var GameTicket = mongoose.model('GameTicket');
var User = mongoose.model('User');
var Reward = mongoose.model('Reward');

router.get('/competitions', function(req, res){
  if (req.xhr || req.headers.accept.indexOf('json') > -1) {
    var drawQuery = parseInt(req.query.draw);
    var startQuery = parseInt(req.query.start);
    var lengthQuery = parseInt(req.query.length);

    async.parallel({
      competitions: function(callback){
        Competition.find().skip(startQuery).limit(lengthQuery).exec(function(err, competitions){
          if (err) return callback(err);
          callback(null, competitions);
        });
      },
      countCompetitions: function(callback){
        Competition.count(function(err, count){
          if (err) return callback(err);
          callback(null, count);
        });
      }
    }, function(err, result){
      if (err) return res.status(500).json(err);
      res.status(200).json({ draw: drawQuery, data: result.competitions, recordsTotal: result.countCompetitions, recordsFiltered: result.countCompetitions });
    });
  } else {
    res.render('admin/competitions/index', { activePage: 'competitions' });
  }
});

router.put('/competitions/:competition_id', function(req, res){

  var id = req.params.competition_id;
  var name = req.body.name;
  var logo = req.body.logo;
  var hashtag = req.body.hashtag;

  Competition.findOneAndUpdate({ _id: id }, { $set: { name: name, logo: logo, hashtag: hashtag } }, { new: true }, function(err, competition){
    if (err) return res.status(500).json(err);
    console.log(competititon);
    return res.status(200).json("OK");
  });

});

/*router.post('/competition/footballdata/install', function(req, res){
var season = req.body.season;

if (season == null){
console.log('Paramètre manquant : season');
return res.status(500).json("Paramètre manquant : season");
}

FootballDataApi.getCompetitions(season).then(function(competitions){
async.eachLimit(competitions, 1, function(competition, eachCompetition){
console.log(competition);
Competition.findOneAndUpdate({ _id: competition._id }, { $set: { active: true, name: competition.name, season: competition.season, "api.footballdata": competition.api.footballdata, numberOfGames: competition.numberOfGames, numberOfTeams: competition.numberOfTeams, numberOfMatchDays: competition.numberOfMatchDays } }, { upsert: true, setDefaultsOnInsert: true }, function(err, result){
eachCompetition();
});
}, function(err){
return res.status(200).json("OK");
});
}, function(err){
console.log(err);
return res.status(500).json(err);
});
});*/

router.post('/competition/sportmonks/install', function(req, res){
  var season = req.body.season;

  if (season == null){
    console.log('Paramètre manquant : season');
    return res.status(500).json("Paramètre manquant : season");
  }

  async.waterfall([

    // Mette à jour le status des saisons terminées
    function(done){
      Competition.find({ isCurrentSeason: true }).exec(function(err, competitions){
        if (err){
          return done(err);
        }

        console.log("Nombre de compétitions à vérifier :", competitions.length);
        async.eachLimit(competitions, 1, function(competition, eachCompetition){
          SportMonks.getSeasonForId(competition).then(function(sComp){
            if (sComp.is_current_season == false){
              Competition.updateOne({ _id: competition._id }, { $set: { isCurrentSeason: false, active: false } }, function(err, result){
                if (err){
                  return eachCompetition(err);
                } else {
                  console.log("Mise à jour de la saison de la compétition :", competition._id);
                  console.log(result);
                  return eachCompetition();
                }
              });
            } else {
              console.log("Aucune mise à jour a effectuer pour la saison de la compétition :", competition._id);
              return eachCompetition();
            }
          }).catch(function(err){
            console.log("Une erreur est survenue lors de la récupération des informations de la saison :", err);
            return eachCompetition();
          });
        }, function(err){
          if (err){
            return done(err);
          } else {
            return done(null);
          }
        });
      });
    },

    function(done){
      SportMonks.getCompetitions(season).then(function(competitions){
        async.eachLimit(competitions, 1, function(competition, eachCompetition){
          console.log(competition);
          var code = competition._id.split('-');
          var logo = "https://www.zanibet.com/mob/competition_logo/" + code[0].toLowerCase() + "_logo.png";
          Competition.findOneAndUpdate({ _id: competition._id }, { $set: {
            code: code[0],
            active: competition.active,
            name: competition.name,
            logo: competition.logo,
            season: competition.season,
            division: competition.division,
            "api.sportmonks.league": competition.api.sportmonks.league,
            "api.sportmonks.season": competition.api.sportmonks.season,
            country: competition.country,
            isCup: competition.isCup,
            availableGames: competition.availableGames,
            isCurrentSeason: competition.isCurrentSeason,
            isInternational: competition.isInternational,
            isFriendly: competition.isFriendly
          } }, { upsert: true, setDefaultsOnInsert: true }, function(err, result){
            return eachCompetition();
          });
        }, function(err){
          return done(null);
        });
      }, function(err){
        console.log(err);
        return done(err);
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

router.post('/competitions/seasons/install', function(req, res){

  var competitionCode = req.body.competitionCode;

  async.waterfall([
    function(done){
      Competition.find({ code: competitionCode }).exec(function(err, competitions){
        if (err){
          return done(err);
        } else if (competitions.length == 0){
          return done('Empty competitions');
        }

        done(null, competitions);
      });
    },

    function(competitions, done){
      var competition = competitions[0];
      SportMonks.getSeasonsForLeague(competition).then(function(seasons){
        done(null, competitions, seasons);
      }, function(err){
        return done(err);
      });
    },

    function(competitions, seasons, done){
      async.eachLimit(seasons, 1, function(season, eachSeason){

        var seasonYearSplit = season.name.split('/');
        var seasonYear = parseInt(seasonYearSplit[0]);

        if (competitions.filter(c => c.season == seasonYear).length > 0){
          console.log("La competition existe déjà");
          return eachSeason();
        }

        var competition = competitions[0];
        Competition.findOneAndUpdate({ _id: competition.code + "-" + String(seasonYear) }, { $set: {
          code: competition.code,
          active: false,
          name: competition.name,
          logo: competition.logo,
          season: seasonYear,
          division: competition.division,
          "api.sportmonks.league": competition.api.sportmonks.league,
          "api.sportmonks.season": season.id,
          country: competition.country,
          isCup: competition.isCup,
          availableGames: competition.availableGames,
          isCurrentSeason: season.isCurrentSeason,
          isInternational: competition.isInternational,
          isFriendly: competition.isFriendly,
          numberOfMatchDays: competition.numberOfMatchDays,
          numberOfTeams: competition.numberOfTeams,
          numberOfGames: competition.numberOfGames
        } }, { upsert: true, setDefaultsOnInsert: true }, function(err, result){
          if (err){
            console.log(err);
          }
          return eachSeason();
        });

      }, function(err){
        if (err){
          return done(err);
        }
        done(null, "OK");
      })
    }

  ], function(err, result){
    if (err){
      console.log(err);
      return res.status(500).json(err);
    } else {
      return res.status(200).json(result);
    }
  });

});

router.post('/competitions/custom', function(req, res){
  Competition.create({
    _id: "MULTILEAGUE",
    name:"Multi League",
    division: 1,
    season: 2018,
    country: "World",
    active: true,
    isCup: false,
    availableGames: [ { type: "SINGLE", active: false }, { type: "MATCHDAY", active: true }, { type: "DAILY-JACKPOT", active: false } ],
    isInternational: true,
    isFriendly: false
  }, function(err, competitions){
    if (err){
      return res.status(500).json(err);
    }

    return res.status(200).json(competitions);
  });
});

router.get('/competition/stats', function(req, res){
  Competition.find({ active: true}).then(function(competitions){
    var nbMatchDays = 0;
    var nbGames = 0;
    for(var i = 0; i <  competitions.length; i++){
      nbMatchDays += parseInt(competitions[i].numberOfMatchDays);
      nbGames += parseInt(competitions[i].numberOfGames);
    }
    return res.status(200).json({ numberOfMatchDays: nbMatchDays, numberOfGames: nbGames });
  }, function(err){
    console.log(err);
    return res.status(500).json("KO");
  });
});

module.exports = router;
