var express = require('express');
var router = express.Router();
var validator = require('validator');

var mongoose = require('mongoose');
var User = mongoose.model('User');

router.get('/referrer/:invitationCode', function(req, res){
  var invitationCode = req.params.invitationCode;

  if (!validator.isAlphanumeric(invitationCode)){
    return res.render('invitation', { referrer: "ZaniBet", invitationCode: "zanibet", montant: 1000 });
  }

  invitationCode = invitationCode.toLowerCase().trim();

  User.findOne({ "referral.invitationCode": invitationCode }).exec(function(err, user){
    if (err){
      return res.render('invitation', { referrer: "ZaniBet", invitationCode: "zanibet", montant: 1000 });
    } else if (user == null) {
      return res.render('invitation', { referrer: "ZaniBet", invitationCode: "zanibet", montant: 1000 });
    } else {
      return res.render('invitation', { referrer: user.username, invitationCode: invitationCode, montant: user.referral.invitationBonus });
    }
  });
});


module.exports = router;
