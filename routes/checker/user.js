var express = require('express');
var mongoose = require('mongoose');
var router = express.Router();
var passport = require('passport');
var moment = require('moment');
var validator = require('validator');
var CustomError = require('../../lib/customerror');
var utils  = require('../../lib/utils.js');
var config = require('../../config/global.js');
var FB = require('fb');
var mailer = require('../../lib/mailer');
var uniqid = require('uniqid');
//moment.locale('fr');
var async = require('async');
const chalk = require('chalk');
const chalkInit = chalk.green;
const chalkInfo = chalk.blue;
const chalkError = chalk.bold.red;
const chalkWarning = chalk.bold.yellow;

var User = mongoose.model('User');
var Grille = mongoose.model('Grille');
var Transaction = mongoose.model('Transaction');

var uniqueArray = function(arrArg) {
  return arrArg.filter(function(elem, pos,arr) {
    return arr.indexOf(elem) == pos;
  });
};

router.get('/users/email/doublon', function(req, res){

  User.aggregate([
    { $group: { _id: "$emailVerifyToken", total: { $sum: 1 } } },
    //{ $match: { emailVerifyToken: { $exists: true }, total: { $gt: 1 } } }
  ], function(err, result){
    if (err){
      return res.status(500).json(err);
    } else {
      console.log(result);
      return res.status(200).json("ok");
    }
  });

});

router.get('/users/:userId/multiaccount', function(req, res){

  var userId = req.params.userId;
  //var ticketId = req.query.ticketId;
  //console.log(userId);

  async.parallel({

    /*
    * Rechercher les utilisateurs ayant validés des grilles avec la même IP que
    * le compte en cours de vérification.
    */
    ipAnalysis: function(callback) {
      // Récupérer toutes les ips uniques de l'utilisateur lors de la validation d'une grille
      console.log(chalkInit("Récupérer la liste des adresses IPs appartenant à l'utilisateur analysé."))
      Grille.distinct('ip', { user: mongoose.Types.ObjectId(userId), ip: { $exists: true } }, function(err, ips){
        if (err){
          return callback(err);
        }
        console.log("Nombre d'adresses IP récupérées :", ips.length);
        console.log(chalkInit("Récupérer toutes les grilles jouées avec les adresses IPs et n'appartenant pas à l'utilisateur analysé."));
        // Récupéré les grilles validés avec les IPs de l'utilisateur analysé
        Grille.find({ ip: { $in: ips }, user: { $ne: mongoose.Types.ObjectId(userId) }, type: "MULTI" })
        .populate('user').exec(function(err, grilles){
          if (err){
            return callback(err);
          }
          console.log("Nombre de grilles ayant été jouées avec la même adresse IP, mais des comptes différents de l'utilisateur principale:", grilles.length);
          var usersArr = grilles.map(g => g.user);
          usersArr = usersArr.filter(function(item, pos, self) {
            return self.indexOf(item) == pos;
          });

          //usersArr = usersArr.map(ua =>  Object.create({ username: ua.username, email: ua.email, paypal: ua.paypal, stats: ua.stats, wallet: ua.wallet }));
          console.log(chalkInfo("Nombre de comptes liés aux adresses IPs :", usersArr.length));
          //usersArr.forEach(ua => console.log({ createdAt: ua.createdAt, updatedAt: ua.updatedAt, username: ua.username, email: ua.email, paypal: ua.paypal, stats: ua.stats, wallet: ua.wallet }));
          //usersArr.forEach(ua => console.log(ua["_id"], ua.username, ua.email, ua.paypal, ua.stats, ua.wallet));

          return callback(null, { grilles: grilles, users: usersArr, ips: ips });
        });
      });
    },

    /*
    * Rechercher les utilisateurs ayant validés des grilles avec les mêmes instances
    * que le compte en cours de vérification
    */
    instanceAnalysis: function(callback) {
      console.log(chalkInit("Récupérer la liste des instanceId appartenant à l'utilisateur analysé."))
      Grille.distinct('instanceId', { user: mongoose.Types.ObjectId(userId), instanceId: { $exists: true } }, function(err, instanceIds){
        if (err){
          return callback(err);
        }
        console.log("Nombre d'instanceId appartenant à l'utilisateur :", instanceIds.length);
        if (instanceIds == null){
          return callback("L'utilisateur ne possède aucune instanceId !");
        }

        // Récupérer les grilles jouées avec les instanceId de l'utilisateur analysé
        Grille.find({ instanceId: { $in: instanceIds, $exists: true, $ne: '' }, user: { $ne: mongoose.Types.ObjectId(userId) } })
        .populate("user").exec(function(err, grilles){
          if (err){
            return callback(err);
          }

          console.log("Nombre de grilles ayant été jouées avec le même instanceId, mais des comptes différents de l'utilisateur principale:", grilles.length);

          var usersArr = grilles.map(g => String(g.user));
          usersArr = usersArr.filter(function(item, pos, self) {
            return self.indexOf(item) == pos;
          });
          console.log(chalkInfo("Liste des comptes liés aux instanceId :", usersArr.length, usersArr));
          return callback(null, { grilles: grilles, users: usersArr, instanceIds: instanceIds });
        });
      });
    },


    paymentMethodAnalysis: function(callback){
      User.findOne({ _id: userId }, function(err, user){
        if (err){
          return callback(err);
        } else if (user == null || user.paypal == null){
          return callback("Unknow user");
        }

        console.log("Statistiques :", user.stats);
        console.log("Wallet :", user.wallet);
        User.find({ paypal: user.paypal }, function(err, users){
          if (err){
            return callback(err);
          }
          console.log("Nombre de paypal doublon :", users.length);
          console.log(user.paypal);
          console.log(users.map(u => u.email));
          return callback(null, users);
        });
      });
    },

    transactionAnalysis: function(callback){
      Transaction.find({ destinationKind: 'User', destination: userId, sourceKind: 'AdsNetwork' }).exec(function(err, transactions){
        if (err){
          return callback(err);
        }

        var amountJeton = 0;
        transactions.forEach(t => amountJeton += parseInt(t.amount));
        console.log(chalkInfo("Nombre de jetons acquis hors vidéos :", amountJeton, "- Montant :", amountJeton/250));
        return callback(null, amountJeton);
      });
    }

  }, function(err, result){
    if (err){
      return res.status(500).json(err);
    }
    return res.status(200).json(result);
  });

});

module.exports = router;
