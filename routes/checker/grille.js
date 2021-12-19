var express = require('express');
var mongoose = require('mongoose');
var router = express.Router();
var passport = require('passport');
var moment = require('moment');
var requestify = require('requestify');
var mongojs = require('mongojs');
var async = require('async');
var gcm = require('../../lib/gcm');
var Chance = require('chance');
var uniqid = require('uniqid');
var fs = require('fs');

var Client = mongoose.model('Client');
var Competition = mongoose.model('Competition');
var Team = mongoose.model('Team');
var Fixture = mongoose.model('Fixture');
var GameTicket = mongoose.model('GameTicket');
var Grille = mongoose.model('Grille');
var User = mongoose.model('User');

router.get('/grilles/checkValidity', function(req, res){

  async.waterfall([
    function(done){
      Grille.aggregate([
        { $match: { status: "win" } },
        { $group: { _id: "$gameTicket" } }
      ], function(err, result){
        console.log("Nombre de ticket à vérifier :", result.length);
        if (err){
          return done(err);
        } else {
          return done(null, result);
        }
      });
    },

    function(gametickets, done){
      async.each(gametickets, function(gameticketId, eachGameTicket){
        GameTicket.findOne({ _id: gameticketId._id }).exec().then(function(gt){
          if (gt == null){
            console.log("Le ticket n'existe pas, donc supprimer les grilles ayant été jouées");
            eachGameTicket();
          } else {
            console.log("Le ticket existe");
            eachGameTicket();
          }
        }, function(err){
          return eachGameTicket(err);
        });
      }, function(err){
        if (err){
          return done(err);
        } else {
          return done(null, "OK");
        }
      })
    }

  ], function(err, result){
    if (err){
      console.log(err);
      return res.status(500).json(err);
    } else {
      return res.status(200).json("OK");
    }
  });
});

/*
* Vérifier l'existance d'un ticket pour les grilles de jeu
*/
router.get('/grilles/checkGameticket', function(req, res){

  Grille.aggregate([
    { $match : { $or:[{ status: "loose"}, { status: "canceled"}], type: "MULTI" } },
    { $group: { _id: "$gameTicket", total: { $sum: 1 } } }
    //{ $match: { total: { $gt: 1 } } }
  ], function(err, result){
    if (err) return res.status(500).json(err);
    console.log(result.length);
    async.each(result, function(gameticket, eachGameTicket){
      GameTicket.findOne({ _id: gameticket._id }, function(err, gt){
        if (err){
          return eachGameTicket(err);
        } else if (gt == null) {
          console.log("Le ticket", gameticket._id, "n'existe pas !");
          return eachGameTicket();
        } else {
          return eachGameTicket();
        }
      });
    }, function(err){
      if (err){
        return res.status(500).json(err);
      } else {
        return res.status(200).json("OK");
      }
    });
  });

});

module.exports = router;
