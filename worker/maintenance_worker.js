// If we are dev env, load dotenv
if (process.env.NODE_ENV != "production"){
  require('dotenv').config();
}

var MongoClient = require('mongodb').MongoClient;
var async = require('async');
var moment = require('moment');


var maintenanceJob = function(db){
  return new Promise(function(resolve, reject){

    var Transaction = db.collection("Transaction");
    var User = db.collection("User");

    async.waterfall([
      /*
      * Supprimer les transactions ZaniAnalytics créés il y a plus d'un mois
      */
      function(done){

      },

      /*
       Désactiver les comptes innactif depuis plus de 3 mois :
       - Uniquement les utilisateurs inscris sans compte facebook
       - Supprimer les grilles (perdante)
       - Supprimer les transactions
       - Supprimer les tokens
       - Mettre le solde à 0
      */
      function(done){

      }

      /*
      * Netoyer les champs des grilles { instanceId, flashed,}
      */

    ], function(err, result){
      if (err){
        return reject(err);
      } else {
        return resolve(result);
      }
    });
  });
};


// Use connect method to connect to the server
MongoClient.connect(process.env.DB_URI, function(err, db) {
  console.log("Connected successfully to server");
  console.log("-----> Start maintenance_worker.js <-----");
  maintenanceJob(db).then(function(res){
    db.close();
    console.log("-----> Stop maintenance_worker.js <-----");
  }, function(err){
    console.log("-----> Error maintenance_worker.js <-----");
    console.log(err);
    db.close();
  });
});
