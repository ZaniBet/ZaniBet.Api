// If we are dev env, load dotenv
if (process.env.NODE_ENV != "production"){
  require('dotenv').config();
}

var MongoClient = require('mongodb').MongoClient;
var async = require('async');
var requestify = require('requestify');
var moment = require('moment');
var SportMonks = require('../../fetcher/sportmonks');
var Chance = require('chance');
var chance = new Chance();

var updateJob = function(db){
  return new Promise(function(resolve, reject){

    var Fixture = db.collection("fixture");
    var Competition = db.collection("competition");
    var Team = db.collection("team");
    var GameTicket = db.collection("gameTicket");

    async.waterfall([

      // Récupérer les matchs à venir
      function(done){
        
      }

    ], function(err, result){
      if (err) return reject(err);
      return result("OK");
    });

  });
};

  // Use connect method to connect to the server
  MongoClient.connect(process.env.DB_URI, function(err, db) {
    console.log("Connected successfully to server");
    console.log("-----> Start fixture_update_worker.js <-----");
    updateJob(db).then(function(res){
      //console.log(res);
      console.log("-----> Fixture Update Job Done <-----")
      db.close();
    }, function(err){
      console.log(err);
      db.close();
    });
  });
