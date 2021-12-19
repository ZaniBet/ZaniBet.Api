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

const chalk = require('chalk');
const chalkInit = chalk.green;
const chalkTask = chalk.cyan;
const chalkDone = chalk.blue;
const chalkError = chalk.bold.red;
const chalkWarning = chalk.bold.yellow;

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
      // Récupérer les grilles simples en attente de validation
      function(callback){
        Grille.find({ status: "waiting_result", type: "SIMPLE" }).toArray(function(err, grilles){
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
          GameTicket.findOne({ _id: groupTicket[0].gameTicket, type: "SINGLE" }, function(err, gameticket){
            if (err) return eachGroupTicket(); // impssible de trouver le ticket de ce groupe de grille
            if (gameticket == null) return eachGroupTicket();
            if (gameticket.status != "ended" && gameticket.status != "canceled"){
              if (gameticket.status != "open") console.log("Impossible de procéder à la validation du ticket ! -", gameticket.status, gameticket.name, gameticket.resultDate);
              return eachGroupTicket(); // le ticket n'est pas encore fini
            }

            //console.log("Traîtement du groupe de grilles pour le ticket :", gameticket.name, "Journée", gameticket.matchDay);
            // Récupérer les résultats du match
            Fixture.findOne({ _id: { $in: gameticket.fixtures } }, function(err, fixture){
              if (fixture == null){
                return eachGroupTicket(); // le match du ticket n'existe pas
              } else if (fixture.status != "done" && fixture.status != "canceled" && gameticket.status != "canceled"){
                return eachGroupTicket(); // le match n'est pas encore terminée
              } else if (fixture.events == null && gameticket.status != "canceled"){
                //console.log("Impossible de valider cette grille, car les évènements sont manquant pour vérifier tous les types de paris");
                return eachGroupTicket();
              } else {
                // Lancer une itération pour récupérer chaque grille appartenant au groupe du ticket
                //console.log("Lancement de la comparaisons des pronostics jouées pour chaque grille par rapport au résultat des matchs. API :", fixture.api.sportmonks);
                // Traiter chaque grille du ticket de jeu
                async.eachLimit(groupTicket, 1, function(grilleTicket, eachGrilleTicket){
                  var countWin = 0;
                  var countCanceled = 0;
                  //console.log("Traîtement de la grille :", grilleTicket._id);

                  if (gameticket.status != "canceled" && fixture.status != "canceled"){
                    // Vérifier que tous les paris ont été validés
                    gameticket.betsType.forEach(function(bt){
                      if (grilleTicket.bets.filter(be => be.type === bt.type).length == 0){
                        console.log("Il manque le pronostic", bt.type, "dans la grille", grilleTicket._id);
                        return eachGrilleTicket();
                      }
                    });

                    // Parcourir chaque pronostic jouée de la grille en cours
                    for (var i = 0; i < grilleTicket.bets.length; i++){
                      if (grilleTicket.bets[i].type === "1N2"){
                        if (grilleTicket.bets[i].result == fixture.result.winner){
                          countWin += 1;
                          grilleTicket.bets[i].status = "win";
                        } else {
                          grilleTicket.bets[i].status = "loose";
                        }
                        //console.log("Resultat:",grilleTicket.bets[i].status, "pour le pari 1N2 de la grille", grilleTicket._id );
                      } else if (grilleTicket.bets[i].type === "BOTH_GOAL") {
                        var homeScore = (fixture.result.homeScore > 0) ? true : false;
                        var awayScore = (fixture.result.awayScore > 0) ? true : false;
                        var choice = grilleTicket.bets[i].result;
                        if (homeScore && awayScore && choice == 1){
                          countWin += 1;
                          grilleTicket.bets[i].status = "win";
                        } else if (!homeScore && awayScore && choice == 0 || homeScore && !awayScore && choice == 0){
                          countWin += 1;
                          grilleTicket.bets[i].status = "win";
                        } else if (!homeScore && !awayScore && choice == 0){
                          countWin += 1;
                          grilleTicket.bets[i].status = "win";
                        } else {
                          grilleTicket.bets[i].status = "loose";
                        }
                        //console.log("Resultat:",grilleTicket.bets[i].status, "pour le pari BOTH_GOAL de la grille", grilleTicket._id );
                      } else if (grilleTicket.bets[i].type === "FIRST_GOAL"){
                        if (fixture.result.homeScore == 0 && fixture.result.awayScore == 0){
                          if (grilleTicket.bets[i].result == 0){
                            countWin += 1;
                            grilleTicket.bets[i].status = "win";
                          } else {
                            grilleTicket.bets[i].status = "loose";
                          }
                        } else {
                          // Récupérer l'équipe qui a marqué en premier
                          var eventsFilter = fixture.events.filter(ev => ev.type == "goal" || ev.type == "penalty" || ev.type == "own-goal");
                          eventsFilter.sort(function(a, b){
                            return a.minute - b.minute;
                          });

                          // Vérifier si des évènements parsonnalisés existes
                          var customEventsFilter = fixture.events.filter(ev => ev.custom != null && ev.custom == true && ev.type != "ZaniBet");
                          //console.log("Custom Filter:", customEventsFilter.length);
                          if (customEventsFilter != null && customEventsFilter.length > 0 && fixture.result.homeScore > 0 && fixture.result.awayScore > 0){
                            // TODO : Considérer le pronostique comme gagnant car des evenements personnalisé existe
                            countWin += 1;
                            grilleTicket.bets[i].status = "win";
                          } else {
                            //console.log('Évènement filtrés et triés:', eventsFilter.length);
                            //console.log("Équipe ayant marqué en premier:", eventsFilter[0].team);
                            if (eventsFilter[0].team.equals(fixture.homeTeam) && grilleTicket.bets[i].result == 1){
                              countWin += 1;
                              grilleTicket.bets[i].status = "win";
                            } else if (eventsFilter[0].team.equals(fixture.awayTeam) && grilleTicket.bets[i].result == 2){
                              countWin += 1;
                              grilleTicket.bets[i].status = "win";
                            } else {
                              grilleTicket.bets[i].status = "loose";
                            }
                          }
                        }
                        //console.log("Resultat:", grilleTicket.bets[i].status, "pour le pari FIRST_GOAL de la grille", grilleTicket._id );
                      } else if (grilleTicket.bets[i].type === "LESS_MORE_GOAL"){
                        var totalScore = fixture.result.homeScore+fixture.result.awayScore;
                        var winner = 0;
                        if (totalScore > 2){
                          winner = 1;
                        } else {
                          winner = 0;
                        }

                        if (grilleTicket.bets[i].result == winner){
                          countWin += 1;
                          grilleTicket.bets[i].status = "win";
                        } else {
                          grilleTicket.bets[i].status = "loose";
                        }
                        //console.log("Resultat:",grilleTicket.bets[i].status, "pour le pari LESS_MORE_GOAL de la grille", grilleTicket._id );
                      }
                    }

                    //console.log('Nombre de pronostics:', grilleTicket.bets.length, '- Pronostics gagnants:', countWin);
                    if (countWin == grilleTicket.bets.length){
                      var bonus = 0;
                      if (gameticket.bonus != null && gameticket.bonus > 0){
                        bonus = gameticket.bonus;
                      }
                      grilleTicket.payout.point = (countWin*gameticket.pointsPerBet) + bonus;
                      grilleTicket.payout.amount = 0;
                      grilleTicket.payout.bonus = bonus;
                      grilleTicket.status = 'win';
                      grilleTicket.numberOfBetsWin = countWin;
                    } else {
                      grilleTicket.payout.point = countWin*gameticket.pointsPerBet;
                      grilleTicket.payout.amount = 0;
                      grilleTicket.payout.bonus = 0;
                      grilleTicket.status = 'loose';
                      grilleTicket.numberOfBetsWin = countWin;
                    }
                  } else {
                    //console.log("Le ticket ou le match sont annulés, donc récompenser toutes les grilles !", gameticket.status, fixture.status);
                    var bonus = 0;
                    if (gameticket.bonus != null && gameticket.bonus > 0){
                      bonus = parseInt(gameticket.bonus/2);
                    }

                    grilleTicket.payout.point = (grilleTicket.bets.length*parseInt(gameticket.pointsPerBet)) + bonus;
                    grilleTicket.payout.amount = 0;
                    grilleTicket.payout.bonus = bonus;
                    grilleTicket.status = 'free';
                    grilleTicket.numberOfBetsWin = grilleTicket.bets.length;
                  }
                  //return eachGrilleTicket("STOP");

                  // Mettre à jour la grille
                  updateGrille(db, grilleTicket).catch(function(err){
                    // Impossible de mettre la grille à jour
                    console.log(err);
                    return eachGrilleTicket();
                  }).then(function(grille){
                  //  console.log('Grille updated:', grille._id);
                    // Créditer l'utilisateur en zanicoins
                    return rewardUser(db, grille);
                  }).catch(function(err){
                    console.log(err);
                    mailer.sendWorkerAlert(app, "single_grille_worker", "Failled to reward user for grid : " + grilleTicket._id);
                    return eachGrilleTicket();
                  }).then(function(user){
                    // Vérifier si la grille est gagnante et si l'utilisateur possède un parrain à créditer
                    if (grilleTicket.status == "win"){
                      if (user.referral != null && user.referral.referrer != null && user.stats != null && user.stats.totalGridSimple != null){
                        if (user.stats.totalGridSimple < 50){
                          //console.log("L'utilisateur possède un referrer, mais n'a pas suffisament d'activités pour être considéré comme valide.");
                          return "PASS";
                        }
                        return rewardReferrer(db, user, grilleTicket, gameticket);
                      } else {
                        //console.log("L'utilisateur ne possède pas de referrer.");
                        //return eachGrilleTicket();
                        return "PASS";
                      }
                    } else {
                      return "PASS";
                    }
                  }).catch(function(err){
                    // Impossible de créditer le compte du referrer
                    console.log(err);
                    mailer.sendWorkerAlert(app, "single_grille_worker", err);
                  }).then(function(result){
                    //console.log(result);
                    return eachGrilleTicket();
                  });
                }, function(err){
                  if (err){
                    console.log("Erreur de traitement pour les grilles du ticket", gameticket._id ,err);
                    return eachGroupTicket();
                  } else {
                    return eachGroupTicket();
                  }
                });
              }
            });
          });
        }, function(err){
          if (err) return callback(err);
          return callback(null, "OK");
        });
      }
    ], function(err, result){
      if (err){
        return reject(err);
      } else {
        return resolve(result);
      }
    });
  });
};

var updateGrille = function(db, grille){
  return new Promise(function(resolve, reject){
    //return reject("grrr");
    var Grille = db.collection('grille');
    Grille.findOneAndUpdate({ _id: grille._id, status: 'waiting_result' }, { $set: {
      updatedAt: moment().utc().toDate(),
      "payout.amount": parseInt(grille.payout.amount),
      "payout.point": parseInt(grille.payout.point),
      "payout.status": grille.payout.status,
      "payout.bonus": parseInt(grille.payout.bonus),
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
    //console.log("Créditer", grille.payout.point, "ZaniCoins sur le compte de l'utilisateur", grille.user);
    User.findOneAndUpdate({ _id: grille.user },  { $set: { updatedAt: moment().utc().toDate() }, $inc: { "point": parseInt(grille.payout.point) } } , { returnOriginal: false}, function(err, user){
      if (err){
        console.log("Une erreur est survenu lors de la tentative de crédit des zanicoins de l'utilisateur :", grille.user);
        return reject(err);
      } else {
        return resolve(user.value);
      }
    });
  });
};

var rewardReferrer = function(db, user, grille, gameticket){
  return new Promise(function(resolve, reject){
    //return reject("Crash reward user");
    var User = db.collection('user');
    var Transaction = db.collection('transaction');
    // FIX BUG PAYOUT ZANICOIN 28/11
    //console.log("Créditer des ZaniCoins sur le compte du parrain", user.referral.referrer);
    async.waterfall([
      // Récupérer le parrain
      function(done){
        User.findOne({ _id: user.referral.referrer }, function(err, referrer){
          if (err){
            return done(err);
          } else if (referrer == null){
            return done("Le parrain n'existe pas");
          } else {
            return done(null, referrer);
          }
        });
      },

      // Créer une transaction
      function(referrer, done){
        var partCoins = Math.round(parseInt(grille.payout.point) * (parseInt(referrer.referral.coinRewardPercent)/100));
        //console.log("Création d'une transaction de parrainage :", partCoins, "ZC");
        Transaction.insertOne({ createdAt: moment().utc().toDate(),
          updatedAt: moment().utc().toDate(),
          type: "Referral-Coin",
          description: gameticket.name,
          source: grille._id,
          sourceKind: "Grille",
          sourceRef: user.username,
          destination: referrer._id,
          destinationKind: "User",
          amount: parseInt(partCoins),
          status: "initial"
        }, function(err, result){
          if (err){
            return done(err);
          } else {
            return done(null, referrer);
          }
        });
      },

      // Récupérer la transaction dernièrement créé et commencer à procéder à son traitement
      function(referrer, done){
        var _transaction;
        Transaction.findOne({ type: "Referral-Coin", source: grille._id, status: "initial" })
        .then(function(transaction){
          if (transaction == null) throw "La transaction n'existe pas";
          _transaction = transaction;
          //console.log(_transaction);
          return Transaction.updateOne({ _id: transaction._id, status: "initial" }, { $set: { status: "pending", updatedAt: moment().utc().toDate() } });
        }).then(function(result){
          if (result.modifiedCount == 1){
            // Créditer le parrain
            return User.updateOne({ _id: referrer._id, pendingTransactions: { $ne: _transaction._id } }, { $inc: { point: parseInt(_transaction.amount), "referral.totalCoin": parseInt(_transaction.amount), "referral.totalTransaction": 1 }, $push: { pendingTransactions: _transaction._id } });
          } else {
            throw "Impossible d'initier la transaction : " + _transaction._id;
          }
        }).then(function(result){
          if (result.modifiedCount == 1){
            // Le parrain a été crédité
            return done(null, _transaction);
          } else {
            return done("Impossible de créditer le compte du parrain : " + referrer._id);
          }
        }).catch(function(err){
          // Final catch
          return done(err);
        });
      },

      // Finaliser la transaction
      function(transaction, done){
        Transaction.updateOne({ _id: transaction._id, status: "pending" }, { $set: { updatedAt: moment().utc().toDate(), status: "applied" } }).then(function(result){
          if (result.modifiedCount == 1){
            // La transaction a été mise à jour
            return User.updateOne({ _id: transaction.destination }, { $pull: { pendingTransactions: transaction._id } });
          } else {
            throw "Impossible de finaliser la transaction :" + transaction._id;
          }
        }).then(function(result){
          if (result.modifiedCount == 1){
            // Les transactions en attente de l'utilisateur ont été mises à jour
            return Transaction.updateOne({ _id: transaction._id, status: "applied" }, { $set: { updatedAt: moment().utc().toDate(), status: "done" } });
          } else {
            throw "Impossible de mettre à jour les transactions du referrer :" + transaction.destination;
          }
        }).then(function(){
          return done(null);
        }).catch(function(err){
          return done(err);
        });
      }

    ], function(err, result){
      if (err){
        console.log("SINGLE GRILLE WORKER ERROR :", err);
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
  console.log("-----> Start single_grille_worker.js <-----");
  validateGrilleJob(db).then(function(res){
    console.log("-----> Single Grille Worker Job Done <-----");
    db.close();
  }, function(error){
    console.log('Error occur:', error)
    db.close();
  });
});
