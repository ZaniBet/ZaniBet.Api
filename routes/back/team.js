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

var Competition = mongoose.model('Competition');
var Team = mongoose.model('Team');

router.get('/teams', function(req, res){

  if (req.xhr || req.headers.accept.indexOf('json') > -1) {
    var drawQuery = parseInt(req.query.draw);
    var startQuery = parseInt(req.query.start);
    var lengthQuery = parseInt(req.query.length);
    var competitionQuery = req.query.competition;

    async.parallel({
      teams: function(callback){
        var teamQuery = Team.find();
        if (competitionQuery != null && competitionQuery != ""){
          teamQuery.where("competition", competitionQuery);
        }

        teamQuery.skip(startQuery).limit(lengthQuery).populate('competition').exec(function(err, teams){
          if (err) return callback(err);
          callback(null, teams);
        });
      },
      countTeams: function(callback){
        Team.count(function(err, count){
          if (err) return callback(err);
          callback(null, count);
        });
      }
    }, function(err, result){
      if (err) return res.status(500).json(err);
      res.status(200).json({ draw: drawQuery, data: result.teams, recordsTotal: result.countTeams, recordsFiltered: result.countTeams });
    });
  } else {
    Competition.find(function(err, competitions){
      res.render('admin/teams/index', { activePage: 'teams', competitions: competitions });
    });
  }
});

router.put('/teams', function(req, res){
  var id = req.body.id;
  var name = req.body.name;
  var shortName = req.body.shortName;
  var logo = req.body.logo;
  var hashtag = req.body.hashtag;

  Team.findOneAndUpdate({ _id: id }, { $set: { name: name, shortName: shortName, logo: logo, hashtag: hashtag } }, { new: true }, function(err, team){
    if (err) return res.status(500).json(err);
    console.log(team);
    return res.status(200).json("OK");
  });

});

router.put('/teams/fixLogo', function(req, res){
  Team.updateMany({ logo: null }, { $set: { logo: "" } }, function(err, result){
    if (err) return res.status(500).json(err);
    console.log(result);
    return res.status(200).json("OK");
  });
});

/*router.post('/teams/footballdata/install', function(req, res){
Competition.find().then(function(competitions){
async.eachLimit(competitions, 1, function(competition, eachCompetition){
FootballDataApi.getTeamsForCompetition(competition).then(function(teams){
async.eachLimit(teams, 1, function(team, eachTeam){
Team.findOneAndUpdate({ 'api.footballdata': team.api.footballdata }, { $set: { name: team.name, shortName: team.shortName, competition: competition._id } }, { upsert: true, setDefaultsOnInsert: true }, function(err, result){
eachTeam();
});
}, function(err){
// Fetch team for next competition
eachCompetition();
});
}, function(err){
// Failled to fetch team for competition
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

router.post('/teams/sportmonks/install', function(req, res){
  Competition.find({ isInternational: false, isCurrentSeason: true, isCup: false, isFriendly: false }).then(function(competitions){
    async.eachLimit(competitions, 1, function(competition, eachCompetition){
      console.log("Récupérer les équipes pour la compétition :", competition);
      SportMonks.getTeamsForCompetition(competition).then(function(teams){
        console.log(teams);
        async.eachLimit(teams, 1, function(team, eachTeam){
          Team.findOne({ $or: [{"api.sportmonks": team.api.sportmonks}] }, function(err, tm){
            if (err){
              console.log(err);
              eachTeam();
            } else if (tm == null){
              // l'equipe n'existe pas encore
              Team.create({ name: team.name, shortName: team.name, shortCode: team.shortCode, logo: team.logo, competition: competition._id, uefaRanking: team.uefaRanking, "api.sportmonks": team.api.sportmonks, country: team.country, twitter: team.twitter }, function(err, result){
                if (err){
                  console.log(err);
                  console.log("Une erreur c'est produite lors de l'ajout de l'équipe :", team.name);
                } else {
                  console.log("Ajout d'une nouvelle équipe :", team.name);
                }
                eachTeam();
              });
            } else {
                Team.update({ _id: tm._id }, { $set: { shortCode: team.shortCode, logo: team.logo, competition: competition._id, uefaRanking: team.uefaRanking, country: team.country, twitter: team.twitter  } }, function(err, result){
                  if (err){
                    console.log("Une erreur c'est produite lors de la mise à jour de l'équipe :", team.name, team.country);
                  } else {
                    console.log(result);
                    console.log("Mise à jour de l'équipe :", team.name);
                  }
                  eachTeam();
                });
            }
          });

        }, function(err){
          // Update competition stats
          Competition.updateOne({ _id: competition._id, numberOfTeams: 0 }, { $set: { numberOfTeams: parseInt(teams.length), numberOfMatchDays: parseInt(teams.length*(teams.length-1))/parseInt(teams.length/2), numberOfGames: parseInt(teams.length*(teams.length-1)) } }, function(err, result){
            if (err){
              console.log(err);
              eachCompetition();
            } else {
              console.log(result);
              eachCompetition();
            }
          });
        });
      }, function(err){
        // Failled to fetch team for competition
        eachCompetition();
      });
    }, function(err){
      return res.status(200).json("OK");
    });
  }, function(err){
    console.log(err);
    return res.status(500).json(err);
  });
});

/*
* Installer les équipes des compétitions national
*/
router.post('/teams/national-cup/sportmonks/install', function(req, res){
  Competition.find({ isCup: true, isCurrentSeason: true, isInternational: false }).then(function(competitions){
    async.eachLimit(competitions, 1, function(competition, eachCompetition){
      SportMonks.getTeamsForCompetition(competition).then(function(teams){
        console.log(teams);
        async.eachLimit(teams, 1, function(team, eachTeam){
          Team.findOne({ $or: [{ "api.sportmonks": team.api.sportmonks }] }, function(err, tm){
            if (err){
              console.log(err);
              eachTeam();
            } else if (tm == null){
              // l'equipe n'existe pas encore
              Team.create({ name: team.name, shortName: team.name, logo: team.logo, competition: competition._id, "api.sportmonks": team.api.sportmonks, isNational: true, country: team.country }, function(err, result){
                if (err){
                  console.log(err);
                  console.log("Une erreur c'est produite lors de l'ajout de l'équipe :", team.name);
                } else {
                  console.log("Ajout d'une nouvelle équipe :", team.name);
                }
                eachTeam();
              });
            } else {
              // l'équipe existe déjà
              Team.update({ _id: tm._id }, { $set: { logo: team.logo, country: team.country } }, function(err, result){
                if (err){
                  console.log("Une erreur c'est produite lors de la mise à jour de l'équipe :", team.name);
                } else {
                  console.log(result);
                  console.log("Mise à jour de l'équipe :", team.name, team.country);
                }
                eachTeam();
              });
            }
          });
        }, function(err){
          // Fetch team for next competition
          eachCompetition();
        });
      }, function(err){
        // Failled to fetch team for competition
        eachCompetition();
      });
    }, function(err){
      return res.status(200).json("OK");
    });
  }, function(err){
    console.log(err);
    return res.status(500).json(err);
  });
});

router.post('/teams/international/sportmonks/install', function(req, res){
  Competition.find({ isCup: true, isCurrentSeason: true, country: { $eq: "World" } }).then(function(competitions){
    async.eachLimit(competitions, 1, function(competition, eachCompetition){
      SportMonks.getTeamsForCompetition(competition).then(function(teams){
        console.log(teams);

        async.eachLimit(teams, 1, function(team, eachTeam){
          Team.findOne({ $or: [{"api.sportmonks": team.api.sportmonks}], isNational: true }, function(err, tm){
            if (err){
              console.log(err);
              eachTeam();
            } else if (tm == null){
              // l'equipe n'existe pas encore
              Team.create({ name: team.name, shortName: team.name, logo: team.logo, competition: "WORLD", "api.sportmonks": team.api.sportmonks, isNational: true, country: team.country }, function(err, result){
                if (err){
                  console.log(err);
                  console.log("Une erreur c'est produite lors de l'ajout de l'équipe :", team.name);
                } else {
                  console.log("Ajout d'une nouvelle équipe :", team.name);
                }
                eachTeam();
              });
            } else {
              // l'équipe existe déjà
              Team.update({ _id: tm._id }, { $set: { logo: team.logo, competition: "WORLD", isNational: true, country: team.country } }, function(err, result){
                if (err){
                  console.log("Une erreur c'est produite lors de la mise à jour de l'équipe :", team.name);
                } else {
                  console.log(result);
                  console.log("Mise à jour de l'équipe :", team.name, team.country);
                }
                eachTeam();
              });
            }
          });

          /*Team.findOneAndUpdate({ $or: [{"api.sportmonks": team.api.sportmonks}] }, { $set: { name: team.name, shortName: team.name, logo: team.logo, competition: competition._id, "api.sportmonks": team.api.sportmonks } }, { upsert: true, setDefaultsOnInsert: true }, function(err, result){
          if (!err) console.log("Install or update team:", team.name);
          console.log(err);
          eachTeam();
        });*/
      }, function(err){
        // Fetch team for next competition
        eachCompetition();
      });
    }, function(err){
      // Failled to fetch team for competition
      eachCompetition();
    });
  }, function(err){
    return res.status(200).json("OK");
  });
}, function(err){
  console.log(err);
  return res.status(500).json(err);
});
});

module.exports = router;
