var express = require('express');
var mongoose = require('mongoose');
var router = express.Router();
var passport = require('passport');
var moment = require('moment');
var requestify = require('requestify');
var mongojs = require('mongojs');
var async = require('async');
var CustomError = require('../../../lib/customerror');

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

  if (ticketType == null || ticketType == ""){
    return res.status(500).json("Incomplete request");
  }

  if (limit == null){
    limit = 100;
  }

  if (page == null){
    page = 0;
  }

  var gameticketQuery;
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
    gameticketQuery = GameTicket.find({ openDate: { $lt: currentDate }, limitDate: { $gt: currentDate }, status: 'open', active: true, type: ticketType, "tournament.rewardType": "ZaniCoin" })
    .select('_id type name openDate limitDate resultDate picture fixtures pointsPerBet bonus bonusActivation status matchDay jackpot maxNumberOfPlay numberOfGrillePlay tournament')
    .populate({
      path: 'fixtures',
      select: '_id date homeTeam awayTeam status odds zScore result',
      options: { sort: { 'date': 1 } },
      populate: {
        path: 'competition homeTeam awayTeam',
        select: 'name country shortName logo'
      }
    })
    .skip(page*limit)
    .limit(limit)
    .sort({ limitDate: 1 });
  } else {
    return res.status(500).json("Invalid ticket type.");
  }

  // Récupérer les tickets dont la date d'ouverte est passée et dont la date limite de validation n'est pas encore arrivée
  gameticketQuery.exec(function(err, gametickets){
    if (err){
      return res.status(500).json(new CustomError(500, -1, "Erreur Interne", "Une erreur interne c'est produite, merci de réesayer ultérieurement ou contacter le support si le problème persiste."));
    }
    //console.log(gametickets.length);
    if (ticketType == "SINGLE"){
      //console.log(gametickets);
    }
    async.mapLimit(gametickets,1, function(gameticket, done){
      Grille.count({ gameTicket: gameticket._id, user: currentUser._id, status: { $ne: 'canceled' } }, function(err, count){
        var convertedJSON = JSON.parse(JSON.stringify(gameticket));
        convertedJSON.numberOfGrillePlay = count;
        done(null, convertedJSON);
      });
    }, function(err, result){
      if (filterMatchday != null && (filterMatchday == 'true')){
        result = result.filter(r => r.numberOfGrillePlay < r.maxNumberOfPlay);
      }

      return res.status(200).json(result);
    });
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
    errLocalized = {
      "internal": new CustomError(500,1, "Erreur Interne", ""),
      "not_available": new CustomError(500, -1, "Indisponible", "Le classement de ce tournoi n'est pas encore disponible. Vous pourrez consulter celui ci quand tous les scores auront été calculés.")
    };
  } else {
    errLocalized = {
      "internal": new CustomError(500,1, "Internal Error", ""),
      "not_available": new CustomError(500, -1, "Not Available", "")
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
      return res.status(500).json(errLocalized['internal']);
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
        if (err || grille == null) return res.status(500).json(errLocalized['internal']);
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
