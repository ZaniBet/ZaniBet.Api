// If we are dev env, load dotenv
if (process.env.NODE_ENV != "production"){
  require('dotenv').config();
}

var MongoClient = require('mongodb').MongoClient;
var async = require('async');
var requestify = require('requestify');
var moment = require('moment');
var Chance = require('chance');
var GCM = require('../../lib/gcm');
var ObjectId = require('mongodb').ObjectID;

var notifyRemainingPlayJob = function(db){
  return new Promise(function(resolve, reject){
    var Grille = db.collection('grille');
    var GameTicket = db.collection('gameTicket');
    var Notification = db.collection('notification');
    var User = db.collection('user');

    // Trouver les notifications de grille en attente à envoyer
    // Trouver un ticket qui ferme dans moins de 2H
    Notification.findOneAndUpdate({ eventName: 'grid_remaining', status: 'pending', sendAt: { $lt: moment().utc().toDate() }, audience: { $in: ['push'] } },
    { $set: { updatedAt: moment().utc().toDate(), status: 'sent' } }).then(function(notification){
      //console.log('Notification', notification);
      notification = notification.value;
      if (notification == null) return resolve();
      // Trouver les grilles jouées pour chaque tickets
      Grille.find({ gameTicket: notification.target }).toArray().then(function(grilles){
        console.log("Nombre de grilles :", grilles.length);
        // Grouper les grilles par utilisateur
        async.groupBy(grilles, function(grille, eachGrille){
          return eachGrille(null, grille.user);
        }, function(err, groupGrille){
          // Réduire les groupes aux utilisateur n'ayant pas atteind la Limite
          var userArr = [];
          for (grilles in groupGrille){
            if(groupGrille[grilles].length >= parseInt(notification.extra)){
              delete groupGrille[grilles];
            } else {
              //console.log(grilles);
              userArr.push(ObjectId(grilles.trim()));
            }
          }
          //console.log(groupGrille);
          //console.log("users", userArr);
          User.find({ _id: { $in: userArr } }).toArray().then(function(users){
            //console.log('result', users);
            var filteredUser = users.filter(user => user.fcmToken != null);
            var tokens = filteredUser.map(user => user.fcmToken);
            console.log("Send notification to", tokens.length, "users.");
            if (tokens.length == 0) return resolve();
            //return resolve();
            return GCM.sendSingleMessage(tokens, notification.title, notification.message);
          }).then(function(result){
            //console.log("Resultat de l'envoi de notification",result);
            resolve();
          }, function(err){
            reject(err);
          });
        });
      }, function(err){
        if (err) return reject();
        resolve();
      });
    }, function(err){
      reject(err);
    });
  })
};

exports.startJob = function(){
  // Use connect method to connect to the server
  MongoClient.connect(process.env.DB_URI, function(err, db) {
    console.log("Connected successfully to server");
    notifyRemainingPlayJob(db).then(function(res){
      console.log("Push grilles worker job done")
      db.close();
    }, function(error){
      console.log('Error occur:', error)
      db.close();
    });
  });
};

/*if (process.env.NODE_ENV == "local"){
  this.startJob();
}*/
