var express = require('express');
var mongoose = require('mongoose');
var router = express.Router();
var passport = require('passport');
var moment = require('moment');
var requestify = require('requestify');
var mongojs = require('mongojs');
var async = require('async');
var CustomError = require('../../../lib/customerror');
var memjs = require('memjs');
var ObjectId = mongoose.Types.ObjectId;

var mc = memjs.Client.create(process.env.MEMCACHIER_SERVERS, {
  failover: true,  // default: false
  timeout: 1,      // default: 0.5 (seconds)
  keepAlive: true  // default: false
});

var Client = mongoose.model('Client');
var Competition = mongoose.model('Competition');
var Team = mongoose.model('Team');
var Fixture = mongoose.model('Fixture');
var GameTicket = mongoose.model('GameTicket');
var Grille = mongoose.model('Grille');

// Récupérer la liste des tickets de jeu disponible
router.get('/gametickets', passport.authenticate('bearer', { session: false }), function(req, res){
  var currentDate = moment().utc();
  var currentUser = req.user;
  var ticketType = req.query.ticketType;
  var page = parseInt(req.query.page);
  var limit = parseInt(req.query.limit);
  var filterCompetition = req.query.filterCompetition;
  var filterMatchday = req.query.filterMatchday;
  var filterRegion = req.query.filterRegion;
  var filterDivision = req.query.filterDivision;

  if (ticketType == null || ticketType == ""){
    return res.status(500).json("Incomplete request");
  }

  if (limit == null || limit == 0){
    limit = 100;
  }

  if (page == null){
    page = 0;
  }

  var gameticketQuery;
  // INDEX : { "openDate": 1, "limitDate": 1, "status": 1, "active": 1, "type": 1 }
  if (ticketType == "SINGLE"){
    gameticketQuery = GameTicket.find({ openDate: { $lt: currentDate }, limitDate: { $gt: currentDate }, status: 'open', active: true, type: ticketType })
    .select('_id type name openDate limitDate resultDate thumbnail fixtures betsType competition pointsPerBet bonus bonusActivation status matchDay jeton maxNumberOfPlay numberOfGrillePlay')
    .populate({
      path: 'competition',
      select: 'logo name country division'
    })
    .populate({
      path: 'fixtures',
      select: 'date venue homeTeam awayTeam result status odds',
      options: { sort: { 'date': 1 } },
      populate: {
        path: 'homeTeam awayTeam',
        select: 'name shortName logo country recentForm'
      }
    })
    .skip(page*limit)
    .limit(limit)
    .sort({ limitDate: 1 });

    if (filterCompetition != null && filterCompetition != ""){
      var splitFilter = filterCompetition.split(";");
      gameticketQuery.where('competition').nin(splitFilter);
    }
  } else if (ticketType == "MATCHDAY"){
    gameticketQuery = GameTicket.find({ openDate: { $lt: currentDate }, limitDate: { $gt: currentDate }, status: 'open', active: true, type: ticketType })
    .select('_id competition type name openDate limitDate resultDate picture fixtures pointsPerBet bonus bonusActivation status matchDay jackpot maxNumberOfPlay numberOfGrillePlay')
    .populate('competition')
    .populate({
      path: 'fixtures',
      select: '_id date homeTeam awayTeam status odds',
      options: { sort: { 'date': 1 } },
      populate: {
        path: 'homeTeam awayTeam',
        select: 'shortName logo country'
      }
    })
    .skip(page*limit)
    .limit(limit)
    .sort({ limitDate: 1 });
  } else if (ticketType == "TOURNAMENT"){
    gameticketQuery = GameTicket.find({ openDate: { $lt: currentDate }, limitDate: { $gt: currentDate }, status: 'open', active: true, type: ticketType })
    .select('_id type name openDate limitDate resultDate picture fixtures pointsPerBet bonus bonusActivation status matchDay jackpot maxNumberOfPlay numberOfGrillePlay tournament')
    .populate({
      path: 'fixtures',
      select: '_id date homeTeam awayTeam status zScore result',
      options: { sort: { 'date': 1 } },
      populate: {
        path: 'homeTeam awayTeam competition',
        select: 'name country shortName logo'
      }
    })
    .skip(page*limit)
    .limit(limit)
    .sort({ limitDate: 1 });
  } else {
    return res.status(500).json("Invalid ticket type.");
  }

  async.waterfall([

    // Fetch gametickets
    function(done){
      if (ticketType == "MATCHDAY" || ticketType == "TOURNAMENT"){
        var cacheKey = "gametickets_" + ticketType.toLowerCase() + "_" + String(page) + "_" + String(limit);
        //console.log("Cache Key :", cacheKey);
        mc.get(cacheKey, function(err, gametickets){
          if (gametickets != null && gametickets.length > 0){
            //console.log("Return cache for key :", cacheKey);
            gametickets = JSON.parse(gametickets.toString());
            return done(null, gametickets);
          } else {
            gameticketQuery.exec(function(err, gametickets){
              if (err){
                return done(new CustomError(500, -1, "Erreur Interne", "Une erreur interne c'est produite, merci de réesayer ultérieurement ou contacter le support si le problème persiste."));
              }

              mc.set(cacheKey, JSON.stringify(gametickets), { expires:60 }, function(err, val){
                return done(null, gametickets);
              });
            });
          }
        });
      } else {
        gameticketQuery.exec(function(err, gametickets){
          if (err){
            return done(new CustomError(500, -1, "Erreur Interne", "Une erreur interne c'est produite, merci de réesayer ultérieurement ou contacter le support si le problème persiste."));
          }
          return done(null, gametickets);
        });
      }
    },

    // Count grille played per ticket
    function(gametickets, done){

      Grille.aggregate([
        { $match: { gameTicket: { $in: gametickets.map(gt => new ObjectId(gt._id)) }, user: currentUser._id,  status: { $ne: 'canceled' } } },
        { $group: { _id: "$gameTicket", total: { $sum: 1 } } }
      ], function(err, result){
        if (err || result.length == 0){
          //console.log("Error", err);
          return done(null, gametickets);
        } else {
          //console.log(result);
          async.map(gametickets, function(gameticket, eachMap){
            var convertedJSON = JSON.parse(JSON.stringify(gameticket));
            for (var i = 0; i < result.length; i++){
              if (String(result[i]._id) == String(gameticket._id)){
                convertedJSON.numberOfGrillePlay = result[i].total;
              }
            }
            eachMap(null, convertedJSON);
          }, function(err, result){
            if (filterMatchday != null && (filterMatchday == 'true')){
              result = result.filter(r => r.numberOfGrillePlay < r.maxNumberOfPlay);
            }
            return done(null, result);
          });
        }
      });

      /*async.mapLimit(gametickets, 1, function(gameticket, eachMap){
        Grille.count({ gameTicket: gameticket._id, user: currentUser._id, status: { $ne: 'canceled' } }, function(err, count){
          var convertedJSON = JSON.parse(JSON.stringify(gameticket));
          convertedJSON.numberOfGrillePlay = count;
          eachMap(null, convertedJSON);
        });
      }, function(err, result){
        if (filterMatchday != null && (filterMatchday == 'true')){
          result = result.filter(r => r.numberOfGrillePlay < r.maxNumberOfPlay);
        }
        return done(null, result);
      });*/
    }

  ], function(err, result){
    if (err){
      return res.status(500).json(err);
    }

    return res.status(200).json(result);
  });

});

// Récupérer le classement pour un ticket tournoi
router.get('/gametickets/:ticket_id/standing', passport.authenticate('bearer', { session: false }), function(req, res){

  var currentUser = req.user;
  var ticketId = req.params.ticket_id;

  // Vérifier les input
  if (ticketId == null){
    return res.status(500).json("KO");
  }

  if (currentUser.locale != null && currentUser.locale == "fr"){
    var errLocalized = {
      "internal": new CustomError(500,1, "Erreur Interne", ""),
      "not_available": new CustomError(500, -1, "Indisponible", "Vous devez participer au tournoi afin de pouvoir consulter le classement.")
    };
  } else if (currentUser.locale != null && currentUser.locale == "pt"){
    var errLocalized = {
      "internal": new CustomError(500,1, "Erreur Interne", ""),
      "not_available": new CustomError(500, -1, "Indisponible", "Você deve participar do torneio para ver a classificação.")
    };
  } else {
    var errLocalized = {
      "internal": new CustomError(500,1, "Internal Error", ""),
      "not_available": new CustomError(500, -1, "Indisponible", "The standing will be available once you join the tournament.")
    };
  }

  GameTicket.findOne({ _id: ticketId, type: "TOURNAMENT" }).exec().then(function(gameticket){
    if (gameticket == null){
      throw "Le ticket n'existe pas !";
    } else {
      if (gameticket.status != "ended"){
        //throw errLocalized["not_available"];
      }
      var queryLimit = 100;
      if (parseInt(gameticket.tournament.totalPlayersPaid) > 100){
        queryLimit = parseInt(gameticket.tournament.totalPlayersPaid);
      }
      if (gameticket.status == "ended"){
        return Grille.find({ gameTicket: gameticket._id, status: { $nin: ["waiting_result"] } })
        .sort({ 'standing.rank': 1 })
        .limit(parseInt(queryLimit))
        .exec();
      } else {
        return Grille.find({ gameTicket: gameticket._id })
        .sort({ 'createdAt': 1 })
        .limit(parseInt(queryLimit))
        .exec();
      }
    }
  }).then(function(grilles){
    //console.log("grilles:", grilles.length);
    if (grilles.length == 0){
      return res.status(500).json(errLocalized['not_available']);
    }
    // Construire le classement
    var standings = [];
    var currentUserWin = false;
    for (var i = 0; i < grilles.length; i++){
      if (String(grilles[i].user) == String(currentUser._id)) currentUserWin = true;

      var standing = grilles[i].standing;
      var payout = parseInt(grilles[i].payout.point);
      var nameArr = standing.id.split(" ");
      var std = { id: nameArr[0], rank: standing.rank, points: standing.points, coin: payout };
      //console.log(std);
      standings.push(std);
    }

    if (currentUserWin == false){
      Grille.findOne({  gameTicket: ticketId, status: { $nin: ["waiting_result"] } }, function(err, grille){
        if (err) return res.status(500).json(errLocalized['internal']);
        if (grille == null) return res.status(500).json(errLocalized['not_available']);
        var nameArr = grille.standing.id.split(" ");
        var std = { id: nameArr[0], rank: grille.standing.rank, points: grille.standing.points, coin: 0 };
        standings.push(std);
        return res.status(200).json(standings);
      });
    } else {
      return res.status(200).json(standings);
    }
  }, function(err){
    //console.log(err);
    return res.status(500).json(err);
  });
});

module.exports = router;
