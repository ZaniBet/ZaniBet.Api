// If we are dev env, load dotenv
if (process.env.NODE_ENV != "production"){
  require('dotenv').config();
}


var MongoClient = require('mongodb').MongoClient;
var async = require('async');
var requestify = require('requestify');
var moment = require('moment');
var GCM = require('../lib/gcm');


var refreshJetonJob = function(db){
  return new Promise(function(resolve, reject){
    console.log("Starting refreshJetonJob()");
    var User = db.collection('user');

    async.waterfall([
      // Récupérer les utilisateurs ayant moins de deux jetons
      function(done){
        //var lastDay = moment().utc().subtract(1, 'day').toDate();
        User.aggregate([
          { $match: { jeton: { $lt: parseInt(process.env.DAILY_JETON_REWARD) } } },
          { $group: { _id: null, users: { $push: "$$ROOT" } } },
          { $project: {
            _id: 0,
            users: {
              $filter: {
                input: "$users",
                as: "user",
                cond: { $lt: [ {$dayOfYear: "$$user.lastFreeJeton"}, moment().utc().dayOfYear() ] }
              }
            }
          }
        },
        //{ $unwind: "$users" }
      ], function(err, result){
        console.log(err);
        //console.log(result);
        if (err){
          return done(err);
        } else if (result.length == 0){
          return done("Il n'y a aucun utilisateur devant recevoir des jetons.");
        } else {
          console.log(result[0].users.length);
          return done(null, result[0].users);
        }
        //return done("done");
      });
    },

    // Créditer les utilisateurs
    function(users, done){
      var userIdArr = users.map(user => user._id);
      console.log("Nombre d'utilisateur devant être mis à jour:", userIdArr.length);
      User.updateMany({ _id: { $in: userIdArr }, jeton: { $lt: parseInt(process.env.DAILY_JETON_REWARD) } }, { $set: { updatedAt: moment().utc().toDate(), lastFreeJeton: moment().utc().toDate(), jeton: parseInt(process.env.DAILY_JETON_REWARD) }  }, function(err, result){
        if (err){
          console.log("Une erreur est survenu lors de la mise à jour du nombre de crédit des utilisateurs.");
          return done(err);
        } else {
          console.log(result.result);
          return done(null, users);
        }
      });
    },

    // Notifier les utilisateurs qui ont été crédité
    /*function(users, done){
      var tokenArr = users.map(user => user.fcmToken);
      console.log("Envoyer un message à", tokenArr.length, "tokens");
      GCM.sendSingleMessage(tokenArr, "ZaniBet", "5 jetons viennent d'être crédités sur votre compte ZaniBet. Faites vos pronostics pour les matchs à venir !");
      return done(null);
    }*/

  ], function(err, result){
    if (err) return reject(err);
    return resolve("OK");
  });
});
};

// Use connect method to connect to the server
MongoClient.connect(process.env.DB_URI, function(err, db) {
  console.log("Connected successfully to server");
  console.log("-----> Start jeton_worker.js <-----");
  refreshJetonJob(db).then(function(res){
    console.log("JETON WORKER JOB DONE !")
    db.close();
  }, function(error){
    console.log('Error occur:', error)
    db.close();
  });
});
