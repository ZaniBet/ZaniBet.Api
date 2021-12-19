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

    // Récupérer toutes les grilles à valider
    Grille.find({ status: "waiting_result" }).toArray().then(function(grilles){
      console.log("Nombre de grille en attente de vaidation:", grilles.length);
      // Créer des groupes de tickets de jeu, contenant les grilles associés
      async.groupByLimit(grilles, 1, function(grille, groupGrille){
        return groupGrille(null, grille.gameTicket);
      }, function(err, groupTickets){
        if (err){
          console.log(err);
          return reject(err);
        }
        console.log("Nombre de groupe de grilles réparti par ticket de jeu", Object.keys(groupTickets).length);
        // Lancer une itération pour traîter chaque groupe de grille
        async.eachLimit(groupTickets, 1, function(groupTicket, eachGroupTicket){
          //console.log(groupResult);
          console.log("Traîtement du groupe de grilles pour le ticket :", groupTicket[0].gameTicket);
          // Récupérer les informations concernant le ticket du groupe
          GameTicket.findOne({ _id: groupTicket[0].gameTicket }, function(err, gameticket){
            if (err) return eachGroupTicket(); // impssible de trouver le ticket de ce groupe de grille
            if (gameticket.status != "ended") return eachGroupTicket();
            // Récupérer les résultats du ticket
            //console.log(gameticket);
            Fixture.find({ _id: { $in: gameticket.fixtures } }).toArray(function(err, fixtures){
              // Lancer une itération pour récupérer chaque grille appartenant au groupe du ticket
              _looseGrilles = [];
              _jackpotGrilles = [];

              async.eachLimit(groupTicket, 1, function(grilleTicket, eachGrilleTicket){
                var countWin = 0;
                var countCanceled = 0;

                // Parcourir chaque paris de la grille en cours
                for (var i = 0; i < grilleTicket.bets.length; i++){
                  for (var z = 0; z < fixtures.length; z++){
                    //console.log('Bets', grille.bets[i].fixture, '- Fixture',fixtureArr[z]._id );
                    // Vérifier si le match est bien terminé
                    if (fixtures[z].status != "done" && fixtures[z].status != "canceled") return eachGrilleTicket("FATAL ERROR, FOUND UN-DONE FIXTURE");

                    // Vérifier si le pari I est pour le match Z
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

                console.log('NB bets', grilleTicket.bets.length, 'count win', countWin);

                if (countWin == grilleTicket.bets.length && countCanceled < 2){
                  console.log('JACKPOT');
                  grilleTicket.payout.amount = -1; // temp value, recalculating in payout process
                  grilleTicket.payout.point = (countWin*10) + 1000;
                  grilleTicket.payout.status = "waiting_update";
                  grilleTicket.status = 'win';
                  grilleTicket.numberOfBetsWin = countWin;
                  _jackpotGrilles.push(grilleTicket);
                } else {
                  grilleTicket.payout.point = countWin*20;
                  grilleTicket.payout.amount = 0;
                  grilleTicket.status = 'loose';
                  grilleTicket.numberOfBetsWin = countWin;
                  _looseGrilles.push(grilleTicket);
                }

                // Mettre à jour la grille
                updateGrille(db, grilleTicket).then(function(grille){
                  console.log('Grille updated:', grille._id);
                  // Créditer l'utilisateur en zanicoins
                  return rewardUser(db, grille);
                }).catch(function(err){
                  //mailer.sendWorkerAlert(app, "grille_worker", "Failled to reward user for grid : " + grilleTicket._id);
                }).then(function(user){
                  eachGrilleTicket();
                }, function(err){
                  //mailer.sendWorkerAlert(app, "grille_worker", err);
                  eachGrilleTicket(err);
                });
              }, function(err){
                if (err){
                  console.log("Erreur de traitement pour les grilles du ticket", gameticket._id ,err);
                  return eachGroupTicket();
                }

                // Toutes les grilles du ticket ont été validés, notifier les utilisateurs ayant une grille perdante
                pushGrilleLoose(db, _looseGrilles, gameticket).then(function(result){
                  // Démarrer le process de création de demande de paiement pour les grilles du ticket
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
                    if (amountToPay > process.env.MAX_JACKPOT_PAYOUT){
                      var chance = new Chance();
                      amountToPay = gameticket.jackpot/chance.integer({ min: gameticket.jackpot/process.env.MAX_JACKPOT_PAYOUT, max: 250 });
                      amountToPay = Math.round(amountToPay*100)/100;
                      console.log("Override amountToPay", amountToPay);
                    }

                    Grille.updateMany({ status: 'win', gameTicket: gameticket._id,  "payout.status": "waiting_update" }, { $set: { "payout.amount": amountToPay, "payout.status": "waiting_paiement" } }, function(err, result){
                      if (err){
                        console.log("Une erreur est survenue lors de la mise à jour du payout des grilles gagnantes pour le ticket:", gameticket._id);
                        //mailer.sendWorkerAlert(app, "grille_worker", err);
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
                              console.log('Send jackpot email alert');
                              payout.target = grille;
                              payout.target.gameTicket = gameticket;
                              //mailer.sendJackpotAlert(app, payout);
                            } else {
                              // Un problème est survenu lors de la création d'une demande de paiement
                              // la transaction devra être reprise ultérieurement
                              //mailer.sendWorkerAlert(app, "grille_worker", "Impossible de créer un payout pour la grille : " + grille._id);
                            }
                            eachJackpotGrille();
                          }, function(err){
                            console.log(err);
                            eachJackpotGrille();
                          });
                        }, function(err){
                          // Mettre à jour le status de toutes les grilles pour indiquer qu'un payout a été créer
                          payoutArr = payoutArr.map(payout => payout._id);
                          Grille.updateMany({ _id: { $in: payoutArr }, status: 'win', gameTicket: gameticket._id,  "payout.status": "waiting_paiement" }, { $set: {  "payout.status": "payout_created" } }, function(err, result){
                            if (err) console.log(err);
                            eachGroupTicket();
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
          if (err) return reject(err);
          resolve();
        });
      });
    }, function(err){
      reject(err);
    });

  });
};

var updateGrille = function(db, grille){
  return new Promise(function(resolve, reject){
    //return reject("grrr");
    var Grille = db.collection('grille');
    Grille.findOneAndUpdate({ _id: grille._id, status: 'waiting_result' }, { $set: {
      "payout.amount": grille.payout.amount,
      "payout.point": grille.payout.point,
      "payout.status": grille.payout.status,
      status: grille.status,
      numberOfBetsWin: grille.numberOfBetsWin,
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
    User.findOneAndUpdate({ _id: grille.user },  { $inc: { "point": grille.payout.point } } , { returnOriginal: false}, function(err, user){
      if (err) return reject(err);
      resolve(user.value);
    });
  });
};

var createPayout = function(db, grille){
  return new Promise(function(resolve, reject){
    var Payout = db.collection('payout');
    Payout.findOneAndUpdate({ target: grille._id, kind: 'Grille' }, { $set: { user: grille.user, status: 'waiting_paiement', amount: grille.payout.amount } }, { upsert: true, returnOriginal: false }, function(err, result){
      if (err) return reject(err);
      console.log('Payout créé pour la grille:', grille._id)
      console.log('Payout:', result.value);
      resolve(result.value);
    });
  });
};

var pushGrilleLoose = function(db, grilles, gameticket){
  console.log('pushGrilleLoose');
  return new Promise(function(resolve, reject){
    var User = db.collection('user');
    var userIdArr = grilles.map( grille => grille.user);
    //console.log("PUSH GRILLE LOOSE");
    //console.log(userIdArr);
    User.find({ _id: { $in: userIdArr }, fcmToken: { $exists: true } }).toArray().then(function(users){
      //console.log(users);
      if (users != null && users.length > 999){
        // TODO : untested
        var pagination = Math.round(user.length/999);
        for (var i = 0; i <= pagination; i++){
          var slice = users.slice(pagination*999, (pagination+1)*999);
          var fcmTokenArr = slice.map( user => user.fcmToken);
          GCM.sendSingleMessage(fcmTokenArr, "ZaniBet", "Les résultats du ticket " + gameticket.name.replace("Jackpot", "J"+gameticket.matchDay) + " sont disponibles. Consultez vos pronostics gagnants dès maintenant !").catch(function(err){
            console.log(err);
          });
        }
      } else if (users != null && users.length > 0){
        var fcmTokenArr = users.map( user => user.fcmToken);
        //console.log(fcmTokenArr);
        GCM.sendSingleMessage(fcmTokenArr, "ZaniBet", "Les résultats du ticket " + gameticket.name.replace("Jackpot", "J"+gameticket.matchDay) + " sont disponibles. Consultez vos pronostics gagnants dès maintenant !").catch(function(err){
          console.log(err);
        });
      }
      resolve("OK");
    }, function(err){
      resolve("KO");
      //reject(err);
    });
  });
};

var pushGrilleJackpot = function(db, grilles, gameticket){
  console.log('pushGrilleJackpot');
  return new Promise(function(resolve, reject){
    var User = db.collection('user');
    var userIdArr = grilles.map( grille => grille.user);

    User.find({ _id: { $in: userIdArr }, fcmToken: { $exists: true } }).toArray().then(function(users){
      //console.log(users);
      if (users != null && users.length > 999){
        // TODO : untested
        var pagination = Math.round(user.length/999);
        for (var i = 0; i <= pagination; i++){
          var slice = users.slice(pagination*999, (pagination+1)*999);
          var fcmTokenArr = slice.map( user => user.fcmToken);
          GCM.sendSingleMessage(fcmTokenArr, "ZaniBet", "Bravo ! Vous avez remporté une partie du jackpot pour le ticket "+ gameticket.name.replace('Jackpot', '') +" J"+ gameticket.matchDay +". Consultez vos gains dès maintenant.").catch(function(err){
            console.log(err);
          });
        }
      } else if (users != null && users.length > 0) {
        var fcmTokenArr = users.map( user => user.fcmToken);
        console.log("Nombre de notification à envoyer pour prévenir d'un jackpot :", fcmTokenArr.length);
        console.log(fcmTokenArr);
        GCM.sendSingleMessage(fcmTokenArr, "ZaniBet", "Bravo ! Vous avez remporté une partie du jackpot pour le ticket "+ gameticket.name.replace('Jackpot', '') +" J"+ gameticket.matchDay +". Consultez vos gains dès maintenant.").catch(function(err){
          console.log(err);
        });
      }
      resolve("OK");
    }, function(err){
      resolve("KO");
      //reject(err);
    });
  });
};

//var url = "mongodb://localhost:27017/footbet";
//var url = "mongodb://devolios:ZaAY8pIjLj@ds143883-a0.mlab.com:43883,ds143883-a1.mlab.com:43883/crummyprod?replicaSet=rs-ds143883";

// Use connect method to connect to the server
MongoClient.connect(process.env.DB_URI, function(err, db) {
  console.log("Connected successfully to server");
  validateGrilleJob(db).then(function(res){
    console.log("GRILLE WORKER JOB DONE !")
    db.close();
  }, function(error){
    console.log('Error occur:', error)
    db.close();
  });
});
