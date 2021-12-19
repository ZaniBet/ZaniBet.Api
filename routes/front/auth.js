var express = require('express');
var mongoose = require('mongoose');
var router = express.Router();
var passport = require('passport');
var moment = require('moment');
var crypto = require('crypto');
var async = require('async');
var validator = require('validator');
var mailer  = require('../../lib/mailer.js');
var CustomError = require('../../lib/customerror');
var utils  = require('../../lib/utils.js');
var config = require('../../config/global.js');
var FB = require('fb');
var accepts = require('accepts');

var User = mongoose.model('User');
var AccessToken = mongoose.model('AccessToken')

/*
* Formulaire de modification du mot de passe
*/
router.get('/auth/reset-password/:token', function(req, res){
  var accept = accepts(req);

  var translation;
  switch (accept.languages(['fr', 'pt'])) {
    case 'fr':
    translation = {
      "title": "ZaniBet - Définir un nouveau mot de passe",
      "reset-password": "Définir un nouveau mot de passe",
      "new-password": "Nouveau mot de passe",
      "confirm-new-password": "Re-indiquer le nouveau mot de passe",
      "submit-new-password": "Modifier mot de passe"
    };
    break;
    case 'pt':
    translation = {
      "title": "ZaniBet - Definir uma nova senha",
      "reset-password": "Definir uma nova senha",
      "new-password": "Nova senha",
      "confirm-new-password": "Confirme a nova senha",
      "submit-new-password": "Alterar senha"
    };
    break;
    default:
    translation = {
      "title": "ZaniBet - Reset password",
      "reset-password": "Reset your password",
      "new-password": "Set new password",
      "confirm-new-password": "Confirm new password",
      "submit-new-password": "Submit new password"
    };
    break;
  }


  return res.render('resetpassword', { translation: translation });
});

/*
* Confirmation de l'adresse email
*/
router.get('/auth/verify-email/:token', function(req, res){
  var token = req.params.token;

  if (token == null || token.length > 254){
    return res.send("Ce lien est invalide ou à expiré");
  }

  User.findOneAndUpdate({ emailVerifyToken: token }, { $set: { emailVerified: true }, $unset: { emailVerifyToken: "" } }, function(err, user){
    if (err) return res.send("Impossible de confirmer l'adresse email");
    return res.send("L'adresse email de votre compte ZaniBet a été confirmée.");
  });
});


/*
* Effectuer la modification du mot de passe avec le token
*/
router.put('/auth/reset-password/:token', function(req, res){
  var newPassword = req.body.password;
  var confirmNewPassword = req.body.confirmPassword;

  var accept = accepts(req);

  /*var translation;
  switch (accept.languages(['fr', 'pt'])) {
    case 'fr':
    translation = {
      "":""
    };
    break;
    case 'pt':
    translation = {
      "":""
    };
    break;
    default:
    translation = {
      "":""
    };
    break;
  }*/

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
        console.log('User find one: ' + user);
        if (err) {
          //return res.status(500).json({ message: "User not found" });
          done(new Error("Une erreur c'est produite !"));
          return;
        } else if (!user){
          done(new Error("Le liens de restauration du mot de passe est invalide ou a expiré. Merci d'effectuer une nouvelle demande."));
          return;
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
