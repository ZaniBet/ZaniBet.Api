var express = require('express');
var mongoose = require('mongoose');
var router = express.Router();
var passport = require('passport');
var moment = require('moment');
var requestify = require('requestify');
var mongojs = require('mongojs');
var async = require('async');
var gcm = require('../../lib/gcm');

moment.locale('fr');

var User = mongoose.model('User');
var Grille = mongoose.model('Grille');
var Payout = mongoose.model('Payout');
var Notification = mongoose.model('Notification');
var GameTicket = mongoose.model('GameTicket');

// Créer toutes les notifications en rapport avec les tickets
router.post('/notification/gameticket/matchday', function(req, res){
  GameTicket.find({ status: { $in: ['close','open'] }, type: 'MATCHDAY', active: true }).then(function(gametickets){
    console.log('Found', gametickets.length, 'gametickets.');
    var _notifications = [];
    async.each(gametickets, function(gameticket, eachGameTicket){
      // Envoyer la notification 2h avant la fermeture du ticket
      var sendAt =  moment(gameticket.limitDate).utc().subtract(2, 'hours');

      Notification.findOneAndUpdate({ eventName: "grid_remaining", kind: "GameTicket", target: gameticket._id },
      { $set: {
        audience: ['push'],
        title: "Fermeture imminente !",
        message: "Plus que " + moment(gameticket.limitDate).utc().diff(sendAt, 'hours') + " heures pour faire vos pronostics des matchs de " + gameticket.name.replace(" Jackpot", "") + " J" + gameticket.matchDay + ".",
        extra: gameticket.maxNumberOfPlay,
        sendAt: sendAt
      } }, { upsert: true, setDefaultsOnInsert: true, new: true }, function(err, notification){
        if (err) return eachGameTicket(err);
        _notifications.push(notification);
        eachGameTicket();
      });
    }, function(err){
      if (err) return res.status(500).json(err);
      return res.status(200).json(_notifications);
    });
  }, function(err){
    if (err) return res.status(500).json(err);
  });
});

router.post('/notification/gameticket/single', function(req, res){

});

router.post('/notification/single', function(req, res){
  var fcmToken = req.body.fcmToken;
  var title = req.body.title;
  var message = req.body.message;

  gcm.sendSingleMessage(fcmToken, title, message).then(function(response){
    return res.status(200).json("OK");
  }, function(err){
    return res.status(500).json(err);
  });
});

router.post('/notification/topic', function(req, res){
  var topic = req.body.topic;
  var title = req.body.title;
  var message = req.body.message;

  gcm.sendTopicMessage(topic, title, message).then(function(response){
    return res.status(200).json("OK");
  }, function(err){
    return res.status(500).json(err);
  });
});


router.post('/notification/analytics', function(req, res){
  /*User.find({ zaniHashEnabled: true }).exec(function(users){

  });*/
});

module.exports = router;
