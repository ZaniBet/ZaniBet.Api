var express = require('express');
var mongoose = require('mongoose');
var router = express.Router();
var passport = require('passport');
var moment = require('moment');
var requestify = require('requestify');
var mongojs = require('mongojs');
var async = require('async');
var mailer = require('../../lib/mailer');
var paypal = require('paypal-rest-sdk');
paypal.configure({
  'mode': 'sandbox', //sandbox or live
  'client_id': process.env.PAYPAL_CLIENT,
  'client_secret': process.env.PAYPAL_SECRET
});


var Client = mongoose.model('Client');
var Competition = mongoose.model('Competition');
var Team = mongoose.model('Team');
var Fixture = mongoose.model('Fixture');
var GameTicket = mongoose.model('GameTicket');
var User = mongoose.model('User');
var Reward = mongoose.model('Reward');
var Help = mongoose.model('Help');
var Payout = mongoose.model('Payout');


router.post('/paypal/test/paiement', function(req, res){

  var sender_batch_id = Math.random().toString(36).substring(9);

  var create_payout_json = {
      "sender_batch_header": {
          "sender_batch_id": sender_batch_id,
          "email_subject": "You have a payment"
      },
      "items": [
          {
              "recipient_type": "EMAIL",
              "amount": {
                  "value": 0.90,
                  "currency": "EUR"
              },
              "receiver": "contact-buyer@devolios.eu",
              "note": "Thank you.",
              "sender_item_id": "item_3"
          }
      ]
  };

  var sync_mode = 'false';

  paypal.payout.create(create_payout_json, sync_mode, function (error, payout) {
      if (error) {
          console.log(error.response);
          return res.status(500).json(error);
      } else {
          console.log("Create Single Payout Response");
          console.log(payout);
          return res.status(200).json(payout);
      }
  });

});



module.exports = router;
