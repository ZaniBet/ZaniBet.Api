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
var createDailyJackpotJob = function(db){
  return new Promise(function(resolve, reject){
    var Competition = db.collection("competition");
    var GameTicket = db.collection("gameTicket");
    var Fixture = db.collection("fixture");

    async.waterfall([

      function(done){
        var startRange = moment().utc().startOf('day');
        var endRange = moment().utc().endOf('day');
        GameTicket.findOne({ competition: "MULTILEAGUE", type: "MATCHDAY", openDate: { $gt: startRange.toDate(), $lt: endRange.toDate() } }, function(err, result){
          if (err){
            return done(err);
          } else if (result != null){
            return done("Un ticket existe déjà pour aujourd'hui !");
          } else {
            return done(null);
          }
        });
      },

      function(done){
        Competition.find({ availableGames: { $elemMatch: { type: "DAILY-JACKPOT", active: true } }, active: true, isCurrentSeason: true }).toArray(function(err, result){
          if (err){
            return done(err);
          } else {
            console.log("Compétitions actives pour le mode de jeu :", result.length);
            //console.log(result.map(r => r._id));
            return done(null, result);
          }
        });
      },

      function(competitions, done){
        var startDate = moment().utc().add(1, 'day').startOf('day');
        startDate.add(30, 'minute');
        var endDate = moment().utc().add(1, 'day').endOf('day');

        console.log("Start date :", startDate, "End date :", endDate);
        Fixture.find({ competition: { $in: competitions.map(c => c._id) }, date: { $gt: startDate.toDate(), $lt: endDate.toDate() } }).limit(50).toArray(function(err, fixtures){
          if (err){
            return done(err);
          } else if (fixtures == null || fixtures.length < 12){
            console.log(fixtures.length);
            return done("Nombre de match insuffisant !");
          } else {
            return done(null, fixtures);
          }
        });
      },

      // Construire le ticket de jeu
      function(fixtures, done){
        console.log(fixtures.length);
        //return done("stop");
        Shuffle(fixtures);
        Shuffle(fixtures);

        /*if (fixtures.length > 15){
          fixtures = fixtures.slice(0, 12);
        } else if (fixtures.length > 13){
          fixtures = fixtures.slice(0, 12);
        }*/

        fixtures = fixtures.slice(0, 12);

        fixtures.sort(function(a, b){
          return a.date - b.date;
        });
        console.log(fixtures.length);
        //return done("stop");

        var ticketName = "Daily Jackpot";
        var openDate = moment(fixtures[0].date).utc().subtract(1, 'day');
        openDate.hour(10);
        var limitDate = moment(fixtures[0].date).utc();
        var resultDate = moment(fixtures[fixtures.length-1].date).utc().add(2, 'hour');
        var coverPath = "MULTILEAGUE";
        var thumbnailPath = "MULTILEAGUE";
        var picturePath =  "https://www.zanibet.com/mob/ticket_cover/ticket_daily_jackpot" + String(chance.integer({ min: 1, max: 8 })) +".png";
        var jackpot = 50;
        var maxNumberOfPlay = 1;
        var pointsPerBet = 5;
        var bonus = chance.integer({min: 30, max: 60});
        var bonusActivation = 6;
        var matchDay = openDate.dayOfYear();

        if (fixtures.length == 16){
          jackpot = 100;
          maxNumberOfPlay = 6;
          pointsPerBet = 5;
          bonusActivation = 12;
          bonus = chance.integer({min: 50, max: 120});
          ticketName = "Daily Sixteen Jackpot";
        } else if (fixtures.length == 14){
          jackpot = 80;
          maxNumberOfPlay = 5;
          pointsPerBet = 5;
          bonusActivation = 10;
          bonus = chance.integer({min: 40, max: 80});
          ticketName = "Daily 14 Jackpot";
        } else if (fixtures.length == 12){
          jackpot = 80;
          maxNumberOfPlay = 4;
          pointsPerBet = 3;
          bonusActivation = 8;
          bonus = chance.integer({min: 30, max: 70});
          ticketName = "Daily Twelve Jackpot";
        } else {
          return done("Nombre de matchs incorrect !");
        }

        GameTicket.insertOne({
          createdAt: moment().utc().toDate(),
          updatedAt: moment().utc().toDate(),
          type: "MATCHDAY",
          matchDay: matchDay,
          competition: "MULTILEAGUE",
          active: true,
          fixtures: fixtures.map(f => f._id),
          name: ticketName,
          jackpot: jackpot,
          jeton: 0,
          openDate: openDate.toDate(),
          limitDate: limitDate.toDate(),
          resultDate: resultDate.toDate(),
          maxNumberOfPlay: maxNumberOfPlay,
          cover: coverPath,
          picture: picturePath,
          thumbnail: thumbnailPath,
          pointsPerBet: pointsPerBet,
          bonus: bonus,
          bonusActivation: bonusActivation,
          status: "close",
          passFixtureCheck: false,
          push: { open: false, limit: false }
        }, function(err, result){
          if (err){
            console.log(err);
            return done(err);
          } else {
            console.log("Création du ticket", ticketName, "J", matchDay, "-",result.insertedCount);
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
  console.log("-----> Start daily_ticket_worker.js <-----");
  createDailyJackpotJob(db).then(function(res){
    console.log(res);
    db.close();
    console.log("-----> Stop daily_ticket_worker.js <-----");
  }, function(err){
    console.log(err);
    db.close();
    console.log("-----> Stop daily_ticket_worker.js <-----");
  });
});
