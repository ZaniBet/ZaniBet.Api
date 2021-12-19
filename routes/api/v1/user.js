var express = require('express');
var mongoose = require('mongoose');
var router = express.Router();
var passport = require('passport');
var moment = require('moment');
var validator = require('validator');
var CustomError = require('../../../lib/customerror');
var utils  = require('../../../lib/utils.js');
var config = require('../../../config/global.js');
var FB = require('fb');
var mailer = require('../../../lib/mailer');
var uniqid = require('uniqid');
var async = require('async');
var GCM = require('../../../lib/gcm');
var Chance = require('chance');
var chance = new Chance();

var User = mongoose.model('User');
var Referral = mongoose.model('Referral');

router.get('/user', passport.authenticate('bearer', { session: false }), function(req, res){
  var currentUser = req.user;
  //console.log("current", currentUser);
  return res.status(200).json(currentUser);
});

// Inscription utilisateur
router.post('/user', passport.authenticate('oauth2-client-password', { session: false }), function(req, res) {
  var username = req.body.username;
  var email = req.body.email;
  var password = req.body.password;

  //console.log(req.body);
  if (validator.isEmpty(username)){
    return res.status(500).json(new CustomError(500, 0, "Paramètre invalide", "Vous devez indiquer un nom d'utilisateur."));
  } else if (validator.isEmail(email) == false){
    return res.status(500).json(new CustomError(500, 0, "Paramètre invalide", "Vous devez indiquer une adresse email correcte."));
  } else if (validator.isEmpty(password)){
    return res.status(500).json(new CustomError(500, 0, "Paramètre invalide", "Vous devez indiquer un mot de passe."));
  }

  var user = new User();
  user.username = username;
  user.email = email.toLowerCase();
  user.emailVerifyToken = chance.hash();
  user.point = parseInt(process.env.ZANICOIN_WELCOME_REWARD);
  user.jeton = parseInt(process.env.WELCOME_JETON);
  user.wallet.zaniHash = parseInt(process.env.WELCOME_ZANIHASH);

  var referral = new Referral();
  referral.invitationCode = uniqid.time();
  user.referral = referral;

  User.register(user, password, function(err){
    if (err) {
      //console.log(err);
      if (err.code == 11000){
        return res.status(500).json(new CustomError(500, 0, "Nom d'utilisateur", "Ce pseudonyme est déjà utilisé, merci d'en choisir un autre."));
      } else if (err.name == "UserExistsError"){
        return res.status(500).json(new CustomError(500, 0, "Nom d'utilisateur", "Un compte avec cette adresse email existe déjà."));
      }
      return res.status(500).json(new CustomError(500, 0, "Erreur Interne", err.message));
    } else {
      mailer.sendWelcomeMail(res, user).then(function(result){
        return res.status(200).json(user);
      }, function(err){
        return res.status(200).json(user);
      });
    }
  });
});

// Mettre à jour les informations personnelles d'un utilisateur
router.put('/user',passport.authenticate('bearer', { session: false }), function(req, res) {
  var currentUser = req.user;

  var lastname = req.body.lastname;
  var firstname = req.body.firstname;
  var address = req.body.address;
  var paypal = req.body.paypal;

  //console.log(req.body);

  if (validator.isEmpty(lastname)){
    return res.status(500).json(new CustomError(500, 1, "Paramètre invalide", "Vous devez indiquer un nom valide."));
  } else if (validator.isEmpty(firstname)){
    return res.status(500).json(new CustomError(500, 1, "Paramètre invalide", "Vous devez indiquer un prénom valide."));
  } else if (validator.isEmpty(address.street)){
    return res.status(500).json(new CustomError(500, 1, "Paramètre invalide", "Vous devez indiquer une adresse valide."));
  } else if (validator.isEmpty(address.city)){
    return res.status(500).json(new CustomError(500, 1, "Paramètre invalide", "Vous devez indiquer une ville valide."));
  } else if (validator.isEmpty(address.zipcode) || validator.isNumeric(address.zipcode) == false){
    return res.status(500).json(new CustomError(500, 1, "Paramètre invalide", "Vous devez indiquer un code postal valide."));
  } else if (validator.isEmpty(address.country)){
    return res.status(500).json(new CustomError(500, 1, "Paramètre manquant", "Vous devez indiquer un pays valide."));
  } else if (validator.isEmpty(paypal) || validator.isEmail(paypal) == false){
    return res.status(500).json(new CustomError(500, 1, "Paramètre invalide", "Vous devez indiquer une adresse PayPal valide."));
  }

  User.findByIdAndUpdate(currentUser._id, { $set: { lastname: lastname, firstname: firstname, address: address, paypal: paypal } }, { new: true }, function(err, user){
    if (err){
      //console.log(err);
      return res.status(500).json(new CustomError(500, 0, "System error", err.message));
    }
    return res.status(200).json(user);
  });

});

// Mettre à jour l'adresse email d'un utilisateur
router.put('/user/email', passport.authenticate('bearer', { session: false }), function(req, res) {
  var currentUser = req.user;
  var email = req.body.email;
  //console.log(!validator.isEmail(email));
  if (email == null){
    return res.status(500).json(new CustomError(500, 0, "Paramètre invalide", "Vous devez indiquer une adresse email correcte."));
  } else if (validator.isEmail(email) == false){
    return res.status(500).json(new CustomError(500, 0, "Paramètre invalide", "Vous devez indiquer une adresse email correcte."));
  }

  var sendConfirmMail = false;

  if (email != currentUser.email) {
    currentUser.email = email;
    currentUser.emailVerifyToken = chance.hash();
    sendConfirmMail = true;
  }

  if (username != currentUser.username){
    currentUser.username = username;
    currentUser.usernameEditAttempt = 1;
  }

  currentUser.save(function(err, user){
    if (err){
      return res.status(500).json(new CustomError(500, 0, "System error", err.message));
    }

    if (sendConfirmMail){
      mailer.sendConfirmEmail(res, user).then(function(result){
        return res.status(200).json(user);
      }, function(err){
        return res.status(200).json(user);
      });
    } else {
      return res.status(200).json(user);
    }
  });
});

router.put('/user/jeton',  passport.authenticate('bearer', { session: false }), function(req, res) {
  var currentUser = req.user;
  //var transaction = { type: "jeton", amount: process.env.JETON_PAYOUT };

  if (currentUser.lastJetonAds != null){
    if (moment(currentUser.lastJetonAds).utc().isAfter(moment().utc().subtract(process.env.JETON_VIDEO_HOUR_DELAY, 'hours'), 'hour')){
      return res.status(500).json(new CustomError(500, 0, "Limite Atteinte", "Vous avez atteint la limite de vidéo visionnable pour obtenir des jetons. Revenez d'ici quelques heures !"));
    }
  }

  return res.status(200).json("OK");

  /*User.update({ _id: currentUser._id }, { $set: { transaction: transaction } }, function(err, result){
    if (err){
      //console.log(err);
      return res.status(500).json(new CustomError(500, 0, "Erreur interne", "Impossible de créditer vos jetons."));
    } else {
      return res.status(200).json("OK");
    }
  });*/
});

// Mettre à jour le token firebase de l'utilisateur
router.put('/user/fcmtoken', passport.authenticate('bearer', { session: false }), function(req, res) {
  var currentUser = req.user;
  var bodyFcmToken = req.body.fcmToken;

  User.update({ _id: currentUser._id }, { $set: { fcmToken: bodyFcmToken } }, function(err, result){
    if (err) return res.status(500).json(err);
    //console.log(result);
    res.status(200).json("OK");
  });

});

// Update extra data
router.put('/user/extra', passport.authenticate('bearer', { session: false }), function(req, res){
  //console.log(req.headers);
  var currentUser = req.user;
  var locale = req.body.locale;

  if (locale == null){
    return res.status(500).json("Empty locale");
  }

  //console.log(locale);
  User.update({ _id: currentUser._id }, { $set: { locale: locale } }, function(err, result){
    if (err) return res.status(500).json(err);
    //console.log(result);
    res.status(200).json("OK");
  });
});

// Valider un code d'invitation
router.put('/user/invitation/:code', passport.authenticate('bearer', { session: false }), function(req, res){
  var currentUser = req.user;
  var referral = currentUser.referral;
  var code = req.params.code;
  var bodyCode = req.body.code;

  console.log('body code:', bodyCode);
  if (code == "code" && bodyCode != null){
    code = bodyCode;
  }

  //console.log(referral);
  // Vérifier si l'utilisateur à déja validé un code d'invitation
  if (referral.referrer != null && referral.referrer != ""){
    return res.status(500).json(new CustomError(500, 0, "Erreur interne", "Vous avez déjà validé un code d'invitation."));
  }

  // Vérifier la limite de temps
  if (moment(currentUser.createdAt).utc() < moment().utc().subtract(4, 'days')){
    return res.status(500).json(new CustomError(500, 0, "Erreur interne", "Vous avez dépassé la date limite de validation d'un code d'invitation."));
  }

  if (code != null){
    code = code.toLowerCase();
  } else {
    return res.status(500).json(new CustomError(500, 0, "Erreur interne", "Vous devez indiquer un code d'invitation à valider."));
  }

  async.waterfall([

    // Trouver le propriétaire du code d'invitation
    function(done){
      User.findOne({ "referral.invitationCode": code }, function(err, user){
        if (err){
          return done(new CustomError(500, 0, "Erreur interne", err.message));
        } else if (user == null){
          return done(new CustomError(500, 0, "Erreur interne", "Ce code d'invitation n'existe pas." + code));
        } else {
          // Vérifier que l'utilisateur validant le code n'est pas le parrain du propriétaire du code (cross parainnage)
          try {
            if ( user.referral != null && String(user.referral.referrer) == String(currentUser._id) ){
              return done(new CustomError(500, 0, "Erreur interne","Impossible de valider ce code d'invitation"));
            } else if ( String(user.referral.referrer) == String(currentUser._id) ){
              return done(new CustomError(500, 0, "Erreur interne","Impossible de valider ce code d'invitation"));
            }
          } catch(error){
            console.log(error);
          }
          //console.log(typeof user.referral.referrer, typeof currentUser._id);
          //return done("stop");
          return done(null, user);
        }
      });
    },

    // Créditer l'utilisateur et mettre à jour son referrer
    function(referrer, done){
      User.updateOne({ _id: currentUser._id }, { $set: { "referral.referrer": referrer._id }, $inc: { point: referrer.referral.invitationBonus } }, function(err, result){
        if (err){
          return done(new CustomError(500, 0, "Erreur interne",err.message));
        } else {
          console.log(result);
          return done(null, referrer);
        }
      });
    },

    // Mettre à jour les statistiques du parrain
    function(referrer, done){
      User.updateOne({ _id: referrer._id }, { $inc: { "referral.totalReferred": 1 } }, function(err, result){
        if (err){
          return done(new CustomError(500, 0, "Erreur interne", err.message));
        } else {
          //GCM.sendSingleMessage([referrer.fcmToken], "ZaniBet", "Un utilisateur vient de valider votre code d'invitation !");
          return done(null, referrer.referral.invitationBonus);
        }
      });
    }

  ], function(err, result){
    if (err){
      console.log(err);
      return res.status(500).json(err);
    }

    return res.status(200).json(parseInt(result));
  });

});

module.exports = router;
