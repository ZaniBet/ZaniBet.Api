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


router.get('/appodeal/validate', function(req, res){
  var data1 = req.query.data1;
  var data2 = req.query.data2;
  var encryptionKey = "Eo97386%U@^w";

  var keyBytes = crypto.createHash('sha256').update(encryptionKey, 'utf-8').digest();
  var ivBytes = Buffer.from(data1, "hex");
  var cipher = crypto.createDecipheriv('aes-256-cbc', keyBytes, ivBytes);
  var decrypted = cipher.update(data2, 'hex', 'utf8') + cipher.final('utf8');
  var queryString = require('querystring');
  var queryParams = queryString.parse(decrypted)

  //User ID set using Appodeal.getUserSettings(this).setUserId("User#123") method in your app
  var userId = queryParams["user_id"];
  //Reward amount
  var amount = queryParams["amount"];
  //Reward currency
  var currency = queryParams["currency"];
  //Unique impression ID in the UUID form
  var impressionId = queryParams["impression_id"];
  //Timestamp of the impression
  var timestamp = queryParams["timestamp"];
  //Hash of the data used for validity confirmation
  var hash = queryParams["hash"];

  //Hash of the data calculation
  var hashString = crypto.createHash('sha1').update(util.format("user_id=%s&amount=%s&currency=%s&impression_id=%s&timestamp=%s", userId, amount, currency, impressionId, timestamp)).digest('hex');
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
            if (user.referral != null && user.referral.referrer != null && grille != null){
              console.log("Reward referrer");
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
        User.findOne({ _id: userId, transaction: { $exists: true } },function(err, user){
          //console.log(user);
          if (user == null) return callback(null, "");
          if (err) return callback(null, err);
          User.update({ _id: user._id }, { $inc: { jeton: user.transaction.amount }, $unset: { transaction: "" }, $set: { lastJetonAds: moment().utc() } }, function(err, result){
            if (err) return callback(null, err);
            callback(null, result);
          });
        });
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
    console.log("INVALID VALIDATION HASH");
    return res.status(500).json("KO");
  }
});

/*router.get('/appodeal/test', function(req, res){
  var _user;

  User.findOne({ _id: "5ad1bf614ee1703fb6776732" }).exec().then(function(user){
    if (user == null){
      throw "L'utilisateur n'existe pas !";
    } else {
      _user = user;
      return Grille.findOne({ _id: "5ad1c4b942b4fb42875171c9" }).exec();
    }
  }).then(function(grille){
    if (grille == null){
      throw "La grille n'existe pas !";
    } else {
      return rewardReferrer(_user, grille);
    }
  }).then(function(result){
    return res.status(200).json(result);
  }).catch(function(err){
    return res.status(500).json(err);
  });

});*/


var rewardReferrer = function(user, grille){
  return new Promise(function(resolve, reject){
    console.log("Créditer des ZaniCoins sur le compte du parrain", user.referral.referrer);
    if (grille == null){
      console.log("La grille n'existe pas !");
      return reject("La grille n'existe pas !");
    } else if (user ==  null) {
      console.log("L'utilisateur n'existe pas !");
      return reject("L'utilisateur n'existe pas !");
    }

    async.waterfall([
      // Récupérer le parrain
      function(done){
        User.findOne({ _id: user.referral.referrer, role: "partner" }).exec(function(err, referrer){
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
        console.log("Création d'une transaction : Referral-Grid-Multi");
        Transaction.create({ createdAt: moment().utc().toDate(),
          updatedAt: moment().utc().toDate(),
          type: "Referral-Grid-Multi",
          description: gameticket.name,
          source: grille._id,
          sourceKind: "Grille",
          sourceRef: user.username,
          destination: referrer._id,
          destinationKind: "User",
          amount: referrer.referral.coinPerMultiTicketPlay,
          status: "initial"
        }, function(err, result){
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
            return User.updateOne({ _id: referrer._id, pendingTransactions: { $ne: _transaction._id } }, { $inc: { point: _transaction.amount, "referral.totalCoin": _transaction.amount, "referral.totalTransaction": 1, "referral.totalCoinMultiTicketPlay": _transaction.amount }, $push: { pendingTransactions: _transaction._id } }).exec();
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
