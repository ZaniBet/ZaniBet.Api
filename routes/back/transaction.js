var express = require('express');
var mongoose = require('mongoose');
var router = express.Router();
var passport = require('passport');
var moment = require('moment');
var requestify = require('requestify');
var mongojs = require('mongojs');
var async = require('async');
var FootballDataApi = require('../../fetcher/footballdata');
var SportMonks = require('../../fetcher/sportmonks');

moment.locale('fr');

var Transaction = mongoose.model('Transaction');
var Team = mongoose.model('Team');


router.delete('/transactions/zanianalytics', function(req, res){

  Transaction.remove({ source: "ZaniAnalytics", createdAt: { $lt: moment().utc().subtract(1, 'month') } }).exec(function(err, count){
    console.log(count);
    if (err){
      return res.status(500).json(err);
    } else {
      return res.status(200).json(count);
    }
  });
});



module.exports = router;
