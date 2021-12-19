var express = require('express');
var mongoose = require('mongoose');
var router = express.Router();
var passport = require('passport');
var moment = require('moment');
var requestify = require('requestify');
var mongojs = require('mongojs');
var async = require('async');
var cors = require('cors')
var validator = require('validator');

moment.locale('fr');

var User = mongoose.model('User');

/*
 Définir l'état d'activation de ZaniHash pour un utilisateur
 Cela permet par la suite de récupérer les statistiques de minage auprès de
 la pool et de créditer l'utilisateur
*/
router.put('/zh/enable/:value', passport.authenticate('bearer', { session: false }), function(req, res){
  var currentUser = req.user;
  var enabled = req.params.value;

  if (enabled == "false"){
    enabled = false;
  } else if (enabled == "true"){
    enabled = true;
  } else {
    return res.status(500).json("KO");
  }

  User.updateOne({ _id: currentUser._id }, { $set: { zaniHashEnabled: enabled } }, function(err, result){
    if (err){
      return res.status(500).json(err);
    } else {
      return res.status(200).json({ active: enabled });
    }
  });
});


router.get('/zh/auth/:email', cors(), function(req, res){
  var email = req.params.email;

  if (email == null || !validator.isEmail(email)){
    return res.status(500).json("KO");
  }

  User.findOneAndUpdate({ email: email }, { $set: { zaniHashEnabled: true } }).exec(function(err, user){
    if (err){
      return res.status(500).json(err);
    } else if (user == null){
      return res.status(500).json('Il n\'y a aucun compte ZaniBet associé à cette adresse email.');
    } else {
      return res.status(200).json({ email: user.email, zanihash: user.wallet.zaniHash });
    }
  });
});

module.exports = router;
