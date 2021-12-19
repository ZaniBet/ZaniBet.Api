// If we are dev env, load dotenv
if (process.env.NODE_ENV != "production"){
  require('dotenv').config();
}


var MongoClient = require('mongodb').MongoClient;
var async = require('async');
var requestify = require('requestify');
var moment = require('moment');
var GCM = require('../lib/gcm');
var SportMonks = require('../fetcher/sportmonks');

const chalk = require('chalk');
const chalkInfo = chalk.bold.cyan;
const chalkDone = chalk.bold.green;
const chalkWarning = chalk.bold.yellow;
const chalkError = chalk.bold.red;

var refreshStanding = function(db){
  return new Promise(function(resolve, reject){
    console.log("Starting refreshStanding()");
    var User = db.collection('user');
    var Competition = db.collection('competition');
    var Team = db.collection('team');

    async.waterfall([
      // Récupérer les compéitions actives
      function(done){
        Competition.find({ isInternational: false, isCup: false }).toArray(function(err, competitions){
          if (err){
            return done(err);
          } else {
            console.log(chalkInfo("Nombre de compétitions actives :", competitions.length));
            //console.log(competitions);
            return done(null, competitions);
          }
        });
      },


      function(competitions, done){
        var _standings = [];
        var _finalStanding = [];
        async.eachLimit(competitions, 1, function(competition, eachCompetition){
          // Récupérer les équipes de la compétition
          /*var _teams = [];
          Team.find({ competition: competition._id }).toArray().then(function(teams){
            _teams = teams;
            return SportMonks.getLeagueStanding(competition.api.sportmonks.season);
          })*/SportMonks.getLeagueStanding(competition.api.sportmonks.season).then(function(standings){
            // replace team
            _standings = standings;
            var teamApiArr = [];
            standings.forEach(stdg => teamApiArr.push(stdg.team));
            return Team.find({ "api.sportmonks": { $in: teamApiArr } }).toArray();
          }).then(function(teams){

            _standings.map(function(standing){
              var teamFilter = teams.filter(tm => tm.api.sportmonks == standing.team);
              if (teamFilter.length == 0){
                //console.log("L'équipe n'existe pas", standing.team);
                standing.team = null;
              } else {
                standing.team = teamFilter[0]._id;
              }
              return standing;
            });

            Competition.update({ _id: competition._id }, { $set: { standings: _standings } }, function(err, result){
              if (err){
                //console.log(err);
                return eachCompetition(err);
              } else {
                //console.log("Mise à jour du classement de la compétition :", competition.name, result.result);
                _finalStanding = _finalStanding.concat(_standings);
                return eachCompetition();
              }
            });
          }, function(err){
            console.log(err);
            //if (err.code != null && err.code == 403) return eachCompetition();
            return eachCompetition();
          });

        }, function(err){
          if (err){
            return done(err);
          } else {
            return done(null, _standings);
          }
        });
      },

      // Mettre à jour la forme de charque équipe
      function(standings, done){
        async.each(standings, function(standing, eachStanding){
          Team.update({ _id: standing.team }, { $set: { recentForm: standing.recentForm } }, function(err, result){
            if (err){
              console.log(err);
            }
            //console.log("Mise à jour de l'équipe", standing.team, result.result);
            return eachStanding();
          });
        }, function(err){
          if (err){
            return done(err);
          } else {
            return done(null);
          }
        });
      }

    ], function(err, result){
      if (err){
        console.log(err);
        return reject(err);
      } else {
        return resolve("OK");
      }
    });
  });
};

// Use connect method to connect to the server
MongoClient.connect(process.env.DB_URI, function(err, db) {
  console.log("Connected successfully to server");
  console.log("-----> Start league_standings_worker.js <-----");
  refreshStanding(db).then(function(res){
    console.log("LEAGUE STANDINGS WORKER JOB DONE !")
    db.close();
  }, function(error){
    console.log('Error occur:', error)
    db.close();
  });
});
