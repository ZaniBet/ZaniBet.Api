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

/*
* Mettre à jour les données des tickets "MATCHDAY" qui ne sont pas encore ouvert
*/
router.put('/gametickets/matchday/fixData', function(req, res){
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
    "LIGATHAAL": "Ligat ha'Al Jackpot",
    "LIGA1ROMANIA": "Liga 1 Romania Jackpot",
    "LALIGA2": "LaLiga 2 Jackpot",
    "LIGAMX": "Liga MX Jackpot",
    "SEGUNLIGAPORTUGAL": "Segunda Liga Jackpot",
    "MSLUSA": "MLS Jackpot",
    "UNISOCCERLEAGUE1": "USL Jackpot",
    "SUPERETTAN": "Superettan Jackpot",
    "LIGA1INDONESIA": "Liga 1 Jackpot",
    "PRIAAPERCOLOMBIA": "Primera A Jackpot",
    "PRIACLAUCOLOMBIA": "Primera A Jackpot",
    "JLEAGUE": "J-League Jackpot",
    "J2LEAGUE": "J-League 2 Jackpot",
    "BOTOLAPRO": "Botola Jackpot",
    "KLEAGUE1": "K-League Jackpot",
    "SERIEBBRAZIL": "Brasileiro B Jackpot"
  };

  GameTicket.find({ status: 'close', type: "MATCHDAY" }).then(function(gametickets){
    async.eachLimit(gametickets, 1, function(gameticket, eachGameTicket){
      var maxNumberOfPlay = 1;
      var jackpot = 10;
      var pointsPerBet = 5;
      var bonus = 0;
      var bonusActivation = 4;

      switch(gameticket.fixtures.length){
        case 4:
        jackpot = 10;
        maxNumberOfPlay = 1;
        pointsPerBet = 5;
        bonus = chance.integer({min: 20, max: 40});
        bonusActivation = 3;
        break;
        case 5:
        jackpot = 15;
        maxNumberOfPlay = 1;
        pointsPerBet = 5;
        bonus = chance.integer({min: 20, max: 40});
        bonusActivation = 3;
        break;
        case 6:
        jackpot = 20;
        maxNumberOfPlay = 1;
        pointsPerBet = 5;
        bonus = chance.integer({min: 10, max: 30});
        bonusActivation = 4;
        break;
        case 7:
        jackpot = 30;
        maxNumberOfPlay = 2;
        pointsPerBet = 5;
        bonus = chance.integer({min: 20, max: 40});
        bonusActivation = 5;
        break;
        case 8:
        jackpot = 60;
        maxNumberOfPlay = 4;
        pointsPerBet = 5;
        bonus = chance.integer({min: 30, max: 50});
        bonusActivation = 6;
        break;
        case 9:
        jackpot = 100;
        maxNumberOfPlay = 5;
        pointsPerBet = 5;
        bonus = chance.integer({min: 40, max: 60});
        bonusActivation = 7;
        break;
        case 10:
        jackpot = 150;
        maxNumberOfPlay = 5;
        pointsPerBet = 5;
        bonus = chance.integer({min: 40, max: 70});
        bonusActivation = 8;
        break;
        case 11:
        jackpot = 200;
        maxNumberOfPlay = 5;
        pointsPerBet = 5;
        bonus = chance.integer({min: 50, max: 80});
        bonusActivation = 9;
        break;
        case 12:
        jackpot = 200;
        maxNumberOfPlay = 5;
        pointsPerBet = 5;
        bonus = chance.integer({min: 60, max: 90});
        bonusActivation = 10;
        break;
        case 13:
        jackpot = 250;
        maxNumberOfPlay = 5;
        pointsPerBet = 5;
        bonus = chance.integer({min: 100, max: 170});
        bonusActivation = 11;
        break;
        default:
        jackpot = 0;
        maxNumberOfPlay = 0;
        pointsPerBet = 0;
        bonus = 0;
        bonusActivation = 4;
      }
      GameTicket.update({ _id: gameticket._id }, { $set: { name: ticketNameArr[gameticket.competition.replace('-2017', '').replace('-2018', '')], jackpot: jackpot, maxNumberOfPlay: maxNumberOfPlay, pointsPerBet: pointsPerBet, bonus: bonus, bonusActivation: bonusActivation } }, function(err, result){
        if (err) return eachGameTicket(err);
        console.log("Mise à jour du ticket", gameticket.name, gameticket.matchDay);
        return eachGameTicket();
      });
    }, function(err){
      if (err) res.status(500).json(err);
      return res.status(200).json("OK");
    });
  }, function(err){
    return res.status(500).json(err);
  });
});

/*
* Mettre à jour les rémunérations et bonus des ticket matchday
*/
router.put('/gametickets/matchday/fixBonus', function(req, res){
  GameTicket.find({ status: { $in: ['close'] }, type: "MATCHDAY" }).then(function(gametickets){
    async.eachLimit(gametickets, 1, function(gameticket, eachGameTicket){
      var maxNumberOfPlay = 1;
      var jackpot = 10;
      var pointsPerBet = 10;
      var bonus = 0;
      var bonusActivation = 4;

      switch(gameticket.fixtures.length){
        case 4:
        jackpot = 10;
        maxNumberOfPlay = 1;
        pointsPerBet = 20;
        bonus = chance.integer({min: 20, max: 40});
        bonusActivation = 3;
        break;
        case 5:
        jackpot = 15;
        maxNumberOfPlay = 1;
        pointsPerBet = 20;
        bonus = chance.integer({min: 20, max: 40});
        bonusActivation = 3;
        break;
        case 6:
        jackpot = 20;
        maxNumberOfPlay = 1;
        pointsPerBet = 20;
        bonus = chance.integer({min: 30, max: 60});
        bonusActivation = 4;
        break;
        case 7:
        jackpot = 30;
        maxNumberOfPlay = 2;
        pointsPerBet = 10;
        bonus = chance.integer({min: 30, max: 70});
        bonusActivation = 5;
        break;
        case 8:
        jackpot = 60;
        maxNumberOfPlay = 4;
        pointsPerBet = 10;
        bonus = chance.integer({min: 40, max: 80});
        bonusActivation = 6;
        break;
        case 9:
        jackpot = 100;
        maxNumberOfPlay = 5;
        pointsPerBet = 8;
        bonus = chance.integer({min: 50, max: 90});
        bonusActivation = 7;
        break;
        case 10:
        jackpot = 150;
        maxNumberOfPlay = 5;
        pointsPerBet = 5;
        bonus = chance.integer({min: 50, max: 100});
        bonusActivation = 7;
        break;
        case 11:
        jackpot = 200;
        maxNumberOfPlay = 5;
        pointsPerBet = 5;
        bonus = chance.integer({min: 60, max: 120});
        bonusActivation = 8;
        break;
        case 12:
        jackpot = 200;
        maxNumberOfPlay = 5;
        pointsPerBet = 5;
        bonus = chance.integer({min: 70, max: 120});
        bonusActivation = 9;
        break;
        case 13:
        jackpot = 250;
        maxNumberOfPlay = 5;
        pointsPerBet = 6;
        bonus = chance.integer({min: 100, max: 170});
        bonusActivation = 10;
        break;
        default:
        jackpot = 0;
        maxNumberOfPlay = 0;
        pointsPerBet = 0;
        bonus = 0;
        bonusActivation = 4;
      }

      GameTicket.update({ _id: gameticket._id }, { $set: { bonus: bonus, bonusActivation: bonusActivation } }, function(err, result){
        if (err) return eachGameTicket(err);
        console.log("Mise à jour du ticket", gameticket.name, gameticket.matchDay);
        return eachGameTicket();
      });
    }, function(err){
      if (err) res.status(500).json(err);
      return res.status(200).json("OK");
    });
  }, function(err){
    return res.status(500).json(err);
  });
});

/*
* Corriger les rémunérations et bonus des ticket single
*/
router.put('/gametickets/single/fixPointsPerBet', function(req, res){
  GameTicket.find({ type: "SINGLE", limitDate: { $gt: moment().utc() }, $or: [ { status: 'open' }, { status: 'close' } ] }).populate('competition').then(function(gametickets){
    console.log(gametickets.length);
    async.eachLimit(gametickets, 1, function(gameticket, eachGameTicket){
      var competition = gameticket.competition;
      var bonus = 0;
      var pointsPerBet = 20;

      switch(competition.division){
        case 1:
        bonus = chance.integer({min: 50, max: 80});
        pointsPerBet = 15;
        break;
        case 2:
        bonus = chance.integer({min: 30, max: 60});
        pointsPerBet = 12;
        break;
        case 3:
        bonus = chance.integer({min: 10, max: 80});
        pointsPerBet = 10;
        break;
        case 4:
        bonus = chance.integer({min: 10, max: 80});
        pointsPerBet = 10;
        break;
      }

      if (competition.isCup){
        bonus = chance.integer({min: 50, max: 60});
        pointsPerBet = 20;
      }

      GameTicket.update({ _id: gameticket._id }, { $set: { pointsPerBet: pointsPerBet, bonus: bonus } }, function(err, result){
        if (err) return eachGameTicket(err);
        return eachGameTicket();
      });
    }, function(err){
      if (err) res.status(500).json(err);
      return res.status(200).json("OK");
    });
  }, function(err){
    return res.status(500).json(err);
  });
});

/*
* Mettre à jour les images des tickets de jeu
*/
router.put('/gametickets/fixPicture', function(req, res){

  var background = [
    { id: "LIGUE1-2017", url: "https://s3-eu-west-1.amazonaws.com/zanibet/ticket_cover/v1/ticket_ligue1.png" },
    { id: "EREDIVISIE-2017", url: "https://s3-eu-west-1.amazonaws.com/zanibet/ticket_cover/v1/ticket_eredivisie.png" },
    { id: "BUNDESLIGA1-2017", url: "https://s3-eu-west-1.amazonaws.com/zanibet/ticket_cover/v1/ticket_bundesliga1.png" },
    { id: "SERIEAITA-2017", url: "https://s3-eu-west-1.amazonaws.com/zanibet/ticket_cover/v1/ticket_seriea.png" },
    { id: "PLEAGUE-2017", url: "https://s3-eu-west-1.amazonaws.com/zanibet/ticket_cover/v1/ticket_premier_league.png" },
    { id: "LIGANOS-2017", url: "https://s3-eu-west-1.amazonaws.com/zanibet/ticket_cover/v1/ticket_liganos.png" },
    { id: "LALIGA-2017", url: "https://s3-eu-west-1.amazonaws.com/zanibet/ticket_cover/v1/ticket_laliga.png" }
  ];

  GameTicket.find().then(function(gametickets){
    async.eachLimit(gametickets, 1, function(gameticket, eachGameTicket){
      var filterBackground = background.filter(back => back.id == gameticket.competition);
      console.log(filterBackground);
      if (filterBackground == null || filterBackground.length == 0) return eachGameTicket();
      GameTicket.update({ _id: gameticket._id }, { $set: { picture: filterBackground[0].url } }, function(err, result){
        if (err) return eachGameTicket(err);
        return eachGameTicket();
      });
    }, function(err){
      if (err) res.status(500).json(err);
      return res.status(200).json("OK");
    });
  }, function(err){
    return res.status(500).json(err);
  });
});

/*
* Ajout du parametre passFixtureCheck
*/
router.put('/gametickets/fixPassFixture', function(req, res){
  GameTicket.updateMany({ passFixtureCheck: { $exists: false } }, { passFixtureCheck: false }, function(err, result){
    if (err){
      return res.status(500).json(err);
    }
    return res.status(200).json(result);
  });
});

router.put('/gametickets/fixCompetition', function(req, res){
  var oldCompetition = req.body.oldCompetition;
  var newCompetition = req.body.newCompetition;

  GameTicket.updateMany({ competition: oldCompetition }, { $set: { competition: newCompetition } }, function(err, result){
    if (err){
      return res.status(500).json(err);
    } else {
      return res.status(200).json(result);
    }
  });
});

/*
* Désactiver un type de ticket à venir pour une compétition spécifique
*/
router.put('/gametickets/disable', function(req, res){

  var competitionId = req.body.competition;
  var type = req.body.type;

  if (type == null || type != "MATCHDAY" && type != "SINGLE" || type == "TOURNAMENT"){
    return res.status(500).json("Invalid ticket type.");
  }

  GameTicket.updateMany( { status: "close", competition: competitionId, type: type }, { $set: { active: false, status: "canceled" } }, function(err, result){
    if (err){
      console.log(err);
      return res.status(500).json(err);
    } else {
      console.log(result);
      return res.status(200).json(result);
    }
  });

});

router.put('/gametickets/tournament/fixRewardType', function(req, res){
  GameTicket.updateMany( { "tournament.rewardType": { $exists: false }, type: "TOURNAMENT" }, { $set: { "tournament.rewardType": "ZaniCoin" } }, function(err, result){
    if (err){
      console.log(err);
      return res.status(500).json(err);
    } else {
      console.log(result);
      return res.status(200).json(result);
    }
  });
});

router.put('/gametickets/fixImages', function(req, res){
  GameTicket.updateMany( { "tournament.rewardType": { $exists: false }, type: "TOURNAMENT" }, { $set: { "tournament.rewardType": "ZaniCoin" } }, function(err, result){
    if (err){
      console.log(err);
      return res.status(500).json(err);
    } else {
      console.log(result);
      return res.status(200).json(result);
    }
  });
});


router.put('/gametickets/single/fixCanceled', function(req, res){

  Fixture.find({ status: "canceled" }).exec().then(function(fixtures){
    if (fixtures.length == 0){
      throw 'Empty fixtures';
    }
    return GameTicket.updateMany({ type: "SINGLE", status: "ended", fixtures: { $in: fixtures.map(f => f._id ) } }, { $set: { status: "canceled" } }).exec();
  }).then(function(gametickets){
    console.log(gametickets);
    return res.status(200).json("OK");
  }, function(err){
    return res.status(500).json(err);
  });

});
/*router.put('/gametickets/fixBonuses', function(req, res){
  async.waterfall([
    function(done){

    }
  ])
});*/

module.exports = router;
