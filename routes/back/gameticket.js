var express = require('express');
var mongoose = require('mongoose');
var router = express.Router();
var passport = require('passport');
var moment = require('moment');
var requestify = require('requestify');
var mongojs = require('mongojs');
var async = require('async');
var Chance = require('chance');
var chance = new Chance();

var Client = mongoose.model('Client');
var Competition = mongoose.model('Competition');
var Team = mongoose.model('Team');
var Fixture = mongoose.model('Fixture');
var Grille = mongoose.model('Grille');
var GameTicket = mongoose.model('GameTicket');
var User = mongoose.model('User');
var Reward = mongoose.model('Reward');

function Shuffle(o) {
  for(var j, x, i = o.length; i; j = parseInt(Math.random() * i), x = o[--i], o[i] = o[j], o[j] = x);
  return o;
};

router.get('/gametickets/single/stats', function(req, res){
  // Compter le nombre de ticket prévu pour une période
  var from = moment('2018-03-09 00:00');
  var to = moment('2018-03-11 23:00');
  console.log(from, to);

  GameTicket.count({ type: "SINGLE", openDate: { $gt: from, $lt: to } }, function(err, count){
    if (err){
      return res.status(500).json(err);
    } else {
      console.log(count);
      return res.status(200).json(count);
    }
  });
});

// Génération un ticket personnalisé
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

// Générer un ticket de jeu tournament
router.post('/gameticket/tournament', function(req, res){
  var fixtureFromDate = req.body.from_date;
  //var fixtureToDate = req.body.to_date;
  var ticketName = req.body.ticketName;
  var rewardType = req.body.rewardType;
  //var fees = req.body.fees;
  //var playCost = req.body.playCost;
  var coverPath = "";
  var thumbnailPath = "";
  var level = req.body.level;
  var maxTime = req.body.maxTime;

  if (fixtureFromDate == null){
    return res.status(500).json("empty fixtureFromDate");
  } else if (rewardType == null){
    return res.status(500).json("empty rewardType");
  } else if (ticketName == null){
    return res.status(500).json("empty matchday");
  } else if (level == null){
    return res.status(500).json("empty level");
  }  else if (maxTime == null){
    return res.status(500).json("empty maxTime");
  }

  var tournamentLevel;
  if (rewardType == "ZaniCoin"){
    tournamentLevel = {
      0: { playCost: 6300, fees: 0, pot: 100, sharing: 11, bonus: 50, bonusActivation: 100, nbFixtures: 17, playTimeLimit: 1 }, // Mise de 1 ZC - Pot : 20
      1: { playCost: 12600, fees: 0, pot: 100, sharing: 11, bonus: 100, bonusActivation: 150, nbFixtures: 17, playTimeLimit: 1 }, // Mise de 2 ZC - Pot : 50
      2: { playCost: 31500, fees: 0, pot: 100, sharing: 11, bonus: 300, bonusActivation: 200, nbFixtures: 17, playTimeLimit: 1 }, // Mise de 10 ZC - Pot : 100
      3: { playCost: 63000, fees: 0, pot: 200, sharing: 13, bonus: 600, bonusActivation: 250, nbFixtures: 18, playTimeLimit: 2 }, // 20 ZC - Pot : 100 - Silver
      4: { playCost: 94500, fees: 0, pot: 2500, sharing: 20, bonus: 1350, bonusActivation: 300, nbFixtures: 35, playTimeLimit: 5 }, // 30 ZC - Pot : 100 - Gold
      5: { playCost: 126000, fees: 0, pot: 200, sharing: 20, bonus: 1800, bonusActivation: 350, nbFixtures: 35, playTimeLimit: 5 }, // 40 ZC
      6: { playCost: 157500, fees: 0, pot: 200, sharing: 20, bonus: 3000, bonusActivation: 400, nbFixtures: 40, playTimeLimit: 5 }, // 50 ZC
      7: { playCost: 189000, fees: 0, pot: 300, sharing: 20, bonus: 3600, bonusActivation: 450, nbFixtures: 40, playTimeLimit: 5 }, // 60 ZC
      8: { playCost: 378000, fees: 0, pot: 400, sharing: 20, bonus: 9000, bonusActivation: 500, nbFixtures: 40, playTimeLimit: 6 }, // 120 ZC
      9: { playCost: 756000, fees: 0, pot: 500, sharing: 20, bonus: 18000, bonusActivation: 550, nbFixtures: 40, playTimeLimit: 7 }, // 240 ZC
    };
  } else if (rewardType == "ZaniHash"){
    tournamentLevel = {
      0: { playCost: 6300, fees: 315, pot: 42000, sharing: 30, bonus: 15750, bonusActivation: 100, nbFixtures: 17, playTimeLimit: 1 }, // Bronze I
      1: { playCost: 12600, fees: 630, pot: 84000, sharing: 30, bonus: 47250, bonusActivation: 150, nbFixtures: 17, playTimeLimit: 1 }, // Bronze II
      2: { playCost: 31500, fees: 1575, pot: 100000, sharing: 30, bonus: 63000, bonusActivation: 200, nbFixtures: 17, playTimeLimit: 1 }, // Bronze III
      3: { playCost: 63000, fees: 3150, pot: 200000, sharing: 25, bonus: 393750, bonusActivation: 250, nbFixtures: 18, playTimeLimit: 1 }, // Silver I
      4: { playCost: 189000, fees: 9450, pot: 1260000, sharing: 23, bonus: 1417500, bonusActivation: 300, nbFixtures: 18, playTimeLimit: 2 }, // Silver II
      5: { playCost: 378000, fees: 18900, pot: 2520000, sharing: 20, bonus: 393750, bonusActivation: 400, nbFixtures: 18, playTimeLimit: 3 }, // Silver III
    };
  }

  if (tournamentLevel == null) return res.status(500).json("Undefined tournamentLevel.");
  if (tournamentLevel[level] == null) return res.status(500).json("Aucun configuration n'existe pour le niveau indiqué.");

  //fixtureFromDate = moment(fixtureFromDate).utc();
  //fixtureToDate = moment(fixtureToDate);

  var openDate = moment(fixtureFromDate).utc();
  var startDate = moment(fixtureFromDate).utc().startOf('day').add(parseInt(tournamentLevel[level].playTimeLimit), 'days');
  //var toDate = moment(startDate).endOf('day').add(3, 'days');
  var toDate = moment(startDate).utc().endOf('day');

  async.waterfall([
    // Récupérer jusqu'à N matchs devant se dérouler sur une période de 3 jours
    function(done){
      Fixture.find({ date: { $gt: startDate, $lt: toDate }, zScore: { $exists: true, $gt: 0 } }).limit(200).exec(function(err, fixtures){
        console.log(fixtures.length, openDate, startDate, toDate);
        if (err){
          return done(err);
        } else if (fixtures.length < (parseInt(tournamentLevel[level].nbFixtures)+3)){
          return done("Nombre de matchs insufissant :" + fixtures.length);
        } else {
          return done(null, fixtures);
        }
      });
    },

    // Retenir jusqu'à N matchs pour générer un ticket
    function(fixtures, done){
      // Mélanger la liste des matchs
      //console.log(fixtures);
      Shuffle(fixtures);
      console.log("Shuffeleeeeed !!");
      Shuffle(fixtures);
      console.log("Double Shuffeleeeeed !!");

      //console.log(fixtures);
      if (fixtures.length < (parseInt(tournamentLevel[level].nbFixtures)+3)){
        return done('Nombre de match insuffisant pour constituer un ticket !');
      } else {
        // Reduce array
        fixtures = fixtures.slice(0, parseInt(tournamentLevel[level].nbFixtures));
        fixtures.sort(function(a,b){
          return new Date(b.date) - new Date(a.date);
        });
        return done(null, fixtures);
      }
    },

    function(fixtures, done){
      console.log(fixtures.length);
      var firstFixture = fixtures[0];
      var lastFixture = fixtures[fixtures.length-1];
      var openTicketDate = moment(fixtureFromDate).utc().hour( chance.integer({ min: 1, max: parseInt(maxTime) }) );
      var resultTicketDate = moment(lastFixture.date).utc().add(2, 'hours');

      GameTicket.findOne({ type: "TOURNAMENT", fixtures: fixtures, level: level}, function(err, gameticket){
        if(err){
          return done(err);
        } else if (gameticket == null){
          // le ticket n'existe pas encore
          GameTicket.create({ type: "TOURNAMENT",
          matchDay: 0,
          competition: null,
          active: true,
          fixtures: fixtures,
          name: ticketName,
          jackpot: 0,
          "tournament.fees": tournamentLevel[level].fees,
          "tournament.playCost": tournamentLevel[level].playCost,
          "tournament.level": level,
          "tournament.pot": tournamentLevel[level].pot,
          "tournament.sharing": tournamentLevel[level].sharing,
          "tournament.rewardType": rewardType,
          openDate: openTicketDate,
          limitDate: moment(firstFixture.date).utc(),
          resultDate: resultTicketDate,
          maxNumberOfPlay: 1,
          bonusActivation: tournamentLevel[level].bonusActivation, // nombre de joueur minimum pour activer le bonus
          bonus: tournamentLevel[level].bonus, // bonus en zanicoins
          pointsPerBet: 0,
          picture: "ZaniBet",
          cover: "ZaniBet",
          thumbnail: "ZaniBet" }, function(err, gt){
            if (err){
              console.log("Une erreur c'est produite lors de la création d'un nouveau ticket :", err);
            } else {
              console.log("Creation du ticket :", gt.name);
            }
            return done(null);
          });
        } else {
          console.log("Le ticket existe déjà");
          return done(null);
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


// Générer un ticket de jeu pour chaque jour de match de chaque compétition
router.post('/gameticket/matchday', function(req, res){
  var ticketNameArr = {
    "LIGUE1" : "Ligue 1 Jackpot",
    "LIGUE2": "Ligue 2 Jackpot",
    "EREDIVISIE": "Eredivisie Jackpot",
    "BUNDESLIGA1": "Bundesliga 1 Jackpot",
    "BUNDESLIGA2": "Bundesliga 2 Jackpot",
    "SERIEAITA": "Serie A Italia Jackpot",
    "SERIEBITA": "Serie B Italia Jackpot",
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
    "SERIEABRAZIL": "Brasileiro A Jackpot",
    "EKSTRAKLASA": "Ekstraklasa Jackpot",
    "LIGATHAAL": "Ligat ha'Al Jackpot",
    "LIGA1ROMANIA": "Liga Romania Jackpot",
    "LALIGA2": "LaLiga 2 Jackpot",
    "LIGAMX": "Liga MX Jackpot",
    "SEGUNLIGAPORTUGAL": "Segunda Liga Jackpot",
    "MSLUSA": "MLS Jackpot",
    //"UNISOCCERLEAGUE1": "USL Jackpot",
    "SUPERETTAN": "Superettan Jackpot",
    "LIGA1INDONESIA": "Liga Indonesia Jackpot",
    "PRIAAPERCOLOMBIA": "Primera A Jackpot",
    "PRIACLAUCOLOMBIA": "Primera A Jackpot",
    "JLEAGUE": "J-League Jackpot",
    "J2LEAGUE": "J-League 2 Jackpot",
    "BOTOLAPRO": "Botola Jackpot",
    //"KLEAGUE1": "K-League Jackpot",
    "SERIEBBRAZIL": "Brasileiro B Jackpot",
    "SERIECBRAZIL": "Brasileiro C Jackpot",
    //"SERIEDBRAZIL": "Brasileiro D Jackpot",
    "SLIGAARGENTINA": "SuperLiga Jackpot",
    "OBOSLIGAEN": "Obos-Ligaen Jackpot",
    //"CARIOCA1BRAZIL": "Carioca 1 Jackpot",
    //"PAULISTA1BRAZIL": "Paulista 1 Jackpot",
    "VEIKKAUSLIIGA": "Veikkausliiga Jackpot",
    "FIRSTDIVCHILE": "Chile Prem's Jackpot",
    "PLEAGUETHAI": "Thai League Jackpot",
    //"PLEAGUEKAZAK": "Kazak Prem's Jackpot",
    //"PLEAGUEGHANA": "Ghana Prem's Jackpot",
    "DAMALLSVENSKAN": "Damallsvenskan Jackpot",
    "PRIMDIVPERU": "Peru Primera Jackpot",
    //"PLEAGUEKENYA": "Kenya Prem's Jackpot",
    //"PLEAGUENIGERIA": "Nigeria Prem's Jackpot",
    //"VYSSHAYAAZER":"Vysshaya Liga Jackpot", // bielorussie
    //"PLEAGUEETHIOPIA":"Ethiopia Prem's Jackpot",
    //"SLEAGUEZAMBIA":"Super League Jackpot",
    //"PLEAGUEBURKINA":"Burkina Prem's Jackpot",
    //"PSLZIMBABWE":"Zimbabwe Prem's Jackpot",
    "FIRSTDIVIREREP":"Ireland First Jackpot",
    "PREMDIVISIONIREREP":"Ireland Prem's Jackpot",
    "FIRSTHNL": "HNL Croatia Jackpot",
    "CZECHLIGA": "Czech Liga Jackpot",
    "PARVALIGA": "Parva Liga Jackpot",
    "SLIGASERBIA": "Serbia Liga Jackpot",
    "NB1HUNGARY": "NB1 Hungary Jackpot",
    "SUPERLIGASLOVAKIA": "Slovakia Liga Jackpot",
    "SLEAGUESWITZER": "Switz League Jackpot",
    "SUPERLIGADENMARK": "SuperLiga Jackpot"
  };


  Competition.find({ active: true, "availableGames": { $elemMatch: { type: "MATCHDAY", active: true } }, isCurrentSeason: true, _id: { $ne: "WORLDCUP-2018" } }).then(function(competitions){
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
          if (fixtures[0] == null){
            console.log("ERREUR FATAL :", fixtures);
            return eachCompetition();
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
              if (/*filtedFixtureGroup.length < 5 || filtedFixtureGroup.length > 17 ||*/ filtedFixtureGroup.length < parseInt(competition.numberOfTeams/2)){
                console.log("Annuler la création d'un ticket de jeu pour le jour de match", filtedFixtureGroup[0].matchDay, "de la competition", competition.name, competition.country, ".Il n'y a pas assez de match disponible : ", filtedFixtureGroup.length);
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

              if (matchDayGroup[lastMatchDay] == null) {
                console.log("erreur fatale :", matchDayGroup[lastMatchDay]);
                return eachFixtureGroup();
              }

              lastOpenDate = matchDayGroup[lastMatchDay][0].date;


              // Créer un ticket pour le jour de match
              var firstFixtureDate = moment(firstFixture.date).utc();
              var lastFixtureDate = moment(lastFixture.date).utc();
              //var openTicketDate = moment(filtedFixtureGroup[0].date).subtract(3, 'days').hour(0).minute(10);
              var openTicketDate = moment(firstFixture.date).utc().subtract(7, 'days');
              var resultTicketDate = moment(lastFixture.date).utc().add(2, 'hours');

              /*console.log('First fixture date:', firstFixtureDate);
              console.log('Last fixture date:', lastFixtureDate);
              console.log('Open ticket date:', openTicketDate);
              console.log('Result ticket date:', resultTicketDate);*/

              var maxNumberOfPlay = 1;
              var jackpot = 10;
              var pointsPerBet = 10;
              switch(filtedFixtureGroup.length){
                case 5:
                jackpot = 10;
                maxNumberOfPlay = 1;
                pointsPerBet = 4;
                bonus = chance.integer({min:10, max: 25});
                bonusActivation = 3;
                break;
                case 6:
                jackpot = 15;
                maxNumberOfPlay = 1;
                pointsPerBet = 4;
                bonus = chance.integer({min:15, max: 30});
                bonusActivation = 4;
                break;
                case 7:
                jackpot = 30;
                maxNumberOfPlay = 1;
                pointsPerBet = 4;
                bonus = chance.integer({min: 20, max: 35});
                bonusActivation = 5;
                break;
                case 8:
                jackpot = 50;
                maxNumberOfPlay = 1;
                pointsPerBet = 3;
                bonus = chance.integer({min: 20, max: 40});
                bonusActivation = 6;
                break;
                case 9:
                jackpot = 80;
                maxNumberOfPlay = 2;
                pointsPerBet = 3;
                bonus = chance.integer({min: 30, max: 50});
                bonusActivation = 7;
                break;
                case 10:
                jackpot = 100;
                maxNumberOfPlay = 3;
                pointsPerBet = 3;
                bonus = chance.integer({min: 40, max: 70});
                bonusActivation = 8;
                break;
                case 11:
                jackpot = 100;
                maxNumberOfPlay = 4;
                pointsPerBet = 3;
                bonus = chance.integer({min: 40, max: 80});
                bonusActivation = 9;
                break;
                case 12:
                jackpot = 120;
                maxNumberOfPlay = 5;
                pointsPerBet = 3;
                bonus = chance.integer({min: 40, max: 80});
                bonusActivation = 10;
                break;
                case 13:
                jackpot = 120;
                maxNumberOfPlay = 5;
                pointsPerBet = 3;
                bonus = chance.integer({min: 40, max: 80});
                bonusActivation = 11;
                break;
                case 14:
                jackpot = 120;
                maxNumberOfPlay = 5;
                pointsPerBet = 3;
                bonus = chance.integer({min: 40, max: 80});
                bonusActivation = 12;
                break;
                case 15:
                jackpot = 150;
                maxNumberOfPlay = 5;
                pointsPerBet = 3;
                bonus = chance.integer({min: 40, max: 80});
                bonusActivation = 13;
                break;
                case 16:
                jackpot = 150;
                maxNumberOfPlay = 5;
                pointsPerBet = 3;
                bonus = chance.integer({min: 40, max: 80});
                bonusActivation = 14;
                break;
                case 17:
                jackpot = 150;
                maxNumberOfPlay = 5;
                pointsPerBet = 3;
                bonus = chance.integer({min: 40, max: 80});
                bonusActivation = 15;
                break;
                default:
                jackpot = 150;
                maxNumberOfPlay = 3;
                pointsPerBet = 3;
                bonus = chance.integer({min: 60, max: 80});
                bonusActivation = 20;
              }

              var competitionId = competition._id.split('-');
              var coverPath = competitionId[0];
              var thumbnailPath = competitionId[0];
              var picturePath =  "https://www.zanibet.com/mob/ticket_cover/ticket_" + competitionId[0].toLowerCase() + ".png";

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
                  thumbnail: thumbnailPath,
                  pointsPerBet: pointsPerBet,
                  bonus: bonus,
                  bonusActivation: bonusActivation
                }, function(err, gt){
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
                if (gameticket.status == "close"){
                  GameTicket.updateOne({ _id: gameticket._id }, { $set: { name: ticketNameArr[competitionId[0]], jackpot: jackpot, pointsPerBet: pointsPerBet, maxNumberOfPlay: maxNumberOfPlay, bonus: bonus, bonusActivation: bonusActivation, picture: picturePath } }, function(err, result){
                    if (err) console.log(err);
                    console.log("Mise à jour du ticket !", gameticket.name);
                    return eachFixtureGroup();
                  });
                } else if (gameticket.status == "ended" || gameticket.status == "open"){
                  GameTicket.updateOne({ _id: gameticket._id }, { $set: { name: ticketNameArr[competitionId[0]], picture: picturePath } }, function(err, result){
                    if (err) console.log(err);
                    console.log("Mise à jour du ticket !");
                    return eachFixtureGroup();
                  });
                } else {
                  return eachFixtureGroup();
                }
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

  var countInstalledTicket = 0;
  var currentDate = moment().utc();

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

  Competition.find({ _id: { $in: allowedLeagues }, active: true,  availableGames: { $elemMatch: { type: "SINGLE", active: true } }, isCurrentSeason: true }).then(function(competitions){
    console.log("Nombre de compétitions actives:", competitions.length);
    var competitionsId = competitions.map(competition => competition._id);
    //console.log(competitionsId);
    var limitDate = moment().utc().add(1, 'month').endOf('day');
    //var fromDate = moment().utc().subtract(1, 'month').startOf('day');
    var fromDate = moment().utc().startOf('day');
    return Fixture.find({ competition: { $in: competitionsId }, date: { $gt: fromDate, $lt: limitDate }, status: "soon" }).populate('homeTeam awayTeam competition');
  }).then(function(fixtures){
    console.log(fixtures.length, "matchs trouvés.");
    console.log(currentDate.startOf('day'));
    async.eachLimit(fixtures, 1, function(fixture, eachFixture){
      var openDate = moment(fixture.date).utc().subtract(3, 'day').startOf('day');
      var limitDate = moment(fixture.date).utc();
      var resultDate = moment(fixture.date).utc().add(3, 'hours');
      //console.log(fixture);
      var ticketName = fixture.homeTeam.name + " - " + fixture.awayTeam.name;
      var competitionId = fixture.competition._id.split('-');
      var coverPath = "";
      var thumbnailPath = "https://www.zanibet.com/mob/competition_logo/" + competitionId[0].toLowerCase() + "_logo.png";
      var picturePath = "";

      var bonus = 0;
      var pointsPerBet = 5;
      var standingMalus = 0;
      var divisionMalus = 0;

      var competition = fixture.competition;
      var standings = competition.standings;
      if (standings != null && competition.numberOfTeams > 0 && competition.numberOfTeams < 25){
        var homeTeamStanding = standings.filter(s => String(s.team) == String(fixture.homeTeam._id));
        var awayTeamStanding = standings.filter(s => String(s.team) == String(fixture.awayTeam._id));
        //console.log(homeTeamStanding, awayTeamStanding)
        if (homeTeamStanding.length == 1 && awayTeamStanding.length == 1){
          var nbrStandings = standings.length;
          standingMalus = ((parseInt(homeTeamStanding[0].position)+parseInt(awayTeamStanding[0].position))/parseInt(competition.numberOfTeams*2))*competition.numberOfTeams;
        } else {
          standingMalus = 20;
        }
      } else {
        standingMalus = 20;
      }

      switch(fixture.competition.division){
        case 1:
        bonus = chance.integer({min: (100-standingMalus), max: 100});
        pointsPerBet = 5;
        break;
        case 2:
        divisionMalus =
        bonus = chance.integer({min: (89-standingMalus), max: 89});
        pointsPerBet = 4;
        break;
        case 3:
        bonus = chance.integer({min: (70-standingMalus), max: 70});
        pointsPerBet = 3;
        break;
        case 4:
        bonus = chance.integer({min: (67-standingMalus), max: 67});
        pointsPerBet = 2;
        case 5:
        bonus = chance.integer({min: (62-standingMalus), max: 62});
        pointsPerBet = 2;
        break;
      }

      if (fixture.competition.isCup){
        if (fixture.competition.isInternational){
          bonus = chance.integer({min: 90, max: 120});
        } else {
          bonus = chance.integer({min: 80, max: 100});
        }
        pointsPerBet = 5;
      }

      console.log("Bonus :", bonus);

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
          resultDate: resultDate,
          name: ticketName,
          cover: "SINGLE",
          picture: "SINGLE",
          thumbnail: thumbnailPath,
          jackpot: 0,
          pointsPerBet: pointsPerBet,
          bonus: bonus,
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
              countInstalledTicket++;
              return eachFixture();
            }
          });
        } else {
          // le ticket existe déjà
          if (gameticket.status == "close"){
            console.log("Le ticket", ticketName, "existe déjà et est fermé.");
            GameTicket.update({ _id: gameticket._id }, { $set: { bonus: bonus, pointsPerBet: pointsPerBet, thumbnail: thumbnailPath, openDate: openDate,
              limitDate: limitDate, resultDate: resultDate } }, function(err, result){
                if (err) return eachFixture(err);
                console.log("Mise à jour du ticket", gameticket.name, gameticket.matchDay);
                return eachFixture();
              });
            } else if (gameticket.status == "open"){
              console.log("Le ticket", ticketName, "existe déjà et est ouvert.");
              GameTicket.update({ _id: gameticket._id }, { $set: { thumbnail: thumbnailPath } }, function(err, result){
                if (err) return eachFixture(err);
                console.log("Mise à jour du ticket", gameticket.name, gameticket.matchDay);
                return eachFixture();
              });
            } else {
              return eachFixture();
            }
          }
        });
      }, function(err){
        if (err) return res.status(500).json(err);
        console.log("Nombre de tickets installés :", countInstalledTicket);
        return res.status(200).json("OK");
      });
    }, function(err){
      console.log("Nombre de tickets installés :", countInstalledTicket);
      return res.status(500).json(err);
    });

  });

  // Création de ticket spécial coupe du monde
  router.post('/gameticket/worldcup/mini-jackpot', function(req, res){
    async.waterfall([

      function(done){
        Fixture.find({ competition: "WORLDCUP-2018", group: { $exists: true } }).exec(function(err, fixtures){
          if (err){
            return done(err);
          } else if (fixtures == null || fixtures.length == 0){
            return done("Aucun match");
          } else {
            return done(null, fixtures);
          }
        });
      },

      function(fixtures, done){
        async.groupBy(fixtures, function(fixture, callback){
          return callback(null, fixture.group);
        }, function(err, results){
          if (err){
            return done(err);
          }
          return done(null, results);
        });
      },

      function(fixturesGroup, done){
        for (var key in fixturesGroup){
          fixturesGroup[key].sort(function(a, b){
            a.date - b.date;
          });
        }
        //console.log(fixturesGroup["A"]);
        return done(null, fixturesGroup);
      },

      // Commencer à construire les tickets
      function(fixturesGroup, done){
        var fixtureGroupArr = [];
        for (var i = 0; i < 6; i++){
          var fixtures = [];
          fixtures.push(fixturesGroup["A"][i]);
          fixtures.push(fixturesGroup["B"][i]);
          fixtures.push(fixturesGroup["C"][i]);
          fixtures.push(fixturesGroup["D"][i]);
          fixtures.push(fixturesGroup["E"][i]);
          fixtures.push(fixturesGroup["F"][i]);
          fixtures.push(fixturesGroup["G"][i]);
          fixtures.push(fixturesGroup["H"][i]);

          fixtures.sort(function(a, b){
            return a.date - b.date;
          });
          fixtureGroupArr.push(fixtures);
        }
        //console.log(fixtureGroupArr[5]);
        //return done("stop");
        var count = 1;
        async.eachLimit(fixtureGroupArr, 1, function(ticketFixtures, eachTicketFixtures){
          var openDate = moment(ticketFixtures[0].date).utc().subtract(4, 'day');
          var limitDate = moment(ticketFixtures[0].date).utc();
          var resultDate = moment(ticketFixtures[fixtures.length-1].date).utc().add(2, 'hour');
          var coverPath = "WORLDCUP";
          var thumbnailPath = "WORLDCUP";
          var picturePath =  "http://www.zanibet.com/mob/ticket_cover/ticket_world_cup_mini" + String(count) +".png";
          var jackpot = 50;
          var maxNumberOfPlay = 1;
          var pointsPerBet = 5;
          var bonus = chance.integer({min: 30, max: 60});
          var bonusActivation = 6;

          count = count+1;

          GameTicket.findOne({ type: "MATCHDAY", fixtures: { $in: ticketFixtures }, competition: "WORLDCUP-2018" }, function(err, gameticket){
            if(err){
              console.log(err);
              return eachFixtureGroup()
            } else if (gameticket == null){
              // le ticket n'existe pas encore
              GameTicket.create({
                type: "MATCHDAY",
                matchDay: 0,
                competition: "WORLDCUP-2018",
                active: true,
                fixtures: ticketFixtures,
                name: "Wold Cup Mini Jackpot",
                jackpot: jackpot,
                openDate: openDate,
                limitDate: limitDate,
                resultDate: resultDate,
                maxNumberOfPlay: maxNumberOfPlay,
                cover: coverPath,
                picture: picturePath,
                thumbnail: thumbnailPath,
                pointsPerBet: pointsPerBet,
                bonus: bonus,
                bonusActivation: bonusActivation
              }, function(err, gt){
                if (err){
                  console.log("Une erreur c'est produite lors de la création d'un nouveau ticket :", err);
                  return eachTicketFixtures(err);
                } else {
                  console.log("Creation du ticket :", gt.name);
                }
                return eachTicketFixtures();
              });
            } else {
              console.log("Le ticket existe déjà");
              if (gameticket.status == "close"){
                GameTicket.updateOne({ _id: gameticket._id }, { $set: { jackpot: jackpot, pointsPerBet: pointsPerBet, maxNumberOfPlay: maxNumberOfPlay, bonus: bonus, bonusActivation: bonusActivation } }, function(err, result){
                  if (err) console.log(err);
                  console.log("Mise à jour du ticket !");
                  return eachTicketFixtures();
                });
              }
              return eachTicketFixtures();
            }
          });
        }, function(err){
          if (err){
            console.log(err);
            return done(err);
          }
          return done(null, "OK");
        });
      }

    ], function(err, result){
      if (err){
        return res.status(500).json(err);
      }
      return res.status(200).json(result);
    });

  });


  // Création de ticket spécial coupe du monde
  router.post('/gameticket/worldcup/group-jackpot', function(req, res){

    async.waterfall([

      function(done){
        Fixture.find({ competition: "WORLDCUP-2018", group: { $exists: true } }).exec(function(err, fixtures){
          if (err){
            return done(err);
          } else if (fixtures == null || fixtures.length == 0){
            return done("Aucun match");
          } else {
            return done(null, fixtures);
          }
        });
      },

      function(fixtures, done){
        async.groupBy(fixtures, function(fixture, callback){
          return callback(null, fixture.matchDay);
        }, function(err, results){
          if (err){
            return done(err);
          }
          return done(null, results);
        });
      },

      function(fixturesGroup, done){
        for (var key in fixturesGroup){
          fixturesGroup[key].sort(function(a, b){
            a.date - b.date;
          });
        }
        return done(null, fixturesGroup);
      },

      // Commencer à construire les tickets
      function(fixturesGroup, done){
        // pour chaque jour de match construire un ticket jackpot
        async.eachLimit(fixturesGroup, 1, function(fixtures, eachFixtureGroup){
          if (fixtures.length < 16 || fixtures.length != 16){
            console.log(fixtures.length);
            return eachFixtureGroup("Nombre de match incorrect !");
          }

          console.log("FIXTURE GROUP : ", fixtures.length);
          var openDate = moment(fixtures[0].date).utc().subtract(7, 'day');
          var limitDate = moment(fixtures[0].date).utc();
          var resultDate = moment(fixtures[fixtures.length-1].date).utc().add(2, 'hour');
          var coverPath = "WORLCUP";
          var thumbnailPath = "WORLCUP";
          var picturePath = "https://www.zanibet.com/mobi/ticket_cover/ticket_world_cup" + String(fixtures[0].matchDay) +".png";
          var jackpot = 150;
          var maxNumberOfPlay = 3;
          var pointsPerBet = 5;
          var bonus = chance.integer({min: 100, max: 160});
          var bonusActivation = 14;

          GameTicket.findOne({ type: "MATCHDAY", competition: "WOLRDCUP-2018", fixtures: { $in: fixtures } }, function(err, gameticket){
            if(err){
              console.log(err);
              return eachFixtureGroup()
            } else if (gameticket == null){
              // le ticket n'existe pas encore
              GameTicket.create({ type: "MATCHDAY",
              matchDay: parseInt(fixtures[0].matchDay),
              competition: "WOLRDCUP-2018",
              active: true,
              fixtures: fixtures,
              name: "World Cup Jackpot",
              jackpot: jackpot,
              openDate: openDate,
              limitDate: limitDate,
              resultDate: resultDate,
              maxNumberOfPlay: maxNumberOfPlay,
              cover: coverPath,
              picture: picturePath,
              thumbnail: thumbnailPath,
              pointsPerBet: pointsPerBet,
              bonus: bonus,
              bonusActivation: bonusActivation
            }, function(err, gt){
              if (err){
                console.log(fixtures[0].matchDay);
                console.log("Une erreur c'est produite lors de la création d'un nouveau ticket :", err);
                return eachFixtureGroup(err);
              } else {
                console.log("Creation du ticket :", gt.name);
              }
              return eachFixtureGroup();
            });
          } else {
            console.log("Le ticket existe déjà");
            if (gameticket.status == "close"){
              GameTicket.updateOne({ _id: gameticket._id }, { $set: { jackpot: jackpot, pointsPerBet: pointsPerBet, maxNumberOfPlay: maxNumberOfPlay, bonus: bonus, bonusActivation: bonusActivation } }, function(err, result){
                if (err) console.log(err);
                console.log("Mise à jour du ticket !");
                return eachFixtureGroup();
              });
            }
          }
        });
      }, function(err){
        return done(err, "OK");
      });
    }

  ], function(err, result){
    if (err){
      return res.status(500).json(err);
    }
    return res.status(200).json(result);
  });

});

/*router.delete('/gametickets', function(req, res){
// Retrouver les ticket créer avant l'ouverture du jeu
GameTicket.find({ openDate: { $lt: moment("2017-11-15") } }).then(function(gametickets){
var fixtureArr = [];
// Récupérer tous les matchs
async.eachLimit(gametickets, 1, function(gameticket, eachGameTicket){
fixtureArr = fixtureArr.concat(gameticket.fixtures);
eachGameTicket();
}, function(err){
if (err) return res.status(500).json(err);
// Supprimer tous les matchs appartenant aux tickets à suppprimer
Fixture.deleteMany({ _id: { $in: fixtureArr } }).then(function(result){
//console.log(result);
async.map(gametickets, function(gameticket, mapGameTicket) {
mapGameTicket(null, gameticket._id);
}, function(err, gameticketArr) {
console.log(gameticketArr);
// Supprimer toutes les grilles appartenant aux tickets à supprimer
return Grille.deleteMany({ gameTicket: { $in: gameticketArr } });
});
}).then(function(grilleDel){
// Supprimer tous les tickets
GameTicket.deleteMany({ openDate: { $lt: moment("2017-11-15") } }).exec(function(err, result){
console.log(err);
if (err) return res.status(500).json(err);
return res.status(200).json(result);
});
}, function(err){
console.log(err);
return res.status(500).json(err);
});
});
});
});*/

router.put('/gametickets/matchday/clean', function(req, res){
  // Désactiver les tickets qui n'ont pas de compétitions
  Competition.find({ isCurrentSeason: true, availableGames: { $elemMatch: { type: "MATCHDAY", active: false } } }).exec().then(function(competitions){

    var competitionId = competitions.map(comp => comp._id);
    console.log(competitionId);
    //return res.status(500).json("stop");

    GameTicket.updateMany({ type: "MATCHDAY", competition: { $in: competitionId }, status: "close", active: true }, { $set: { active: false, status: "canceled" } },function(err, result){
      if (err) return res.status(500).json(err);
      console.log(result.nModified, "ticket ont été désactivé !.")
      return res.status(200).json(result);
    });
  }, function(err){
    return res.status(500).json(err);
  });
});


module.exports = router;
