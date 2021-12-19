// If we are dev env, load dotenv
if (process.env.NODE_ENV != "production"){
  require('dotenv').config();
}

var MongoClient = require('mongodb').MongoClient;
var ObjectID = require('mongodb').ObjectID;
var async = require('async');
var moment = require('moment');
//var GCM = require('../lib/gcm');

MongoClient.connect(process.env.DB_URI, function(err, db) {
  console.log("Connected successfully to server");
  var Fixture = db.collection("fixture");
  Fixture.findOne({ _id: ObjectID("5a15ffd69455dc15fee7b87b") }, function(err, fixture){
    if (err || fixture == null){
      console.log(err);
      db.close();
    } else {
      //console.log(fixture);
      // Vérifier que le score de l'équipe à domicile correspond aux évènements de but
      var homeGoal = fixture.events.filter(ev => ev.type == "goal" && ev.team.equals(fixture.homeTeam) || ev.type == "penalty" && ev.team.equals(fixture.homeTeam)).length;
      var awayGoal = fixture.events.filter(ev => ev.type == "goal" && ev.team.equals(fixture.awayTeam) || ev.type == "penalty" && ev.team.equals(fixture.awayTeam)).length;

      console.log("Home Score", homeGoal);
      console.log("Away Score", awayGoal);
      if (homeGoal != fixture.result.homeScore){
        console.log("ERREUR FATALE: Le score de l'équipe à domicile ne correspond pas aux évènements de buts.")
      } else if (awayGoal != fixture.result.awayScore){
        console.log("ERREUR FATALE: Le score de l'équipe à l'extérieur ne correspond pas aux évènements de buts.")
      }

      db.close();
    }
  });
});
