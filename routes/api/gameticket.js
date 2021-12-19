var express = require('express');
var mongoose = require('mongoose');
var router = express.Router();
var passport = require('passport');
var moment = require('moment');
var requestify = require('requestify');
var mongojs = require('mongojs');
var async = require('async');
var CustomError = require('../../lib/customerror');

moment.locale('fr');

var Client = mongoose.model('Client');
var Competition = mongoose.model('Competition');
var Team = mongoose.model('Team');
var Fixture = mongoose.model('Fixture');
var GameTicket = mongoose.model('GameTicket');
var Grille = mongoose.model('Grille');


// Récupérer la liste des tickets de jeu disponible
router.get('/gametickets', passport.authenticate('bearer', { session: false }), function(req, res){
  //console.log("request");
  var currentUser = req.user;
  var currentDate = moment().utc();
  //console.log("request", req.params);

  // Récupérer les tickets dont la date d'ouverte est passée et dont la date limite de validation n'est pas encore arrivée
  GameTicket.find({ openDate: { $lt: currentDate }, limitDate: { $gt: currentDate } , status: 'open', active: true, type: "MATCHDAY" })
  .sort({ limitDate: 1 })
  .populate({
    path: 'fixtures',
    options: { sort: { 'date': 1 } },
    populate: {
      path: 'homeTeam awayTeam'
    }
  }).then(function(gametickets){
    //console.log(gametickets.length);
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
    console.log(err);
    return res.status(500).json(new CustomError(500, -1, "Erreur Interne", "Une erreur interne c'est produite, merci de réesayer ultérieurement ou contacter le support si le problème persiste."));
  });
});

// Récupérer les détails d'un ticket
/*router.get('/gameticket/:ticketId', passport.authenticate('bearer', { session: false }), function(req, res){
  var currentUser = req.user;
  var ticketId = req.params.ticketId;

  GameTicket.findOne({ _id: ticketId }).then(function(gameticket){
    return res.status(200).json(gameticket);
  }, function(err){
    return res.status(500).json(new CustomError(500, -1, "Erreur Interne", "Une erreur interne c'est produite, merci de réesayer ultérieurement ou contacter le support si le problème persiste."));
  });
});*/


module.exports = router;
