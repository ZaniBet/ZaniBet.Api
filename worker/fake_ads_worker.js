// If we are dev env, load dotenv
if (process.env.NODE_ENV != "production"){
  require('dotenv').config();
}

var MongoClient = require('mongodb').MongoClient;
var async = require('async');
var requestify = require('requestify');
var moment = require('moment');
var FootballDataAPI = require('../fetcher/footballdata');


var validateGrilleJob = function(db){
  return new Promise(function(resolve, reject){
    var Grille = db.collection('grille');
    var User = db.collection('user');
    // Valider toutes les grilles en attente de validation
    async.parallel([
      function(callback){
        Grille.updateMany({ status: 'waiting_validation' }, { $set: { status: 'waiting_result' } }, function(err, result){
          if (err) return callback(null, err);
          callback(null, result.result);
        });
      },
      function(callback){
        User.findOne({ transaction: { $exists: true } },function(err, user){
          //console.log(user);
          if (user == null) return callback(null, "");
          if (err) return callback(null, err);
          User.update({ _id: user._id }, { $inc: { jeton: user.transaction.amount }, $unset: { transaction: "" }, $set: { lastJetonAds: moment().utc().toDate() } }, function(err, result){
            if (err) return callback(null, err);
            callback(null, result);
          });
        });
      }
    ], function(err, results){
      if (err){
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
  validateGrilleJob(db).then(function(res){
    console.log(res);
    db.close();
  }, function(err){
    console.log(err);
    db.close();
  });
});
