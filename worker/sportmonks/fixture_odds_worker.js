// If we are dev env, load dotenv
if (process.env.NODE_ENV != "production"){
  require('dotenv').config();
}

var MongoClient = require('mongodb').MongoClient;
var async = require('async');
var requestify = require('requestify');
var moment = require('moment');
var SportMonks = require('../../fetcher/sportmonks');

var updateOddsJob = function(db){
  return new Promise(function(resolve, reject){
    var Fixture = db.collection("fixture");
    var GameTicket = db.collection("gameTicket");

    async.waterfall([

      function(done){
        GameTicket.find({ status: 'open', active: true }).toArray().then(function(gametickets){
          var fixtureArr = [];
          gametickets.forEach(function(gt){
            fixtureArr = fixtureArr.concat(gt.fixtures);
          });
          //console.log("Nombre de match récupérés dans les tickets de jeu :", fixtureArr.length);
          return done(null, fixtureArr);
        }, function(err){
          console.log("Une erreur est survenue lors de la récupération des tickets de jeu ouvert");
          return done(err);
        });
      },

      function(fixturesToCheck, done){
        Fixture.find({ status: 'soon', _id: { $in: fixturesToCheck } }).toArray().then(function(fixtures){
          //console.log("Nombre de match à vérifier :", fixtures.length);
          return done(null, fixtures);
        }, function(err){
          console.log("Une erreur c'est produite lors de la récupération des matchs");
          return done(err);
        });
      },

      // Récupérer les côtes de chaque match
      function(fixtures, done){
        var fixturesOdds = [];
        async.eachLimit(fixtures, 1, function(fixture, eachFixture){
          SportMonks.getFixtureOdds(fixture.api.sportmonks).then(function(odds){
            fixturesOdds.push(odds);
            eachFixture();
          }, function(err){
            //console.log("Impossible de trouver les cotes pour le match", fixture.homeTeam.name, fixture.awayTeam.name);
            eachFixture();
          });
        }, function(err){
          //console.log("Nombre de groupe de cotes:", fixturesOdds.length);
          //return done(err);
          if (err){
            return done(err);
          }
          return done(null, fixturesOdds);
        });
      },

      // Mettre à jour la cote moyenne de chaque match
      function(fixturesOdds, done){
        async.eachLimit(fixturesOdds, 5, function(fixtures, eachFixtures){
          if (fixtures == null || fixtures.length == 0 || fixtures[0].fixture == null){
            //console.log("Un problème est survenue avec le groupe de match", fixtures);
            return eachFixtures();
          }

          var homeSum = 0;
          var awaySum = 0;
          var drawSum = 0;
          //console.log(fixturesOdds);
          for (var i = 0; i < fixtures.length; i++){
            var homeOdd = fixtures[i].odds.filter(od => od.label === "1");
            var drawOdd = fixtures[i].odds.filter(od => od.label === "X");
            var awayOdd = fixtures[i].odds.filter(od => od.label === "2");

            //console.log(parseFloat(homeOdd[0].value), parseFloat(drawOdd[0].value), parseFloat(awayOdd[0].value));
            if (homeOdd.length > 0) homeSum += parseFloat(homeOdd[0].value);
            if (awayOdd.length > 0) awaySum += parseFloat(awayOdd[0].value);
            if (drawOdd.length > 0) drawSum += parseFloat(drawOdd[0].value);
          }

          //console.log((homeSum/fixtures.length).toFixed(2), (awaySum/fixtures.length).toFixed(2), (drawSum/fixtures.length).toFixed(2));
          var zanibetOdds = { bookmaker: "ZaniBet", type: "1N2", odds: { homeTeam: parseFloat(homeSum/fixtures.length).toFixed(2), draw: parseFloat(drawSum/fixtures.length).toFixed(2), awayTeam: parseFloat(awaySum/fixtures.length).toFixed(2) } };
          Fixture.update({ "api.sportmonks": fixtures[0].fixture }, { $set: { updatedAt: moment().utc().toDate() }, $pull: { odds: { bookmaker: "ZaniBet" } } }, function(err, result){
            //console.log("Mise à jour du match - Retrait des cotes zanibet:", fixtures[0].fixture);
            if (err){
              console.log(err);
              return eachFixtures(err);
            }
            Fixture.update({ "api.sportmonks": fixtures[0].fixture  }, { $set: { updatedAt: moment().utc().toDate() }, $addToSet: { odds: zanibetOdds } }, function(err, result){
              //console.log("Mise à jour du match - Ajout des cotes zanibet:", fixtures[0].fixture);
              if (err){
                console.log(err);
                return eachFixtures(err);
              }

              //console.log("Résultat de la modification:", result.result.n, result.result.nModified);
              return eachFixtures(null);
            });
          });
        }, function(err){
          return done(err);
        });
      }

    ], function(err, result){
      if (err) return reject(err);
      return resolve(result);
    });

  });
}

// Use connect method to connect to the server
MongoClient.connect(process.env.DB_URI, function(err, db) {
  console.log("Connected successfully to server");
  console.log("-----> Start fixture_odds_worker.js <-----");
  updateOddsJob(db).then(function(res){
    //console.log(res);
    console.log("-----> Fixture Odds Job Done <-----")
    db.close();
  }, function(err){
    //console.log(err);
    db.close();
  });
});
