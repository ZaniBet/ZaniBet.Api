var express = require('express');
var mongoose = require('mongoose');
var router = express.Router();
var passport = require('passport');
var moment = require('moment');
var requestify = require('requestify');
var mongojs = require('mongojs');
var async = require('async');
var CustomError = require('../../../lib/customerror');

moment.locale('fr');

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

  if (ticketType == null || ticketType == ""){
    return res.status(500).json("Incomplete request");
  }

  var gameticketQuery;
  if (ticketType == "SINGLE"){
    gameticketQuery = GameTicket.find({ openDate: { $lt: currentDate }, limitDate: { $gt: currentDate }, status: 'open', active: true, type: ticketType }).sort({ limitDate: 1 });
  } else if (ticketType == "MATCHDAY"){
    gameticketQuery = GameTicket.find({ openDate: { $lt: currentDate }, limitDate: { $gt: currentDate }, status: 'open', active: true, type: ticketType }).sort({ limitDate: 1 });
  } else {
    return res.status(500).json("Invalid ticket type.");
  }

  // Récupérer les tickets dont la date d'ouverte est passée et dont la date limite de validation n'est pas encore arrivée
  gameticketQuery.populate({ path: 'competition' }).populate({
    path: 'fixtures',
    options: { sort: { 'date': 1 } },
    populate: {
      path: 'homeTeam awayTeam'
    }
  }).then(function(gametickets){
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
      return res.status(200).json(result);
    });
  }, function(err){
    //console.log(err);
    return res.status(500).json(new CustomError(500, -1, "Erreur Interne", "Une erreur interne c'est produite, merci de réesayer ultérieurement ou contacter le support si le problème persiste."));
  });
});

module.exports = router;
