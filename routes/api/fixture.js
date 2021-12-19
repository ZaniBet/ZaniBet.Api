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
var Competition = mongoose.model('Competition');
var Team = mongoose.model('Team');
var Fixture = mongoose.model('Fixture');
var GameTicket = mongoose.model('GameTicket');

router.get('/fixtures/:fixtureId/stats',  passport.authenticate('bearer', { session: false }), function(req, res){
  var fixtureId = req.params.fixtureId;

  Fixture.findOne({ _id: fixtureId }, function(err, fixture){
    if (err){
      return res.status(500).json(err);
    } else {
      //console.log(fixture);
      async.parallel({
        homeFixtures: function(callback) {
          Fixture.find({ status: "done", $or: [{ homeTeam: mongoose.Types.ObjectId(fixture.homeTeam) }, { awayTeam: mongoose.Types.ObjectId(fixture.homeTeam) }], _id: { $ne: fixtureId } })
          .sort({ date: -1 }).limit(5).populate('competition homeTeam awayTeam').exec(function(err, fixtures){
            if (err){
              console.log(err);
            }
            callback(null, fixtures);
          });
        },
        awayFixtures: function(callback) {
          Fixture.find({ status: "done", $or: [{ homeTeam: fixture.awayTeam }, { awayTeam: fixture.awayTeam }], _id: { $ne: fixtureId } })
          .sort({ date: -1 }).limit(5).populate('competition homeTeam awayTeam').exec(function(err, fixtures){
            if (err){
              console.log(err);
            }
            callback(null, fixtures);
          });
        }
      }, function(err, results) {
        // results is now equals to: {one: 1, two: 2}
        if (err){
          return res.status(500).json(err);
        } else {
          //console.log(results);
          return res.status(200).json({ lastHomeFixtures: results.homeFixtures, lastAwayFixtures: results.awayFixtures });
        }
      });
    }
  });

});


module.exports = router;
