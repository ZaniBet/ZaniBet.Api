var express = require('express');
var mongoose = require('mongoose');
var router = express.Router();
var passport = require('passport');
var moment = require('moment');
var crypto = require('crypto');
var async = require('async');
var validator = require('validator');
var mailer  = require('../../../lib/mailer.js');
var CustomError = require('../../../lib/customerror');
var utils  = require('../../../lib/utils.js');
var config = require('../../../config/global.js');
var FB = require('fb');
var uniqid = require('uniqid');
var Chance = require('chance');
var chance = new Chance();

var User = mongoose.model('User');
var AccessToken = mongoose.model('AccessToken')
var Referral = mongoose.model('Referral');

// Création/Connexion d'un compte avec facebook
router.post('/auth/facebook', passport.authenticate('oauth2-client-password', { session: false }), function(req, res){
  var facebookAccessToken = req.body.accessToken;
  var clientId = req.body.client_id;
  var locale = req.body.locale;

  // Vérifier le token
  var _fbResult;
  FB.api('me', { fields: 'id,name,email,first_name,last_name,gender,locale', access_token: facebookAccessToken }, function (result) {
    _fbResult = result;
    if(result && result.error) {
      if(result.error.code === 'ETIMEDOUT') {
        console.log('Facebook request timeout');
      } else {
        console.log('Facebook error', result.error);
      }
      return res.status(500).json(result.error);
    } else {
      //console.log('Token facebook valide :', result);
      //return res.status(200).json("OK");

      var username = result.first_name + chance.string({ length: 6 });
      var firstname = result.first_name;
      var lastname = result.last_name;
      var facebookId = result.id;
      var email = result.email;
      var gender = result.gender;
      //var birthday = result.birthday;

      if (locale == null || locale == ""){
        if (result.locale != null && result.locale != ""){
          var localeSplit = result.locale.split("_");
          locale = localeSplit[0];
        } else {
          locale = "";
        }
      }

      if (email == null || email == ""){
        email = facebookId + "@facebook.com";
      }

      //console.log(gender, birthday);
      // Trouver un utilisateur ayant le même id ou la même adresse email facebook
      User.findOne({ $or: [ { facebookId: facebookId }, { email: email } ] }, function(err, user){
        if (err){
          return res.status(500).json(err);
        }

        const token = utils.uid(config.token.accessTokenLength);
        const refreshToken = utils.uid(config.token.accessTokenLength);
        var _user;
        if (user == null){
          // Créer un nouvel utilisateur
          if (gender != "male" && gender != "female"){
            gender = "other";
          }

          var referral = new Referral();
          referral.invitationCode = uniqid.time();

          User.create({
            facebookId: facebookId,
            email: email,
            firstname: firstname,
            lastname: lastname,
            username: username,
            facebookAccessToken: facebookAccessToken,
            point: parseInt(process.env.ZANICOIN_WELCOME_REWARD),
            jeton: parseInt(process.env.WELCOME_JETON),
            "wallet.zaniHash": parseInt(process.env.WELCOME_ZANIHASH),
            gender: gender,
            referral: referral,
            locale: locale,
            emailVerifyToken: chance.hash()
          }).then(function(user){
            _user = user;
            return AccessToken.create({ token: token, expirationDate: config.token.calculateExpirationDate(), userId: user._id, clientId: clientId });
          }).then(function(accessToken){
            if (email.indexOf("@facebook.com") == -1){
              mailer.sendWelcomeMail(res, _user).then(function(result){
                return res.status(200).json({ access_token: accessToken.token, expire_id: accessToken.expirationDate, refresh_token: accessToken.refreshToken });
              }, function(err){
                return res.status(200).json({ access_token: accessToken.token, expire_id: accessToken.expirationDate, refresh_token: accessToken.refreshToken });
              });
            } else {
              return res.status(200).json({ access_token: accessToken.token, expire_id: accessToken.expirationDate, refresh_token: accessToken.refreshToken });
            }
          }, function(err){
            console.log(err, _fbResult);
            return res.status(500).json(err);
          });
        } else {
          // ANTI-Hack
          if (user.facebookId == null && user.email != null){
            return res.status(500).json("The email attached to the facebook account already used.");
          }

          if (user.status == "banned"){
            //return done(new CustomError(500, 0, "","Account suspended : TOS Violation"));
            return res.status(500).json(new CustomError(500, 0, "","Account suspended : TOS Violation"));
          } else if (user.status == "removal_request"){
            //return done(new CustomError(500, 0, "Erreur", "Vous avez demandé la suppression de votre compte, celui ci à donc été désactivé et toutes les données relatives à votre compte seront supprimées à l'échéance du délai légal."));
            return res.status(500).json(new CustomError(500, 0, "Erreur", "Vous avez demandé la suppression de votre compte, celui ci à donc été désactivé et toutes les données relatives à votre compte seront supprimées à l'échéance du délai légal."));
          }

          // Créer ou mettre à jour un token
          AccessToken.findOneAndUpdate({ userId: user._id, clientId: clientId, expirationDate: { $gt: moment() } }, { $set: { token: token, expirationDate: config.token.calculateExpirationDate(), refreshToken: refreshToken } }, { upsert:true, new:true }).sort({ expirationDate: -1 }).then(function(accessToken){
            //console.log('Fresh accessToken:', accessToken);
            return res.status(200).json({ access_token: accessToken.token, expire_id: accessToken.expirationDate, refresh_token: accessToken.refreshToken });
          }, function(err){
            console.log(err, _fbResult);
            return res.status(500).json(err);
          });
        }
      });
    }
  });
});

// Demande de restauration du mot de passe depuis l'aplication
router.put('/auth/reset-password', passport.authenticate('oauth2-client-password', { session: false }), function(req, res, next){

  var email = req.body.email;

  if (email == null || !validator.isEmail(email)){
    return res.status(500).json(new CustomError(50, "Error", "You must indicate the email address linked to your account."));
  }

  email = email.toLowerCase();

  // Initiliser un tableau de fonction asynchrone
  async.waterfall([
    // Générer hash de vérification pour reset de l'email
    function(done) {
      crypto.randomBytes(20, function(err, buf) {
        if (buf != null){
          var token = buf.toString('hex');
          return done(null, token);
        } else {
          // SYSTEM ERROR
          return done(new CustomError(500, 500, "","Erreur innatendue"));
        }
      });
    },

    // Vérifier si l'adresse email appartient à un utilisateur
    function(token, done) {
      User.findOne({ email: email }, function(err, user) {
        if (!user) {
          return done(new CustomError(500, 500, "","Aucun compte n'est enregistré avec cette adresse email."));
        } else {
          if (user.status == "banned"){
            return done(new CustomError(500, 500, "","Account suspended : TOS Violation"));
          } else if (user.status == "removal_request"){
            return done(new CustomError(500, 0, "Erreur", "Vous avez demandé la suppression de votre compte, celui ci à donc été désactivé et toutes les données relatives à votre compte seront supprimées à l'échéance du délai légal."));
          }

          // Vérifier si un token de reset existe déjà et si il n'a pas expiré
          if (user.resetPasswordToken != null && user.resetPasswordExpires > Date.now()){
            return done(new CustomError(500, 500, "","Vous avez déjà demander la restauration de votre mot de passe il y a moins d'une heure. Merci de suivre la procédure que vous avez reçu par email."));
          }

          user.resetPasswordToken = token;
          user.resetPasswordExpires = Date.now() + (1000 * 60 * 60 * 1); // 24 hour

          user.save(function(err) {
            if (err){
              return done(new CustomError(500, 500, "", "Unable to update user"));
            } else {
              return done(null, token, user);
            }
          });
        }
      });
    },

    // Envoi de l'email de restauration du mot de passe
    function(token, user, done) {
      mailer.sendResetPasswordMail(res, user).then(function(response){
        done(null);
      }, function(err){
        //if (err) console.log("Une erreur est survenue lors de l'envoi des instructions de restauration de mot de passe du l'utilisation:", user.email);
        done(null);
      });
    }
    
  ], function(err) {
    if (err){
      return res.status(500).json(err);
    }

    return res.status(200).json(true);
  });
});

// Change password with reset token
router.put('/auth/reset-password/:token', function(req, res){
  var newPassword = req.body.password;
  var confirmNewPassword = req.body.confirmPassword;

  if (newPassword == null || confirmNewPassword == null){
    return res.status(500).json("KO");
  }

  if (!validator.isLength(newPassword, { min: 6, max: 256})){
    return res.status(500).json({ message: "Le mot de passe doit contenir au moins 6 caractères et pas plus de 256." });
  } else if (!validator.isLength(confirmNewPassword, { min: 6, max: 256})){
    return res.status(500).json({ message: "Le mot de passe doit contenir au moins 6 caractères et pas plus de 256." });
  } else if (newPassword != confirmNewPassword){
    return res.status(500).json({ message: "Les mots de passe ne correspondent pas." });
  }

  async.waterfall([
    function(done) {
      User.findOne({ resetPasswordToken: req.params.token, resetPasswordExpires: { $gt: Date.now() } }, function(err, user) {
        //console.log('User find one: ' + user);
        if (err) {
          //return res.status(500).json({ message: "User not found" });
          done(new Error("Une erreur c'est produite !"));
          return;
        } else if (!user){
          done(new Error("Le liens de restauration du mot de passe est invalide ou a expiré. Merci d'effectuer une nouvelle demande."));
          return;
        }

        if (user.status == "banned"){
          return done(new Error("Account suspended : TOS Violation"));
        }

        // Un utilisateur a été trouvé
        user.setPassword(newPassword, function(error, user){
          if (error == null){
            user.resetPasswordToken = undefined;
            user.resetPasswordExpires = undefined;
            user.save();
            done(null, user);
          } else {
            done(new Error(error.message));
          }
        });

      });
    },
    function(user, done) {
      mailer.sendResetPasswordConfirm(res, user).then(function(response){
        done(null);
      }, function(err){
        done(null);
      });
    }
  ], function(err) {
    if (err) return res.status(500).json({ message : err.message});
    return res.status(200).json(true);

  });
});

module.exports = router;
