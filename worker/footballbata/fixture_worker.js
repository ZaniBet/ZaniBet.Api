// If we are dev env, load dotenv
if (process.env.NODE_ENV != "production"){
  require('dotenv').config();
}

var MongoClient = require('mongodb').MongoClient;
var async = require('async');
var requestify = require('requestify');
var moment = require('moment');
var FootballDataAPI = require('../fetcher/footballdata');

var updateFixtureJob = function(db){
  return new Promise(function(resolve, reject){
    // Récupérer tous les matchs dont la date de commencement est dépassé et dont les résultats ne sont pas connus
    var Fixture = db.collection('fixture');
    var Competition = db.collection('competition');

    var currentDate = moment().utc();
    console.log("Current date:", currentDate);


    async.waterfall([
      /*
      ** Récupérer la liste des matchs en cours de jeu
      */
      /*function(done){
        Fixture.find({ date: { $lt: currentDate.toDate() }, $or: [ { status: 'soon' }, { status: 'playing' } ] }).toArray(function(err, fixtures){
          if (err){
            console.log("Error occur :", err);
            return done(err);
          }
          console.log(fixtures.length, "fixtures found.");
          done(null, fixtures);
        });
      },*/

      /*
      ** Pour chaque compétitions récupérer tous les matchs ayant eu lieu les 14
      ** derniers jours
      */
      function(done){
        Competition.find().toArray(function(err, competitions){
          if (err){
            console.log("Error occur :", err);
            return done(err);
          }

          var fixturesToCheckArr = [];
          async.eachLimit(competitions, 1, function(competition, eachCompetition){
            FootballDataAPI.getFixtureForCompetition(competition, "p99").then(function(fixtures){
                if (fixtures == null){
                  console.log("Failled to found fixtures for competition", competition.name);
                  eachCompetition();
                } else {
                  fixturesToCheckArr = fixturesToCheckArr.concat(fixtures);
                  eachCompetition();
                }
            }, function(err){
              console.log("Failled to found fixtures for competition", competition.name);
              eachCompetition();
            });
          }, function(err){
            done(null, fixturesToCheckArr);
          });
        });
      },

      /*
      ** Créer un tableau contenant uniquement les ids des matchs à vérifier
      */
      function(fixturesToCheck, done){
        //console.log(fixturesToCheck);
        async.map(fixturesToCheck, function(fixture, mapFixture){
          mapFixture(null, parseInt(fixture.api.footballdata));
        }, function(err, results){
          done(null, fixturesToCheck, results);
        });
      },

      // Rechercher dans la base de donnée les matchs n'ayant pas de résultat,
      // et qui sont présent dans la liste à vérifier
      function(fixturesToCheck, fixturesId, done){
        //console.log(fixturesId);
        Fixture.find({ date: { $lt: currentDate.toDate() }, $or: [{status: 'playing'}, {status: 'soon'}], "api.footballdata": { $in: fixturesId } }).toArray(function(err, fixtures){
          if (err){
            return done(err);
          }

          async.eachLimit(fixtures, 1, function(fixture, eachFixture){
            for (var i = 0; i < fixturesToCheck.length; i++){
              if (fixturesToCheck[i].api.footballdata == fixture.api.footballdata){
                console.log('should update', fixture.api.footballdata, fixturesToCheck[i].status);
                updateFixture(db, fixture, fixturesToCheck[i]).then(function(updatedFixture){
                  eachFixture();
                }, function(err){
                  console.log("Error occur when trying to update fixture", fixturesToCheck[i] )
                  eachFixture();
                });
              }
            }
          }, function(err){
            done(null);
          });
        });
      }

      /*
      ** Récupérer les informations sur chaque match auprès du fournisseur
      ** puis mettre à jour la base de données.
      */
      /*function(fixtures, done){
        var updateCount = 0;
        async.eachLimit(fixtures, 1, function(fixture, eachFixture){
          FootballDataAPI.getFixture(fixture.api.footballdata).then(function(apiFixture){
            //console.log("Récupération des données pour le match terminée.");
            return updateFixture(db, fixture, apiFixture);
          }).then(function(updatedFixture){
            updateCount++;
            eachFixture();
          }, function(err){
            console.log("Error occur :", err);
            eachFixture();
          });
        }, function(err, res){
          console.log(updateCount, "fixtures ont été mis à jour");
          done(null);
        });
      }*/

    ], function(err, result){
      if (err) return reject(err);
      resolve();
    });

  });
};


var updateFixture = function(db, fixture, apiFixture){
  return new Promise(function(resolve, reject){
    var Fixture = db.collection('fixture');
    //var homeScore = apiFixture.result.goalsHomeTeam;
    //var awayScore = apiFixture.result.goalsAwayTeam;
    var homeScore = apiFixture.result.homeScore;
    var awayScore = apiFixture.result.awayScore;
    var winner = null;
    var updateQuery = null;

    if (fixture.status == 'playing' && apiFixture.status == 'IN_PLAY'){
      return reject("Le match est toujours en cours et le status n'a pas besoin d'être mis à jour.");
    } else if (apiFixture.status == 'SCHEDULED' || apiFixture.status == 'TIMED'){
      return reject("Le match est n'a pas encore commencé, ou est retardé");
    } else if (fixture.status == 'soon' && apiFixture.status == 'POSTPONED'){
      // Le match est reporté
      updateQuery = Fixture.findOneAndUpdate({ _id: fixture._id }, { $set: {
        'status': 'canceled'
      } }, { returnOriginal: false });
    } else if (fixture.status == 'playing' && apiFixture.status == 'CANCELED'){
      // Le match était en cours, mais a été stopé
      updateQuery = Fixture.findOneAndUpdate({ _id: fixture._id }, { $set: {
        'result.homeScore': homeScore,
        'result.awayScore': awayScore,
        'status': 'canceled'
      } }, { returnOriginal: false });
    } else if (fixture.status == 'playing' && apiFixture.status == 'FINISHED' || fixture.status == 'soon' && apiFixture.status == 'FINISHED'){
      // Le match est terminé
      winner = getWinner(homeScore, awayScore);
      if (winner == -1) return reject("Aucun resultat n'est disponible pour ce match !");
      updateQuery = Fixture.findOneAndUpdate({ _id: fixture._id }, { $set: {
        'result.homeScore': homeScore,
        'result.awayScore': awayScore,
        'result.winner': winner,
        'status': 'done'
      } }, { returnOriginal: false });
    } else if (fixture.status == 'soon' && apiFixture.status == 'IN_PLAY'){
      // Le match a commencé
      updateQuery = Fixture.findOneAndUpdate({ _id: fixture._id }, { $set: {
        'result.homeScore': homeScore,
        'result.awayScore': awayScore,
        'status': 'playing'
      } }, { returnOriginal: false });
    } else if (fixture.status == 'soon' && apiFixture.status == 'CANCELED'){
      // Le match a été annulé
      updateQuery = Fixture.findOneAndUpdate({ _id: fixture._id }, { $set: {
        'status': 'canceled'
      } }, { returnOriginal: false });
    }

    console.log(fixture.status, apiFixture.status, updateQuery);
    if (updateQuery == null){
      return reject("Internal error !");
    }

    updateQuery.then(function(result){
      resolve(result.value);
    }, function(err){
      reject(err);
    });
  });
};


function getWinner(homeScore, awayScore){
  var winner;
  if (homeScore == null || awayScore == null){
    //return reject("Un match contenu dans le ticket, n'a pas encore de résultat");
    return -1;
  }

  if (homeScore == awayScore){
    winner = 0;
  } else if (homeScore > awayScore){
    winner = 1;
  } else if (awayScore > homeScore){
    winner = 2;
  }

  return winner;
}

//var url = "mongodb://localhost:27017/footbet";
//var url = "mongodb://devolios:ZaAY8pIjLj@ds143883-a0.mlab.com:43883,ds143883-a1.mlab.com:43883/crummyprod?replicaSet=rs-ds143883";

// Use connect method to connect to the server
MongoClient.connect(process.env.DB_URI, function(err, db) {
  console.log("Connected successfully to server");
  updateFixtureJob(db).then(function(res){
    //console.log(res);
    db.close();
  }, function(err){
    //console.log(err);
    db.close();
  });
});
