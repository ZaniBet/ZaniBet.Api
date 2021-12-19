// If we are dev env, load dotenv
if (process.env.NODE_ENV != "production"){
  require('dotenv').config();
}

var MongoClient = require('mongodb').MongoClient;
var async = require('async');
var requestify = require('requestify');
var moment = require('moment');
moment.locale('fr');
var Chance = require('chance');
var GCM = require('../../lib/gcm');
var ObjectId = require('mongodb').ObjectID;

var notififyMatchesToday = function(db){
  return new Promise(function(resolve, reject){
    var planning = [
      { jour: 'lundi', heure: 8 },
      { jour: 'mardi', heure: 8 },
      { jour: 'mercredi', heure: 8 },
      { jour: 'jeudi', heure: 8 },
      { jour: 'vendredi', heure: 7 },
      { jour: 'samedi', heure: 7 },
      { jour: 'dimanche', heure: 7 },
    ];

    var Fixture = db.collection("fixture");
    var Notification = db.collection("notification");

    //console.log(moment().utc().format('dddd'));
    async.waterfall([
      // Trouver les matchs ayant lieu aujourd'hui
      function(done){
        Fixture.find({ date: { $gt: moment().utc().startOf('day').toDate(), $lt: moment().utc().endOf('day').toDate() } }).sort({ date: 1 }).toArray(function(err, fixtures){
          if (err){
            return done(err);
          } else {
            if (fixtures.length == 0){
              return done("Il n'y a aucun match prévu aujourd'hui");
            }
            return done(null, fixtures);
          }
        });
      },

      function(fixtures, done){
        // Ajuster l'heure d'envoi de la notification par rapport au jour de la semaine
        var sendAt;
        planning.forEach(function(plan){
          if (plan.jour === moment().utc().format('dddd')){
            //console.log(plan);
            sendAt = moment().utc().hour(plan.heure).minute(0).second(0);
          }
        });

        //console.log(sendAt);
        //console.log(moment(sendAt).utc().format('HH:mm'));
        //return done(null);
        // Récupérer ou créer une notification si celle ci n'existe pas
        Notification.findOne({ eventName: 'single_gameticket_today', sendAt: {  $gt: moment().utc().startOf('day').toDate(), $lt: moment().utc().endOf('day').toDate() } }, function(err, notification){
          if (err){
            return done(err);
          } else {
            //console.log(notification);
            //return done(null, notification); // DEBUG

            if (notification == null){
              // Créer une notification
              Notification.insertOne({ locale: 'fr', status: 'pending', eventName: 'single_gameticket_today', createdAt: moment().utc().toDate(), updatedAt: moment().utc().toDate(), sendAt: sendAt.toDate(), title: 'Faites vos pronostics !',
              message: 'Le foot commence à '+ moment(fixtures[0].date).utc().format('HH:mm') + ' UTC aujourd\'hui. Faites vos pronostics sur les ' + String(fixtures.length) +' matchs prévus et gagnez jusqu\'à '+ String((fixtures.length*4)*20) +' ZaniCoins!', audience: ['push']  }, function(err, result){
                if (err){
                  return done(err);
                } else {
                  console.log(result);
                  // Vérifier l'heure
                  if (sendAt.diff(moment().utc()) < 0){
                    //console.log("diff1", sendAt.diff(moment().utc()));
                    return done("La notification vient juste d'être créé, l'envoi sera surement effectué au prochain lancement du processus.");
                  } else {
                    //console.log("diff2", sendAt.diff(moment().utc()));
                    return done("Il n'est pas encore l'heure d'envoyer cette notification");
                  }
                }
              });
            } else if (notification.status == "pending"){
              // Vérifier si il est l'heure d'envoyer la notification
              if (moment(notification.sendAt).diff(moment().utc()) < 0){
                return done(null, notification, fixtures);
              } else {
                //console.log("diff3", moment(notification.sendAt).diff(moment().utc()));
                return done("Il n'est pas encore l'heure d'envoyer cette notification");
              }
            } else {
              //console.log("La notification à surement déjà du être envoyée :", notification.status);
              return done("Il y a un problème avec la notification", notification._id);
            }
          }
        });
      },

      function(notification, fixtures, done){
        // Envoyer la notification
        console.log("Envoi de la notification :", notification._id);
        Notification.findOneAndUpdate({ _id: notification._id }, { $set: { status: 'sending', updatedAt: moment().utc().toDate() } }, { returnOriginal: false }, function(err, notif){
          if (err){
            return done(err);
          } else {
            notif = notif.value;
            //console.log(notif.eventName);
            //return done(null);

            GCM.sendTopicMessage(notif.eventName + "_en", notif.title, "Football starts at " + moment(fixtures[0].date).utc().format('HH:mm') +" UTC today. Make your predictions on the "+ fixtures.length +" scheduled matches and win up to "+ String((fixtures.length*4)*30) +" ZaniCoins.").then(function(result){
              return GCM.sendTopicMessage(notif.eventName + "_pt", notif.title, "O futebol começa às " + moment(fixtures[0].date).utc().format('HH:mm') +" UTC de hoje. Faça suas previsões nos "+ fixtures.length +" jogos programados e ganhe até "+ String((fixtures.length*4)*30) +" ZaniCoins !");
            }).then(function(result){
              return GCM.sendTopicMessage(notif.eventName + "_fr", notif.title, "Le foot commence à "+ moment(fixtures[0].date).utc().format('HH:mm') + " UTC aujourd'hui. Faites vos pronostics sur les " + String(fixtures.length) + " matchs prévus et gagnez jusqu'à "+ String((fixtures.length*4)*30) +" ZaniCoins !");
            }).then(function(result){
              return GCM.sendTopicMessage(notif.eventName + "_es", notif.title, "El fútbol comienza hoy a las " + moment(fixtures[0].date).utc().format('HH:mm') + " UTC. Haga sus predicciones en las " + String(fixtures.length) + " partidas programadas y gane hasta "+ String((fixtures.length*4)*30) +" ZaniCoins !");
            }).then(function(result){
              console.log("La notification a été envoyé !", notif.eventName);
              return Notification.updateOne({ _id: notification._id }, { $set: { status: 'sent' } });
            }).then(function(result){
              return done(null, result.result);
            }, function(err){
              console.log("Une erreur c'est produite lors de l'envoi de la notification ou de la mise à jour du status final");
              return done(err);
            });
          }
        });
      }
    ], function(err, result){
      if (err){
        console.log(err);
        return reject(err);
      } else {
        console.log(result);
        return resolve("OK");
      }
    });
  });
}


MongoClient.connect(process.env.DB_URI, function(err, db) {
  console.log("Connected successfully to server");
  console.log("----> Start matches_today.js <----")
  notififyMatchesToday(db).then(function(res){
    console.log("----> Notify matches today job done <----")
    db.close();
  }, function(error){
    console.log('Error occur:', error)
    db.close();
  });
});
