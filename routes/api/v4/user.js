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
var crypto = require('crypto');
var freemail = require('freemail');

var Chance = require('chance');
var chance = new Chance();

var BadWords = require('bad-words');
var badWords = new BadWords();
badWords.addWords(['zanibet', 'zanibe', 'zanib']);

var User = mongoose.model('User');
var Referral = mongoose.model('Referral');
//var Device = mongoose.model('Device');
var AccessToken = mongoose.model('AccessToken');

router.get('/user', passport.authenticate('bearer', { session: false }), function(req, res){
  var currentUser = req.user;
  //console.log("current", currentUser);
  return res.status(200).json(currentUser);
});

router.get('/user/nonce', passport.authenticate('bearer', { session: false }), function(req, res){
  var currentUser = req.user;
  var currentUnixTime = moment().utc().unix();

  //var concatString = currentUser._id.slice(-6) + String(currentUnixTime) + currentUser.username;
  //var nounce = crypto.createHash('md5').update(concatString).digest("hex");

  return res.status(200).json({ timestamp: currentUnixTime, nonce: "nounce" });
});

// Inscription utilisateur
router.post('/user', passport.authenticate('oauth2-client-password', { session: false }), function(req, res) {
  var username = req.body.username;
  var email = req.body.email;
  var password = req.body.password;
  var locale = req.body.locale;

  var errLocalized;
  if (locale != null && locale == "fr"){
    errLocalized = {
      "internal": new CustomError(500,1, "Erreur Interne", ""),
      "missing_username": new CustomError(500,1, "Erreur Interne", ""),
      "missing_email": new CustomError(500,1, "Erreur Interne", ""),
      "missing_password": new CustomError(500,1, "Erreur Interne", ""),
      "username_already_used": new CustomError(500,1, "Erreur Interne", ""),
      "email_already_used": new CustomError(500,1, "Erreur Interne", "")
    };
  } else if (locale != null && locale == "pt"){
    errLocalized = {
      "internal": new CustomError(500,1, "Erreur Interne", ""),
      "missing_username": new CustomError(500,1, "Erreur Interne", ""),
      "missing_email": new CustomError(500,1, "Erreur Interne", ""),
      "missing_password": new CustomError(500,1, "Erreur Interne", ""),
      "username_already_used": new CustomError(500,1, "Erreur Interne", ""),
      "email_already_used": new CustomError(500,1, "Erreur Interne", "")
    };
  } else if (locale != null && locale == "es"){
    errLocalized = {
      "internal": new CustomError(500,1, "Erreur Interne", ""),
      "missing_username": new CustomError(500,1, "Erreur Interne", ""),
      "missing_email": new CustomError(500,1, "Erreur Interne", ""),
      "missing_password": new CustomError(500,1, "Erreur Interne", ""),
      "username_already_used": new CustomError(500,1, "Erreur Interne", ""),
      "email_already_used": new CustomError(500,1, "Erreur Interne", "")
    };
  } else {
    errLocalized = {
      "internal": new CustomError(500,1, "Erreur Interne", ""),
      "missing_username": new CustomError(500,1, "Erreur Interne", ""),
      "missing_email": new CustomError(500,1, "Erreur Interne", ""),
      "missing_password": new CustomError(500,1, "Erreur Interne", ""),
      "username_already_used": new CustomError(500,1, "Erreur Interne", ""),
      "email_already_used": new CustomError(500,1, "Erreur Interne", "")
    };
  }

  //console.log(freemail.isFree(email));
  //console.log(req.body);
  if (validator.isEmpty(username)){
    return res.status(500).json(new CustomError(500, 0, "Param??tre invalide", "Vous devez indiquer un nom d'utilisateur."));
  } else if (validator.isEmail(email) == false || !freemail.isFree(email)){
    return res.status(500).json(new CustomError(500, 0, "Param??tre invalide", "Vous devez indiquer une adresse email correcte."));
  } else if (validator.isEmpty(password)){
    return res.status(500).json(new CustomError(500, 0, "Param??tre invalide", "Vous devez indiquer un mot de passe."));
  } else if (locale == null || locale.length > 20){
    locale = "";
  }

  var user = new User();
  user.username = username;
  user.email = email.toLowerCase();
  user.emailVerifyToken = chance.hash();
  user.point = parseInt(process.env.ZANICOIN_WELCOME_REWARD);
  user.jeton = parseInt(process.env.WELCOME_JETON);
  user.wallet.zaniHash = parseInt(process.env.WELCOME_ZANIHASH);
  user.locale = locale;

  var referral = new Referral();
  referral.invitationCode = uniqid.time();
  user.referral = referral;

  User.register(user, password, function(err){
    if (err) {
      //console.log(err);
      if (err.code == 11000){
        return res.status(500).json(new CustomError(500, 0, "Erreur", "Ce pseudonyme est d??j?? utilis??, merci d'en choisir un autre."));
      } else if (err.name == "UserExistsError"){
        return res.status(500).json(new CustomError(500, 0, "Erreur", "Un compte avec cette adresse email existe d??j??."));
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

router.post('/user/device', passport.authenticate('bearer', { session: false }), function(req, res) {
  var currentUser = req.user;

  var brand = req.body.brand;
  var model = req.body.model;
  var sdk = req.body.sdk;
  var packageName = req.body.packageName;
  var versionRelease = req.body.versionRelease;
  var versionIncremental = req.body.versionIncremental;
  var signature = req.body.signature;
  var safety = req.body.safety;
  var safetyResponse = req.body.safetyResponse;

  //console.log(req.body);
  return res.status(200).json("OK");

});

// Mettre ?? jour les informations de paiement de l'utilisateur
router.put('/user/paiement', passport.authenticate('bearer', { session: false }), function(req, res) {
  var currentUser = req.user;
  var locale = currentUser.locale;

  var lastname = req.body.lastname;
  var firstname = req.body.firstname;
  var address = req.body.address;
  var paypal = req.body.paypal;
  var bitcoin = req.body.bitcoin;

  var errLocalized;
  if (locale != null && locale == "fr"){
    errLocalized = {
      "internal": new CustomError(500,1, "Erreur Interne", ""),
      "invalid_lastname": new CustomError(500,1, "", ""),
      "invalid_firstname": new CustomError(500,1, "", ""),
      "invalid_address": new CustomError(500,1, "", ""),
      "invalid_zipcode": new CustomError(500,1, "", ""),
      "invalid_country": new CustomError(500,1, "", ""),
      "invalid_paypal": new CustomError(500,1, "", ""),
      "invalid_bitcoin": new CustomError(500,1, "", "")
    };
  } else if (locale != null && locale == "pt"){
    errLocalized = {
      "internal": new CustomError(500,1, "Erreur Interne", ""),
      "invalid_lastname": new CustomError(500,1, "", ""),
      "invalid_firstname": new CustomError(500,1, "", ""),
      "invalid_address": new CustomError(500,1, "", ""),
      "invalid_zipcode": new CustomError(500,1, "", ""),
      "invalid_country": new CustomError(500,1, "", ""),
      "invalid_paypal": new CustomError(500,1, "", ""),
      "invalid_bitcoin": new CustomError(500,1, "", "")
    };
  } else if (locale != null && locale == "es"){
    errLocalized = {
      "internal": new CustomError(500,1, "Erreur Interne", ""),
      "invalid_lastname": new CustomError(500,1, "", ""),
      "invalid_firstname": new CustomError(500,1, "", ""),
      "invalid_address": new CustomError(500,1, "", ""),
      "invalid_zipcode": new CustomError(500,1, "", ""),
      "invalid_country": new CustomError(500,1, "", ""),
      "invalid_paypal": new CustomError(500,1, "", ""),
      "invalid_bitcoin": new CustomError(500,1, "", "")
    };
  } else {
    errLocalized = {
      "internal": new CustomError(500,1, "Erreur Interne", ""),
      "invalid_lastname": new CustomError(500,1, "", ""),
      "invalid_firstname": new CustomError(500,1, "", ""),
      "invalid_address": new CustomError(500,1, "", ""),
      "invalid_zipcode": new CustomError(500,1, "", ""),
      "invalid_country": new CustomError(500,1, "", ""),
      "invalid_paypal": new CustomError(500,1, "", ""),
      "invalid_bitcoin": new CustomError(500,1, "", "")
    };
  }

  if (validator.isEmpty(lastname)){
    return res.status(500).json(new CustomError(500, 1, "Param??tre invalide", "Vous devez indiquer un nom valide."));
  } else if (validator.isEmpty(firstname)){
    return res.status(500).json(new CustomError(500, 1, "Param??tre invalide", "Vous devez indiquer un pr??nom valide."));
  } else if (validator.isEmpty(address.street)){
    return res.status(500).json(new CustomError(500, 1, "Param??tre invalide", "Vous devez indiquer une adresse valide."));
  } else if (validator.isEmpty(address.city)){
    return res.status(500).json(new CustomError(500, 1, "Param??tre invalide", "Vous devez indiquer une ville valide."));
  } else if (validator.isEmpty(address.zipcode) || validator.isNumeric(address.zipcode) == false){
    return res.status(500).json(new CustomError(500, 1, "Param??tre invalide", "Vous devez indiquer un code postal valide."));
  } else if (validator.isEmpty(address.country)){
    return res.status(500).json(new CustomError(500, 1, "Param??tre manquant", "Vous devez indiquer un pays valide."));
  } else if (!validator.isEmpty(paypal) && validator.isEmail(paypal) == false){
    return res.status(500).json(new CustomError(500, 1, "Param??tre invalide", "Vous devez indiquer une adresse PayPal valide."));
  }

  var bitcoinReg = new RegExp('^[13][a-km-zA-HJ-NP-Z0-9]{26,33}$', 'igm');
  if (bitcoin != null && !validator.isEmpty(bitcoin) && !bitcoinReg.exec(bitcoin)){
    return res.status(500).json(new CustomError(500, 1, "Param??tre invalide", "Vous devez indiquer une adresse Bitcoin valide."));
  }

  currentUser.lastname = lastname;
  currentUser.firstname = firstname;
  currentUser.address = address;

  if (paypal != null && validator.isEmail(paypal)){
    currentUser.paypal = paypal.toLowerCase();
  }

  if (bitcoin != null){
    currentUser.bitcoin = bitcoin;
  }

  currentUser.save(function(err, user){
    if (err){
      //console.log(err);
      return res.status(500).json(new CustomError(500, 0, "System error", err.message));
    } else {
      return res.status(200).json(user);
    }
  });

  /*User.findByIdAndUpdate(currentUser._id, { $set: { lastname: lastname, firstname: firstname, address: address, paypal: paypal.toLowerCase() } }, { new: true }, function(err, user){
    if (err){
      //console.log(err);
      return res.status(500).json(new CustomError(500, 0, "System error", err.message));
    }
    return res.status(200).json(user);
  });*/

});

// Mettre ?? jour le compte zanibet de l'utilisateur
router.put('/user', passport.authenticate('bearer', { session: false }), function(req, res) {
  var currentUser = req.user;
  var email = req.body.email;
  var username = req.body.username;

  //console.log(!validator.isEmail(email));
  if (email == null || !validator.isEmail(email)){
    return res.status(500).json(new CustomError(500, 0, "Param??tre invalide", "Vous devez indiquer une adresse email correcte."));
  } else if (username == null || !validator.isAscii(username) || !validator.isLength(username, { min: 3, max: 16 })){
    return res.status(500).json(new CustomError(500, 0, "Param??tre invalide", "Vous devez indiquer un nom d'utilisateur correcte."));
  } else if(username != currentUser.username && currentUser.usernameEditAttempt > 0){
    return res.status(500).json(new CustomError(500, 0, "Param??tre invalide", "Vous ne pouvez plus modifier votre nom d'utilisateur."));
  }

  var sendConfirmMail = false;

  if (email != currentUser.email) {
    currentUser.email = email.toLowerCase();
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
  var transaction = { type: "jeton", amount: process.env.JETON_PAYOUT };
  var locale = currentUser.locale;

  var errLocalized;
  if (locale != null && locale == "fr"){
    errLocalized = {
      "internal": new CustomError(500,1, "Erreur Interne", ""),
      "missing_username": new CustomError(500,1, "Erreur Interne", ""),
    };
  } else if (locale != null && locale == "pt"){
    errLocalized = {
      "internal": new CustomError(500,1, "Erreur Interne", ""),
      "missing_username": new CustomError(500,1, "Erreur Interne", ""),
    };
  } else if (locale != null && locale == "es"){
    errLocalized = {
      "internal": new CustomError(500,1, "Erreur Interne", ""),
      "missing_username": new CustomError(500,1, "Erreur Interne", ""),
    };
  } else {
    errLocalized = {
      "internal": new CustomError(500,1, "Erreur Interne", ""),
      "missing_username": new CustomError(500,1, "Erreur Interne", ""),
    };
  }

  if (currentUser.lastJetonAds != null){
    if (moment(currentUser.lastJetonAds).utc().isAfter(moment().utc().subtract(process.env.JETON_VIDEO_HOUR_DELAY, 'hours'), 'hour')){
      return res.status(500).json(new CustomError(500, 0, "Limite Atteinte", "Vous avez atteint la limite de vid??o visionnable pour obtenir des jetons. Revenez d'ici quelques heures !"));
    }
  }

  User.update({ _id: currentUser._id }, { $set: { transaction: transaction } }, function(err, result){
    if (err){
      //console.log(err);
      return res.status(500).json(new CustomError(500, 0, "Erreur interne", "Impossible de cr??diter vos jetons."));
    } else {
      return res.status(200).json("OK");
    }
  });
});

// Mettre ?? jour le token firebase de l'utilisateur
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
  var fcmToken = req.body.fcmToken;

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
router.put('/user/invitation', passport.authenticate('bearer', { session: false }), function(req, res){
  var currentUser = req.user;
  var referral = currentUser.referral;
  var code = req.body.invitationCode;

  //console.log(referral);
  // V??rifier si l'utilisateur ?? d??ja valid?? un code d'invitation
  if (referral.referrer != null && referral.referrer != ""){
    return res.status(500).json(new CustomError(500, 0, "Erreur interne", "Vous avez d??j?? valid?? un code d'invitation."));
  }

  // V??rifier la limite de temps
  if (moment(currentUser.createdAt).utc() < moment().utc().subtract(4, 'days')){
    return res.status(500).json(new CustomError(500, 0, "Erreur interne", "Vous avez d??pass?? la date limite de validation d'un code d'invitation."));
  }

  if (code != null){
    code = code.toLowerCase();
  } else {
    return res.status(500).json(new CustomError(500, 0, "Erreur interne", "Vous devez indiquer un code d'invitation ?? valider."));
  }

  async.waterfall([

    // Trouver le propri??taire du code d'invitation
    function(done){
      User.findOne({ "referral.invitationCode": code }, function(err, user){
        if (err){
          return done(new CustomError(500, 0, "Erreur interne", err.message));
        } else if (user == null){
          return done(new CustomError(500, 0, "Erreur interne", "Ce code d'invitation n'existe pas." + code));
        } else {
          // V??rifier que l'utilisateur validant le code n'est pas le parrain du propri??taire du code (cross parainnage)
          try {
            if ( user.referral != null && String(user.referral.referrer) == String(currentUser._id) ){
              return done(new CustomError(500, 0, "Erreur interne","Impossible de valider ce code d'invitation"));
            } else if ( String(user.referral.referrer) == String(currentUser._id) ){
              return done(new CustomError(500, 0, "Erreur interne","Impossible de valider ce code d'invitation"));
            }
          } catch(error){
            //console.log(error);
          }
          //console.log(typeof user.referral.referrer, typeof currentUser._id);
          //return done("stop");
          return done(null, user);
        }
      });
    },

    // Cr??diter l'utilisateur et mettre ?? jour son referrer
    function(referrer, done){
      User.updateOne({ _id: currentUser._id }, { $set: { "referral.referrer": referrer._id }, $inc: { point: referrer.referral.invitationBonus } }, function(err, result){
        if (err){
          return done(new CustomError(500, 0, "Erreur interne",err.message));
        } else {
          //console.log(result);
          return done(null, referrer);
        }
      });
    },

    // Mettre ?? jour les statistiques du parrain
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
      //console.log(err);
      return res.status(500).json(err);
    }

    return res.status(200).json(parseInt(result));
  });

});

router.put('/user/invitation/custom', passport.authenticate('bearer', { session: false }), function(req, res){

  var currentUser = req.user;
  var invitationCode = req.body.invitationCode;
  var locale = currentUser.locale;

  var errLocalized;
  if (locale != null && locale == "fr"){
    errLocalized = {
      "internal": new CustomError(500,1, "Erreur", "Impossible de modifier votre code d'invitation. Merci de r????ssayer ult??rieurement ou de contacter le support si le probl??me persiste."),
      "missing_code": new CustomError(500,1, "Erreur", "Vous devez indiquer un nouveau code d'invitation."),
      "invalid_code": new CustomError(500,1, "Erreur", "Votre code d'invitation personnalis?? doit ??tre compos?? uniquement de chiffres et lettres, contenir entre 4 et 8 charact??res et ne pas contenir un mot offensant."),
      "code_already_used": new CustomError(500,1, "Erreur", "Ce code d'invitation est d??j?? r??serv?? par un utilisateur, merci d'en choisir un autre."),
      "code_already_edited": new CustomError(500,1, "Erreur", "Vous ne pouvez plus modifier votre code d'invitation."),
    };
  } else if (locale != null && locale == "pt"){
    errLocalized = {
      "internal": new CustomError(500,1, "Erro", "N??o ?? poss??vel alterar seu c??digo de convite. Por favor, tente novamente mais tarde ou entre em contato com o suporte se o problema persistir."),
      "missing_code": new CustomError(500,1, "Erro", "Voc?? deve inserir um novo c??digo de convite."),
      "invalid_code": new CustomError(500,1, "Erro", "Seu c??digo de convite personalizado deve consistir apenas em n??meros e letras, conter entre 4 e 8 caracteres e n??o conter uma palavra ofensiva."),
      "code_already_used": new CustomError(500,1, "Erro", "Este c??digo de convite j?? est?? reservado por um usu??rio, por favor, escolha outro."),
      "code_already_edited": new CustomError(500,1, "Erro", "Voc?? n??o pode alterar seu c??digo de convite."),
    };
  } else if (locale != null && locale == "es"){
    errLocalized = {
      "internal": new CustomError(500,1, "Error", "No puedes cambiar tu c??digo de invitaci??n. Int??ntelo m??s tarde o p??ngase en contacto con el servicio de asistencia si el problema persiste."),
      "missing_code": new CustomError(500,1, "Error", "Debe ingresar un nuevo c??digo de invitaci??n."),
      "invalid_code": new CustomError(500,1, "Error", "Su c??digo de invitaci??n personalizado debe consistir ??nicamente en n??meros y letras, contener entre 4 y 8 caracteres y no contener una palabra ofensiva."),
      "code_already_used": new CustomError(500,1, "Error", "Este c??digo de invitaci??n ya est?? reservado por un usuario, elija otro."),
      "code_already_edited": new CustomError(500,1, "Error", "No puedes cambiar tu c??digo de invitaci??n."),
    };
  } else {
    errLocalized = {
      "internal": new CustomError(500,1, "Error", "Can not change your invitation code. Please try again later or contact support if the problem persists."),
      "missing_code": new CustomError(500,1, "Error", "You must enter a new invitation code."),
      "invalid_code": new CustomError(500,1, "Error", "Your custom invitation code must consist only of numbers and letters, contain between 4 and 8 characters and not contain an offensive word."),
      "code_already_used": new CustomError(500,1, "Error", "This invitation code is already reserved by a user, please choose another one."),
      "code_already_edited": new CustomError(500,1, "Error", "You can't change your invitation code."),
    };
  }

  if (currentUser.referral.invitationCodeEditAttempt > 0){
    return res.status(500).json(errLocalized["code_already_edited"]);
  } else if (invitationCode == null || validator.isEmpty(invitationCode)){
    return res.status(500).json(errLocalized["missing_code"])
  } else if (!validator.isAlphanumeric(invitationCode)){
    //console.log("alpha error");
    return res.status(500).json(errLocalized["invalid_code"]);
  } else if (!validator.isLength(invitationCode, { min: 4, max: 8 })){
    return res.status(500).json(errLocalized["invalid_code"]);
  } else if (badWords.isProfane(invitationCode)){
    return res.status(500).json(errLocalized["invalid_code"]);
  }

  invitationCode = invitationCode.toLowerCase();

  User.findOne({ "referral.invitationCode": invitationCode }).exec().then(function(user){
    if (user != null){
      throw errLocalized["code_already_used"];
    } else {
      return User.updateOne({ _id: currentUser._id }, { $set: { "referral.invitationCode": invitationCode }, $inc: { "referral.invitationCodeEditAttempt": 1 } }).exec();
    }
  }).then(function(result){
    //console.log(result);
    if (result.nModified == 0){
      return res.status(500).json(errLocalized["internal"]);
    }
    return res.status(200).json(invitationCode);
  }, function(err){
    if (err instanceof CustomError){
      return res.status(500).json(err);
    } else {
      return res.status(500).json(errLocalized["internal"]);
    }
  });

});

router.delete('/user', passport.authenticate('bearer', { session: false }), function(req, res){
  var currentUser = req.user;
  User.updateOne({ _id: currentUser._id }, { $set: { status: "removal_request" } }).exec()
  .catch(function(err){
    throw err;
  })
  .then(function(result){
    return AccessToken.deleteMany({ userId: String(currentUser._id) });
  })
  .catch(function(err){
    console.log("Failled to delete accesstoken :", err);
  })
  .then(function(result){
    console.log("AccessToken remove result :", result.n);
    return res.status(200).json("OK");
  }, function(err){
    return res.status(500).json(err);
  });
});

module.exports = router;
