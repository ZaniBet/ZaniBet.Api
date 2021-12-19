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
var User = mongoose.model('User');
var Reward = mongoose.model('Reward');

router.get('/install/client', function(req, res){
  var db = mongojs(process.env.DB_URI || 'mongodb://localhost:27017/pornoid', ['client']);
  db.client.drop(function(err){
    if (err){
      console.log("failled to drop client collection : " + err);
      return res.status(500).json("NOK");
    } else {
      Client.create({ clientId: "XDWUGIXKoNeb727Dne2C5IvowMxLmLjV", clientSecret: "EDTTf780dJ5LcrHQ1BeqOyrUGV07Rh2O" }, function(err, client){
        if (err) return res.status(500).json({ message: err.message });
        return res.status(200).json(client);
      });
    }
  });
});

router.post('/install/competition', function(req,res){
  var season = req.body.season;
  var useApi = req.body.useApi;

  // Faire un tableau associatif des compétitions à installer
  var competitionArr = {
    "FL1" : {_id: "LIGUE1-17", name: "Ligue 1", division: 1, season: 2017, apiFootball: 127, footballData: ''},
    "FL2": {_id: "LIGUE2-17", name:"Ligue 2", division: 2, season: 2017, apiFootball: 128, footballData: ''},
    "DED": {_id: "EREDIVISIE-17", name:"Eredivisie", division: 1, season: 2017, apiFootball: 137, footballData: '' },
    "BL1": {_id: "BUNDESLIGA1-17", name:"Bundesliga 1", division: 1, season: 2017, apiFootball: 117, footballData: '' },
    "BL2": {_id: "BUNDESLIGA2-17", name:"Bundesliga 2", division: 2, season: 2017, apiFootball: 118, footballData: '' },
    "SA": {_id: "SERIEAITA-17", name:"Serie A", division: 1, season: 2017, apiFootball: 79, footballData: '' },
    //"SB": {"Serie B"},
    "PL": {_id: "PLEAGUE-17", name:"Premier League", division: 1, season: 2017, apiFootball: 62, footballData: '' },
    "PPL": {_id: "LIGANOS-17", name:"Liga NOS", division: 1, season: 2017, apiFootball: 62, footballData: '' },
    "PD": {_id: "LALIGA-17", name:"LaLiga Santander", division: 1, season: 2017, apiFootball: 109, footballData: '' }
  };

  var competitionArr2 = {
    "127" : {_id: "LIGUE1", name: "Ligue 1", division: 1, season: 2017, apiFootball: 127, footballData: ''},
    "128" : {_id: "LIGUE2", name:"Ligue 2", division: 2, season: 2017, apiFootball: 128, footballData: ''},
    "137": {_id: "EREDIVISIE", name:"Eredivisie", division: 1, season: 2017, apiFootball: 137, footballData: '' },
    "117": {_id: "BUNDESLIGA1", name:"Bundesliga 1", division: 1, season: 2017, apiFootball: 117, footballData: '' },
    "118": {_id: "BUNDESLIGA2", name:"Bundesliga 2", division: 2, season: 2017, apiFootball: 118, footballData: '' },
    "79": {_id: "SERIEAITA", name:"Serie A", division: 1, season: 2017, apiFootball: 79, footballData: '' },
    //"SB": {"Serie B"},
    "62": {_id: "PLEAGUE", name:"Premier League", division: 1, season: 2017, apiFootball: 62, footballData: '' },
    "150": {_id: "LIGANOS", name:"Liga NOS", division: 1, season: 2017, apiFootball: 62, footballData: '' },
    "109": {_id: "LALIGA", name:"LaLiga Santander", division: 1, season: 2017, apiFootball: 109, footballData: '' }
  };

  async.waterfall([
    // Supprimer toutes les compétitions de la saison à installer
    function(done){
      //return done(null);
      Competition.deleteMany(null, function(err){
        if (!err){
          done(null);
        } else {
          done("Error occur when trying to delete all competition");
        }
      });
    },
    // Requete vers API pour récupérer les compétitions disponible pour la saison indiquée
    function(done){
      if (useApi == 'footballData'){
        requestify.get('http://api.football-data.org/v1/competitions/?season='+season).then(function(response) {
          var competitions = response.getBody();
          async.eachLimit(competitions, 1, function(competition, callback){
            if (competitionArr[competition.league] != null){
              console.log('Install competition :', competition.league);
              var compet = competitionArr[competition.league];
              Competition.create({ _id: compet._id,
                name: compet.name,
                season: competition.year,
                division: compet.division,
                "apiId.footballData": competition.id
              }, function(err, compet){
                console.log(err);
                callback();
              });
            } else {
              console.log('Pass this competition :', competition.league);
              callback();
            }
          }, function(err, result){
            done(null);
          });
        }, function(err){
          console.log('Impossible de récupérer les informations sur les compétitions disponible. Erreur :', err);
          done(err);
        });
      } else if (useApi == 'apiFootball'){
        requestify.get('https://apifootball.com/api/?action=get_leagues&APIkey=83ad1ddf7bd9c1bb1218a0151d955c7c59d8f0da7b2574b82374708a4404ab90').then(function(response) {
          var competitions = response.getBody();
          async.eachLimit(competitions, 1, function(competition, callback){
            if (competitionArr2[competition.league_id] != null){
              console.log('Install competition :', competition.league_name);
              var compet = competitionArr2[competition.league_id];
              Competition.create({ _id: compet._id,
                name: compet.name,
                season: compet.season,
                division: compet.division,
                "apiId.apiFootball": competition.league_id
              }, function(err, compet){
                callback();
              });
            } else {
              //console.log('Pass this competition :', competition.league);
              callback();
            }
          }, function(err, result){
            done(null);
          });
        }, function(err){
          console.log('Impossible de récupérer les informations sur les compétitions disponible. Erreur :', err);
          done(err);
        });
      }
    }
  ], function(err, result){
    if (err) return res.status(500).json(err);
    return res.status(200).json("OK");
  });
});

router.post('/install/teams', function(req, res){

  var useApi = req.body.useApi;

  Team.deleteMany(null, function(err){
    if (!err){
      Competition.find().then(function(competitions){
        if (useApi == 'footballData'){
          async.eachLimit(competitions, 1, function(competition, callback){
            requestify.get('http://api.football-data.org/v1/competitions/' + competition.apiId.footballData +'/teams').then(function(response){
              var teams = response.getBody().teams;
              async.eachLimit(teams, 1, function(team, done){
                var teamLink = team._links.self.href.split('/');
                console.log(teamLink);
                Team.create({ name: team.name, shortName: team.shortName, picture: '', competition: competition._id, "apiId.footballData": teamLink[5] }, function(err, tea){
                  done();
                });
              }, function(err, result){
                callback();
              });
            }, function(err){
              callback();
            });
          }, function(err, result){
            return res.status(200).json("OK");
          });
        } else if (useApi == 'apiFootball') {
          async.eachLimit(competitions, 1, function(competition, eachCompetition){
            requestify.get('https://apifootball.com/api/?action=get_standings&APIkey=83ad1ddf7bd9c1bb1218a0151d955c7c59d8f0da7b2574b82374708a4404ab90&league_id='+ competition.apiId.apiFootball).then(function(response){
              var teams = response.getBody();
              //console.log(teams);
              async.eachLimit(teams, 1, function(team, eachTeam){
                console.log(team);
                Team.create({ name: team.team_name, competition: competition._id, 'apiId.apiFootball': team.team_name }, function(err, tea){
                  if (err) return eachTeam(err);
                  eachTeam();
                });
              }, function(err, result){
                if (err) return eachCompetition(err);
                eachCompetition();
              });
            }, function(err){
              eachCompetition(err);
            });
          }, function(err, result){
            console.log(err);
            return res.status(200).json("OK");
          });
        }
      });
    } else {
      return res.status(500).json("KO");
    }
  });
});

router.post('/install/fixtures', function(req, res){
  var useApi = req.body.useApi;

  Competition.find().then(function(competitions){
    // Pour chaque compétition, récupérer tous les matchs
    if (useApi == 'footballData'){
      async.eachLimit(competitions, 1, function(competition, callback){
        requestify.get('http://api.football-data.org/v1/competitions/' + competition.apiId.footballData +'/fixtures?timeFrame=n99', { headers: { 'X-Auth-Token': 'afddb7f282a940b7bb85e447b34f35ff' } }).then(function(response){
          var fixtures = response.getBody().fixtures;
          async.eachLimit(fixtures, 1, function(fixture, done){
            var fixtureLink = fixture._links.self.href.split('/');
            var homeTeamLink = fixture._links.homeTeam.href.split('/');
            var awayTeamLink = fixture._links.awayTeam.href.split('/');
            //console.log('Fixture Link:', fixtureLink);
            //console.log('Home Team Link:', homeTeamLink, ' - ', fixture.homeTeamName);
            //console.log('Away Team Link:', awayTeamLink, ' - ', fixture.awayTeamName);

            Team.find({ $or : [{ "apiId.footballData": homeTeamLink[5] }, { "apiId.footballData": awayTeamLink[5] }] }).exec(function(err, result){
              if (!err){
                //console.log(result);
                var homeTeam, awayTeam;
                for (resu in result){
                  if (result[resu].apiId.footballData == homeTeamLink[5]){
                    homeTeam = result[resu];
                  } else if (result[resu].apiId.footballData == awayTeamLink[5]){
                    awayTeam = result[resu];
                  }
                }
                console.log('Home:', homeTeam.name, '- Away:', awayTeam.name);
                //return done();
                Fixture.create({ competition: competition._id, date: fixture.date, matchDay: fixture.matchday, homeTeam: homeTeam, awayTeam: awayTeam, "apiId.footballData": fixtureLink[5] }, function(err, tea){
                  done();
                });
              } else {
                console.log(err);
                done();
              }
            });
          }, function(err, result){
            console.log(err, result);
            callback();
          });
        }, function(err){
          console.log(err);
          callback();
        });
      }, function(err, result){
        console.log(err, result);
        return res.status(200).json("OK");
      });
    } else if (useApi == 'apiFootball') {
      async.eachLimit(competitions, 1, function(competition, callback){
        requestify.get('https://apifootball.com/api/?action=get_events&APIkey=83ad1ddf7bd9c1bb1218a0151d955c7c59d8f0da7b2574b82374708a4404ab90&from=20170101&to=20171230&league_id=' + competition.apiId.apiFootball).then(function(response){
          var fixtures = response.getBody();
          async.eachLimit(fixtures, 1, function(fixture, done){
            Team.find({ $or : [{ "apiId.apiFootball": fixture.match_hometeam_name }, { "apiId.apiFootball": fixture.match_awayteam_name }] }).exec(function(err, result){
              if (!err){
                console.log(result);
                var homeTeam, awayTeam;
                for (resu in result){
                  if (result[resu].apiId.apiFootball == fixture.match_hometeam_name){
                    homeTeam = result[resu];
                  } else if (result[resu].apiId.apiFootball == fixture.match_awayteam_name){
                    awayTeam = result[resu];
                  }
                }
                console.log('Home:', homeTeam.name, '- Away:', awayTeam.name);
                //return done();
                var fixturDate = moment(fixture.match_date + ' ' + fixture.match_time);
                Fixture.create({ competition: competition._id, date: fixturDate, matchDay: fixture.matchday, homeTeam: homeTeam, awayTeam: awayTeam, "apiId.apiFootball": fixture.match_id }, function(err, tea){
                  done();
                });
              } else {
                console.log(err);
                done();
              }
            });
          }, function(err, result){
            console.log(err, result);
            callback();
          });
        }, function(err){
          console.log(err);
          callback();
        });
      }, function(err, result){
        console.log(err, result);
        return res.status(200).json("OK");
      });
    } else {


    }

  }, function(err){
    console.log(err);
    return res.status(200).json("OK");
  });
});


router.post('/install/gameticket', function(req, res){

  var ticketNameArr = {
    "LIGUE1" : "Ligue 1 Jackpot",
    "LIGUE2": "Ligue 2 Jackpot",
    "EREDIVISIE": "Eredivisie Jackpot",
    "BUNDESLIGA1": "Bundesliga 1 Jackpot",
    "BUNDESLIGA2": "Bundesliga 2 Jackpot",
    "SERIEAITA": "Serie A Italia Jackpot",
    "SERIEBITA": "Serie B Italia Jackpot",
    "PLEAGUE": "Premier League Jackpot",
    "LIGANOS": "Liga NOS Jackpot",
    "LALIGA": "LaLiga Jackpot"
  };


  Competition.find().then(function(competitions){
    async.eachLimit(competitions, 1, function(competition, eachCompetition){
      Fixture.find({ competition: competition._id }).sort({ date: 1 }).exec(function(err, fixtures){
        async.groupBy(fixtures, function(fixture, groupFixture){
          if (err) return groupFixture(err);
          return groupFixture(null, fixture.matchDay);
        }, function(err, result){
          //console.log('Competition : ', competition.caption, result);
          var minMatchDay = fixtures[0].matchDay;
          var maxMatchDay = fixtures[fixtures.length-1].matchDay;
          console.log(minMatchDay, maxMatchDay);
          async.eachLimit(result, 1, function(fixtureGroup, eachFixtureGroup){
            //console.log(fixtureGroup);
            // Créer un ticket pour chaque matchDay
            var firstFixtureDate = moment(fixtureGroup[0].date);
            var lastFixtureDate = moment(fixtureGroup[fixtureGroup.length-1].date);
            var openTicketDate = moment(fixtureGroup[0].date).subtract(3, 'days').hour(0).minute(10);
            var resultTicketDate = moment(fixtureGroup[fixtureGroup.length-1].date).add(4, 'hours');

            /*console.log('First fixture date:', firstFixtureDate);
            console.log('Last fixture date:', lastFixtureDate);
            console.log('Open ticket date:', openTicketDate);
            console.log('Result ticket date:', resultTicketDate);*/

            //return eachFixtureGroup();

            GameTicket.create({ competition: competition._id, name: ticketNameArr[competition._id], jackpot: 250, openDate: openTicketDate, limitDate: firstFixtureDate, resultDate: resultTicketDate, maxNumberOfPlay: 8, fixtures: fixtureGroup }, function(err, gameTicket){
              if (!err) console.log(gameTicket);
              eachFixtureGroup();
            });
          }, function(err, result){
            eachCompetition();
          });
        });
      });
    }, function(err, result){
      return res.status(200).json("OK");
    });
  }, function(err){
    return res.status(500).json("KO")
  });

});

module.exports = router;
