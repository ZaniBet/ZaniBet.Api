var express = require('express');
var mongoose = require('mongoose');
var router = express.Router();
var passport = require('passport');
var moment = require('moment');
var requestify = require('requestify');
var mongojs = require('mongojs');
var async = require('async');
var gcm = require('../../lib/gcm');

var Client = mongoose.model('Client');
var Competition = mongoose.model('Competition');
var Team = mongoose.model('Team');
var Fixture = mongoose.model('Fixture');
var GameTicket = mongoose.model('GameTicket');
var User = mongoose.model('User');
var Reward = mongoose.model('Reward');
var Gift = mongoose.model('Gift');

// Récompenser tous les utilisateurs en zanicoins
router.post('/gifts/points', function(req, res){
  var kind = req.body.kind;
  var amount = req.body.amount;
  //var audience = req.body.audience;
  var notificationEnabled = req.body.notificationEnabled;
  var title = req.body.title;
  var message = req.body.message;

  if (kind == null || amount == null || notificationEnabled == null){
    return res.status(500).json("Invalid request !");
  }

  amount = parseInt(amount);

  var giftQuery;
  if (notificationEnabled == "true"){
    giftQuery = Gift.create({ activationDate: moment().utc(),
      kind: kind,
      amount: amount,
      "target.audience": "Everybody",
      "notification.enabled": true,
      "notification.title": title,
      "notification.message": message
    });
  } else {
    giftQuery = Gift.create({ activationDate: moment().utc(),
      kind: kind,
      amount: amount,
      "target.audience": "Everybody"
    });
  }

  var _gift;
  var _lastGiftDate = moment().utc();
  // Création d'un log de création de cadeau
  giftQuery.then(function(gift){
    _gift = gift;
    // Accorder la récompense à tous les utilisateurs
    return User.updateMany({}, {
      $set: {
        "lastGift.date": _lastGiftDate,
        "lastGift.kind": "Point",
        "lastGift.amount": parseInt(gift.amount)
      },
      $inc: {
        point: parseInt(gift.amount)
      }
    });
  }).then(function(raw){
    console.log(raw);
    // Mettre à jour le status du cadeau
    Gift.update({ _id: _gift._id }, { $set: { status: 'done', recipientCount: parseInt(raw.nModified) } }, function(err, result){
      console.log(result);
      if (err) return res.status(500).json(err);
      if (_gift.notification.enabled){
        // Envoyer une notification aux utilisateurs
        User.find({ "lastGift.date": { $gte: _lastGiftDate }, fcmToken: { $exists: true } }, function(err, users){
          if (err) return res.status(500).json(err);
          console.log(users.length);
          // Send notification
          if (users.length < 999){
            var fcmTokenArr = users.map( user => user.fcmToken);
            console.log('Send notification');
            gcm.sendSingleMessage(fcmTokenArr, _gift.notification.title, _gift.notification.message).then(function(result){
              return res.status(200).json("OK");
            },function(err){
              return res.status(500).json(err);
            });
          } else {
            // TODO : IF THERE IS MORE THAN 999 USERS
          }
        });
      } else {
        return res.status(200).json("OK");
      }
    });
  }, function(err){
    return res.status(500).json(err);
  });

});

module.exports = router;
