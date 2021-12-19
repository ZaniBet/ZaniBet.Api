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

    async.waterfall([
      // Récupérer les grilles en attente de validation
      function(callback){

        /*Grille.aggregate([
          { $match: { status: "waiting_result", type: "TOURNAMENT" } },
          { $lookup: {
            from: "user",
            localField: "user",
            foreignField: "_id",
            user: "user"
          },
          { $unwind: "$user" }
        }
      ], function(err, grilles){
        if (err){
          return callback(err);
        } else {
          console.log("Nombre de grille en attente de validation :", grilles.length);
          console.log(grilles[0]);
          if (grilles == null || grilles.length == 0) return callback("Aucune grille en attente de résultat");
          return callback(null, grilles);
        }
      });*/

      Grille.find({ status: "waiting_result", type: "TOURNAMENT" }).toArray(function(err, grilles){
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
      // Lancer une itération pour traîter chaque groupe de grille appartenant à un ticket
      async.eachLimit(groupTickets, 1, function(groupTicket, eachGroupTicket){
        var _pendingGrids = [];

        // Récupérer les informations concernant le ticket du groupe
        //console.log("Tournoi en cours de traitement:", groupTicket[0].gameTicket);
        GameTicket.findOne({ _id: groupTicket[0].gameTicket, type: 'TOURNAMENT' }, function(err, gameticket){
          //console.log(gameticket);
          if (err) return eachGroupTicket(); // impssible de trouver le ticket de ce groupe de grille
          if (gameticket == null) return eachGroupTicket(); // Le ticket n'existe pas
          if (gameticket.status != "ended") return eachGroupTicket(); // le ticket n'est pas encore fini

          //console.log("Traîtement du groupe de grilles pour le ticket :", gameticket.name, "Journée", gameticket.matchDay);
          // Récupérer les résultats du ticket
          Fixture.find({ _id: { $in: gameticket.fixtures } }).toArray(function(err, fixtures){
            // Lancer une itération pour récupérer chaque grille appartenant au groupe du ticket
            _pendingGrids = [];
            //console.log("Lancement de la comparaisons des pronostics jouées pour chaque grille par rapport au résultat des matchs.");
            // Traiter chaque grille du ticket de jeu
            async.eachLimit(groupTicket, 1, function(grilleTicket, eachGrilleTicket){
              var countWin = 0;
              var countCanceled = 0;
              var points = 0;
              //console.log("Traîtement de la grille :", grilleTicket._id);

              // Parcourir chaque pronostic jouée de la grille en cours
              for (var i = 0; i < grilleTicket.bets.length; i++){
                // Parcourir chaque match pour trouver celui correspondant au pronostic
                for (var z = 0; z < fixtures.length; z++){
                  // Vérifier si le match est bien terminé
                  if (fixtures[z].status != "done" && fixtures[z].status != "canceled" && fixtures[z].status != "postphoned"){
                    //mailer.sendWorkerAlert(app, "grille_worker", "Un match contenu dans une grille jouée pour un ticket terminée, n'est pas terminé ! ID Grille : " + grilleTicket._id);
                    return eachGrilleTicket();
                  }

                  // Vérifier si le pronostic I est pour le match Z
                  if (String(grilleTicket.bets[i].fixture) === String(fixtures[z]._id)){
                    // Vérifier si le paris est gagnant
                    if (grilleTicket.bets[i].result == fixtures[z].result.winner){
                      countWin += 1;
                      points += parseInt(fixtures[z].zScore);
                      grilleTicket.bets[i].status = "win";
                    } else if(fixtures[z].status == "canceled" || fixtures[z].status == "postphoned"){
                      // Le match de la grille est annulée ou reporté, considérer le résultat comme gagnant
                      countWin += 1;
                      countCanceled += 1;
                      points += parseInt(fixtures[z].zScore);
                      grilleTicket.bets[i].status = "canceled";
                    } else {
                      grilleTicket.bets[i].status = "loose";
                    }
                  }
                }
              }

              console.log('Nombre de pronostics:', grilleTicket.bets.length, '- Pronostics gagnants:', countWin, '- Points:', points);
              grilleTicket.payout.point = -1;
              grilleTicket.status = 'pending_standing';
              grilleTicket.numberOfBetsWin = parseInt(countWin);
              grilleTicket.standing.rank = -1;
              grilleTicket.standing.points = parseInt(points);
              //grilleTicket.standing.paid = false;
              _pendingGrids.push(grilleTicket);

              // Mettre à jour le status de la grille
              updateGrille(db, grilleTicket).then(function(grille){
                //console.log('Grille updated:', grille._id);
                return eachGrilleTicket();
              }, function(err){
                mailer.sendWorkerAlert(app, "grille_worker", err);
                return eachGrilleTicket(err);
              });

            }, function(err){
              if (err){
                console.log("Erreur de traitement pour les grilles du ticket", gameticket._id ,err);
                return eachGroupTicket();
              }

              // Création du classement du tournoi
              async.sortBy(_pendingGrids, function(sortedGrid, onSort){
                return onSort(null, sortedGrid.standing.points*-1);
              }, function(err, results){
                if(err){
                  console.log("[ERROR]: Impossible de trier les grilles du tournoi pour créer un classement !");
                  return eachGroupTicket();
                } else {
                  //console.log(results[0].standing.points);
                  var count = 0;
                  var potDiv = (gameticket.tournament.pot/gameticket.tournament.totalPlayersPaid).toFixed(0);
                  //console.log(potDiv);
                  async.eachLimit(results, 1, function(grid, eachGrid){
                    //console.log("eachgrid");
                    if (count < gameticket.tournament.totalPlayersPaid){
                      count++;
                      grid.payout.point = parseInt(potDiv);
                      grid.status = "win";
                      grid.standing.rank = parseInt(count);
                      updateGrilleStanding(db, grid).then(function(grille){
                        //console.log("Mise à jour de la rémunation d'une grille gagnante pour un tournoi.");
                        return rewardUser(db, grille, gameticket);
                      }).then(function(user){
                        //console.log(potDiv, "ont été crédités sur le compte de l'utilisateur.");
                        if (user.locale == null || user.locale == ""){
                          GCM.sendSingleMessage([user.fcmToken], "ZaniBet", "You are part of the winners of the tournament" + gameticket.name + "! Check your ranking now!");
                        } else if (user.locale == "pt"){
                          GCM.sendSingleMessage([user.fcmToken], "ZaniBet", "Você faz parte dos vencedores do torneio" + gameticket.name + "! Verifique o seu ranking agora!");
                        } else if (user.locale == "fr"){
                          GCM.sendSingleMessage([user.fcmToken], "ZaniBet", "Vous faites parti des gagnants du tournoi " + gameticket.name + "! Consultez votre classement dès maintenant!");
                        } else {
                          GCM.sendSingleMessage([user.fcmToken], "ZaniBet", "You are part of the winners of the tournament" + gameticket.name + "! Check your ranking now!");
                        }
                        return eachGrid();
                      }, function(err){
                        console.log("[ERROR]:", err);
                        return eachGrid();
                      });
                    } else {
                      count++;
                      grid.payout.point = 0;
                      grid.status = "loose";
                      //grid.standing.id = grid.user.usermane;
                      grid.standing.rank = parseInt(count);
                      //grid.standing.paid = false;
                      updateGrilleStanding(db, grid).then(function(grille){
                        //console.log("Mise à jour d'une grille perdante.");
                        return eachGrid();
                      }, function(err){
                        console.log("[ERROR]:", err);
                        return eachGrid();
                      });
                    }
                  }, function(err){
                    if (err){
                      console.log("[ERROR]:", err);
                      return eachGroupTicket();
                    } else {
                      return eachGroupTicket();
                    }
                  }); //
                }
              }); //

            }); //

          }); //

        }); //
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
    var Grille = db.collection('grille');
    Grille.findOneAndUpdate({ _id: grille._id, status: 'waiting_result' }, { $set: {
      updatedAt: moment().utc().toDate(),
      "payout.point": parseInt(grille.payout.point),
      status: grille.status,
      numberOfBetsWin: parseInt(grille.numberOfBetsWin),
      bets: grille.bets,
      "standing.points": parseInt(grille.standing.points),
      "standing.rank": parseInt(grille.standing.rank),
    } }, { returnOriginal: false }, function(err, grille){
      if (err) return reject(err);
      if (grille == null) return reject("Tentative de mise à jour d'une grille qui n'existe pas !");
      return resolve(grille.value);
    });
  });
};

var updateGrilleStanding = function(db, grille){
  return new Promise(function(resolve, reject){
    var Grille = db.collection('grille');
    Grille.findOneAndUpdate({ _id: grille._id, status: 'pending_standing' }, { $set: {
      updatedAt: moment().utc().toDate(),
      "payout.point": parseInt(grille.payout.point),
      status: grille.status,
      "standing.points": parseInt(grille.standing.points),
      "standing.rank": parseInt(grille.standing.rank),
    } }, { returnOriginal: false }, function(err, grille){
      if (err) return reject(err);
      if (grille == null) return reject("Tentative de mise à jour d'une grille qui n'existe pas !");
      return resolve(grille.value);
    });
  });
};

// Two phase
var rewardUser = function(db, grille, gameticket){
  return new Promise(function(resolve, reject){
    //return reject("Crash reward user");
    var User = db.collection('user');
    var Transaction = db.collection('transaction');

    var _currentUser = null;

    async.waterfall([
      // Récupérer l'utilisateur
      function(done){
        User.findOne({ _id: grille.user }, function(err, user){
          if (err){
            return done(err);
          } else if (user == null){
            return done("L'utilisateur n'existe pas !");
          } else {
            _currentUser = user;
            return done(null, user);
          }
        });
      },

      // Créer une transaction
      function(user, done){
        console.log("Création d'une transaction pour les gains du tournoi :", grille.payout.point, "ZC/ZH");
        Transaction.insertOne({ createdAt: moment().utc().toDate(),
          updatedAt: moment().utc().toDate(),
          type: "Tournament",
          description: gameticket.name,
          source: grille._id,
          sourceKind: "Grille",
          destination: user._id,
          destinationKind: "User",
          amount: parseInt(grille.payout.point),
          currency: gameticket.tournament.rewardType,
          status: "initial"
        }, function(err, result){
          if (err){
            return done(err);
          } else {
            return done(null, user);
          }
        });
      },

      // Récupérer la transaction dernièrement créé et commencer à procéder à son traitement
      function(user, done){
        var _transaction;
        Transaction.findOne({ type: "Tournament", source: grille._id, status: "initial" })
        .then(function(transaction){
          if (transaction == null) throw "La transaction n'existe pas";
          _transaction = transaction;
          //console.log(_transaction);
          return Transaction.updateOne({ _id: transaction._id, status: "initial" }, { $set: { status: "pending", updatedAt: moment().utc().toDate() } });
        }).then(function(result){
          if (result.modifiedCount == 1){
            // Créditer l'utilisateur
            if (_transaction.currency == "ZaniCoin"){
              return User.updateOne({ _id: user._id, pendingTransactions: { $ne: _transaction._id } }, { $inc: { point: parseInt(_transaction.amount) }, $push: { pendingTransactions: _transaction._id } });
            } else if (_transaction.currency == "ZaniHash"){
              return User.updateOne({ _id: user._id, pendingTransactions: { $ne: _transaction._id } }, { $inc: { "wallet.zaniHash": parseInt(_transaction.amount), "wallet.totalZaniHash": parseInt(_transaction.amount) }, $push: { pendingTransactions: _transaction._id } });
            } else {
              throw "Impossible de créditer un utilisateur à cause d'une devise inconnue ! Transaction : " + _transaction._id;
            }
          } else {
            throw "Impossible d'initier une transaction : " + _transaction._id;
          }
        }).then(function(result){
          if (result.modifiedCount == 1){
            // L'utilisateur a été crédité
            return done(null, _transaction);
          } else {
            return done("Impossible de créditer le compte de l'utilisateur : " + user._id);
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
            throw "Impossible de mettre à jour les transactions de l'utilisateur :" + transaction.destination;
          }
        }).then(function(){
          return done(null);
        }).catch(function(err){
          return done(err);
        });
      }

    ], function(err, result){
      if (err){
        console.log("TOURNAMENT GRILLE WORKER ERROR :", err);
        return reject(err);
      } else {
        return resolve(_currentUser);
      }
    });
  });
};

// Use connect method to connect to the server
MongoClient.connect(process.env.DB_URI, function(err, db) {
  console.log("Connected successfully to server");
  console.log("-----> Start tournament_grille_worker.js <-----");
  validateGrilleJob(db).then(function(res){
    console.log("-----> Tournament Grille Worker Job Done <-----");
    db.close();
  }, function(error){
    console.log('Error occur:', error)
    db.close();
  });
});
