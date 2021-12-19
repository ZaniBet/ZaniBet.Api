var express = require('express');
var mongoose = require('mongoose');
var router = express.Router();
var passport = require('passport');
var moment = require('moment');
var requestify = require('requestify');
var mongojs = require('mongojs');
var async = require('async');

moment.locale('fr');

var Client = mongoose.model('Client');
var User = mongoose.model('User');
var Transaction = mongoose.model('Transaction');
var Grille = mongoose.model('Grille');

// Migrer les filleuls vers un nouveau code fidélité
/*router.put('/referrals/:old_referrer/:new_code', function(req, res){
  var oldReferrer = req.params.old_referrer;
  var newReferrer = req.params.new_referrer;

  if (oldReferrer == null || newReferrer == null){
    return res.status(500).json("KO");
  }
  // Vérifier si le referrer existe
  User.findOne({ _id: oldReferrer }).exec().then(function(user){
    if (user == null){
      return Primise.reject("Referrer not exist")
    }
  });
});*/

router.put('/referrals/banFackAccount', function(req, res){

  var referralId = req.body.referralId;
  console.log(referralId);
  async.waterfall([
    function(done){
      Transaction.distinct('sourceRef', { destination: mongoose.Types.ObjectId(referralId), sourceKind: 'Grille' }).exec().then(function(result){
        console.log("Potentital fake account :", result.length);
        //console.log(result);
        return User.find({ username: { $in: result }, emailVerified: false, "stats.totalGridMatchday": 0, createdAt: { $lt: moment().utc() }, "stats.totalGridSimple": { $lt : 51, $gt: 6 }, locale: "fr" }).exec();
      }).then(function(users){
        console.log("Fake account :", users.length);
        return done(null, users);
      }, function(err){
        return done(err);
      });
    },

    // Calculer le préjudice
    function(users, done){
      var usernameArr = users.map(user => user.username);
      console.log(usernameArr);
      Transaction.aggregate([
        { $match: { sourceKind: 'Grille', sourceRef: { $in: usernameArr } } },
        { $group: { _id: null, total: { $sum: "$amount" } } }
      ], function(err, result){
        if (err || result.length == 0){
          return done("stop");
        } else {
          console.log("PREJUDICE :", result[0].total);
          return done(null, users);
        }
      });
    },

    // Bannir les comptes
    function(users, done){
      User.updateMany({ _id: { $in: users.map(u => u._id) } }, { $set: { status: "banned"} }, function(err, result){
        if (err){
          return done(err);
        } else {
          console.log(result);
          return done(null, users);
        }
      });
    },

    // Supprimer les donnée
    function(users, done){
      Grille.deleteMany({ user: { $in: users.map(u => u._id) } }, function(err, result){
        if (err){
          return done(err);
        }
        console.log(result.result);
        Transaction.deleteMany({ sourceRef: { $in: users.map(u => u.username) } }, function(err, result){
          if (err){
            return done(err);
          }
          console.log(result.result);
          return done(null, result);
        });
      });
    }

  ], function(err, result){
    if (err){
      return res.status(500).json(err);
    } else {
      return res.status(200).json("OK");
    }
  });

});

module.exports = router;
