var express = require('express');
var mongoose = require('mongoose');
var router = express.Router();
var passport = require('passport');
var moment = require('moment');
var requestify = require('requestify');
var mongojs = require('mongojs');
var async = require('async');

moment.locale('fr');

var Client = mongoose.model('Client');
var Reward = mongoose.model('Reward');

router.post('/reward/install', function(req, res){
  var rewardArr = [
    {
      name: "ZaniCoin",
      brand: "ZaniCoin",
      amount: 10000,
      price: 60000000,
      active: true,
      currency: "ZaniHash"
    },
    {
      name: "ZaniCoin",
      brand: "ZaniCoin",
      amount: 20000,
      price: 108000000,
      active: true,
      currency: "ZaniHash"
    },
    {
      name: "ZaniCoin",
      brand: "ZaniCoin",
      amount: 40000,
      price: 204000000,
      active: true,
      currency: "ZaniHash"
    },
    {
      name: "ZaniCoin",
      brand: "ZaniCoin",
      amount: 80000,
      price: 360000000,
      active: true,
      currency: "ZaniHash"
    },
    {
      name: "Jetons",
      brand: "Jeton",
      amount: 10,
      price: 1800000,
      active: true,
      currency: "ZaniHash"
    },
    {
      name: "Jetons",
      brand: "Jeton",
      amount: 50,
      price: 8100000,
      active: true,
      currency: "ZaniHash"
    },
    {
      name: "Jetons",
      brand: "Jeton",
      amount: 150,
      price: 22900000,
      active: true,
      currency: "ZaniHash"
    },
    {
      name: "Jetons",
      brand: "Jeton",
      amount: 400,
      price: 50000000,
      active: true,
      currency: "ZaniHash"
    },
    {
      name: "PayPal",
      brand: "PayPal",
      amount: 20,
      price: 190000,
      active: false,
      currency: "ZaniCoin"
    },
    {
      name: "PayPal",
      brand: "PayPal",
      amount: 10,
      price: 100000,
      active: true,
      currency: "ZaniCoin"
    },
    {
      name: "PayPal",
      brand: "PayPal",
      amount: 5,
      price: 75000,
      active: true,
      currency: "ZaniCoin"
    },
    {
      name: "PayPal",
      brand: "PayPal",
      amount: 2.50,
      price: 38000,
      active: false,
      currency: "ZaniCoin"
    },
    {
      name: "PayPal",
      brand: "PayPal",
      amount: 1,
      price: 16000,
      active: true,
      currency: "ZaniCoin"
    },
    {
      name: "PayPal",
      brand: "PayPal",
      amount: 0.50,
      price: 9000,
      active: false,
      currency: "ZaniCoin"
    },

    {
      name: "Bitcoin",
      brand: "Bitcoin",
      amount: 5,
      price: 90000,
      active: true,
      currency: "ZaniCoin"
    },
    {
      name: "Bitcoin",
      brand: "Bitcoin",
      amount: 2.50,
      price: 45600,
      active: true,
      currency: "ZaniCoin"
    },
    {
      name: "Bitcoin",
      brand: "Bitcoin",
      amount: 1,
      price: 19200,
      active: true,
      currency: "ZaniCoin"
    },
    {
      name: "Bitcoin",
      brand: "Bitcoin",
      amount: 0.50,
      price: 10800,
      active: true,
      currency: "ZaniCoin"
    },

    {
      name: "Amazon",
      brand: "Amazon",
      amount: 20,
      price: 190000,
      active: false,
      currency: "ZaniCoin"
    },
    {
      name: "Amazon",
      brand: "Amazon",
      amount: 10,
      price: 100000,
      active: true,
      currency: "ZaniCoin"
    },
    {
      name: "Amazon",
      brand: "Amazon",
      amount: 5,
      price: 75000,
      active: true,
      currency: "ZaniCoin"
    },
    {
      name: "Amazon",
      brand: "Amazon",
      amount: 2.50,
      price: 38000,
      active: true,
      currency: "ZaniCoin"
    },
    {
      name: "Amazon",
      brand: "Amazon",
      amount: 1,
      price: 16000,
      active: true,
      currency: "ZaniCoin"
    },
    {
      name: "Amazon",
      brand: "Amazon",
      amount: 0.50,
      price: 9000,
      active: true,
      currency: "ZaniCoin"
    }];

    async.eachLimit(rewardArr, 1, function(reward, eachReward){
      Reward.findOne({ name: reward.name, $or: [{ value: reward.amount }, { "amount.euro": reward.amount }] }, function(err, rwd){
        if (err){
          console.log(err);
          return eachReward();
        } else if (rwd != null){
          console.log("La récompense existe déjà !");
          if (!rwd.hasOwnProperty('value')){
            Reward.updateOne({ _id: rwd._id }, { $set: { value: reward.amount } }, function(err, result){
              if (err){
                console.log(err);
                return eachReward();
              } else {
                console.log("La récompense a été mise à jour");
                return eachReward();
              }
            });
          } else {
            return eachReward();
          }
        } else {
          Reward.create({ value: reward.amount, name: reward.name, price: parseInt(reward.price), brand: reward.brand, active: reward.active, currency: reward.currency }, function(err, result){
            if (err){
              console.log(err);
              return eachReward();
            } else {
              return eachReward();
            }
          });
        }
      });

      /*Reward.findOneAndUpdate({ value: reward.amount, name: reward.name }, { $set: { price: reward.price, brand: reward.brand, name: reward.name, active: reward.active } }, { setDefaultsOnInsert: true, upsert: true }, function(err, reward){
      eachReward();
    });*/
  }, function(err){
    return res.status(200).json("OK");
  });
});


module.exports = router;
