var express = require('express');
var mongoose = require('mongoose');
var router = express.Router();
var passport = require('passport');
var moment = require('moment');
var requestify = require('requestify');
var mongojs = require('mongojs');
var async = require('async');


var Client = mongoose.model('Client');
var Competition = mongoose.model('Competition');
var Team = mongoose.model('Team');
var Fixture = mongoose.model('Fixture');
var Grille = mongoose.model('Grille');
var GameTicket = mongoose.model('GameTicket');
var User = mongoose.model('User');
var Reward = mongoose.model('Reward');


// Générer un ticket de jeu
router.post('/gameticket', function(req, res){
  var name = req.body.name;
  var jackpot = req.body.jackpot;
  var openDate = req.body.openDate;
  var limitDate = req.body.limitDate;
  var resultDate = req.body.resultDate;
  var status = req.body.status;
  var maxNumberOfPlay = req.body.maxNumberOfPlay;

  var fixtureQuery;
  if (status == "waiting_result"){
    fixtureQuery = Fixture.find({ date: { $lt: moment() } });
    openDate = moment().subtract(2, 'days');
    limitDate = moment().subtract(2, 'hours');
    resultDate = moment();
  } else if (status == "open"){
    fixtureQuery = Fixture.find({ date: { $gt: moment() } });
    openDate = moment(openDate);
    limitDate = moment(limitDate);
    resultDate = moment(resultDate);
  }

  fixtureQuery.limit(11).then(function(fixtures){
    var gameticket = new GameTicket();
    gameticket.name = name;
    gameticket.jackpot = jackpot;
    gameticket.openDate = openDate;
    gameticket.limitDate = limitDate;
    gameticket.resultDate = resultDate;
    gameticket.status = status;
    gameticket.maxNumberOfPlay = maxNumberOfPlay;
    gameticket.fixtures = fixtures;
    return gameticket.save();
  }).then(function(gameticket){
    return res.status(200).json(gameticket);
  }, function(err){
    console.log(err);
    res.status(500).json(err);
  });
});


// Génération un ticket personnalisé

// Générer un ticket de jeu pour chaque jour de match de chaque compétition
router.post('/gameticket/matchday', function(req, res){
  var ticketNameArr = {
    "LIGUE1" : "Ligue 1 Jackpot",
    "LIGUE2": "Ligue 2 Jackpot",
    "EREDIVISIE": "Eredivisie Jackpot",
    "BUNDESLIGA1": "Bundesliga 1 Jackpot",
    "BUNDESLIGA2": "Bundesliga 2 Jackpot",
    "SERIEAITA": "Serie A Italia Jackpot",
    //"SERIEBITA": "Serie B Italia Jackpot",
    "PLEAGUE": "Premier League Jackpot",
    "LIGANOS": "Primeira Liga Jackpot",
    "LALIGA": "La Liga Jackpot",
    "SCOTTPRE": "Scottish Prem's Jackpot",
    "PROLEAGUE": "Pro League Jackpot",
    "ALLSVENSKAN":"Allsvenskan Jackpot",
    "ELITESERIEN":"Eliteserien Jackpot",
    "PLEAGUERUS":"Russia Prem's Jackpot",
    "PLEAGUEUKR":"Ukraine Prem's Jackpot",
    "EFLCHAMPIONSHIP":"EFL Championship",
    "SUPERLIG":"Super Lig Jackpot",
    "LEAGUEONE":"League One Jackpot",
    "TIPICOBUNDESLIGA": "Tipico Jackpot",
    "SERIEABRAZIL": "Seria A Brazil Jackpot",
    "EKSTRAKLASA": "Ekstraklasa Jackpot",
    "LIGATHAAL": "Ligat ha'Al Jackpot"
  };


  Competition.find({ active: true, "availableGames": { $elemMatch: { type: "MATCHDAY", active: true } } }).then(function(competitions){
    console.log("Nombre de compétition disponible pour la génération de ticket MATCHDAY :", competitions.length);
    console.log(competitions.map(comp => comp.name));
    // Itération à travers chaque compétition, pour récupérer les matchs associés
    async.eachLimit(competitions, 1, function(competition, eachCompetition){
      // Récupérer tous les match de la compération
      Fixture.find({ competition: competition._id }).populate('homeTeam awayTeam').sort({ date: 1 }).exec(function(err, fixtures){
        if (err || fixtures == null){
          console.log("Cannot find fixtures for competition:", competition);
          return eachCompetition();
        }
        if (fixtures.length == 0){
          console.log("Aucun match disponible pour la competition:", competition);
          return eachCompetition();
        }

        // Grouper les matchs, par jour de match
        async.groupByLimit(fixtures,1, function(fixture, groupFixture){
          return groupFixture(null, fixture.matchDay);
        }, function(err, matchDayGroup){
          if (fixtures[0] ==null){
            console.log(fixtures);

          }
          var minMatchDay = fixtures[0].matchDay;
          var maxMatchDay = fixtures[fixtures.length-1].matchDay;
          console.log(minMatchDay, maxMatchDay);
          // Pour chaque jour de match, créer un ticket
          async.eachLimit(matchDayGroup, 1, function(fixtureGroup, eachFixtureGroup){
            // Trier les matchs
            async.sortBy(fixtureGroup, function(fixtureSort, sortCallback){
              sortCallback(null, fixtureSort.date);
            }, function(err, filtedFixtureGroup){
              if (err){
                console.log("Failled to filter fixture for comptetition:",competition.name, " and matchday:", matchDayGroup);
                return eachFixtureGroup();
              }

              // Ne pas créer de ticket si moins de 8 match sont disponibles
              if (filtedFixtureGroup.length < 5){
                console.log("Annuler la création d'un ticket de jeu pour le jour de match", filtedFixtureGroup[0].matchDay, "de la competition", competition.name, ".Il n'y a pas assez de match disponible : ", filtedFixtureGroup.length);
                return eachFixtureGroup();
              }

              if (filtedFixtureGroup[0].matchDay == 17){
                //console.log(filtedFixtureGroup);
              }

              // Récupérer la date limite du dernier ticket de jeu, récupérant le premier match du dernier jour de jeu
              var lastMatchDay;
              var lastOpenDate;
              var firstFixture = filtedFixtureGroup[0];
              var lastFixture = filtedFixtureGroup[filtedFixtureGroup.length-1];
              var currentMatchDay = firstFixture.matchDay;


              // Vérifier si il s'agit du premier ticket créé pour une compétition,
              // afin d'ajuster la date d'ouverture
              if (currentMatchDay > minMatchDay) {
                lastMatchDay = currentMatchDay-1;
              } else {
                lastMatchDay = currentMatchDay;
              }
              lastOpenDate = matchDayGroup[lastMatchDay][0].date;


              // Créer un ticket pour le jour de match
              var firstFixtureDate = moment(firstFixture.date).utc();
              var lastFixtureDate = moment(lastFixture.date).utc();
              //var openTicketDate = moment(filtedFixtureGroup[0].date).subtract(3, 'days').hour(0).minute(10);
              var openTicketDate = moment(lastOpenDate).utc();
              var resultTicketDate = moment(lastFixture.date).utc().add(2, 'hours');

              /*console.log('First fixture date:', firstFixtureDate);
              console.log('Last fixture date:', lastFixtureDate);
              console.log('Open ticket date:', openTicketDate);
              console.log('Result ticket date:', resultTicketDate);*/

              var maxNumberOfPlay = 1;
              var jackpot = 10;
              var pointsPerBet = 10;
              switch(filtedFixtureGroup.length){
                case 4:
                jackpot = 25;
                maxNumberOfPlay = 1;
                pointsPerBet = 20;
                break;
                case 5:
                jackpot = 20;
                maxNumberOfPlay = 1;
                pointsPerBet = 20;
                break;
                case 6:
                jackpot = 25;
                maxNumberOfPlay = 1;
                pointsPerBet = 20;
                break;
                case 7:
                jackpot = 30;
                maxNumberOfPlay = 2;
                pointsPerBet = 10;
                break;
                case 8:
                jackpot = 60;
                maxNumberOfPlay = 5;
                pointsPerBet = 10;
                break;
                case 9:
                jackpot = 100;
                maxNumberOfPlay = 6;
                pointsPerBet = 10;
                break;
                case 10:
                jackpot = 150;
                maxNumberOfPlay = 6;
                pointsPerBet = 10;
                break;
                case 11:
                jackpot = 200;
                maxNumberOfPlay = 7;
                pointsPerBet = 10;
                break;
                case 12:
                jackpot = 200;
                maxNumberOfPlay = 8;
                pointsPerBet = 10;
                break;
                case 13:
                jackpot = 250;
                maxNumberOfPlay = 9;
                pointsPerBet = 10;
                break;
                default:
                jackpot = 0;
                maxNumberOfPlay = 0;
                pointsPerBet = 0;
              }

              var competitionId = competition._id.split('-');
              var coverPath = "";
              var thumbnailPath = "";
              var picturePath =  process.env.CLOUD_FRONT_URI + "/ticket_cover/v1/ticket_" + competitionId[0].toLowerCase() + ".png";
              if (competitionId[0] == "PROLEAGUE" || competitionId[0] == "SCOTTPRE"){
                coverPath = process.env.CLOUD_FRONT_URI + "/ticket_cover/" + competitionId[0].toLowerCase() + "_ticket_cover.png";
                thumbnailPath = process.env.CLOUD_FRONT_URI + "/competition_logo/" + competitionId[0].toLowerCase() + "_logo.png";
              } else {
                coverPath = competitionId[0];
                thumbnailPath = competitionId[0];
              }

              GameTicket.findOne({ type: "MATCHDAY", matchDay: currentMatchDay, fixtures: { $in: filtedFixtureGroup } }, function(err, gameticket){
                if(err){
                  console.log(err);
                  return eachFixtureGroup()
                } else if (gameticket == null){
                  // le ticket n'existe pas encore
                  GameTicket.create({ type: "MATCHDAY",
                  matchDay: currentMatchDay,
                  competition: competition._id,
                  active: competition.active,
                  fixtures: filtedFixtureGroup,
                  name: ticketNameArr[competitionId[0]],
                  jackpot: jackpot,
                  openDate: openTicketDate,
                  limitDate: firstFixtureDate,
                  resultDate: resultTicketDate,
                  maxNumberOfPlay: maxNumberOfPlay,
                  cover: coverPath,
                  picture: picturePath,
                  thumbnail: thumbnailPath }, function(err, gt){
                    if (err){
                      console.log(currentMatchDay, competition, filtedFixtureGroup);
                      console.log("Une erreur c'est produite lors de la création d'un nouveau ticket :", err);
                    } else {
                      console.log("Creation du ticket :", gt.name);
                    }
                    return eachFixtureGroup();
                  });
                } else {
                  console.log("Le ticket existe déjà");
                  return eachFixtureGroup();
                }
              });

            });
          }, function(err){
            if (err) console.log(err);
            eachCompetition();
          });
        });
      });
    }, function(err){
      console.log(err);
      return res.status(200).json("OK");
    });
  }, function(err){
    return res.status(500).json("KO")
  });

});


// Générer un ticket de jeu par match
router.post('/gameticket/single', function(req, res){
  var betsType = [
    { type: "1N2" },
    { type: "BOTH_GOAL" },
    { type: "LESS_MORE_GOAL" },
    { type: "FIRST_GOAL" }
  ];

  var currentDate = moment().utc();
  Competition.find({ active: true,  "availableGames": { $elemMatch: { type: "SINGLE", active: true } } }).then(function(competitions){
    console.log("Nombre de compétitions actives:", competitions.length);
    var competitionsId = competitions.map(competition => competition._id);
    //console.log(competitionsId);
    return Fixture.find({ competition: { $in: competitionsId }, date: { $gt: currentDate.startOf('day') }, status: "soon" }).populate('homeTeam awayTeam competition');
  }).then(function(fixtures){
    console.log(fixtures.length, "matchs trouvés.");
    console.log(currentDate.startOf('day'));
    async.eachLimit(fixtures, 1, function(fixture, eachFixture){
      var openDate = moment(fixture.date).utc().subtract(1, 'day').startOf('day');
      var limitDate = moment(fixture.date).utc();
      var resultDate = moment(fixture.date).utc().add(3, 'hours');
      var ticketName = fixture.homeTeam.name + " - " + fixture.awayTeam.name;
      var competitionId = fixture.competition._id.split('-');
      var coverPath = "";
      var thumbnailPath = process.env.CLOUD_FRONT_URI + "/competition_logo/" + competitionId[0].toLowerCase() + "_logo.png";
      var picturePath = "";

      GameTicket.findOne({ type: "SINGLE", fixtures: [fixture._id] }, function(err, gameticket){
        if (err){
          console.log(err);
          return eachFixture(err);
        } else if (gameticket == null){
            // le ticket nexiste pas encore
            GameTicket.create({ type: "SINGLE",
            fixtures: [fixture._id],
            openDate: openDate,
            limitDate: limitDate,
            name: ticketName,
            cover: "SINGLE",
            picture: "SINGLE",
            thumbnail: thumbnailPath,
            jackpot: 0,
            pointsPerBet: 20,
            resultDate: resultDate,
            maxNumberOfPlay: 1,
            jeton: 1,
            matchDay: fixture.matchDay,
            competition: fixture.competition._id,
            betsType: betsType }, function(err, result){
              if (err){
                console.log("Une erreur est survenu lors de la création du ticket", ticketName);
                return eachFixture(err);
              } else {
                console.log("Création d'un ticket pour le match", result.name, "J" + result.matchDay, "/", openDate);
                console.log("Status actuel:", result.status);
                return eachFixture();
              }
            });
        } else {
          // le ticket existe déjà
          console.log("Le ticket", ticketName, "existe déjà.");
          return eachFixture();
        }
      });
    }, function(err){
      if (err) return res.status(500).json(err);
      return res.status(200).json("OK");
    });
  }, function(err){
    return res.status(500).json(err);
  });

});

module.exports = router;
