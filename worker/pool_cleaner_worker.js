// If we are dev env, load dotenv
if (process.env.NODE_ENV != "production"){
  require('dotenv').config();
}

var MongoClient = require('mongodb').MongoClient;
var async = require('async');
var requestify = require('requestify');
var moment = require('moment');
var GCM = require('../lib/gcm');


var poolCleanJob = function(db){
  return new Promise(function(resolve, reject){
    console.log("Starting poolCleanJob()");
    var Transaction = db.collection('transaction');

    async.waterfall([
      // Récupérer les utilisateurs ayant recçu une transaction ZaniAnalytics durant les 7 derniers jours
      function(done){
        //var lastDay = moment().utc().subtract(1, 'day').toDate();
        Transaction.distinct('user', { sourceKind: "ZaniAnalytics", createdAt: { $gt: moment().utc().subtract(7, 'days').toDate() } }, function(err, transactions){
          
        });
      },
    ], function(err, result){
      if (err) return reject(err);
      return resolve("OK");
    });
  });
};

// Use connect method to connect to the server
MongoClient.connect(process.env.DB_URI, function(err, db) {
  console.log("Connected successfully to server");
  console.log("-----> Start pool_cleaner_worker.js <-----");
  poolCleanJob(db).then(function(res){
    console.log("-----> Stop pool_cleaner_worker.js <-----");
    db.close();
  }, function(error){
    console.log('Error occur:', error)
    db.close();
  });
});
