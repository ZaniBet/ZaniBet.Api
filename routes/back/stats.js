var express = require('express');
var mongoose = require('mongoose');
var router = express.Router();
var passport = require('passport');
var moment = require('moment');
var requestify = require('requestify');
var mongojs = require('mongojs');
var async = require('async');
var FootballDataApi = require('../../fetcher/footballdata');
var SportMonks = require('../../fetcher/sportmonks');
var json2csv = require('json2csv');
var fs = require('fs');
var path = require('path');
var ObjectId = mongoose.Types.ObjectId;

moment.locale('fr');

var Competition = mongoose.model('Competition');
var Team = mongoose.model('Team');
var User = mongoose.model('User');
var Grille = mongoose.model('Grille');
var GameTicket = mongoose.model('GameTicket');
var Payout = mongoose.model('Payout');
var Transaction = mongoose.model('Transaction');

router.get('/stats', function(req, res){
  var folderName = "stats/" + moment('2018-01-01').format("MMM") + "_" + moment('2018-01-01').year();
  if (!fs.existsSync(folderName)) {
    console.log('create foldr');
    console.log(path.resolve(__dirname, '../../'));

    var pathname = path.resolve(__dirname, '../../') + "/" + folderName;
    console.log(pathname);
    fs.mkdirSync(pathname);
    //console.log(folderName);

  }

  var startDate = moment().utc().subtract(30, 'days');
  var endDate = moment().utc();
  //console.log(endDate.endOf('month').toDate());
  async.parallel({

    totalUsers: function(done){
      User.count(function(err, count){
        return done(err, count);
      });
    },

    totalActiveUsersForMonths: function(done){
      User.aggregate([
        { $match: { updatedAt: { $exists: true } } },
        { $group: { _id: { $month: "$updatedAt" } , count: { $sum: 1 } } }
      ]).exec(function(err, result){
        var fields = ['_id', 'count'];
        var fieldNames = ['Jour', 'Nombre d\'utilisateurs actif'];
        try {
          var csv = json2csv({ data: result, fields: fields, fieldNames: fieldNames });
          fs.writeFile(folderName + '/totalActiveUsersForMonth.csv', csv, function(err) {
            if (err) throw err;
          });
          //console.log(csv);
          return done(null, result);
        } catch (err) {
          // Errors are thrown for bad options, or if the data is empty and no fields are provided.
          // Be sure to provide fields if it is possible that your data array will be empty.
          return done(err);
        }
      });
    },

    /*totalActiveUsersPerDayForMonth: function(done){
    User.aggregate([
    { $match: { updatedAt: { $exists: true, $gt: startDate.startOf('month').toDate(), $lt: endDate.endOf('month').toDate() } } },
    { $group: { _id: { $dayOfMonth: "$updatedAt" } , count: { $sum: 1 } } }
  ]).exec(function(err, result){
  var fields = ['_id', 'count'];
  var fieldNames = ['Jour', 'Nombre d\'utilisateurs actif'];
  try {
  var csv = json2csv({ data: result, fields: fields, fieldNames: fieldNames, quotes: '' });
  fs.writeFile(folderName + '/totalActiveUsersPerDayForMonth.csv', csv, function(err) {
  if (err) throw err;
});
//console.log(csv);
return done(null, result);
} catch (err) {
// Errors are thrown for bad options, or if the data is empty and no fields are provided.
// Be sure to provide fields if it is possible that your data array will be empty.
return done(err);
}
});
},*/

totalCreatedUsersPerDayForMonth: function(done){
  User.aggregate([
    { $match: { createdAt: { $exists: true, $gt: startDate.startOf('month').toDate(), $lt: endDate.endOf('month').toDate() } } },
    { $group: { _id: { $dayOfMonth: "$createdAt" } , count: { $sum: 1 } } }
  ]).exec(function(err, result){
    var fields = ['_id', 'count'];
    var fieldNames = ['Jour', 'Nombre d\'inscriptions'];
    try {
      var csv = json2csv({ data: result, fields: fields, fieldNames: fieldNames, quotes: '' });
      fs.writeFile(folderName + '/totalCreatedUsersPerDayForMonth.csv', csv, function(err) {
        if (err) throw err;
      });
      //console.log(csv);
      return done(null, result);
    } catch (err) {
      // Errors are thrown for bad options, or if the data is empty and no fields are provided.
      // Be sure to provide fields if it is possible that your data array will be empty.
      return done(err);
    }
  });
},

totalCreatedUsersForMonth: function(done){
  User.count({ createdAt: { $gt: startDate.startOf('month'), $lt: endDate.endOf('month') } }, function(err, count){
    return done(err, count);
  });
},

totalGrids: function(done){
  Grille.count(function(err, count){
    return done(err, count);
  });
},

totalGridsForMonth: function(done){
  Grille.count({ createdAt: { $gt: startDate.startOf('month').toDate(), $lt: endDate.endOf('month').toDate() } }, function(err, count){
    return done(err, count);
  });
},

totalGridsPerDayForMonth: function(done){
  Grille.aggregate([
    { $match: { createdAt: { $gt: startDate.startOf('month').toDate(), $lt: endDate.endOf('month').toDate() } } },
    { $group: { _id: { $dayOfMonth: "$createdAt" }, count: { $sum: 1 }, activeUsers: {$addToSet: "$user"} } },
    { $project: {_id: 1, count: 1, activeUsers:{$size:"$activeUsers" } } }
  ]).exec(function(err, result){
    //console.log(result);
    var fields = ['_id', 'count', 'activeUsers'];
    var fieldNames = ['Jour', 'Nombre de grilles', 'Utilisateurs actif'];
    try {
      var csv = json2csv({ data: result, fields: fields, fieldNames: fieldNames, quotes: '' });
      fs.writeFile(folderName + '/totalGridsPerDayForMonth.csv', csv, function(err) {
        if (err) throw err;
      });
      //console.log(csv);
      return done(null, result);
    } catch (err) {
      // Errors are thrown for bad options, or if the data is empty and no fields are provided.
      // Be sure to provide fields if it is possible that your data array will be empty.
      return done(err);
    }
  });
},

totalGridsMultiPerDayForMonth: function(done){
  Grille.aggregate([
    { $match: { createdAt: { $gt: startDate.startOf('month').toDate(), $lt: endDate.endOf('month').toDate() }, type: "MULTI" } },
    { $group: { _id: { $dayOfMonth: "$createdAt" } , count: { $sum: 1 } } }
  ]).exec(function(err, result){
    var fields = ['_id', 'count'];
    var fieldNames = ['Jour', 'Nombre de grilles'];
    try {
      var csv = json2csv({ data: result, fields: fields, fieldNames: fieldNames, quotes: '' });
      fs.writeFile(folderName + '/totalGridsMultiPerDayForMonth.csv', csv, function(err) {
        if (err) throw err;
      });
      //console.log(csv);
      return done(null, result);
    } catch (err) {
      // Errors are thrown for bad options, or if the data is empty and no fields are provided.
      // Be sure to provide fields if it is possible that your data array will be empty.
      return done(err);
    }
  });
},

totalGridsSimplePerDayForMonth: function(done){
  Grille.aggregate([
    { $match: { createdAt: { $gt: startDate.startOf('month').toDate(), $lt: endDate.endOf('month').toDate() }, type: "SIMPLE" } },
    { $group: { _id: { $dayOfMonth: "$createdAt" } , count: { $sum: 1 } } }
  ]).exec(function(err, result){
    var fields = ['_id', 'count'];
    var fieldNames = ['Jour', 'Nombre de grilles'];
    try {
      var csv = json2csv({ data: result, fields: fields, fieldNames: fieldNames, quotes: '' });
      fs.writeFile(folderName + '/totalGridsSimplePerDayForMonth.csv', csv, function(err) {
        if (err) throw err;
      });
      //console.log(csv);
      return done(null, result);
    } catch (err) {
      // Errors are thrown for bad options, or if the data is empty and no fields are provided.
      // Be sure to provide fields if it is possible that your data array will be empty.
      return done(err);
    }
  });
},

totalZanicoinsRewardedPerDayForMonth: function(done){
  Grille.aggregate([
    { $match: { createdAt: { $gt: startDate.startOf('month').toDate(), $lt: endDate.endOf('month').toDate() }, status: { $in: ['win', 'loose'] } } },
    { $group: { _id: { $dayOfMonth: "$createdAt" }, total: { $sum: "$payout.point" } } },
  ]).exec(function(err, result){
    //console.log(result);
    var fields = ['_id', 'total'];
    var fieldNames = ['Jour', 'ZaniCoins'];
    try {
      var csv = json2csv({ data: result, fields: fields, fieldNames: fieldNames, quotes: '' });
      fs.writeFile(folderName + '/totalZanicoinsRewardedPerDayForMonth.csv', csv, function(err) {
        if (err) throw err;
      });
      //console.log(csv);
      return done(null, result);
    } catch (err) {
      // Errors are thrown for bad options, or if the data is empty and no fields are provided.
      // Be sure to provide fields if it is possible that your data array will be empty.
      return done(err);
    }
  });
},


totalGridsMulti: function(done){
  Grille.count({ type: 'MULTI' }, function(err, count){
    return done(err, count);
  });
},

totalGridsSimple: function(done){
  Grille.count({ type: 'SIMPLE' }, function(err, count){
    return done(err, count);
  });
},

totalGameTickets: function(done){
  GameTicket.count(function(err, count){
    return done(err, count);
  });
},

totalGameTicketsForMonth: function(done){
  GameTicket.count({ openDate: { $gt: startDate.startOf('month'), $lt: endDate.endOf('month') } }, function(err, count){
    return done(err, count);
  });
},

totalZanicoinsRewardedForMonth: function(done){
  Grille.aggregate([
    { $match: { createdAt: { $gt: startDate.startOf('month').toDate(), $lt: endDate.endOf('month').toDate() }, status: { $in: ['win', 'loose'] } } },
    { $group: { _id: null, total: { $sum: "$payout.point" } } },
  ]).exec(function(err, result){
    //console.log(result);
    return done(err, result[0].total);
  });
},

totalZanicoins: function(done){
  User.aggregate([
    { $group: { _id: null, total: { $sum: "$point" } } },
  ]).exec(function(err, result){
    //console.log(result);
    return done(err, result[0].total);
  });
}

}, function(err, result){
  if (err) return res.status(500).json(err);
  console.log(result);
  return res.status(200).json(result);
});
});

// Récupérer la moyenne de points distribuer pour les grilles simples pour les 30 derniers jours
router.get('/stats/grilles/simple', function(req, res){
  var startDate = moment().utc().subtract(1, 'months');
  console.log(startDate, moment().utc());
  Grille.aggregate([
    { $match: { type: "SIMPLE", createdAt: { $gt: startDate.toDate() }, status: { $in: ["win", "loose", "free", "canceled"] } } },
    //{ $group: { _id: null, total: { $sum: "$payout.point" } } }
    { $group: { _id: null, totalPoints: { $sum: "$payout.point" }, averagePoints: { $avg: "$payout.point" }, count: { $sum: 1 } } }
  ]).exec(function(err, result){
    if (err){
      return res.status(500).json(err);
    }
    console.log(result);
    Grille.aggregate([
      { $match: { type: "SIMPLE", createdAt: { $gt: startDate.toDate() }, status: { $in: ["win", "loose", "free", "canceled"] } } },
      { $group: { _id: "$status", count: { $sum: 1 }, averagePoints: { $avg: "$payout.point" }, maximumPayout: { $max: "$payout.point" }, averageWinningBets: { $avg: "$numberOfBetsWin"} } },
    ], function(err, result){
      console.log(result);

      /*
      * Nombre total de transaction
      * Calculer le bonus moyen pour les grilles gagnantes
      * Calculer le pourcentage d'utilisateur gagnant
      * Estimer la valeur réel du jeton selon le delta de gain
      */
      var totalTransaction = 0;
      var totalWin = 0;
      for (var i = 0; i < result.length; i++){
        totalTransaction += result[i].count;
        if (result[i]._id === "win" || result[i]._id === "free"){
          totalWin += result[i].count;
        }
      }

      console.log(totalTransaction);
      return res.status(200).json(result);
    });

  });
});

// Récupérer la moyenne de points distribuer pour les grilles simples pour les 30 derniers jours
router.get('/stats/grilles/simple/optimized', function(req, res){
  var startDate = moment().utc().subtract(1, 'months');
  console.log(startDate, moment().utc());

  async.waterfall([

    /*
    * Récupérer les utilisateurs ayant déjà reçu un paiement ou effectué une demande
    */
    function(done){
      Payout.distinct('user', function(err, payouts){
        if (err){
          return done(err);
        }
        console.log(payouts[0]);
        return done(null, payouts);
      });
    },

    function(usersId, done){
      Grille.aggregate([
        { $match: { user: { $in: usersId }, type: "SIMPLE", createdAt: { $gt: startDate.toDate() }, status: { $in: ["win", "loose", "free"] } } },
        //{ $limit: 5 },
        { $lookup: { from: 'user', localField: 'user', foreignField: '_id', as: 'user' } },
        { $unwind: '$user' },
        //{ $match: { "user.stats.totalGridSimple": { $gt: 50 } } },
        { $group: { _id: "$status", count: { $sum: 1 }, averagePoints: { $avg: "$payout.point" }, maximumPayout: { $max: "$payout.point" }, averageWinningBets: { $avg: "$numberOfBetsWin"} } }
      ]).exec(function(err, result){
        if (err){
          return done(err);
        }
        console.log(result);
        var totalTransaction = 0;
        var totalWin = 0;
        for (var i = 0; i < result.length; i++){
          totalTransaction += result[i].count;
          if (result[i]._id === "win" || result[i]._id === "free"){
            totalWin += result[i].count;
          }
        }
        console.log("Taux de victoire moyen", (totalWin/totalTransaction)*100);
        return done(null, result);
      });
    },


  ], function(err, result){
    if (err){
      return res.status(500).json(err);
    }
    return res.status(200).json(result);
  });

});

// Récupérer la moyenne de points distribuer pour les grilles MULTI pour les 30 derniers jours
router.get('/stats/grilles/multi', function(req, res){
  var startDate = moment().utc().subtract(1, 'months');
  console.log(startDate, moment().utc());
  Grille.aggregate([
    { $match: { type: "MULTI", createdAt: { $gt: startDate.toDate() }, status: { $in: ["win", "loose", "free"] } } },
    //{ $group: { _id: null, total: { $sum: "$payout.point" } } }
    { $group: { _id: null, totalPoints: { $sum: "$payout.point" }, averagePoints: { $avg: "$payout.point" }, count: { $sum: 1 } } }
  ]).exec(function(err, result){
    if (err){
      return res.status(500).json(err);
    }
    console.log(result);
    return res.status(200).json(result);

  });
});

// Récupérer la moyenne de points distribuer pour les grilles simples pour les 30 derniers jours
router.get('/stats/grilles/multi/optimized', function(req, res){
  var startDate = moment().utc().subtract(1, 'months');
  console.log(startDate, moment().utc());

  async.waterfall([

    /*
    * Récupérer les utilisateurs ayant déjà reçu un paiement ou effectué une demande
    */
    function(done){
      Payout.distinct('user', function(err, payouts){
        if (err){
          return done(err);
        }
        console.log(payouts[0]);
        return done(null, payouts);
      });
    },

    function(usersId, done){
      Grille.aggregate([
        { $match: { user: { $in: usersId }, type: "MULTI", createdAt: { $gt: startDate.toDate() }, status: { $in: ["win", "loose", "free"] } } },
        { $limit: 5 },
        //{ $lookup: { from: 'user', localField: 'user', foreignField: '_id', as: 'user' } },
        //{ $unwind: '$user' },
        //{ $match: { "user.stats.totalGridSimple": { $gt: 50 } } },
        { $group: {
          _id: "$status",
          count: { $sum: 1 },
          averagePoints: { $avg: "$payout.point" },
          maximumPayout: { $max: "$payout.point" },
          averageWinningBets: { $avg: "$numberOfBetsWin" },
          bonus: { $sum: "$payout.bonus" },
          totalPayout: { $sum: "$payout.point" },
          }
        },
      ]).exec(function(err, result){
        if (err){
          return done(err);
        }
        console.log(result);
        var totalTransaction = 0;
        var totalWin = 0;
        for (var i = 0; i < result.length; i++){
          totalTransaction += result[i].count;
          if (result[i]._id === "win" || result[i]._id === "free"){
            totalWin += result[i].count;
          }
        }
        console.log("Taux de victoire moyen", (totalWin/totalTransaction)*100);
        return done(null, result);
      });
    },


  ], function(err, result){
    if (err){
      return res.status(500).json(err);
    }
    return res.status(200).json(result);
  });

});

/*
* Statistiques concernant les paiements effectués
*/
router.get('/stats/payouts', function(req, res){
  Payout.aggregate([
    { $match: { status: "paid" } },
    { $group: { _id: null, totalPaid: { $sum: "$amount" }, count: { $sum: 1 } } }
  ]).exec(function(err, result){
    if (err){
      return res.status(500).json(err);
    }
    console.log(result);
    return res.status(200).json(result);
  });
});


/*
* Statistiques concernant le poucentage de victoire des joueurs ayants acquis
* des jetons grâce aux sondages
*/
router.get('/stats/grilles/simple/pollfish', function(req, res){
  var startDate = moment().utc().subtract(1, 'months');

  async.waterfall([

    /*
    * Récupérer les utilisateurs ayant déjà reçu un paiement ou effectué une demande
    */
    function(done){
      Transaction.distinct('destination', { source: 'Pollfish' }, function(err, users){
        if (err){
          return done(err);
        }
        users = users.map(u => new ObjectId(u));
        console.log(users[0]);

        return done(null, users);
      });
    },

    function(usersId, done){
      Grille.aggregate([
        { $match: { user: { $in: usersId }, type: "SIMPLE", createdAt: { $gt: startDate.toDate() }, status: { $in: ["win", "loose", "free"] } } },
        //{ $limit: 5 },
        { $lookup: { from: 'user', localField: 'user', foreignField: '_id', as: 'user' } },
        { $unwind: '$user' },
        //{ $match: { "user.stats.totalGridSimple": { $gt: 50 } } },
        { $group: { _id: "$status", count: { $sum: 1 }, averagePoints: { $avg: "$payout.point" }, maximumPayout: { $max: "$payout.point" }, averageWinningBets: { $avg: "$numberOfBetsWin"} } }
      ]).exec(function(err, result){
        if (err){
          return done(err);
        }
        console.log(result);
        var totalTransaction = 0;
        var totalWin = 0;
        for (var i = 0; i < result.length; i++){
          totalTransaction += result[i].count;
          if (result[i]._id === "win" || result[i]._id === "free"){
            totalWin += result[i].count;
          }
        }
        console.log("Taux de victoire moyen", (totalWin/totalTransaction)*100);
        return done(null, result);
      });
    },


  ], function(err, result){
    if (err){
      return res.status(500).json(err);
    }
    return res.status(200).json(result);
  });
});

module.exports = router;
