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
var Grille = mongoose.model('Grille');
var AccessToken = mongoose.model('AccessToken');
var RefreshToken = mongoose.model('RefreshToken');
var Payout = mongoose.model('Payout');


router.get('/users', function(req, res){
  if (req.xhr || req.headers.accept.indexOf('json') > -1) {
    var drawQuery = parseInt(req.query.draw);
    var startQuery = parseInt(req.query.start);
    var lengthQuery = parseInt(req.query.length);
    var orderQuery = req.query.order;
    var columnsQuery = req.query.columns;

    console.log(orderQuery, columnsQuery[orderQuery[0].column]);

    var field = columnsQuery[orderQuery[0].column].name;
    var order = orderQuery[0].dir;


    async.parallel({
      userCount: function(callback){
        User.count(function(err, count){
          if (err) return callback(err);
          callback(null, count);
        });
      },
      users: function(callback){
        var ordering = {};
        ordering[field] = order,
        User.find().skip(startQuery).limit(lengthQuery).sort(ordering).then(function(users){
          callback(null, users);
        }, function(err){
          callback(err);
        });
      }
    }, function(err, result){
      if (err) return res.status(500).json(err);
      return res.status(200).json({ draw: drawQuery, data: result.users, recordsTotal: result.userCount, recordsFiltered: result.userCount });
    });
  } else {
    res.render('admin/users', { activePage: "users" });
  }
});

router.get('/users/:user_id', function(req, res){
  var userId = req.params.user_id;

  async.waterfall([
    function(next){
      User.findOne({ _id: userId }, function(err, user){
        if (err) return next(err);
        if (user == null) return next("L'utilisateur n'existe pas.");
        next(null, user);
      });
    },

    function(user, next){
      return next(null, user);
      async.parallel([

      ], function(err, results){

      });
    }
  ], function(err, user){
    if (err) return res.render('error', { message: err.message, error: err });
    return res.render('admin/users/details', { activePage: 'users', user: user });
  });
});

router.get('/users/:user_id/grilles', function(req, res){
  var userId = req.params.user_id;

  var drawQuery = parseInt(req.query.draw);
  var startQuery = parseInt(req.query.start);
  var lengthQuery = parseInt(req.query.length);

  async.parallel({
    grilleCount: function(callback){
      Grille.count({ user: userId }, function(err, count){
        if (err) return callback(err);
        callback(null, count);
      });
    },
    grilles: function(callback){
      Grille.find({ user: userId }).skip(startQuery).limit(lengthQuery)
      .populate('bets.fixture')
      .populate({
        path: "gameTicket",
        populate: {
          path: "fixtures",
          populate: {
            path: "homeTeam awayTeam events.team"
          }
        }
      }).sort({ createdAt: -1 }).then(function(grilles){
        callback(null, grilles);
      }, function(err){
        callback(err);
      });
    }
  }, function(err, result){
    console.log(err);
    if (err) return res.status(500).json(err);
    return res.status(200).json({ draw: drawQuery, data: result.grilles, recordsTotal: result.grilleCount, recordsFiltered: result.grilleCount});
  });
});

router.get('/users/:user_id/payouts', function(req, res){
  var userId = req.params.user_id;

  var drawQuery = parseInt(req.query.draw);
  var startQuery = parseInt(req.query.start);
  var lengthQuery = parseInt(req.query.length);

  async.parallel({
    payoutCount: function(callback){
      Payout.count({ user: userId }, function(err, count){
        if (err) return callback(err);
        callback(null, count);
      });
    },
    payputs: function(callback){
      Payout.find({ user: user_id }).skip(startQuery).limit(lengthQuery).then(function(payouts){
        callback(null, payouts);
      }, function(err){
        callback(err);
      });
    }
  }, function(err, result){
    if (err) return res.status(500).json(err);
    return res.status(200).json({ draw: drawQuery, data: result.payouts, recordsTotal: result.payoutCount, recordsFiltered: result.payouts.length });
  });
});


router.post('/user', function(req, res){
  var user = new User();
  user.username = 'Devolios';
  user.email = 'gromatl@devolios.eu';

  User.register(user, 'demotest', function(err){
    if (err) {
      console.log(err);
      return res.status(500).json(err.message);
    } else {
      return res.status(200).json(user);
    }
  });
});

router.post('/users/fixJeton', function(req, res){
  User.updateMany({ $or: [ { jeton: { $exists: false } }, { jeton: { $lt: 6 } } ] }, { $set: { jeton: 6, lastFreeJeton: moment().utc() } }, function(err, result){
    if (err) return res.status(500).json(err);
    console.log(result);
    return res.status(200).json(result);
  });
});

router.put('/users/:userId/referrer', function(req, res){
  var userId = req.params.userId;
  var referrerId = req.body.referrerId;

  async.waterfall([
    // Trouver l'utilisateur
    function(done){
      User.findOne({ _id: userId }).exec(function(err, user){
        if (err){
          return done(err);
        } else if (user == null){
          return done("User not exists");
        } else {
          return done(null, user);
        }
      });
    },

    // Trouver le parrain
    function(user, done){
      User.findOne({ _id: referrerId }).exec(function(err, referrer){
        if (err){
          return done(err);
        } else if (referrer == null){
          return done("referrer not exists");
        } else {
          return done(null, referrer, user);
        }
      });
    },

    // Mettre à jour le referrer de l'user
    function(referrer, user, done){
      User.update({ _id: user._id }, { $set: { "referral.referrer": referrer._id }, $inc: { point: referrer.referral.invitationBonus } }).exec(function(err, result){
        if (err){
          return done(err);
        }

        if (result.nModified == 0){
          console.log("Échec de la mise à jour de l'utilisateur");
        }
        return done(null, referrer);
      });
    },

    // Mettre à jour les stats du parrain
    function(referrer, done){
      User.update({ _id: referrer._id }, { $inc: { "referral.totalReferred": 1 } }).exec(function(err, result){
        if (err){
          return done(err);
        }

        if (result.nModified == 0){
          console.log("Échec de la mise à jour du parrain");
        }
        return done(null, referrer);
      });
    }
  ], function(err, result){
    if (err){
      return res.status(500).json(err);
    }

    return res.status(200).json(result);
  });
});

router.put('/users/:user_id/ban', function(req, res){

  var userId = req.params.user_id;

  async.waterfall([

    // Récupérer l'utilisateur
    function(done){
      User.findOne({ _id: userId }, function(err, user){
        if (err){
          return done(err);
        } else if (user == null){
          return done("L'utilisateur n'existe pas");
        }
        return done(null, user);
      });
    },

    // Supprimer tous les jetons
    function(user, done){
      AccessToken.deleteMany({ userId: user._id })
      .exec()
      .then(function(result){
        console.log("Suppression AccestToken", result.result);
        return RefreshToken.deleteMany({ userId: user._id }).exec();
      }).then(function(result){
        console.log("Suppression RefreshToken", result.result);
        return done(null, user);
      }, function(err){
        return done(err);
      });
    },

    // Désactiver le compte de l'utilisateur
    function(user, done){
      User.findOneAndUpdate({ _id: user._id }, { $set: { status: "banned" } }, { new: true }, function(err, result){
        if (err){
          return done(err);
        }
        console.log("Mise à jour du status de l'utilisateur :", result.status);
        return done(null, user);
      });
    },

    // Annuler les paiements en attente
    function(user, done){
      Payout.updateMany({ $or: [ { status: "waiting_paiement" }, { status : "verification" } ], user: user._id }, { $set: { status: "fraud" } }, function(err, result){
        if (err){
          return done(err);
        }
        console.log("Mise à jour des demandes de paiement :", result);
        return done(null, "OK");
      });
    },

    // Supprimer les grilles
    /*function(user, done){
      return done(null, "OK");
      Grille.deleteMany({ user: user._id }, function(err, result){
        if (err){
          return done(err);
        }
        console.log("Suppression des grilles :", result.result);
        return done(null, "OK");
      });
    }*/

  ], function(err, result){
    if (err){
      return res.status(500).json(err);
    }
    return res.status(200).json(result);
  });

});

module.exports = router;
