var express = require('express');
var mongoose = require('mongoose');
var router = express.Router();
var passport = require('passport');
var moment = require('moment');
var requestify = require('requestify');
var mongojs = require('mongojs');
var async = require('async');
var cmd = require('node-cmd');

router.get('/worker', function(req, res){
  res.render('admin/worker');
});

router.post('/worker', function(req, res){
  var worker = req.body.worker;
  console.log(worker);
  cmd.get(
    'DEBUG=node-gcm node ' + worker,
    function(err, data, stderr){
      console.log("err:", err);
      console.log("stderr:", stderr);
      console.log(data);
      if (err){
        return res.status(500).json(err);
      } else {
        return res.status(200).json(data);
      }
    }
  );
});

module.exports = router;
