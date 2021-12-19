// If we are dev env, load dotenv
if (process.env.NODE_ENV != "production"){
  require('dotenv').config();
}


var MongoClient = require('mongodb').MongoClient;
var async = require('async');
var requestify = require('requestify');
var moment = require('moment');
var Chance = require('chance');
var GCM = require('../lib/gcm');
var mailer = require('../lib/mailer');
var uniqid = require('uniqid');

// Charger ExpressJS pour utiliser le renderer EJS pour les fonctions de mailing
var express = require('express');
var app = express();
var path = require('path');
app.set('views', path.join('', 'views'));
app.set('view engine', 'ejs');

var validateGrilleJob = function(db) {
  return new Promise(function(resolve, reject){

    var Grille = db.collection('grille');
    var GameTicket = db.collection('gameTicket');
    var Fixture = db.collection('fixture');

    var currentDate = moment().utc();

    var _looseGrilles = [];
    var _jackpotGrilles = [];

    async.waterfall([
      // Récupérer les grilles en attente de validation
      function(callback){
        Grille.find({ status: "waiting_result", type: "MULTI" }).toArray(function(err, grilles){
          if (err){
            return callback(err);
          } else {
            console.log("Nombre de grille en attente de validation:", grilles.length);
            if (grilles == null || grilles.length == 0) return callback("Aucune grille en attente de résultat");
            return callback(null, grilles);
          }
        });
      },

      // Grouper les grilles par ticket de jeu
      function(grilles, callback){
        function group(grille, groupGrille){
          if (grille.gameTicket != null){
            return groupGrille(null, grille.gameTicket);
          } else {
            return groupGrille("Une grille ne contient aucun ticket de jeu !");
          }
        }

        async.groupBySeries(grilles, async.ensureAsync(group), function(err, groupTickets){
          if (err){
            callback(err);
          } else {
            console.log("Nombre de groupe de grilles réparti par ticket de jeu", Object.keys(groupTickets).length);
            callback(null, groupTickets);
          }
        });
      },

      // Valider les grilles pour chaque groupe
      function(groupTickets, callback){
        // Lancer une itération pour traîter chaque groupe de grille
        async.eachLimit(groupTickets, 1, function(groupTicket, eachGroupTicket){
          // Récupérer les informations concernant le ticket du groupe
          //console.log("Ticket en cours de traitement:", groupTicket[0].gameTicket);
          GameTicket.findOne({ _id: groupTicket[0].gameTicket, type: 'MATCHDAY' }, function(err, gameticket){
            //console.log(gameticket);
            if (err) return eachGroupTicket(); // impssible de trouver le ticket de ce groupe de grille
            if (gameticket == null) return eachGroupTicket(); // Le ticket n'existe pas
            if (gameticket.status != "ended") return eachGroupTicket(); // le ticket n'est pas encore fini

            //console.log("Traîtement du groupe de grilles pour le ticket :", gameticket.name, "Journée", gameticket.matchDay);
            // Récupérer les résultats du ticket
            Fixture.find({ _id: { $in: gameticket.fixtures } }).toArray(function(err, fixtures){
              // Lancer une itération pour récupérer chaque grille appartenant au groupe du ticket
              _looseGrilles = [];
              _jackpotGrilles = [];
              //console.log("Lancement de la comparaisons des pronostics jouées pour chaque grille par rapport au résultat des matchs.");
              // Traiter chaque grille du ticket de jeu
              async.eachLimit(groupTicket, 1, function(grilleTicket, eachGrilleTicket){
                var countWin = 0;
                var countCanceled = 0;
                //console.log("Traîtement de la grille :", grilleTicket._id);

                // Parcourir chaque pronostic jouée de la grille en cours
                for (var i = 0; i < grilleTicket.bets.length; i++){
                  // Parcourir chaque match pour trouver celui correspondant au pronostic
                  for (var z = 0; z < fixtures.length; z++){
                    // Vérifier si le match est bien terminé
                    if (fixtures[z].status != "done" && fixtures[z].status != "canceled"){
                      mailer.sendWorkerAlert(app, "grille_worker", "Un match contenu dans une grille jouée pour un ticket terminée, n'est pas terminé ! ID Grille : " + grilleTicket._id);
                      return eachGrilleTicket();
                    }

                    // Vérifier si le pronostic I est pour le match Z
                    if (String(grilleTicket.bets[i].fixture) === String(fixtures[z]._id)){
                      // Vérifier si le paris est gagnant
                      if (grilleTicket.bets[i].result == fixtures[z].result.winner){
                        countWin += 1;
                        grilleTicket.bets[i].status = "win";
                      } else if(fixtures[z].status == "canceled"){
                        // Le match de la grille est annulée, considérer le résultat comme gagnant
                        countWin += 1;
                        countCanceled += 1;
                        grilleTicket.bets[i].status = "canceled";
                      } else {
                        grilleTicket.bets[i].status = "loose";
                      }
                    }
                  }
                }

                //console.log('Nombre de pronostics:', grilleTicket.bets.length, '- Pronostics gagnants:', countWin);
                var bonus = 0;
                if(gameticket.bonusActivation != null && gameticket.bonus != null){
                  if (countWin >= gameticket.bonusActivation){
                    bonus = parseInt(gameticket.bonus);
                  }
                }

                if (bonus == null){
                  bonus = 0;
                }

                if (countWin == grilleTicket.bets.length && countCanceled == 0){
                  grilleTicket.payout.amount = -1; // temp value, recalculating in payout process
                  grilleTicket.payout.point = (countWin*parseInt(gameticket.pointsPerBet))+1000;
                  grilleTicket.payout.status = "waiting_update";
                  grilleTicket.payout.bonus = bonus;
                  grilleTicket.status = 'win';
                  grilleTicket.numberOfBetsWin = countWin;
                  _jackpotGrilles.push(grilleTicket);
                } else {
                  grilleTicket.payout.point = (countWin*parseInt(gameticket.pointsPerBet))+bonus;
                  grilleTicket.payout.amount = 0;
                  grilleTicket.payout.bonus = bonus;
                  grilleTicket.status = 'loose';
                  grilleTicket.numberOfBetsWin = countWin;
                  _looseGrilles.push(grilleTicket);
                }

                // Mettre à jour la grille
                updateGrille(db, grilleTicket).then(function(grille){
                  //console.log('Grille updated:', grille._id);
                  // Créditer l'utilisateur en zanicoins
                  return rewardUser(db, grille);
                }).catch(function(err){
                  mailer.sendWorkerAlert(app, "grille_worker", "Failled to reward user for grid : " + grilleTicket._id);
                }).then(function(user){
                  eachGrilleTicket();
                }, function(err){
                  mailer.sendWorkerAlert(app, "grille_worker", err);
                  eachGrilleTicket(err);
                });
              }, function(err){
                if (err){
                  //console.log("Erreur de traitement pour les grilles du ticket", gameticket._id ,err);
                  return eachGroupTicket();
                }

                // Toutes les grilles du ticket ont été validés, notifier les utilisateurs ayant une grille perdante
                pushGrilleLoose(db, _looseGrilles, gameticket).then(function(result){
                  // Démarrer le process de création de demande de paiement pour les grilles gagnantes du ticket
                  Grille.count({ status: 'win', gameTicket: gameticket._id, "payout.status": "waiting_update" }, function(err, count){
                    if (err){
                      console.log("Impossible de retrouver le nombre de grilles gagnantes pour le ticket:", gameticket._id ,err);
                      return eachGroupTicket();
                    }

                    if (count == 0){
                      console.log("Il n'y a aucune grille gagnante en attente de mise à jour.");
                      return eachGroupTicket();
                    }
                    // Répartir le jackpot entre toutes les grilles gagnantes
                    var amountToPay = Math.round((gameticket.jackpot/count)*100)/100;

                    Grille.updateMany({ status: 'win', gameTicket: gameticket._id,  "payout.status": "waiting_update" }, { $set: { "payout.amount": amountToPay, "payout.status": "waiting_paiement", updatedAt: moment().utc().toDate() } }, function(err, result){
                      if (err){
                        console.log("Une erreur est survenue lors de la mise à jour du payout des grilles gagnantes pour le ticket:", gameticket._id);
                        mailer.sendWorkerAlert(app, "grille_worker", err);
                        return eachGroupTicket();
                      }

                      // Mettre à jour le montant à payer du tableau local de grilles gagnantes
                      for (var jg in _jackpotGrilles){
                        //console.log('JG', _jackpotGrilles[jg]);
                        _jackpotGrilles[jg].payout.amount = amountToPay;
                      }

                      // Envoyer une notification push à tous les utilisateurs ayant jouées une grille gagnante
                      pushGrilleJackpot(db, _jackpotGrilles, gameticket).then(function(result){
                        // Créer une demande de paiement pour chaque grille gagnante
                        var payoutArr = [];
                        async.eachLimit(_jackpotGrilles, 1, function(grille, eachJackpotGrille){
                          createPayout(db, grille).then(function(payout){
                            if (payout != null){
                              payoutArr.push(payout);
                              //console.log('Send jackpot email alert');
                              payout.target = grille;
                              payout.target.gameTicket = gameticket;
                              mailer.sendJackpotAlert(app, payout);
                            } else {
                              // Un problème est survenu lors de la création d'une demande de paiement
                              // la transaction devra être reprise ultérieurement
                              mailer.sendWorkerAlert(app, "grille_worker", "Impossible de créer un payout pour la grille : " + grille._id);
                            }
                            return eachJackpotGrille();
                          }, function(err){
                            console.log(err);
                            return eachJackpotGrille();
                          });
                        }, function(err){
                          // Mettre à jour le status de toutes les grilles pour indiquer qu'un payout a été créer
                          payoutArr = payoutArr.map(payout => payout._id);
                          Grille.updateMany({ _id: { $in: payoutArr }, status: 'win', gameTicket: gameticket._id,  "payout.status": "waiting_paiement" }, { $set: {  "payout.status": "payout_created", updatedAt: moment().utc().toDate() } }, function(err, result){
                            if (err) console.log(err);
                            return eachGroupTicket();
                          });
                        });
                      });
                    });
                  });
                });

              });
            });
          });
        }, function(err){
          if (err) return callback(err);
          return callback(null, "OK");
        });
      }

    ], function(err, result){
      resolve("OK");
    });
  });
};

var updateGrille = function(db, grille){
  return new Promise(function(resolve, reject){
    //return reject("grrr");
    var Grille = db.collection('grille');
    Grille.findOneAndUpdate({ _id: grille._id, status: 'waiting_result' }, { $set: {
      updatedAt: moment().utc().toDate(),
      "payout.bonus": grille.payout.bonus,
      "payout.amount": grille.payout.amount,
      "payout.point": parseInt(grille.payout.point),
      "payout.status": grille.payout.status,
      status: grille.status,
      numberOfBetsWin: parseInt(grille.numberOfBetsWin),
      bets: grille.bets
    } }, { returnOriginal: false }, function(err, grille){
      if (err) return reject(err);
      resolve(grille.value);
    });
  });
};

var rewardUser = function(db, grille){
  return new Promise(function(resolve, reject){
    //return reject("Crash reward user");
    var User = db.collection('user');
    // FIX BUG PAYOUT ZANICOIN 28/11
    User.findOneAndUpdate({ _id: grille.user },  { $set: { updatedAt: moment().utc().toDate() }, $inc: { "point": parseInt(grille.payout.point) } } , { returnOriginal: false}, function(err, user){
      if (err) return reject(err);
      resolve(user.value);
    });
  });
};

var createPayout = function(db, grille){
  return new Promise(function(resolve, reject){
    var Payout = db.collection('payout');
    var reference = uniqid.process('PAY-');

    Payout.findOneAndUpdate({ target: grille._id, kind: 'Grille' }, { $set: {
      createdAt: moment().utc().toDate(),
      updatedAt: moment().utc().toDate(),
      reference: reference,
      user: grille.user,
      status: 'waiting_paiement',
      amount: grille.payout.amount, // deprecated
      "invoice.price": 0,
      "invoice.amount": grille.payout.amount,
      "invoice.paymentMethod": "PayPal"
     } }, { upsert: true, returnOriginal: false }, function(err, result){
      if (err) return reject(err);
      //console.log('Payout créé pour la grille:', grille._id)
      //console.log('Payout:', result.value);
      resolve(result.value);
    });
  });
};

var pushGrilleLoose = function(db, grilles, gameticket){
  return new Promise(function(resolve, reject){
    //console.log('pushGrilleLoose');
    var User = db.collection('user');

    if (grilles == null || grilles.length == 0) return resolve("OK");

    var userIdArr = grilles.map( grille => grille.user);

    User.find({ _id: { $in: userIdArr }, fcmToken: { $exists: true } }).toArray().then(function(users){
      console.log("Nombre d'utilisateur devant être informé d'une grille perdante :", users.length);
      if (users != null && users.length > 999){
        // TODO : untested
        var pagination = Math.round(users.length/999);
        for (var i = 0; i <= pagination; i++){
          var slice = users.slice(pagination*999, (pagination+1)*999);

          var fcmTokenArrFR = slice.filter(sl => sl.locale == "fr");
          var fcmTokenArrPT = slice.filter(sl => sl.locale == "pt");
          var fcmTokenArrEN = slice.filter(sl => sl.locale != "pt" && sl.locale != "fr");

          fcmTokenArrFR = fcmTokenArrFR.map( user => user.fcmToken);
          fcmTokenArrPT = fcmTokenArrPT.map( user => user.fcmToken);
          fcmTokenArrEN = fcmTokenArrEN.map( user => user.fcmToken);

          GCM.sendSingleMessage(fcmTokenArrFR, "ZaniBet", "Les résultats du ticket " + gameticket.name.replace("Jackpot", "J"+gameticket.matchDay) + " sont disponibles. Consultez vos pronostics gagnants dès maintenant!");
          GCM.sendSingleMessage(fcmTokenArrPT, "ZaniBet", "Os resultados do ingresso " + gameticket.name.replace("Jackpot", "J"+gameticket.matchDay) + " estão disponíveis. Confira suas previsões vencedoras agora!");
          GCM.sendSingleMessage(fcmTokenArrEN, "ZaniBet", "The results of the " + gameticket.name.replace("Jackpot", "J"+gameticket.matchDay) + " ticket are available. Check out your winning predictions now!");
        }

        resolve("OK");
      } else if (users != null && users.length > 0){
        var fcmTokenArr = users.map( user => user.fcmToken);

        var fcmTokenArrFR = fcmTokenArr.filter(sl => sl.locale == "fr");
        var fcmTokenArrPT = fcmTokenArr.filter(sl => sl.locale == "pt");
        var fcmTokenArrEN = fcmTokenArr.filter(sl => sl.locale != "pt" && sl.locale != "fr");

        fcmTokenArrFR = fcmTokenArrFR.map( user => user.fcmToken);
        fcmTokenArrPT = fcmTokenArrPT.map( user => user.fcmToken);
        fcmTokenArrEN = fcmTokenArrEN.map( user => user.fcmToken);

        GCM.sendSingleMessage(fcmTokenArrFR, "ZaniBet", "Les résultats du ticket " + gameticket.name.replace("Jackpot", "J"+gameticket.matchDay) + " sont disponibles. Consultez vos pronostics gagnants dès maintenant!");
        GCM.sendSingleMessage(fcmTokenArrPT, "ZaniBet", "Os resultados do ingresso " + gameticket.name.replace("Jackpot", "J"+gameticket.matchDay) + " estão disponíveis. Confira suas previsões vencedoras agora!");
        GCM.sendSingleMessage(fcmTokenArrEN, "ZaniBet", "The results of the " + gameticket.name.replace("Jackpot", "J"+gameticket.matchDay) + " ticket are available. Check out your winning predictions now!");

        resolve("OK");
      }
    }, function(err){
      if (err) console.log(err);
      return resolve("OK");
    });
  });
};

var pushGrilleJackpot = function(db, grilles, gameticket){
  return new Promise(function(resolve, reject){
    //console.log('pushGrilleJackpot');
    var User = db.collection('user');

    var userIdArr = grilles.map( grille => grille.user);

    User.find({ _id: { $in: userIdArr }, fcmToken: { $exists: true } }).toArray().then(function(users){
      //console.log(users);
      console.log("Nombre de notification à envoyer pour prévenir d'un jackpot :", users.length);
      if (users != null && users.length > 999){
        // TODO : untested
        var pagination = Math.round(users.length/999);
        for (var i = 0; i <= pagination; i++){
          var slice = users.slice(pagination*999, (pagination+1)*999);
          //var fcmTokenArr = slice.map( user => user.fcmToken);

          var fcmTokenArrFR = slice.filter(sl => sl.locale == "fr");
          var fcmTokenArrPT = slice.filter(sl => sl.locale == "pt");
          var fcmTokenArrEN = slice.filter(sl => sl.locale != "pt" && sl.locale != "fr");

          fcmTokenArrFR = fcmTokenArrFR.map( user => user.fcmToken);
          fcmTokenArrPT = fcmTokenArrPT.map( user => user.fcmToken);
          fcmTokenArrEN = fcmTokenArrEN.map( user => user.fcmToken);


          GCM.sendSingleMessage(fcmTokenArrFR, "ZaniBet", "Bravo ! Vous avez remporté une partie du jackpot pour le ticket "+ gameticket.name.replace('Jackpot', '') +" J"+ gameticket.matchDay +". Consultez vos gains dès maintenant!");
          GCM.sendSingleMessage(fcmTokenArrPT, "ZaniBet", "Parabéns! Você ganhou uma parte do jackpot do bilhete "+ gameticket.name.replace('Jackpot', '') +" D"+ gameticket.matchDay +". Veja os seus ganhos agora!");
          GCM.sendSingleMessage(fcmTokenArrEN, "ZaniBet", "Congratulations! You won a portion of the jackpot for the "+ gameticket.name.replace('Jackpot', '') +" D"+ gameticket.matchDay +" ticket. Check your winnings now!");
        }
        resolve("OK");
      } else if (users != null && users.length > 0) {
        var fcmTokenArr = users.map( user => user.fcmToken);
        console.log("Nombre de notification à envoyer pour prévenir d'un jackpot :", fcmTokenArr.length);
        var fcmTokenArrFR = fcmTokenArr.filter(sl => sl.locale == "fr");
        var fcmTokenArrPT = fcmTokenArr.filter(sl => sl.locale == "pt");
        var fcmTokenArrEN = fcmTokenArr.filter(sl => sl.locale != "pt" && sl.locale != "fr");

        fcmTokenArrFR = fcmTokenArrFR.map( user => user.fcmToken);
        fcmTokenArrPT = fcmTokenArrPT.map( user => user.fcmToken);
        fcmTokenArrEN = fcmTokenArrEN.map( user => user.fcmToken);

        GCM.sendSingleMessage(fcmTokenArrFR, "ZaniBet", "Bravo ! Vous avez remporté une partie du jackpot pour le ticket "+ gameticket.name.replace('Jackpot', '') +" J"+ gameticket.matchDay +". Consultez vos gains dès maintenant!");
        GCM.sendSingleMessage(fcmTokenArrPT, "ZaniBet", "Parabéns! Você ganhou uma parte do jackpot do bilhete "+ gameticket.name.replace('Jackpot', '') +" D"+ gameticket.matchDay +". Veja os seus ganhos agora!");
        GCM.sendSingleMessage(fcmTokenArrEN, "ZaniBet", "Congratulations! You won a portion of the jackpot for the "+ gameticket.name.replace('Jackpot', '') +" D"+ gameticket.matchDay +" ticket. Check your winnings now!");

        resolve("OK");
      }
    }, function(err){
      if (err) console.log(err);
      return resolve("OK");
    });
  });
};

//var url = "mongodb://localhost:27017/footbet";
//var url = "mongodb://devolios:ZaAY8pIjLj@ds143883-a0.mlab.com:43883,ds143883-a1.mlab.com:43883/crummyprod?replicaSet=rs-ds143883";

// Use connect method to connect to the server
MongoClient.connect(process.env.DB_URI, function(err, db) {
  console.log("Connected successfully to server");
  console.log("-----> Start grille_worker.js <-----");
  validateGrilleJob(db).then(function(res){
    console.log("GRILLE WORKER JOB DONE !")
    db.close();
  }, function(error){
    console.log('Error occur:', error)
    db.close();
  });
});
