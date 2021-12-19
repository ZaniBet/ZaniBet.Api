// If we are dev env, load dotenv
if (process.env.NODE_ENV != "production"){
  require('dotenv').config();
}

var MongoClient = require('mongodb').MongoClient;
var async = require('async');
var requestify = require('requestify');
var moment = require('moment');
var SportMonks = require('../../fetcher/sportmonks');

var updateEventsJob = function(db){
  return new Promise(function(resolve, reject){

    var Fixture = db.collection("fixture");

    async.waterfall([

      function(done){
        var twoHourAgo = moment().utc().subtract(130, 'minutes').toDate();
        Fixture.find({ status: { $in: [ 'playing' ] }, date: { $lt: twoHourAgo }, "result.auto": true }).toArray().then(function(fixtures){
          console.log("Nombre de match potentiellement corroumpu :", fixtures.length);
          return done(null, fixtures);
        }, function(err){
          console.log("Impossible de récupérer les matchs");
          return done(err);
        });
      },

      // Refresh events
      function(fixtures, done){
        async.eachLimit(fixtures, 1, function(fixture, eachFixture){
          SportMonks.getFixtureEvents(fixture.api.sportmonks).then(function(apiFixture){

            console.log("Mise à jour des id des équipes");
            for (var i = 0; i < apiFixture.events.length; i++){
              if (apiFixture.events[i].team == "home"){
                apiFixture.events[i].team = fixture.homeTeam;
              } else if (apiFixture.events[i].team == "away"){
                //console.log(fixture.awayTeam);
                apiFixture.events[i].team = fixture.awayTeam;
              }
            }

            Fixture.update({ _id: fixture._id }, { $set: { events: apiFixture.events/*, 'result.homeScore': apiFixture.result.homeScore, 'result.awayScore': apiFixture.result.awayScore,*/ } }, function(err, result){
              if (err){
                console.log("Une erreur c'est produite lors du refresh des events pour le match :", fixture._id);
                return eachFixture(err);
              } else {
                console.log("Les évènements du match", fixture._id, "ont été mis à jour !")
                return eachFixture();
              }
            });
          }, function(err){
            console.log("Une erreur c'est produite lors de la récupération des informations pour le match :", fixture._id);
            return eachFixture();
          });
        }, function(err){
          if (err){
            console.log("Le processus de mise à jour des évènements des matchs, c'est terminé avec une erreur.")
            return done(err);
          } else {
            return done(null);
          }
        });
      }

    ], function(err, result){
      if (err){
        return reject(err);
      } else {
        return resolve("OK");
      }
    });
  });
}

// Use connect method to connect to the server
MongoClient.connect(process.env.DB_URI, function(err, db) {
  console.log("Connected successfully to server");
  console.log("-----> Start fixture_events.js <-----");
  updateEventsJob(db).then(function(res){
    //console.log(res);
    console.log("-----> Fixture Events Job Done <-----")
    db.close();
  }, function(err){
    console.log(err);
    db.close();
  });
});
