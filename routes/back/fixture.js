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
var Chance = require('chance');
var chance = new Chance();

const chalk = require('chalk');
const chalkInit = chalk.green;
const chalkTask = chalk.cyan;
const chalkDone = chalk.blue;
const chalkError = chalk.bold.red;
const chalkWarning = chalk.bold.yellow;


var Client = mongoose.model('Client');
var Competition = mongoose.model('Competition');
var Team = mongoose.model('Team');
var Fixture = mongoose.model('Fixture');
var GameTicket = mongoose.model('GameTicket');
var User = mongoose.model('User');
var Reward = mongoose.model('Reward');
var SocialTask = mongoose.model('SocialTask');

router.get('/fixtures', function(req, res){
  // Ajaw Query
  if (req.xhr || req.headers.accept.indexOf('json') > -1) {
    var drawQuery = parseInt(req.query.draw);
    var startQuery = parseInt(req.query.start);
    var lengthQuery = parseInt(req.query.length);

    async.parallel({
      fixtures: function(callback){
        var rangeStart = moment().utc().startOf('day');
        var rangeStop = moment().utc().endOf('day');
        Fixture.find().skip(startQuery).limit(lengthQuery).populate('homeTeam awayTeam competition').exec(function(err, fixtures){
          if (err) return callback(err);
          callback(null, fixtures);
        });
      },
      countFixtures: function(callback){
        Fixture.count(function(err, count){
          if (err) return callback(err);
          callback(null, count);
        });
      }
    }, function(err, result){
      if (err) return res.status(500).json(err);
      res.status(200).json({ draw: drawQuery, data: result.fixtures, recordsTotal: result.countFixtures, recordsFiltered: result.countFixtures });
    });
  } else {
    async.parallel({
      fixturesToday: function(callback){
        var rangeStart = moment().utc().startOf('day');
        var rangeStop = moment().utc().endOf('day');
        Fixture.find({ date: { $gt: rangeStart, $lt: rangeStop } }).sort({ date: 1 }).populate('homeTeam awayTeam competition').exec(function(err, fixtures){
          if (err) return callback(err);
          //console.log(fixtures);
          callback(null, fixtures);
        });
      },
      countFixtures: function(callback){
        Fixture.count(function(err, count){
          if (err) return callback(err);
          callback(null, count);
        });
      },
      countFixturesMonth: function(callback){
        Fixture.count({ date: { $gt: moment().utc().startOf('month'), $lt: moment().utc().endOf('month') } }, function(err, count){
          if (err) return callback(err);
          callback(null, count);
        });
      }
    }, function(err, result){
      if (err) return res.render('admin/fixtures', { fixturesToday: null, countFixtures: 0, countFixturesMonth: 0, activePage: "fixtures" });
      res.render('admin/fixtures', {
        fixturesToday: result.fixturesToday,
        countFixtures: result.countFixtures,
        countFixturesMonth: result.countFixturesMonth,
        activePage: "fixtures" });
      });
    }
  });

  /*
  * R??cup??rer la liste des matchs corrumpu
  */
  router.get('/fixtures/corrupted', function(req, res){
    async.waterfall([

      function(done){
        console.log(chalkTask("R??cup??rer la liste des matchs en attente."));
        Fixture.find({ date: { $lt: moment().utc().subtract(1, 'days') }, $or: [{status: 'playing'}, {status: 'soon'}, {status: 'postphoned'}] })
        //.limit(20)
        .populate('homeTeam awayTeam competition')
        .sort({ date: 1 })
        //.limit(40)
        .exec(function(err, fixtures){
          if (err){
            return done(err);
          } else if (fixtures == null || fixtures.length == 0){
            return done("Aucun match ?? v??rifier.");
          } else {
            console.log(fixtures.length, "matchs ?? v??rifier");
            return done(null, fixtures);
          }
        });
      },

      // R??cup??rer les matchs des tickets simple en attente de r??sultat
      function(fixtures, done){
        console.log(chalkTask("R??cup??rer les matchs des tickets simple en attente de r??sultat."));
        GameTicket.find({ type: "SINGLE", status: "waiting_result", resultDate: { $lt: moment().utc().subtract(2, 'hours') }, fixtures: { $nin: fixtures } })
        .exec()
        .then(function(gametickets){
          var fixturesId = [];
          gametickets.forEach(function(gt){
            fixturesId.push(gt.fixtures[0]);
          });
          return Fixture.find({ _id: { $in: fixturesId } }).populate('homeTeam awayTeam competition').exec();
        }).then(function(fix){
          console.log("Il y a", fix.length, "matchs ?? ajouter dans la liste.");
          var fixFiltered = fix.filter(f => fixtures.indexOf(f) == -1);
          console.log("Il y a", fixFiltered.length, "matchs filtr??s ?? ajouter dans la liste.");
          //return done("stop");
          return done(null, fixtures.concat(fixFiltered));
        }, function(err){
          console.log(chalkError("Impossible de r??cup??rer les matchs des tickets simple en attente !"));
          return done(err);
        });
      },

      function(fixtures, done){
        console.log(chalkTask("R??cup??rer les matchs des tickets matchday en attente de r??sultat."));
        GameTicket.find({ type: "MATCHDAY", status: "waiting_result", resultDate: { $lt: moment().utc().subtract(2, 'hours') }, fixtures: { $nin: fixtures } })
        .exec()
        .then(function(gametickets){
          var fixturesId = [];
          gametickets.forEach(function(gt){
            fixturesId = fixturesId.concat(gt.fixtures);
          });
          return Fixture.find({ _id: { $in: fixturesId } }).populate('homeTeam awayTeam competition').exec();
        }).then(function(fix){
          console.log("Il y a", fix.length, "matchs ?? ajouter dans la liste.");
          var fixFiltered = fix.filter(f => fixtures.indexOf(f) == -1);
          console.log("Il y a", fixFiltered.length, "matchs filtr??s ?? ajouter dans la liste.");
          //return done("stop");
          return done(null, fixtures.concat(fixFiltered));
        }, function(err){
          console.log(chalkError("Impossible de r??cup??rer les matchs des tickets matchday en attente !"));
          return done(err);
        });
      },

      function(fixtures, done){
        console.log(chalkTask("R??cup??rer les matchs des tickets tournament en attente de r??sultat."));
        GameTicket.find({ type: "TOURNAMENT", status: "waiting_result", resultDate: { $lt: moment().utc().subtract(2, 'hours') }, fixtures: { $nin: fixtures } })
        .exec()
        .then(function(gametickets){
          var fixturesId = [];
          gametickets.forEach(function(gt){
            fixturesId = fixturesId.concat(gt.fixtures);
          });
          return Fixture.find({ _id: { $in: fixturesId } }).populate('homeTeam awayTeam competition').exec();
        }).then(function(fix){
          console.log("Il y a", fix.length, "matchs ?? ajouter dans la liste.");
          var fixFiltered = fix.filter(f => fixtures.indexOf(f) == -1);
          console.log("Il y a", fixFiltered.length, "matchs filtr??s ?? ajouter dans la liste.");
          //return done("stop");
          return done(null, fixtures.concat(fixFiltered));
        }, function(err){
          console.log(chalkError("Impossible de r??cup??rer les matchs des tickets tournament en attente !"));
          return done(err);
        });
      }

    ], function(err, result){
      if (err){
        return res.render('admin/fixtures/corrupted', { activePage: "fixtures/corrupted", fixtures: [] });
      }
      //result = result.filter(f => f.status != "postphoned");
      console.log("Il y a", result.length, "matchs filtr??s ?? ajouter dans la liste.");

      result.sort(function(a, b){
        return a.date - b.date;
      });
      res.render('admin/fixtures/corrupted', { activePage: "fixtures/corrupted", fixtures: result });

    });

  });

  /*
  * D??finir manuellement le score d'un match
  */
  router.put('/fixtures/:fixture_id/score', function(req, res){
    var fixtureId = req.params.fixture_id;
    var homeScore = parseInt(req.body.homeScore);
    var awayScore = parseInt(req.body.awayScore);
    var winner = -1;

    if (homeScore == awayScore){
      winner = 0;
    } else if (homeScore > awayScore){
      winner = 1;
    } else if (awayScore > homeScore){
      winner = 2;
    } else {
      winner = -1;
    }

    if (homeScore == null || awayScore == null || fixtureId == null){
      return res.status(500).json("missing params");
    }

    Fixture.updateOne({ _id: fixtureId }, { $set: { "result.homeScore": homeScore, "result.awayScore": awayScore, "result.auto": false, "result.winner": winner, status: "done" }, $unset: { comment: "" } }, function(err, result){
      if (err){
        return res.status(500).json(err);
      }
      console.log(result);
      return res.status(200).json("OK");
    });

  });

  /*
  * annuler un match
  */
  router.put('/fixtures/:fixture_id/cancel', function(req, res){
    var fixtureId = req.params.fixture_id;
    Fixture.updateOne({ _id: fixtureId, status: { $ne: "done" } }, { $set: { status: "canceled" } }, function(err, result){
      if (err){
        return res.status(500).json(err);
      }
      console.log(result);
      return res.status(200).json("OK");
    });
  });

  /* Score checker and fixer */
  router.get('/fixtures/:fixture_id/checkScore', function(req, res){
    var fixtureId = req.params.fixture_id;

    Fixture.findOne({ _id: fixtureId }, function(err, fixture){
      if (err){
        return res.status(500).json(err);
      }

      SportMonks.getFixtureEvents(fixture.api.sportmonks).then(function(apiFixture){
        // Le match est termin??
        var homeScore = apiFixture.result.homeScore;
        var awayScore = apiFixture.result.awayScore;
        var winner = null;
        var updateQuery = null;
        var events = [];

        // V??rifier si il y a de nouveaux ??v??nements ?? sauvegarder
        if (apiFixture.events != null){
          if (fixture.events != null){
            apiFixture.events.forEach(function(event){
              if (fixture.events.filter(ev => ev.api.sportmonks === event.api.sportmonks).length == 0){
                if (event.team == "home"){
                  event.team = fixture.homeTeam;
                } else {
                  event.team = fixture.awayTeam;
                }
                console.log("Ajout d'un ??v??nement", event.type, event.minute + "min", "pour le match", apiFixture.homeTeam, "vs", apiFixture.awayTeam);
                events.push(event);
              }
            });
          } else {
            apiFixture.events.forEach(function(event){
              if (event.team == "home"){
                event.team = fixture.homeTeam;
              } else {
                event.team = fixture.awayTeam;
              }
              //console.log(event.api.sportmonks);
              console.log("Ajout d'un ??v??nement", event.type, event.minute + "min", "pour le match", apiFixture.homeTeam, "vs", apiFixture.awayTeam);
              events.push(event)
            });
          }
          console.log("Il y a", events.length, " ??v??nements ?? mettre ?? jour pour le match", fixture._id);
        }

        console.log("Le match", apiFixture.homeTeam, "vs", apiFixture.awayTeam, "est termin?? avec le score", homeScore, "-", awayScore);
        console.log("V??rification de la validit?? du score avec l'utilisation des ??v??nements.")
        if (fixture.events == null || fixture.events.length == 0){
          console.log("ERREUR FATAL: Aucun ??v??nement enregistr?? pour le match!");
          return res.status(500).json("KO");
        }

        //console.log(fixture.events);

        // Calculer les buts par rapport aux ??v??nements enregistr??s
        var homeGoal = fixture.events.filter(ev => ev.type == "goal" && ev.team.equals(fixture.homeTeam)
        || ev.type == "penalty" && ev.team.equals(fixture.homeTeam)
        || ev.type == "own-goal" && ev.team.equals(fixture.homeTeam)).length;

        var awayGoal = fixture.events.filter(ev => ev.type == "goal" && ev.team.equals(fixture.awayTeam)
        || ev.type == "penalty" && ev.team.equals(fixture.awayTeam)
        || ev.type == "own-goal" && ev.team.equals(fixture.awayTeam)).length;
        console.log("Calcul des buts par rapport aux ??v??nements enregistr??s dans la BDD, domicile:", homeGoal, "ext??rieur:", awayGoal);

        // V??rifier les penalty rat??s
        //var missedPenaltyHome = fixture.events.filter(ev => ev.type == "missed_penalty" && ev.team.equals(fixture.homeTeam)).length;
        //var missedPenaltyAway = fixture.events.filter(ev => ev.type == "missed_penalty" && ev.team.equals(fixture.awayTeam)).length;

        //homeGoal = (homeGoal - missedPenaltyHome);
        //awayGoal = (awayGoal - missedPenaltyAway);
        //console.log("Score avec penalty manqu??", homeGoal, awayGoal);

        // Ajuster le calcul par rapport aux ??v??nements en attentes
        var homePendingGoal = events.filter(ev => ev.type == "goal" && ev.team.equals(fixture.homeTeam)
        || ev.type == "penalty" && ev.team.equals(fixture.homeTeam)
        || ev.type == "own-goal" && ev.team.equals(fixture.homeTeam)).length;

        var awayPendingGoal = events.filter(ev => ev.type == "goal" && ev.team.equals(fixture.awayTeam)
        || ev.type == "penalty" && ev.team.equals(fixture.awayTeam)
        || ev.type == "own-goal" && ev.team.equals(fixture.awayTeam)).length;

        // V??rifier les penalty rat??s en attentes
        //var pendingMissedPenaltyHome = events.filter(ev => ev.type == "missed_penalty" && ev.team.equals(fixture.homeTeam)).length;
        ///var pendingMissedPenaltyAway = events.filter(ev => ev.type == "missed_penalty" && ev.team.equals(fixture.awayTeam)).length;

        //homePendingGoal = (homePendingGoal - pendingMissedPenaltyHome);
        //awayPendingGoal = (awayPendingGoal - pendingMissedPenaltyAway);

        console.log("Ajustement des buts par rapport aux ??v??nements manquant, domicile:", homePendingGoal, "ext??rieur:", awayPendingGoal);
        console.log("Score d??finitif:", homeGoal+homePendingGoal, "-", awayGoal+awayPendingGoal);

        if ((homeGoal+homePendingGoal) != homeScore){
          console.log("ERREUR FATAL: Le r??sultat de l'??quipe ?? domicile enregistr?? dans la BDD ne correspond pas aux ??v??nements", homeScore, homeGoal);
          return res.status(500).json("KO");
        } else if ((awayGoal+awayPendingGoal) != awayScore){
          console.log("ERREUR FATAL: Le r??sultat de l'??quipe ext??rieure enregistr?? dans la BDD ne correspond pas aux ??v??nements", awayScore, awayGoal);
          return res.status(500).json("KO");
        }

        return res.status(200).json("OK");
      }, function(err){
        return res.status(500).json(err);

      });
    });
  });

  /*
  * Mettre ?? jour les ??v??nements d'un match
  */
  router.put('/fixtures/:fixture_id/events', function(req, res){
    var fixtureId = req.params.fixture_id;

    Fixture.findOne({ _id: fixtureId }, function(err, fixture){
      if (err){
        return res.status(500).json(err);
      }

      SportMonks.getFixtureEvents(fixture.api.sportmonks).then(function(apiFixture){
        var homeScore = apiFixture.result.homeScore;
        var awayScore = apiFixture.result.awayScore;
        var events = [];

        if (apiFixture.events != null){
          apiFixture.events.forEach(function(event){
            if (event.team == "home"){
              event.team = fixture.homeTeam;
            } else {
              event.team = fixture.awayTeam;
            }
            //console.log(event.api.sportmonks);
            console.log("Ajout d'un ??v??nement", event.type, event.minute + "min", "pour le match", apiFixture.homeTeam, "vs", apiFixture.awayTeam);
            events.push(event)
          });
          console.log("Il y a", events.length, " ??v??nements ?? mettre ?? jour pour le match", fixture._id);
        }

        console.log("Le match", apiFixture.homeTeam, "vs", apiFixture.awayTeam, "est termin?? avec le score", homeScore, "-", awayScore);
        console.log("V??rification de la validit?? du score avec l'utilisation des ??v??nements.")
        if (apiFixture.events == null || apiFixture.events.length == 0){
          console.log("ERREUR FATAL: Aucun ??v??nement enregistr?? pour le match!");
          return res.status(500).json("KO");
        }

        Fixture.update({ _id: fixtureId }, { $set: { events: events } }, function(err, result){
          if (err) return res.status(500).json(err);
          console.log(result);
          return res.status(200).json("OK");
        });
      }, function(err){
        return res.status(500).json(err);
      });
    });
  });

  /*
  * V??rifier les r??sultats des matchs d'une comp??tition pour une p??riode
  */
  router.get('/fixtures/competition/:competition_id/checkScore', function(req, res){
    var competitionId = req.params.competition_id;
    var currentDate = moment().utc().format("YYYY-MM-DD");
    var daysAgo = moment().utc().startOf('month').format("YYYY-MM-DD");

    console.log(daysAgo);
    var _apiFixtures;
    Competition.findOne({ _id: competitionId }).then(function(competition){
      //console.log(competition.api.sportmonks.league);
      // R??cup??rer les matchs ayant eu lieu ce mois ci pour une competition
      return SportMonks.getFixtureEventsForCompetition(competition, daysAgo, currentDate);
    }).then(function(fixtures){
      // r??cup??rer dans la BDD les matchs correspondants et ??tant termin??
      console.log(fixtures.length, "matchs r??cup??r??s aupr??s du fournissur de data.");
      _apiFixtures = fixtures;
      var fixturesId = fixtures.map(fix => fix.api.sportmonks);
      return Fixture.find({ "api.sportmonks": { $in: fixturesId }, status: "done" }).populate("homeTeam awayTeam");
    }).then(function(fixtures){
      // comparer les scores
      console.log("Il y a", fixtures.length, "?? v??rifier dans la BDD");
      for (var i = 0; i < _apiFixtures.length; i++){
        for (var z = 0; z < fixtures.length; z++){
          var fixture = fixtures[z];
          var apiFixture = _apiFixtures[i];
          if (fixture.api.sportmonks == apiFixture.api.sportmonks){
            console.log("Traitement du match", fixture.homeTeam.name, fixture.awayTeam.name);
            //console.log("Score dans la BDD - Domicile:",fixture.result.homeScore, "Ext??rieur:", fixture.result.awayScore);
            //console.log("Score fournisseur - Domicile:",apiFixture.result.homeScore,"Ext??rieur:",apiFixture.result.awayScore);

            if (fixture.result.homeScore != apiFixture.result.homeScore){

            } else if (fixture.result.awayScore != apiFixture.result.awayScore){
              console.log("ERREUR FATALE : Les r??sultats ext??rieur ne correspondent pas !");
            } else {
              //console.log("TOUT VA BIEN !");
            }
          }
        }
      }
      return res.status(200).json("OK");
    }, function(err){
      return res.status(500).json("KO");
    });

  });

  /*
  * Installer les matchs d'une comp??tition active pour une p??riode
  */
  router.post('/fixture/sportmonks/install', function(req, res){
    var from = req.body.from;
    var to = req.body.to;

    Competition.find({ active: true, isCurrentSeason: true, availableGames: { $elemMatch: { type: "SINGLE", active: true } } }).then(function(competitions){
      // Pour chaque comp??tition, r??cup??rer tous les matchs
      console.log("Nombre de comp??tition actives:", competitions.length);

      async.eachLimit(competitions, 1, function(competition, eachCompetition){
        SportMonks.getFixtureForCompetition(competition, from, to).then(function(fixtures){
          //console.log(fixtures);
          console.log(fixtures.length, "matchs r??cup??r??s pour la comp??tition", competition.name);
          async.eachLimit(fixtures, 1, function(fixture, eachFixture){
            // Trouver les ??quipes en opposition grace ?? l'ID de l'api
            Team.find({ $or : [{ "api.sportmonks": fixture.homeTeam.api.sportmonks }, { "api.sportmonks": fixture.awayTeam.api.sportmonks }] }).exec(function(err, teams){
              if (!err){
                if (teams.length < 2){
                  console.log("Impossible de trouver une ??quipe pour le match:", fixture);
                  //return eachFixture("Impossible de trouver une ??quipe pour un match.");
                  return eachFixture();
                }

                var homeTeam, awayTeam;
                for (team in teams){
                  if (teams[team].api.sportmonks == fixture.homeTeam.api.sportmonks){
                    homeTeam = teams[team];
                  } else if (teams[team].api.sportmonks == fixture.awayTeam.api.sportmonks){
                    awayTeam = teams[team];
                  }
                }

                if (homeTeam == null || awayTeam == null){
                  console.log("Impossible de trouver une ??quipe pour le match:", fixture);
                  return eachFixture();
                }

                //console.log(homeTeam, awayTeam);
                // V??rifier si un match existe d??j?? dans la BDD
                //}, {$and: [{homeTeam: homeTeam}, {awayTeam:awayTeam}]}
                Fixture.findOne({ $or: [{ "api.sportmonks": fixture.api.sportmonks }, { homeTeam: homeTeam, awayTeam: awayTeam, competition: competition._id, matchDay: fixture.matchDay }] }, function(err, fix){
                  if (err){
                    console.log("Echec de la v??rification de l'existence d'un match pour la comp??tition:", competition._id);
                    return eachFixture();
                  } else if (fix == null){
                    // Le match n'existe pas
                    //console.log(fixture.api.sportmonks, homeTeam, awayTeam);
                    console.log("Lancer la cr??ation du match", homeTeam.name, "-", awayTeam.name);
                    Fixture.create({
                      name: homeTeam.name + " - " + awayTeam.name,
                      competition: competition._id,
                      isCup: competition.isCup,
                      isFriendly: competition.isFriendly,
                      date: moment.unix(fixture.timestamp).utc().toDate(),
                      venue: fixture.venue,
                      matchDay: fixture.matchDay,
                      homeTeam: homeTeam,
                      awayTeam: awayTeam,
                      "result.homeScore": fixture.result.homeScore,
                      "result.awayScore": fixture.result.awayScore,
                      "api.sportmonks": fixture.api.sportmonks,
                      zScore: chance.integer({ min: 100, max: 300 })
                    }, function(err, result){
                      if (err){
                        console.log("Echec lors de la cr??ation d'un match pour la comp??tition:", competition._id);
                      } else {
                        console.log("Cr??ation du match", homeTeam.name, "-", awayTeam.name, "pour la competition:", competition._id);
                      }

                      return eachFixture();
                    });
                  } else {
                    // Le match existe d??j??
                    console.log("Le match", homeTeam.name, "-", awayTeam.name, "existe d??j??. -", competition._id);
                    if (fix.isFriendly == null || fix.venue == null || fix.name == null){
                      console.log("Indiquer si le match est amical ou non :", competition.isFriendly);
                      //console.log("Venue :", fixture.venue);
                      Fixture.updateOne({ _id: fix._id }, { $set: { isFriendly: competition.isFriendly, venue: fixture.venue, name: homeTeam.name + " - " + awayTeam.name } }, function(err, result){
                        if (err){
                          console.log("La mise ?? jour ?? ??chou??e :", err);
                          return eachFixture();
                        } else {
                          return eachFixture();
                        }
                      });
                    } else if (fix.api.sportmonks != fixture.api.sportmonks){
                      console.log("L'ancien ID d'api du match est corrumpu, effectuer la modification !");
                      Fixture.updateOne({ _id: fix._id }, { $set: { "api.sportmonks": fixture.api.sportmonks } }, function(err, result){
                        if (err){
                          console.log("La mise ?? jour ?? ??chou??e :", err);
                          return eachFixture();
                        } else {
                          return eachFixture();
                        }
                      });
                    } else if (moment(fix.date).utc() > moment.unix(fixture.timestamp).utc()){
                      console.log("Mise ?? jour de la date du match !", fix.api.sportmonks );
                      Fixture.updateOne({ _id: fix._id }, { $set: { date: moment.unix(fixture.timestamp).utc().toDate() } }, function(err, result){
                        if (err){
                          console.log("La mise ?? jour ?? ??chou??e :", err);
                          return eachFixture();
                        } else {
                          //return eachFixture();
                          // Mettre ?? jour le ticket simple si celui ci existe
                          GameTicket.updateOne({ type: "SINGLE", fixtures: { $in: [ fix._id ] } }, { $set: { openDate: moment.unix(fixture.timestamp).utc().subtract(1, 'day').toDate() } }, function(err, result){
                            if (err){
                              console.log("Une erreure c'est produite lors de la mise ?? jour de la date d'ouverture du ticket :", err);
                              return eachFixture();
                            } else {
                              console.log(moment.unix(fixture.timestamp).utc().subtract(1, 'day').toDate());
                              console.log("Mise ?? jour de la date d'ouverture du ticket :", result.nModified);
                              return eachFixture();
                            }
                          });
                        }
                      });
                    } else {
                      return eachFixture();
                    }
                  }
                });
              } else {
                if (err) console.log("Failled to find teams for fixture", fixture);
                eachFixture();
              }
            });
          }, function(err){
            // Switch to next competition
            console.log("Finished create/update fixture for comptetition:", competition._id);
            eachCompetition();
          });
        }, function(err){
          // Failled to get fixture for competition
          //console.log(err);
          if (err) console.log("Failled to find fixture for competition", competition);
          eachCompetition();
        });
      }, function(err){
        return res.status(200).json("OK");
      });

    }, function(err){
      return res.status(500).json("OK");
    });

  });

  /*
  * Installer les matchs d'une competition
  */
  router.post('/fixtures/season/install', function(req, res){
    var competitionId = req.body.competitionId;
    Competition.findOne({ _id: competitionId }).then(function(competition){
      // Pour chaque comp??tition, r??cup??rer tous les matchs

      SportMonks.getFixturesForSeason(competition).then(function(fixtures){
        //console.log(fixtures);
        console.log(fixtures.length, "matchs r??cup??r??s pour la comp??tition", competition.name);
        async.eachLimit(fixtures, 1, function(fixture, eachFixture){
          // Trouver les ??quipes en opposition grace ?? l'ID de l'api
          Team.find({ $or : [{ "api.sportmonks": fixture.homeTeam.api.sportmonks }, { "api.sportmonks": fixture.awayTeam.api.sportmonks }] }).exec(function(err, teams){
            if (!err){
              if (teams.length < 2){
                console.log("Impossible de trouver une ??quipe pour le match:", fixture);
                //return eachFixture("Impossible de trouver une ??quipe pour un match.");
                return eachFixture();
              }

              var homeTeam, awayTeam;
              for (team in teams){
                if (teams[team].api.sportmonks == fixture.homeTeam.api.sportmonks){
                  homeTeam = teams[team];
                } else if (teams[team].api.sportmonks == fixture.awayTeam.api.sportmonks){
                  awayTeam = teams[team];
                }
              }

              if (homeTeam == null || awayTeam == null){
                console.log("Impossible de trouver une ??quipe pour le match:", fixture);
                return eachFixture();
              }

              var events = [];
              for (event in fixture.events){
                if (event.team == "home"){
                  event.team = homeTeam;
                  events.push(event);
                } else if (event.team == "away"){
                  event.team = awayTeam;
                  events.push(event);
                }
              }

              //console.log(homeTeam, awayTeam);
              // V??rifier si un match existe d??j?? dans la BDD
              //}, {$and: [{homeTeam: homeTeam}, {awayTeam:awayTeam}]}
              Fixture.findOne({ $or: [{ "api.sportmonks": fixture.api.sportmonks }, { homeTeam: homeTeam, awayTeam: awayTeam, competition: competition._id, matchDay: fixture.matchDay }] }, function(err, fix){
                if (err){
                  console.log("Echec de la v??rification de l'existence d'un match pour la comp??tition:", competition._id);
                  return eachFixture();
                } else if (fix == null){
                  // Le match n'existe pas
                  //console.log(fixture.api.sportmonks, homeTeam, awayTeam);
                  console.log("Lancer la cr??ation du match", homeTeam.name, "-", awayTeam.name);
                  Fixture.create({
                    name: homeTeam.name + " - " + awayTeam.name,
                    competition: competition._id,
                    isCup: competition.isCup,
                    isFriendly: competition.isFriendly,
                    date: moment.unix(fixture.timestamp).utc().toDate(),
                    venue: fixture.venue,
                    matchDay: fixture.matchDay,
                    homeTeam: homeTeam,
                    awayTeam: awayTeam,
                    "result.homeScore": fixture.result.homeScore,
                    "result.awayScore": fixture.result.awayScore,
                    events: events,
                    "api.sportmonks": fixture.api.sportmonks,
                    zScore: chance.integer({ min: 100, max: 300 })
                  }, function(err, result){
                    if (err){
                      console.log(err);
                      console.log("Echec lors de la cr??ation d'un match pour la comp??tition:", competition._id);
                    } else {
                      console.log("Cr??ation du match", homeTeam.name, "-", awayTeam.name, "pour la competition:", competition._id);
                    }

                    return eachFixture();
                  });
                } else {
                  // Le match existe d??j??
                  console.log("Le match", homeTeam.name, "-", awayTeam.name, "existe d??j??. -", competition._id);
                  if (fix.isFriendly == null || fix.venue == null || fix.name == null){
                    console.log("Indiquer si le match est amical ou non :", competition.isFriendly);
                    //console.log("Venue :", fixture.venue);
                    Fixture.updateOne({ _id: fix._id }, { $set: { isFriendly: competition.isFriendly, venue: fixture.venue, name: homeTeam.name + " - " + awayTeam.name } }, function(err, result){
                      if (err){
                        console.log("La mise ?? jour ?? ??chou??e :", err);
                        return eachFixture();
                      } else {
                        return eachFixture();
                      }
                    });
                  } else if (fix.api.sportmonks != fixture.api.sportmonks){
                    console.log("L'ancien ID d'api du match est corrumpu, effectuer la modification !");
                    Fixture.updateOne({ _id: fix._id }, { $set: { "api.sportmonks": fixture.api.sportmonks } }, function(err, result){
                      if (err){
                        console.log("La mise ?? jour ?? ??chou??e :", err);
                        return eachFixture();
                      } else {
                        return eachFixture();
                      }
                    });
                  } else if (moment(fix.date).utc() > moment.unix(fixture.timestamp).utc()){
                    console.log("Mise ?? jour de la date du match !", fix.api.sportmonks );
                    Fixture.updateOne({ _id: fix._id }, { $set: { date: moment.unix(fixture.timestamp).utc().toDate() } }, function(err, result){
                      if (err){
                        console.log("La mise ?? jour ?? ??chou??e :", err);
                        return eachFixture();
                      } else {
                        //return eachFixture();
                        // Mettre ?? jour le ticket simple si celui ci existe
                        GameTicket.updateOne({ type: "SINGLE", fixtures: { $in: [ fix._id ] } }, { $set: { openDate: moment.unix(fixture.timestamp).utc().subtract(1, 'day').toDate() } }, function(err, result){
                          if (err){
                            console.log("Une erreure c'est produite lors de la mise ?? jour de la date d'ouverture du ticket :", err);
                            return eachFixture();
                          } else {
                            console.log(moment.unix(fixture.timestamp).utc().subtract(1, 'day').toDate());
                            console.log("Mise ?? jour de la date d'ouverture du ticket :", result.nModified);
                            return eachFixture();
                          }
                        });
                      }
                    });
                  } else {
                    return eachFixture();
                  }
                }
              });
            } else {
              if (err) console.log("Failled to find teams for fixture", fixture);
              eachFixture();
            }
          });
        }, function(err){
          // Switch to next competition
          console.log("Finished create/update fixture for comptetition:", competition._id);
          return res.status(200).json("OK");
        });
      }, function(err){
        // Failled to get fixture for competition
        //console.log(err);
        if (err) console.log("Failled to find fixture for competition", competition);
        return res.status(500).json("OK");
      });

    }, function(err){
      return res.status(500).json("OK");
    });

  });


  /*
  * Installer les matchs pour une comp??tition active d'une coupe
  */
  router.post('/fixture/sportmonks/install/cup', function(req, res){
    var from = req.body.from;
    var to = req.body.to;


    Competition.find({ active: true, isCurrentSeason: true, isCup: true }).then(function(competitions){
      // Pour chaque comp??tition, r??cup??rer tous les matchs
      console.log("Nombre de comp??tition actives:", competitions.length);

      async.eachLimit(competitions, 1, function(competition, eachCompetition){
        SportMonks.getFixtureForCompetition(competition, from, to).then(function(fixtures){
          //console.log(fixtures);
          console.log(fixtures.length, "matchs r??cup??r??s pour la comp??tition", competition.name);
          async.eachLimit(fixtures, 1, function(fixture, eachFixture){
            // Trouver les ??quipes en opposition grace ?? l'ID de l'api
            Team.find({ $or : [{ "api.sportmonks": fixture.homeTeam.api.sportmonks }, { "api.sportmonks": fixture.awayTeam.api.sportmonks }] }).exec(function(err, teams){
              if (!err){
                if (teams.length < 2){
                  console.log("Impossible de trouver une ??quipe pour le match:", fixture);
                  //return eachFixture("Impossible de trouver une ??quipe pour un match.");
                  return eachFixture();
                }

                var homeTeam, awayTeam;
                for (team in teams){
                  if (teams[team].api.sportmonks == fixture.homeTeam.api.sportmonks){
                    homeTeam = teams[team];
                  } else if (teams[team].api.sportmonks == fixture.awayTeam.api.sportmonks){
                    awayTeam = teams[team];
                  }
                }

                if (homeTeam == null || awayTeam == null){
                  console.log("Impossible de trouver une ??quipe pour le match:", fixture);
                  return eachFixture();
                }

                //console.log(homeTeam, awayTeam);
                // V??rifier si un match existe d??j?? dans la BDD
                //}, {$and: [{homeTeam: homeTeam}, {awayTeam:awayTeam}]}
                Fixture.findOne({ $or: [{ "api.sportmonks": fixture.api.sportmonks }], competition: competition._id }, function(err, fix){
                  if (err){
                    console.log("Echec de la v??rification de l'existence d'un match pour la comp??tition:", competition._id);
                    return eachFixture();
                  } else if (fix == null){
                    // Le match n'existe pas
                    //console.log(fixture.api.sportmonks, homeTeam, awayTeam);
                    console.log("Lancer la cr??ation du match", homeTeam.name, "-", awayTeam.name);
                    Fixture.create({
                      name: homeTeam.name + " - " + awayTeam.name,
                      competition: competition._id,
                      isCup: competition.isCup,
                      isFriendly: competition.isFriendly,
                      date: moment.unix(fixture.timestamp).utc().toDate(),
                      venue: fixture.venue,
                      matchDay: fixture.matchDay,
                      homeTeam: homeTeam,
                      awayTeam: awayTeam,
                      "result.homeScore": fixture.result.homeScore,
                      "result.awayScore": fixture.result.awayScore,
                      "api.sportmonks": fixture.api.sportmonks,
                      zScore: chance.integer({ min: 100, max: 300 })
                    }, function(err, result){
                      if (err){
                        console.log("Echec lors de la cr??ation d'un match pour la comp??tition:", competition._id);
                      } else {
                        console.log("Cr??ation du match", homeTeam.name, "-", awayTeam.name, "pour la competition:", competition._id);
                      }

                      return eachFixture();
                    });
                  } else {
                    // Le match existe d??j??
                    console.log("Le match", homeTeam.name, "-", awayTeam.name, "existe d??j??.");
                    if (fix.isFriendly == null || fix.venue == null || fix.name == null){
                      console.log("Indiquer si le match est amical ou non :", competition.isFriendly);
                      console.log("Venue :", fixture.venue);
                      Fixture.updateOne({ _id: fix._id }, { $set: { isFriendly: competition.isFriendly, venue: fixture.venue, name: homeTeam.name + " - " + awayTeam.name } }, function(err, result){
                        if (err){
                          console.log("La mise ?? jour ?? ??chou??e :", err);
                          return eachFixture();
                        } else {
                          return eachFixture();
                        }
                      });
                    } else if (moment(fix.date).utc() > moment.unix(fixture.timestamp).utc()){
                      console.log("Mise ?? jour de la date du match !", fix.api.sportmonks );
                      Fixture.updateOne({ _id: fix._id }, { $set: { date: moment.unix(fixture.timestamp).utc().toDate() } }, function(err, result){
                        if (err){
                          console.log("La mise ?? jour ?? ??chou??e :", err);
                          return eachFixture();
                        } else {
                          return eachFixture();

                        }
                      });
                    } else {
                      return eachFixture();
                    }
                  }
                });
              } else {
                if (err) console.log("Failled to find teams for fixture", fixture);
                eachFixture();
              }
            });
          }, function(err){
            // Switch to next competition
            console.log("Finished create/update fixture for comptetition:", competition._id);
            eachCompetition();
          });
        }, function(err){
          // Failled to get fixture for competition
          //console.log(err);
          if (err) console.log("Failled to find fixture for competition", competition);
          eachCompetition();
        });
      }, function(err){
        return res.status(200).json("OK");
      });

    }, function(err){
      return res.status(500).json("OK");
    });

  });

  // Corriger le probl??me de null value
  router.put('/fixture/fixNull', function(res, res){
    Fixture.updateMany({ "result.winner": null, "result.awayScore":null, "result.homeScore": null }, { $set: { "result.winner": -1, "result.awayScore":-1, "result.homeScore": -1 } }).then(function(result){
      console.log(result);
      return res.status(200).json(result);
    }, function(err){
      console.log(err);
      return res.status(500).json(err);
    });
  });

  // Corriger les matchs n'ayant pas d'??v??nements
  router.put('/fixture/fixEvents', function(req, res){
    // Rcup??rer tous les matchs sans events
    async.waterfall([
      function(done){
        Fixture.find({ events: { $exists: false }, date: { $lt: moment().utc() } }).populate('competition').sort({ date: 1 }).exec(function(err, fixtures){
          if (err) return done("Impossible de trouver des matchs");
          console.log(fixtures.length, "matchs trouv??s");
          done(null, fixtures);
        });
      },

      function(fixtures, done){
        // Grouper les matchs par comp??titions
        async.groupBy(fixtures, function(fixture, groupFixture){
          return groupFixture(null, fixture.competition.api.sportmonks.league);
        }, function(err, group){
          console.log(Object.keys(group));
          Object.keys(group).forEach(function(key){
            if (key == 'undefined'){
              delete group[key];
            }
          });
          console.log(Object.keys(group));
          done(null, group, fixtures);
        });
      },

      function(groupFixtures, fixtures, done){
        // Pour chaque comp??titions, r??cup??rer les datas des matchs
        var fixturesArr = [];
        async.each(groupFixtures, function(groupFix, eachGroupFixtures){
          var competition = groupFix[0].competition;
          var from = groupFix[0].date;
          var to = groupFix[groupFix.length-1].date;
          console.log(groupFix[0].competition.name, from, to);
          SportMonks.getFixtureEventsForCompetition(competition, moment(from).format('YYYY-MM-DD'), moment(to).format('YYYY-MM-DD')).then(function(fix){
            console.log(fix.length, "match trouv??s pour la comp??tition", competition.name);
            fixturesArr = fixturesArr.concat(fix);
            return eachGroupFixtures();
          }, function(err){
            console.log(err);
            return eachGroupFixtures();
          });
        }, function(err){
          done(null, fixturesArr, fixtures);
        });
      },

      // Mettre ?? jour tous les matchs
      function(fixturesArr, fixtures, done){
        async.eachLimit(fixturesArr, 1, function(apiFixture, eachFixture){
          var fixture = fixtures.filter(fix => fix.api.sportmonks === apiFixture.api.sportmonks);
          if (fixture.length > 1){
            return eachFixture();
          } else if (fixture[0] == null){
            return eachFixture();
          }

          //console.log(fixture[0]);

          for (var i = 0; i < apiFixture.events.length; i++){
            if (apiFixture.events[i].team == "home"){
              apiFixture.events[i].team = fixture[0].homeTeam;
            } else if (apiFixture.events[i].team == "away"){
              apiFixture.events[i].team = fixture[0].awayTeam;
            }
          }

          //console.log(apiFixture.events);
          //return eachFixture("er");
          Fixture.findOneAndUpdate({ _id: fixture[0]._id }, { $addToSet: { events: { $each: apiFixture.events } } }, { new: true }, function(err, result){
            if (err){
              console.log(err);
              return eachFixture(err);
            } else {
              //console.log(result);
              return eachFixture();
            }
          });
        }, function(err){
          if (err) return done(err);
          return done(null);
        });
      }
    ], function(err, result){
      if (err) return res.status(500).json(err);
      return res.status(200).json(result);
    });
  });

  // Corriger les r??sultats des matchs en attente termin??es
  router.put('/fixtures/fixScore', function(req, res){
    async.waterfall([

      function(done){
        console.log(chalkTask("R??cup??rer la liste des matchs en attente."));
        Fixture.find({ date: { $lt: moment().utc().subtract(1, 'days') }, $or: [{status: 'playing'}, {status: 'soon'}] })
        .populate('homeTeam awayTeam competition')
        .sort({ date: 1 })
        //.limit(40)
        .exec(function(err, fixtures){
          if (err){
            return done(err);
          } else if (fixtures == null || fixtures.length == 0){
            //return done("Aucun match ?? v??rifier.");
            return done(null, []);
          } else {
            console.log(fixtures.length, "matchs ?? v??rifier");
            return done(null, fixtures);
          }
        });
      },

      // v??rifier si les matchs r??cup??r??s poss??de un ticket de jeu, dans le cas contraire annuler le match
      /*function(fixtures, done){
        var countDelete = 0;
        async.eachLimit(fixtures, 1, function(fixture, eachFixture){
          GameTicket.find({ fixtures: { $in: [fixture._id] } }, function(err, result){
              if (err){
                eachFixture(err);
              } else if (result.length == 0){
                console.log("Canceled fixture because no ticket");
                countDelete++;
                Fixture.updateOne({ _id: fixture._id }, { $set: { status: "canceled" } }).exec(function(err, updateResult){
                  console.log("Fixture update", updateResult);
                  eachFixture();
                });
              } else if (result.length == 1){
                if (result[0].type == "SINGLE" && result[0].status == "canceled"){
                  console.log("Canceled fixture because ticket is canceled");
                  countDelete++;
                  Fixture.updateOne({ _id: fixture._id }, { $set: { status: "canceled" } }).exec(function(err, updateResult){
                    console.log("Fixture update", updateResult);
                    eachFixture();
                  });
                } else if (result[0].type == "MATCHDAY" && result[0].status == "canceled"){
                  console.log("Canceled fixture because ticket matchday is canceled");
                  countDelete++;
                  Fixture.updateOne({ _id: fixture._id }, { $set: { status: "canceled" } }).exec(function(err, updateResult){
                    console.log("Fixture update", updateResult);
                    eachFixture();
                  });
                } else {
                  eachFixture();
                }
              } else {
                eachFixture();
              }
          });
        }, function(err){
          if (err){
            return done(err);
          }
          console.log(countDelete);
          return done("stop");
        });
      },*/


      // R??cup??rer les matchs des tickets simple en attente de r??sultat
      function(fixtures, done){
        console.log(chalkTask("R??cup??rer les matchs des tickets simple en attente de r??sultat."));
        GameTicket.find({ type: "SINGLE", status: "waiting_result", resultDate: { $lt: moment().utc().subtract(2, 'hours') }, fixtures: { $nin: fixtures } })
        .exec()
        .then(function(gametickets){
          var fixturesId = [];
          gametickets.forEach(function(gt){
            fixturesId.push(gt.fixtures[0]);
          });
          return Fixture.find({ _id: { $in: fixturesId } }).populate('homeTeam awayTeam competition').exec();
        }).then(function(fix){
          console.log("Il y a", fix.length, "matchs ?? ajouter dans la liste.");
          var fixFiltered = fix.filter(f => fixtures.indexOf(f) == -1);
          console.log("Il y a", fixFiltered.length, "matchs filtr??s ?? ajouter dans la liste.");
          //return done("stop");
          return done(null, fixtures.concat(fixFiltered));
        }, function(err){
          console.log(chalkError("Impossible de r??cup??rer les matchs des tickets simple en attente !"));
          return done(err);
        });
      },

      function(fixtures, done){
        console.log(chalkTask("R??cup??rer les matchs des tickets matchday en attente de r??sultat."));
        GameTicket.find({ type: "MATCHDAY", status: "waiting_result", resultDate: { $lt: moment().utc().subtract(2, 'hours') }, fixtures: { $nin: fixtures } })
        .exec()
        .then(function(gametickets){
          var fixturesId = [];
          gametickets.forEach(function(gt){
            fixturesId = fixturesId.concat(gt.fixtures);
          });
          return Fixture.find({ _id: { $in: fixturesId } }).populate('homeTeam awayTeam competition').exec();
        }).then(function(fix){
          console.log("Il y a", fix.length, "matchs ?? ajouter dans la liste.");
          var fixFiltered = fix.filter(f => fixtures.indexOf(f) == -1);
          console.log("Il y a", fixFiltered.length, "matchs filtr??s ?? ajouter dans la liste.");
          //return done("stop");
          return done(null, fixtures.concat(fixFiltered));
        }, function(err){
          console.log(chalkError("Impossible de r??cup??rer les matchs des tickets matchday en attente !"));
          return done(err);
        });
      },

      function(fixtures, done){
        console.log(chalkTask("R??cup??rer les matchs des tickets tournament en attente de r??sultat."));
        GameTicket.find({ type: "TOURNAMENT", status: "waiting_result", resultDate: { $lt: moment().utc().subtract(2, 'hours') }, fixtures: { $nin: fixtures } })
        .exec()
        .then(function(gametickets){
          var fixturesId = [];
          gametickets.forEach(function(gt){
            fixturesId = fixturesId.concat(gt.fixtures);
          });
          return Fixture.find({ _id: { $in: fixturesId } }).populate('homeTeam awayTeam competition').exec();
        }).then(function(fix){
          console.log("Il y a", fix.length, "matchs ?? ajouter dans la liste.");
          var fixFiltered = fix.filter(f => fixtures.indexOf(f) == -1);
          console.log("Il y a", fixFiltered.length, "matchs filtr??s ?? ajouter dans la liste.");
          //return done("stop");
          return done(null, fixtures.concat(fixFiltered));
        }, function(err){
          console.log(chalkError("Impossible de r??cup??rer les matchs des tickets tournament en attente !"));
          return done(err);
        });
      },

      // Corriger le score et le status de chaque match
      function(fixtures, done){
        console.log("Il y a", fixtures.length, "matchs ?? corriger.");
        console.log(chalkTask("Correction du score pour les matchs en attente."));
        async.eachLimit(fixtures, 1, function(fixture, eachFixture){
          // R??cup??rer le match aupr??s du fournisseur
          console.log(chalkInit("Traitement du match", fixture.homeTeam.name, "-", fixture.awayTeam.name, "- API :", fixture.api.sportmonks, "- Status :", fixture.status));
          // V??rifier si le score a ??t?? d??fini manuellement
          if (fixture.result.auto == false){
            var customEvents = [];
            console.log("Le score du match a ??t?? d??fini manuellement, donc reconstruire un arbre d'??v??nement.");
            console.log(chalkWarning("Cr??er des ??v??nements de buts pour les ??quipes concern??es."));

            customEvents.push({ team: fixture.homeTeam, type: "ZaniBet", minute: 0, custom: true });

            for (var ht = 0; ht < fixture.result.homeScore; ht++){
              console.log(chalkWarning("Ajout d'un ??v??nement goal pour l'??quipe ?? domicile."))
              customEvents.push({ team: fixture.homeTeam, type: "goal", minute: ht+1, custom: true });
            }

            for (var vt = 0; vt < fixture.result.awayScore; vt++){
              console.log(chalkWarning("Ajout d'un ??v??nement goal pour l'??quipe visiteuse."))
              customEvents.push({ team: fixture.awayTeam, type: "goal", minute: ht+2, custom: true });
            }

            Fixture.updateOne({ _id: fixture._id }, { $set: { status: "done", events: customEvents } }, function(err, result){
              if (err){
                console.log(chalkError("Impossible de mettre ?? jour le match !"));
                return eachFixture(err);
              } else {
                console.log(chalkInit("La mise ?? jour du match est termin??e", result));
                return eachFixture();
              }
            });
          } else {
            SportMonks.getFixtureEvents(fixture.api.sportmonks).then(function(apiFixture){
              //console.log(apiFixture);

              // V??rifier que le match est bien termin??
              if (apiFixture.status != "FT" && apiFixture.status != "AET" && apiFixture.status != "FT_PEN"){
                console.log(chalkError("Le match n'est pas termin??. Status :", apiFixture.status, "-", fixture.competition.name, fixture.competition.country));
                //return eachFixture("Le match n'est pas termin??.");
                if (apiFixture.status == "CANCL"){
                  console.log(chalkWarning("Le match a ??t?? annul??, proc??der ?? sa mise ?? jour."));
                  Fixture.updateOne({ _id: fixture._id }, { $set: { status: "canceled", "result.homeScore": -1, "result.awayScore": -1, "result.winner": -1 } }, function(err, result){
                    if (err){
                      return eachFixture();
                    } else {
                      console.log(chalkWarning("Le match a ??t?? mise ?? jour."));
                      return eachFixture();
                    }
                  });
                } else if (apiFixture.status == "NS" || apiFixture.status == "POSTP"){
                  console.log(chalkWarning("Le match a ??t?? report?? ou n'a pas encore commenc??, proc??der ?? sa mise ?? jour."));
                  if ( !moment(fixture.date).isSame(moment.unix(apiFixture.timestamp).utc()) ){
                    Fixture.updateOne({ _id: fixture._id }, { $set: { date: moment.unix(apiFixture.timestamp).utc(), "result.homeScore": -1, "result.awayScore": -1, "result.winner": -1 } }, function(err, result){
                      if (err){
                        console.log(chalkError("Impossible de mettre ?? jour la date du match."));
                        return eachFixture();
                      } else {
                        console.log(chalkWarning("Le match a ??t?? mise ?? jour."));
                        return eachFixture();
                      }
                    });
                  } else {
                    console.log(chalkWarning("Aucune mise ?? jour de date ?? effectuer"));
                    return eachFixture();
                  }
                } else if (apiFixture.status == "Deleted"){
                  console.log("Mise ?? jour du commentaire concernant le match");
                  Fixture.updateOne({ _id: fixture._id }, { $set: { "result.homeScore": -1, "result.awayScore": -1, "result.winner": -1, comment: "deleted" } }, function(err, result){
                    if (err){
                      console.log(chalkError("Impossible de mettre ?? jour le comment du match."));
                      return eachFixture();
                    } else {
                      console.log(chalkWarning("Le match a ??t?? mise ?? jour."));
                      return eachFixture();
                    }
                  });
                } else {
                  return eachFixture();
                }
              } else {
                // Le match est termin??, v??rifier que le score final est disponible
                if (apiFixture.result.fullScore == null){
                  console.log(chalkError("Le score final n'existe pas !"));
                  return eachFixture();
                } else if (apiFixture.result.halfScore == null
                  && fixture.competition._id.indexOf("CLUBFRIENDLIES") == -1
                  && fixture.competition._id.indexOf("PDLUSA") == -1
                  && fixture.competition._id.indexOf("PRIMDIVGUAT") == -1
                  && fixture.competition._id.indexOf("DENMARKSERIES1") == -1
                  && fixture.competition._id.indexOf("DENMARKSERIES2") == -1
                  && fixture.competition._id.indexOf("DENMARKSERIES3") == -1
                  && fixture.competition._id.indexOf("DENMARKSERIES4") == -1
                  && fixture.competition._id.indexOf("SECONDIVBELARUS") == -1
                  && fixture.competition._id.indexOf("SEGONDADIVVENEZUELA") == -1
                  && fixture.competition._id.indexOf("SRPSKVOJVODINA") == -1
                  && fixture.competition._id.indexOf("SRPSKABELGRADE") == -1
                  && fixture.competition._id.indexOf("SRPSKWEST") == -1
                  && fixture.competition._id.indexOf("SRPSKEAST") == -1
                  && fixture.competition._id.indexOf("THAILEAGUETWO") == -1
                  && fixture.competition._id.indexOf("DIVINTERPARA") == -1
                  && fixture.competition._id.indexOf("CARIOCA2BRAZIL") == -1
                  && fixture.competition._id.indexOf("PCSLCANADA") == -1
                  && fixture.competition._id.indexOf("TERCERAGP5") == -1
                  && fixture.competition._id.indexOf("TERCERAGP") == -1
                  && fixture.competition._id.indexOf("THAILEAGUETWO") == -1
                  && fixture.competition._id.indexOf("EREDIVISIEWOMEN") == -1
                  && fixture.competition._id.indexOf("SEGUNDADIVPERU") == -1
                  && fixture.competition._id.indexOf("PROLEAGUEOMAN") == -1
                  && fixture.competition._id.indexOf("3HNLJUG") == -1
                  && fixture.competition._id.indexOf("PRIMBCHILE") == -1
                  && fixture.competition._id.indexOf("3HNLISTOK") == -1
                  && fixture.competition._id.indexOf("SEGUNDABG2") == -1
                  && fixture.competition._id.indexOf("FIRSTDIVBELARUS") == -1
                  && fixture.competition._id.indexOf("PRIMBECUADOR") == -1
                  && fixture.competition._id.indexOf("SUPERLIGUECONGO") == -1
                  && fixture.competition._id.indexOf("PSLZIMBABWE") == -1
                  && fixture.competition._id.indexOf("1LYGALITH") == -1
                  && fixture.competition._id.indexOf("LIGA2SER1ROMANIA") == -1
                  && fixture.competition._id.indexOf("FIRSTDIVBELARUS") == -1
                  && fixture.competition._id.indexOf("FIRSTLEAGUEBOSNIA") == -1
                  && fixture.competition._id.indexOf("MEISTRILIIGA") == -1
                  && fixture.competition._id.indexOf("3HNLZAPAD") == -1
                  && fixture.competition._id.indexOf("J3LEAGUE") == -1
                  && fixture.competition._id.indexOf("SLEAGUEZAMBIA") == -1
                  && fixture.competition._id.indexOf("3HNLZAPAD") == -1
                  && fixture.competition._id.indexOf("BIRINCIAZER") == -1
                  && fixture.competition._id.indexOf("FIRSTDIVKAZAK") == -1){
                    console.log(chalkError("Le score ?? la mi temps n'existe pas !", fixture.competition.name, "-", fixture.competition.country, "-", fixture.competition._id));
                    return eachFixture();
                  }

                  // R??cup??rer le nombre de buts marqu??s par ??quipe
                  console.log(chalkInit("Lancer la v??rification des scores."));
                  var homeScore = apiFixture.result.homeScore;
                  var awayScore = apiFixture.result.awayScore;

                  console.log("Le match est termin?? avec le score :", homeScore, "-", awayScore);

                  //var halfTimeSplit = apiFixture.result.halfScore.split("-");
                  //var htHomeScore = parseInt(halfTimeSplit[0]);
                  //var htAwayScore = parseInt(halfTimeSplit[1]);

                  var fullTimeSplit = apiFixture.result.fullScore.split("-");
                  var ftHomeScore = parseInt(fullTimeSplit[0]);
                  var ftAwayScore = parseInt(fullTimeSplit[1]);

                  console.log("R??sultat du match d'apr??s le score de fin de match :", ftHomeScore, "-", ftAwayScore);
                  if (ftHomeScore != homeScore || ftAwayScore != awayScore){
                    console.log(chalkError("Le nombre de but marqu?? et le score final ne coresspondent pas pour l'une des ??quipes !"));
                    return eachFixture();
                  }

                  // Cr??er un tableau devant contenir les ??v??nements d??finitifs
                  var events = [];

                  // V??rifier si les ??v??nements sont disponibles
                  if (apiFixture.events == null || apiFixture.events.length == 0){
                    console.log(chalkError("Aucun ??v??nement n'est disponible pour le match, entamer une proc??dure de cr??ation manuel !"));
                    // Si il n'y a aucun but marqu?? cr??er un event ZaniBet
                    if (homeScore == 0 && awayScore == 0){
                      apiFixture.events = [{ type: "ZaniBet", minute: 0, team: fixture.homeTeam._id, custom: true }];
                    } else {
                      apiFixture.events = [];
                      for (var i = 0; i < homeScore; i++){
                        apiFixture.events.push({ type: "goal", minute: 90, custom: true, team: "home" });
                      }

                      for (var i = 0; i < awayScore; i++){
                        apiFixture.events.push({ type: "goal", minute: 90, custom: true, team: "away" });
                      }
                    }

                    if (apiFixture.events == null || apiFixture.events.length == 0){
                      console.log(chalkError("La cr??ation d'??v??nements a ??chou?? !"));
                      return eachFixture("stop");
                    }
                  }

                  // Filtrer les ??v??nements
                  var homeEventScore = apiFixture.events.filter(e => e.team == "home" && e.type == "goal" || e.team == "home" && e.type == "penalty" || e.team == "home" && e.type == "own-goal").length;
                  var awayEventScore = apiFixture.events.filter(e => e.team == "away" && e.type == "goal" || e.team == "away" && e.type == "penalty" || e.team == "away" && e.type == "own-goal").length;

                  console.log("Score du match d'apr??s les ??v??nements :", homeEventScore, "-", awayEventScore);
                  // V??rifier si il y a une diff??rence entre score du match et celui des events
                  if (homeScore != homeEventScore || awayScore != awayEventScore){
                    console.log(chalkError("Le score du match ne correspond pas aux ??v??nements enregistr??s ! Comp??tition :", fixture.competition.name ));
                    var continueWork = false;
                    // Tenter d'ajuster les ??v??nements de but de l'??quipe ?? domicile
                    if (homeEventScore < homeScore){
                      continueWork = true;
                      var homeDif = homeScore - homeEventScore;
                      for (var i = 0; i < homeDif; i++){
                        apiFixture.events.push({ type: "goal", minute: 90, custom: true, team: "home" });
                      }
                    }

                    // Tenter d'ajuster les ??v??nements de but de l'??quipe visiteuse
                    if (awayEventScore < awayScore){
                      continueWork = true;
                      var awayDif = awayScore - awayEventScore;
                      for (var i = 0; i < awayDif; i++){
                        apiFixture.events.push({ type: "goal", minute: 90, custom: true, team: "away" });
                      }
                    }

                    if (!continueWork) return eachFixture();
                    console.log(chalkWarning("Les ??v??nements du match ont pu ??tre ajust??s pour correspondre au score final, v??rifier ?? nouveau les scores !"));
                    homeEventScore = apiFixture.events.filter(e => e.team == "home" && e.type == "goal" || e.team == "home" && e.type == "penalty" || e.team == "home" && e.type == "own-goal").length;
                    awayEventScore = apiFixture.events.filter(e => e.team == "away" && e.type == "goal" || e.team == "away" && e.type == "penalty" || e.team == "away" && e.type == "own-goal").length;

                    if (homeScore != homeEventScore || awayScore != awayEventScore){
                      console.log(chalkError("La correction a ??chou??, les nouveaux scores ne correspondent toujours pas :", homeEventScore, "-", awayEventScore));
                      return eachFixture();
                    }

                    console.log(chalkInit("Les ??v??nements correspondent d??sormais au score final, continuer le travail !"));
                  }

                  // ??diter les ??v??nements pour y placer l'ID des ??quipes
                  apiFixture.events.forEach(function(ev){
                    if (ev.team == "home"){
                      ev.team = fixture.homeTeam;
                    } else if (ev.team == "away") {
                      ev.team = fixture.awayTeam;
                    }
                    events.push(ev);
                  });

                  // R??cup??rer le gagnant
                  var winner = 0;
                  if (homeScore == awayScore){
                    winner = 0;
                  } else if (homeScore > awayScore){
                    winner = 1;
                  } else if (awayScore > homeScore){
                    winner = 2;
                  }

                  // Mettre ?? jour le match
                  Fixture.updateOne({ _id: fixture._id }, { $set: { status: "done", events: events, "result.homeScore": homeScore, "result.awayScore": awayScore, "result.winner": winner } }, function(err, result){
                    if (err){
                      console.log(chalkError("Impossible de mettre ?? jour le match !"));
                      return eachFixture(err);
                    } else {
                      console.log(chalkInit("La mise ?? jour du match est termin??e", result));
                      return eachFixture();
                    }
                  });
                }
              }, function(err){
                // Impossible de r??cup??rer les donn??es du matchs
                console.log(chalkError("Impossible de r??cup??rer les donn??es du match",
                fixture.homeTeam.name, "-", fixture.awayTeam.name, "de la comp??tition :", fixture.competition.name));
                return eachFixture();
              });
            }

          }, function(err){
            if (err){
              return done(err);
            } else {
              return done(null, "OK");
            }
          });
        }

      ], function(err, result){
        if (err){
          console.log(err);
          return res.status(500).json(err);
        } else {
          return res.status(200).json(result);
        }
      });
    });

    router.put('/fixtures/fixOdds', function(req, res){

      async.waterfall([

        function(done){
          GameTicket.find({ status: "open", active: true }).populate({ path: "fixtures", populate: {
            path: "homeTeam awayTeam"
          } }).exec(function(err, gametickets){
            if (err) return done(err);
            console.log("Nombre de ticket:", gametickets.length);
            var fixtures = gametickets.map(gt => gt.fixtures);
            //console.log(fixtures);
            var fixtureArr = [];
            fixtures.forEach(fix => fixtureArr = fixtureArr.concat(fix));
            console.log("Nombre de match:", fixtureArr.length);
            return done(null, fixtureArr);
          });
        },

        function(fixtures, done){
          var fixturesOdds = [];
          async.eachLimit(fixtures, 1, function(fixture, eachFixture){
            SportMonks.getFixtureOdds(fixture.api.sportmonks).then(function(odds){
              fixturesOdds.push(odds);
              eachFixture();
            }, function(err){
              console.log("Impossible de trouver les cotes pour le match", fixture.homeTeam.name, fixture.awayTeam.name);
              eachFixture();
            });
          }, function(err){
            console.log("Nombre de groupe de cotes:", fixturesOdds.length);
            //return done(err);
            if (err){
              return done(err);
            }
            done(null, fixturesOdds);
          });
        },

        // Mettre ?? jour la cote moyenne de chaque match
        function(fixturesOdds, done){
          async.eachLimit(fixturesOdds, 1, function(fixtures, eachFixtures){
            var homeSum = 0;
            var awaySum = 0;
            var drawSum = 0;
            //console.log(fixturesOdds);
            for (var i = 0; i < fixtures.length; i++){
              var homeOdd = fixtures[i].odds.filter(od => od.label === "1");
              var drawOdd = fixtures[i].odds.filter(od => od.label === "X");
              var awayOdd = fixtures[i].odds.filter(od => od.label === "2");

              //console.log(parseFloat(homeOdd[0].value), parseFloat(drawOdd[0].value), parseFloat(awayOdd[0].value));
              homeSum += parseFloat(homeOdd[0].value);
              awaySum += parseFloat(awayOdd[0].value);
              drawSum += parseFloat(drawOdd[0].value);
            }

            console.log((homeSum/fixtures.length).toFixed(2), (awaySum/fixtures.length).toFixed(2), (drawSum/fixtures.length).toFixed(2));
            var zanibetOdds = [{ type: "1N2", odds: { homeTeam: (homeSum/fixtures.length).toFixed(2), draw: (drawSum/fixtures.length).toFixed(2), awayTeam: (awaySum/fixtures.length).toFixed(2) } }];
            Fixture.update({ "api.sportmonks": fixtures[0].fixture }, { $set: { odds: zanibetOdds } }, function(err, result){
              console.log("Mise ?? jour du match:", fixtures[0].fixture),
              console.log(err, result);
              if (err){
                return eachFixtures(err);
              }
              return eachFixtures(null);
            });
          }, function(err){
            return done(err);
          });
        }

      ], function(err, result){
        if (err) return res.status(500).json(err);
        return res.status(200).json("OK");
      });

    });

    module.exports = router;
