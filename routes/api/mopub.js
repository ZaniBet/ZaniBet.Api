var express = require('express');
var mongoose = require('mongoose');
var router = express.Router();
var passport = require('passport');
var moment = require('moment');
var requestify = require('requestify');
var mongojs = require('mongojs');
var async = require('async');
var crypto = require('crypto');
var util = require('util');
var uniqid = require('uniqid');

var Client = mongoose.model('Client');
var Competition = mongoose.model('Competition');
var Team = mongoose.model('Team');
var Fixture = mongoose.model('Fixture');
var GameTicket = mongoose.model('GameTicket');
var Grille = mongoose.model('Grille');
var User = mongoose.model('User');
var Transaction = mongoose.model('Transaction');


/* https://api.zanibet.com/mopub/validate?
customer_id=%%CUSTOMER_ID%%
&id=%%ID%%
&hash=%%VERIFIER%%
*/
router.get('/mopub/validate', function(req, res){

  var secretKey = "867de5b4551a4522854698c0e234d5fa";
  var userId = req.query.customer_id;
  var impressionId = req.query.id;
  var hash = req.query.hash;

  var concatedQuery = userId + impressionId;
  //console.log("concatedQuery =", concatedQuery);
  var hashString = crypto.createHmac("sha256", secretKey).update(concatedQuery).digest("hex");
  //console.log("hashString =", hashString);
  //console.log("verifier =", hash);

  //If hashes match impression is valid
  if (hash.toUpperCase() === hashString.toUpperCase()) {
    async.parallel([
      // Valider la dernière grille créé par l'utilisateur
      function(callback){
        Grille.findOneAndUpdate({ user: userId, status: 'waiting_validation' }, { $set: { status: 'waiting_result', impressionId: impressionId } }, { sort: { createdAt: -1 }, new: true }, function(err, grille){
          if (err) return callback(null, err);
          // Mise à jour des statistiques du joueur
          User.findOneAndUpdate({ _id: userId }, { $inc: { "stats.totalGridMatchday": 1 } }, { new: true }, function(err, user){
            // Vérifier si le joueur possède un parrain devant être crédité
            //console.log(user.username, " - referral :", user.referral);
            if (user == null){
              return callback(null, "Empty user");
            }
            if (user.referral != null && user.referral.referrer != null && grille != null){
              //console.log("Reward referrer");
              rewardReferrer(user, grille).then(function(result){
                return callback(null, "OK");
              }).catch(function(err){
                console.log("Une erreur c'est produite lors de la rémunération du parrain", err);
                return callback(null, err);
              });
            } else {
              if (err) return callback(null, err);
              callback(null);
            }
          });
        });
      },

      // Vérifier si des jetons sont attentes de crédit
      function(callback){
        return callback(null);
        /*User.findOne({ _id: userId, transaction: { $exists: true } },function(err, user){
          //console.log(user);
          if (user == null) return callback(null, "");
          if (err) return callback(null, err);
          User.update({ _id: user._id }, { $inc: { jeton: user.transaction.amount }, $unset: { transaction: "" }, $set: { lastJetonAds: moment().utc() } }, function(err, result){
            if (err) return callback(null, err);
            callback(null, result);
          });
        });*/
      }

    ], function(err, results){
      if (err){
        console.log(err);
        return res.status(500).json("KO");
      } else {
        return res.status(200).json("OK");
      }
    });
  } else {
    console.log("MoPub Error : Unable to verify transaction !");
    return res.status(500).json("KO");
  }
});

router.get('/mopub/chips', function(req, res){
  var secretKey = "867de5b4551a4522854698c0e234d5fa";
  var userId = req.query.customer_id;
  var impressionId = req.query.id;
  var hash = req.query.hash;

  var concatedQuery = userId + impressionId;
  //console.log("concatedQuery =", concatedQuery);
  var hashString = crypto.createHmac("sha256", secretKey).update(concatedQuery).digest("hex");
  //console.log("hashString =", hashString);
  //console.log("verifier =", hash);

  var waterfallStage = -1;

  //If hashes match impression is valid
  if (hash.toUpperCase() === hashString.toUpperCase()) {
    /*async.waterfall([

      // Récupérer l'utilisateur devant être crédité
      function(done){
        User.findOne({ _id: userId }).exec(function(err, user){
          if (err){
            return done(err);
          } else if (user == null){
            return done("L'utilisateur n'existe pas !");
          } else {
            waterfallStage = 0;
            return done(null, user);
          }
        });
      },

      // Vérifier qu'une transaction n'a pas déjà été créé pour la référence
      function(user, done){
        Transaction.findOne({ type: "Jeton", sourceKind: "AdsNetwork", source: "MoPub", sourceRef: impressionId }).exec(function(err, transaction){
          if (err){
            return done(err);
          } else if (transaction != null){
            return done("Une transaction a déjà été initiée pour créditer des jetons !");
          } else {
            waterfallStage = 1;
            return done(null, user);
          }
        });
      },

      // Créer une transaction
      function(user, done){
        Transaction.create({
          type: "Jeton",
          destinationKind: "User",
          destination: user._id,
          sourceKind: "AdsNetwork",
          source: "MoPub",
          sourceRef: impressionId,
          amount: parseInt(process.env.JETON_PAYOUT),
          status: "initial"
        }, function(err, transaction){
          if (err){
            return done(err);
          } else if (transaction == null){
            return done("La création de la transaction inital a échoué !");
          } else {
            waterfallStage = 2;
            return done(null, user, transaction);
          }
        });
      },

      // Initier la transaction
      function(user, transaction, done){
        Transaction.updateOne({ _id: transaction._id, status: "initial" }, { $set: { status: "pending", updatedAt: moment().utc().toDate() } })
        .exec(function(err, result){
          if (err){
            return done(err);
          } else {
            if (result.nModified == 1){
              waterfallStage = 3;
              return done(null, user, transaction);
            } else {
              return done("Échec lors de l'intiatilisation de la transaction !");
            }
          }
        });
      },

      // Créditer l'utilisateur
      function(user, transaction, done){
        User.updateOne({ _id: user._id, pendingTransactions: { $ne: transaction._id } }, { $inc: { jeton: parseInt(transaction.amount) }, $push: { pendingTransactions: transaction._id }, $set: { lastJetonAds: moment().utc() } }).exec(function(err, result){
          if (err){
            return done(err);
          } else {
            if (result.nModified == 1){
              waterfallStage = 4;
            } else {
              return done("Échec lors de la tentative de crédit du compte de l'utilisateur !");
            }
          }
        });
      },

      // Indiquer si la transaction a pu être effectué
      function(user, transaction, done){
        Transaction.updateOne({ _id: transaction._id, status: "pending" }, { $set: { updatedAt: moment().utc().toDate(), status: "applied" } }).exec(function(err, result){
          if (err){
            return done(err);
          } else {
            if (result.nModified == 1){
              waterfallStage = 5;
              return done(null, user, transaction);
            } else {
              return done("Impossible d'indiquer si la transaction a été appliquée.");
            }
          }
        });
      },

      // Mettre à jour les transactions de l'utilisateur
      function(user, transaction, done){
        User.updateOne({ _id: user._id }, { $pull: { pendingTransactions: transaction._id } }).exec(function(err, result){
          if (err){
            return done(err);
          } else {
            if (result.nModified == 1){
              waterfallStage = 6;
              return done(null, user, transaction);
            } else {
              return done("Échec du retrait de la transaction dans l'historique de l'utilisateur !");
            }
          }
        });
      },

      // Finaliser la transaction
      function(user, transaction, done){
        Transaction.updateOne({ _id: transaction._id, status: "applied" }, { $set: { updatedAt: moment().utc().toDate(), status: "done" } }).exec(function(err, result){
          if (err){
            return done(err);
          } else {
            if (result.nModified == 1){
              waterfallStage = 7;
              return done(null, "OK");
            } else {
              return done("Impossible de finaliser la transaction !");
            }
          }
        });
      },

    ], function(err, result){
      if (err){
        console.log("MoPub Error :", err, "- Stage :", waterfallStage);
      }
      return res.status(200).json("OK");
    });*/

    User.findOne({ _id: userId },function(err, user){
      //console.log(user);
      if (user == null) return res.status(500).json("KO");
      if (err) return res.status(500).json("KO");
      User.update({ _id: user._id }, { $inc: { jeton: parseInt(process.env.JETON_PAYOUT) }, $unset: { transaction: "" }, $set: { lastJetonAds: moment().utc() } }, function(err, result){
        if (err) return res.status(500).json("KO");
        return res.status(200).json("OK");
      });
    });
  } else {
    console.log("MoPub Error : Unable to verify transaction !");
    return res.status(500).json("OK");
  }
});

// Rémunérer l'utilisateur pour une grille payé
var rewardReferrer = function(user, grille){
  return new Promise(function(resolve, reject){
    //console.log("Créditer des ZaniCoins sur le compte du parrain", user.referral.referrer);
    if (grille == null){
      //console.log("La grille n'existe pas !");
      return reject("La grille n'existe pas !");
    } else if (user ==  null) {
      //console.log("L'utilisateur n'existe pas !");
      return reject("L'utilisateur n'existe pas !");
    }

    async.waterfall([
      // Récupérer le parrain
      function(done){
        User.findOne({ _id: user.referral.referrer, "referral.coinPerMultiTicketPlay": { $gt: 0 } }).exec(function(err, referrer){
          if (err){
            return done(err);
          } else if (referrer == null){
            return done("Le parrain n'existe pas ou ne possède pas le bon rôle.");
          } else {
            return done(null, referrer);
          }
        });
      },

      // Récupérer le ticket de la grille
      function(referrer, done){
        GameTicket.findOne({ _id: grille.gameTicket }).exec(function(err, gameticket){
          if (err){
            return done(err);
          } else if (gameticket == null){
            return done("Le ticket validé par l'utilisateur est introuvable.");
          } else {
            return done(null, referrer, gameticket);
          }
        });
      },

      // Vérifier que le parrain n'a pas encore été rémunéré pour la grille validée
      function(referrer, gameticket, done){
        Transaction.findOne({ type: "Referral-Grid-Multi", source: grille._id }).exec(function(err, transaction){
          if (transaction != null){
            return done("Une transaction a déjà été initiée pour créditer le parrain !");
          } else {
            return done(null, referrer, gameticket);
          }
        });
      },

      // Créer une transaction
      function(referrer, gameticket, done){
        //console.log("Création d'une transaction : Referral-Grid-Multi");
        Transaction.create({ createdAt: moment().utc().toDate(),
          updatedAt: moment().utc().toDate(),
          type: "Referral-Grid-Multi",
          description: gameticket.name,
          source: grille._id,
          sourceKind: "Grille",
          sourceRef: user.username,
          destination: referrer._id,
          destinationKind: "User",
          amount: parseInt(referrer.referral.coinPerMultiTicketPlay),
          status: "initial"
        }, function(err, transaction){
          if (err){
            return done(err);
          } else {
            return done(null, referrer);
          }
        });
      },

      // Récupérer la transaction dernièrement créé pour la grille et commencer à procéder à son traitement
      function(referrer, done){
        var _transaction;
        Transaction.findOne({ type: "Referral-Grid-Multi", source: grille._id, status: "initial" }).exec()
        .then(function(transaction){
          if (transaction == null) throw "La transaction n'existe pas";
          _transaction = transaction;
          //console.log(_transaction);
          return Transaction.updateOne({ _id: transaction._id, status: "initial" }, { $set: { status: "pending", updatedAt: moment().utc().toDate() } }).exec();
        }).then(function(result){
          if (result.nModified == 1){
            // Créditer le parrain
            return User.updateOne({ _id: referrer._id, pendingTransactions: { $ne: _transaction._id } }, { $inc: { point: parseInt(_transaction.amount), "referral.totalCoin": parseInt(_transaction.amount), "referral.totalTransaction": 1, "referral.totalCoinMultiTicketPlay": parseInt(_transaction.amount) }, $push: { pendingTransactions: _transaction._id } }).exec();
          } else {
            throw "Impossible d'initier la transaction : " + _transaction._id;
          }
        }).then(function(result){
          if (result.nModified == 1){
            // Le parrain a été crédité
            return done(null, _transaction);
          } else {
            throw "Impossible de créditer le compte du parrain : " + referrer._id;
          }
        }).catch(function(err){
          return done(err);
        });
      },

      // Finaliser la transaction
      function(transaction, done){
        Transaction.updateOne({ _id: transaction._id, status: "pending" }, { $set: { updatedAt: moment().utc().toDate(), status: "applied" } }).exec()
        .then(function(result){
          if (result.nModified == 1){
            // La transaction a été mise à jour
            return User.updateOne({ _id: transaction.destination }, { $pull: { pendingTransactions: transaction._id } }).exec();
          } else {
            throw "Impossible de finaliser la transaction :" + transaction._id;
          }
        }).then(function(result){
          if (result.nModified == 1){
            // Les transactions en attente de l'utilisateur ont été mises à jour
            return Transaction.updateOne({ _id: transaction._id, status: "applied" }, { $set: { updatedAt: moment().utc().toDate(), status: "done" } }).exec();
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
        //console.log(err);
        return reject(err);
      } else {
        return resolve(result);
      }
    });
  });
};

module.exports = router;
