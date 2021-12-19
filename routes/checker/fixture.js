var express = require('express');
var mongoose = require('mongoose');
var router = express.Router();
var passport = require('passport');
var moment = require('moment');
var requestify = require('requestify');
var mongojs = require('mongojs');
var async = require('async');
var gcm = require('../../lib/gcm');
var Chance = require('chance');
var uniqid = require('uniqid');
var fs = require('fs');

var Client = mongoose.model('Client');
var Competition = mongoose.model('Competition');
var Team = mongoose.model('Team');
var Fixture = mongoose.model('Fixture');
var GameTicket = mongoose.model('GameTicket');
var Grille = mongoose.model('Grille');
var User = mongoose.model('User');

router.get('/fixtures/checkDoublon', function(req, res){
  console.log(moment().utc().add(2, 'day'));
  var _countUndeletable = 0;
  var _orphanFixtureArr = [];
  async.waterfall([

    // Récupérer les matchs en doublon
    function(done){
      Fixture.aggregate([
        //{ $match: { status: "waiting_result"/*, date: { $gt: moment().utc().add(2, 'day').toDate() }*/ } },
        //{ $group: { _id: "$api.sportmonks", total: { $sum: 1 } } },
        { $match: { isFriendly: false, isCup: false } },
        { $group: { _id: { name: "$name", matchDay: "$matchDay", competition: "$competition" }, total: { $sum: 1 } } },
        { $match: { total: { $gt: 1 } } }
      ], function(err, result){
        if (err){
          return done(err);
        } else {
          console.log(result.length);
          //console.log(result);
          //return done("stop");
          return done(null, result);
        }
      });
    },

    // Pour chaque match en doublon vérifier l'existance d'un ticket
    function(doublons, done){
      async.eachLimit(doublons, 1, function(doublon, eachDoublon){
        var corruptedFixtures = [];
        if (doublon.total < 2){
          console.log("Erreur de considération de doublon ?!", doublon._id);
          return eachDoublon();
        } else {
          var fixtureQuery;
          if (typeof doublon._id === 'object'){
            //console.log("doublon is object");
            fixtureQuery = Fixture.find({ name: doublon._id.name, matchDay: doublon._id.matchDay, competition: doublon._id.competition });
          } else {
            fixtureQuery = Fixture.find({ "api.sportmonks": doublon._id });
          }


          fixtureQuery.exec().then(function(fixtures){
            if (fixtures.length == 0 || fixtures.length < 2){
              throw "stop : " + fixtures.length;
            } else {
              corruptedFixtures = fixtures.map(f => f._id);
              return GameTicket.find({ fixtures: { $in: fixtures.map(f => f._id ) } }).exec();
            }
          }).then(function(gametickets){
            var containMatchday = false;
            var countMatchDay = 0;
            var containTournament = false;
            var countTournament = 0;

            for (var i = 0; i < gametickets.length; i++){
              if (gametickets[i].type == "MATCHDAY"){
                containMatchday = true;
                countMatchDay++;
              } else if (gametickets[i].type == "TOURNAMENT"){
                containTournament = true;
                countTournament++;
              }
            }

            if (gametickets.length == 0){
              console.log("Le match ne possède aucun ticket !");
              Fixture.remove({ $in: { _id: corruptedFixtures } }).exec(function(err, result){

                if (!err) console.log("Resultat de la suppression :", result.result);
                process.nextTick(function() {
                  eachDoublon();
                });
              });
            } else if (containMatchday){

              console.log("Le match est utilisé dans un ticket matchday !");
              //console.log(gametickets);
              var isDeletable = false;
              if (countMatchDay == 1){

                // Vérifier si les tickets matchday sont fermés afin de pouvoir
                // entamer une suppression des tickets et matchs
                for (var i = 0; i < gametickets.length; i++){
                  if (gametickets[i].type == "MATCHDAY" && gametickets[i].status == "close"){
                    console.log("Les tickets liés au match peuvent être supprimés.")
                    isDeletable = true;
                  }
                }

                if (isDeletable){
                  console.log("Procéder à la suppression des tickets matchday et autres...");
                  GameTicket.remove({ status: "close", _id: { $in: gametickets.map(gt => gt._id) } })
                  .exec()
                  .then(function(result){
                    console.log("Resultat de la suppression des tickets matchday/simple:", result.result);
                    console.log("Procéder à la suppression des matchs");
                    var fixtureRemoveQuery;
                    if (typeof doublon._id === 'object'){
                      //console.log("doublon is object");
                      fixtureRemoveQuery = Fixture.remove({ name: doublon._id.name, matchDay: doublon._id.matchDay, competition: doublon._id.competition });
                    } else {
                      fixtureRemoveQuery = Fixture.remove({ "api.sportmonks": doublon._id });
                    }
                    return fixtureRemoveQuery.exec();
                  }).then(function(result){
                    console.log("Resultat de la suppression des matchs:", result.result);
                    process.nextTick(function() {
                      eachDoublon();
                    });
                  }, function(err){
                    console.log(err);
                    process.nextTick(function() {
                      eachDoublon();
                    });
                  });
                } else {
                  _countUndeletable++;
                  process.nextTick(function() {
                    eachDoublon();
                  });
                }
              } else {
                console.log("Il y a plusieurs tickets matchday/tournament potentiellement corrumpu, aucune action n'est recommandée.");
                _countUndeletable++;
                process.nextTick(function() {
                  eachDoublon();
                });
              }
            } else {
              console.log("Procéder à la suppression des tickets (SINGLE/TOURNAMENT) et matchs");
              GameTicket.remove({ status: "close", $or: [{ type: "SINGLE"} , {type: "TOURNAMENT"}], _id: { $in: gametickets.map(gt => gt._id) } })
              .exec()
              .then(function(result){
                console.log("Resultat de la suppression des tickets simples:", result.result);
                console.log("Procéder à la suppression des matchs");
                var fixtureRemoveQuery;
                if (typeof doublon._id === 'object'){
                  //console.log("doublon is object");
                  fixtureRemoveQuery = Fixture.remove({ name: doublon._id.name, matchDay: doublon._id.matchDay, competition: doublon._id.competition });
                } else {
                  fixtureRemoveQuery = Fixture.remove({ "api.sportmonks": doublon._id });
                }
                return fixtureRemoveQuery.exec();
              }).then(function(result){
                console.log("Resultat de la suppression des matchs:", result.result);
                process.nextTick(function() {
                  eachDoublon();
                });
              }, function(err){
                console.log(err);
                process.nextTick(function() {
                  eachDoublon();
                });
              });
            }
          }, function(err){
            console.log(err);
            process.nextTick(function() {
              eachDoublon();
            });
          });
        }
      }, function(err){
        console.log("Undeletable :", _countUndeletable);
        //console.log("Orphan fixtures :", _orphanFixtureArr);
        if (err){
          console.log(err);
          return done(err);
        } else {
          return done();
        }
      });
    },

    // Traiter les matchs potentiellement orphelin
    function(done){
      console.log("Traitement des matchs orphelin");
      return done("stop");
      async.eachLimit(_orphanFixtureArr, 1, function(orphanFixture, eachOrphanFixture){
        GameTicket.find({ fixtures: { $in: [orphanFixture] } }).exec().then(function(gametickets){
          if (gametickets.length == 0){
            console.log(gametickets.length);
            //return Promise.resolve("OK");
            return Fixture.remove({ _id: orphanFixture }).exec();
          } else {
            console.log("Ne pas supprimer le match car des tickets existes !");
            throw "STOP";
          }
        }).then(function(result){
          console.log(result.result);
          process.nextTick(function() {
            eachOrphanFixture();
          });
        }, function(err){
          console.log(err);
          process.nextTick(function() {
            eachOrphanFixture();
          });
        });
      }, function(err){
        if (err){
          return done(err);
        } else {
          return done("OK");
        }
      });
    }

  ], function(err, result){
    if (err){
      console.log(err);
      return res.status(500).json(err);
    } else {
      console.log(result.length);
      return res.status(200).json(result);
    }
  });

});

router.put('/fixtures/checkGameticket', function(req, res){

  var allowedLeagues = [
    "LIGUE1-2018",
    "EREDIVISIE-2018",
    "BUNDESLIGA1-2018",
    "SERIEAITA-2018",
    "PLEAGUE-2018",
    "LIGANOS-2018",
    "LALIGA-2018",
    "SUPERLIG-2018",
    "EFLCHAMPIONSHIP-2018",
    "PROLEAGUE-2018",
    "ALLSVENSKAN-2018",
    "ELITESERIEN-2018",
    "TIPICOBUNDESLIGA-2018",
    "PLEAGUEUKR-2018",
    "CHAMPIONSLEAGUE-2018",
    "EUROPALEAGUE-2018",
    "PLEAGUERUS-2018",
    "LEAGUEONE-2018",
    "SCOTTPRE-2018"
  ];

  async.waterfall([

    function(done){
      Fixture.find({ competition: { $nin: allowedLeagues }, status: "soon" }, function(err, fixtures){
        if (err){
          return done(err);
        } else {
          console.log(fixtures.length);
          return done(null, fixtures);
        }
      });
    },

    function(fixtures, done){
      var potentialDelete = 0;
      async.eachLimit(fixtures, 1, function(fixture, eachFixture){

        GameTicket.find({ fixtures: { $in: [fixture._id] } }).exec().then(function(gametickets){
          if (gametickets.length == 0){
            potentialDelete++;
            //console.log(potentialDelete);
            //eachFixture();
            return Fixture.remove({ _id: fixture._id }).exec();
          } else {
            eachFixture();
          }
        }).then(function(result){
          console.log("Deleted result", result.result.n);
          eachFixture();
        }, function(err){
          eachFixture();
        });
      }, function(err){
        console.log(potentialDelete);
        return done(err);
      });
    }
  ], function(err, result){
    if (err){
      return res.status(500).json(err);
    }
    return res.status(200).json("OK");
  });

});

module.exports = router;
