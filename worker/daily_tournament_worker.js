// If we are dev env, load dotenv
if (process.env.NODE_ENV != "production"){
  require('dotenv').config();
}

var MongoClient = require('mongodb').MongoClient;
var async = require('async');
var moment = require('moment');
var GCM = require('../lib/gcm');
var Chance = require('chance');
var chance = new Chance();

const chalk = require('chalk');
const chalkInit = chalk.bold.green;
const chalkTask = chalk.bold.cyan;
const chalkDone = chalk.bold.blue;
const chalkError = chalk.bold.red;
const chalkWarning = chalk.bold.yellow;


/*
* Créer un ticket de jeu jackpot jounalier composé de 14 matchs à 16 matchs
*/
var createDailyTournamentJob = function(db){
  return new Promise(function(resolve, reject){
    var Competition = db.collection("competition");
    var GameTicket = db.collection("gameTicket");
    var Fixture = db.collection("fixture");

    const tournamentLevelZanihash = {
      1: { playCost: 6300, fees: 315, pot: 42000, sharing: 30, bonus: 15750, bonusActivation: 100, nbFixtures: 17, playTimeLimit: 1 }, // Bronze I
      2: { playCost: 31500, fees: 1575, pot: 100000, sharing: 30, bonus: 63000, bonusActivation: 200, nbFixtures: 17, playTimeLimit: 1 }, // Bronze III
      3: { playCost: 63000, fees: 3150, pot: 150000, sharing: 25, bonus: 393750, bonusActivation: 250, nbFixtures: 18, playTimeLimit: 2 }, // Silver I
    };

    const tournamentLevelZanicoin = {
      1: { playCost: 12600, fees: 0, pot: 200, sharing: 11, bonus: 100, bonusActivation: 150, nbFixtures: 17, playTimeLimit: 1 }, // Mise de 2 ZC - Pot : 50
      2: { playCost: 31500, fees: 0, pot: 200, sharing: 11, bonus: 300, bonusActivation: 200, nbFixtures: 17, playTimeLimit: 1 }, // Mise de 10 ZC - Pot : 100
      3: { playCost: 63000, fees: 0, pot: 300, sharing: 13, bonus: 600, bonusActivation: 250, nbFixtures: 18, playTimeLimit: 2 },
    };

    const tournamentPlanning = [
      { name: "ZH-Challenge Bronze", level: 1, currency: "ZaniHash", count: 5 },
      { name: "ZH-Challenge Silver", level: 2, currency: "ZaniHash", count: 1 },
      { name: "ZC-Challenge Bronze", level: 1, currency: "ZaniCoin", count: 5 },
      { name: "ZC-Challenge Silver", level: 2, currency: "ZaniCoin", count: 1 },
    ];

    var startRange = moment().utc().add(1, 'day').startOf('day');
    var endRange = moment(startRange).endOf('day');

    async.waterfall([

      // Vérifier que des tournois n'existe pas déjà pour le lendemain
      function(done){
        console.log("Start :", startRange, "End :", endRange);
        GameTicket.findOne({ type: "TOURNAMENT", openDate: { $gt: startRange.toDate(), $lt: endRange.toDate() } }, function(err, result){
          if (err){
            return done(err);
          } else if (result != null){
            //console.log(result);
            return done("Un ou plusieurs tournois sont déjà prévus pour demain !");
          } else {
            return done(null);
          }
        });
      },

      // Récupérer jusqu'à N matchs devant se dérouler sur une période de 3 jours
      function(done){
        Fixture.find({ date: { $gt: moment(startRange).add(1, 'day').startOf('day').toDate(), $lt: moment(startRange).add(1, 'day').endOf('day').toDate() }, zScore: { $exists: true, $gt: 0 } }).limit(200).toArray(function(err, fixtures){
          console.log(fixtures.length);
          if (err){
            return done(err);
          } else if (fixtures.length < 20){
            return done("Nombre de matchs insufissant :" + fixtures.length);
          } else {
            return done(null, fixtures);
          }
        });
      },

      // Plannifier une série de ticket pour le lendemain
      function(fixtures, done){
        var gametickets = [];

        async.eachLimit(tournamentPlanning, 1, function(planning, eachPlanning){
          console.log(planning);
          if (planning.currency == "ZaniCoin"){
            var tournamentLevel = tournamentLevelZanicoin;
          } else if (planning.currency == "ZaniHash"){
            var tournamentLevel = tournamentLevelZanihash;
          } else {
            return eachPlanning("Unknow currency !");
          }

          for (var i = 0; i < parseInt(planning.count); i++){
            Shuffle(fixtures);
            Shuffle(fixtures);

            var fixturesArr = fixtures.slice(0, parseInt(tournamentLevel[planning.level].nbFixtures));
            fixturesArr.sort(function(a,b){
              return new Date(b.date) - new Date(a.date);
            });

            var firstFixture = fixturesArr[0];
            var lastFixture = fixturesArr[fixturesArr.length-1];
            var resultTicketDate = moment(lastFixture.date).utc().add(2, 'hours');

            gametickets.push({
              createdAt: moment().utc().toDate(),
              updatedAt: moment().utc().toDate(),
              type: "TOURNAMENT",
              matchDay: 0,
              competition: null,
              active: true,
              fixtures: fixturesArr.map(f => f._id),
              name: planning.name,
              jackpot: 0,
              jeton: 0,
              active: true,
              status: "close",
              tournament: {
                fees: tournamentLevel[planning.level].fees,
                playCost: tournamentLevel[planning.level].playCost,
                level: planning.level,
                pot: tournamentLevel[planning.level].pot,
                sharing: tournamentLevel[planning.level].sharing,
                rewardType: planning.currency
              },
              openDate: startRange.add(1, 'hour').toDate(),
              limitDate: moment(firstFixture.date).utc().toDate(),
              resultDate: resultTicketDate.toDate(),
              maxNumberOfPlay: 1,
              bonusActivation: tournamentLevel[planning.level].bonusActivation, // nombre de joueur minimum pour activer le bonus
              bonus: tournamentLevel[planning.level].bonus, // bonus en zanicoins
              pointsPerBet: 0,
              picture: "ZaniBet",
              cover: "ZaniBet",
              thumbnail: "ZaniBet",
              passFixtureCheck: false,
              push: { open: false, limit: false }
            });
          }

          return eachPlanning();
        }, function(err){
          if (err){
            return done(err);
          } else {
            console.log(gametickets.length);
            //console.log(gametickets);
            return done(null, gametickets);
          }
        });
      },

      // Bulk insert game ticket
      function(gametickets, done){
        GameTicket.insertMany(gametickets, function(err, result){
          if (err){
            console.log(err);
            return done(err);
          } else {
            console.log(result.insertedCount);
            return done(null, "OK");
          }
        });
      }

    ], function(err, result){
      if (err){
        //console.log(err);
        return reject(err);
      } else {
        return resolve("OK");
      }
    });

  });
};

function Shuffle(o) {
  for(var j, x, i = o.length; i; j = parseInt(Math.random() * i), x = o[--i], o[i] = o[j], o[j] = x);
  return o;
};

// Use connect method to connect to the server
MongoClient.connect(process.env.DB_URI, function(err, db) {
  console.log("Connected successfully to server");
  console.log("-----> Start daily_tournament_worker.js <-----");
  createDailyTournamentJob(db).then(function(res){
    console.log("-----> Stop daily_tournament_worker.js <-----");
    console.log(res);
    db.close();
  }, function(err){
    console.log("-----> Error daily_tournament_worker.js <-----");
    console.log(err);
    db.close();
  });
});
