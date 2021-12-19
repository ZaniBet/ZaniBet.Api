// If we are dev env, load dotenv
if (process.env.NODE_ENV != "production"){
  require('dotenv').config();
}

var MongoClient = require('mongodb').MongoClient;
var async = require('async');
var requestify = require('requestify');
var moment = require('moment');
//var FootballDataAPI = require('../fetcher/footballdata');


//var url = "mongodb://localhost:27017/footbet";
//var url = "mongodb://devolios:ZaAY8pIjLj@ds143883-a0.mlab.com:43883,ds143883-a1.mlab.com:43883/crummyprod?replicaSet=rs-ds143883";

var clearGrilleJob = function(db){
  return new Promise(function(resolve, reject){
    var Grille = db.collection('grille');
    var currentDate = moment().utc();
    var filterDate = currentDate.subtract(10, 'minutes');
    // Annuler les grilles qui n'ont pas été validé au bout de 30min
    Grille.updateMany({ status: 'waiting_validation', createdAt: { $lt: filterDate.toDate() } }, { $set: { status: 'canceled', updatedAt: moment().utc().toDate() } }, function(err, result){
      if (err) return reject(err);
      resolve(result.result);
    });
  });
};

// Use connect method to connect to the server
MongoClient.connect(process.env.DB_URI, function(err, db) {
  console.log("Connected successfully to server");
  console.log("-----> Start clear_grille_worker.js <-----");
  clearGrilleJob(db).then(function(res){
    console.log(res);
    db.close();
  }, function(err){
    console.log(err);
    db.close();
  });
});
