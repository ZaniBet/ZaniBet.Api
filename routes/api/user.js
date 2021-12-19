var express = require('express');
var mongoose = require('mongoose');
var router = express.Router();
var passport = require('passport');
var moment = require('moment');
var validator = require('validator');
var CustomError = require('../../lib/customerror');
var utils  = require('../../lib/utils.js');
var config = require('../../config/global.js');
var FB = require('fb');
var mailer = require('../../lib/mailer');
var uniqid = require('uniqid');
//moment.locale('fr');

var User = mongoose.model('User');
var Referral = mongoose.model('Referral');

router.get('/user', passport.authenticate('bearer', { session: false }), function(req, res){
  var currentUser = req.user;
  return res.status(200).json(req.user);
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
  user.emailVerifyToken = uniqid();
  user.point = process.env.ZANICOIN_WELCOME_REWARD;
  user.jeton = process.env.WELCOME_JETON;

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
  }

  if (validator.isEmail(email) == false){
    return res.status(500).json(new CustomError(500, 0, "Paramètre invalide", "Vous devez indiquer une adresse email correcte."));
  }

  User.findByIdAndUpdate(currentUser._id, { $set: { email: email.toLowerCase() } }, { new: true }, function(err, user){
    if (err){
      //console.log(err);
      return res.status(500).json(new CustomError(500, 0, "System error", err.message));
    }
    return res.status(200).json(user);
  });
});

router.put('/user/jeton',  passport.authenticate('bearer', { session: false }), function(req, res) {
    var currentUser = req.user;
    var transaction = { type: "jeton", amount: process.env.JETON_PAYOUT };

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
router.put('/user/extra',passport.authenticate('bearer', { session: false }), function(req, res){
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

module.exports = router;
