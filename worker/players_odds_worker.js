// If we are dev env, load dotenv
if (process.env.NODE_ENV != "production"){
  require('dotenv').config();
}

var MongoClient = require('mongodb').MongoClient;
var async = require('async');
var requestify = require('requestify');
var moment = require('moment');
var mongoose = require('mongoose');

const chalk = require('chalk');
const chalkInit = chalk.bold.green;
const chalkDone = chalk.bold.blue;
const chalkError = chalk.bold.red;

var updatePlayersOddsJob = function(db){
  return new Promise(function(resolve, reject){
    var Fixture = db.collection("fixture");
    var GameTicket = db.collection("gameTicket");
    var Grille = db.collection("grille");

    async.waterfall([

      // Récupérer les tickets ouvert
      function(done){
        GameTicket.find({ status: 'open', active: true }).toArray().then(function(gametickets){
          var fixtureArr = [];
          gametickets.forEach(function(gt){
            fixtureArr = fixtureArr.concat(gt.fixtures);
          });
          console.log("Nombre de match récupérés dans les tickets de jeu :", fixtureArr.length);
          return done(null, fixtureArr);
        }, function(err){
          console.log("Une erreur est survenue lors de la récupération des tickets de jeu ouvert");
          return done(err);
        });
      },

      // Récupérer les matchs contenu dans les tickets ouvert
      function(fixturesToCheck, done){
        Fixture.find({ status: 'soon', _id: { $in: fixturesToCheck } }).toArray().then(function(fixtures){
          console.log("Nombre de match à vérifier :", fixtures.length);
          return done(null, fixtures);
        }, function(err){
          console.log("Une erreur c'est produite lors de la récupération des matchs");
          return done(err);
        });
      },

      // Récupérer les paris joués pour chaque match
      function(fixtures, done){
        var fixturesBetsArr = [];
        async.eachLimit(fixtures, 5, function(fixture, eachFixture){
          var t0 = moment();
          Grille.find({ "bets.fixture": fixture._id }, { bets: 1 }).toArray(function(err, grilles){
            if (err){
              return eachFixture(err);
            } else {
              //console.log("Nombre de grilles pour le match", fixture._id, grilles.length);
              //console.log(grilles);

              // Créer un tableau contenant les paris jouées de chaque grille pour le match
              var betsMap = grilles.map(function(grille){
                var bets = grille.bets;
                const betsArr = bets.filter(function(bt){
                  if (bt.fixture !== undefined && String(bt.fixture) === String(fixture._id)){
                    return true;
                  } else {
                    return false;
                  }
                });
                //console.log(betsArr);

                return betsArr;
              });
              //console.log(betsMap);

              var homeSum = 0;
              var drawSum = 0;
              var awaySum = 0;

              var lessGoalSum = 0;
              var moreGoalSum = 0;

              var bothGoalPositiveSum = 0;
              var bothGoalNegativeSum = 0;

              var firstGoalHomeSum = 0;
              var firstGoalAwaySum = 0;
              var firstGoalDrawSum = 0;

              betsMap.forEach(function(bt){
                /*if (bt.result == 0){
                  drawSum++;
                } else if (bt.result == 1){
                  homeSum++;
                } else if (bt.result == 2){
                  awaySum++;
                }*/
                for (var i = 0; i < bt.length; i++){
                  var bet = bt[i];
                  if (bet.type != null && bet.type == "1N2"){
                    if (bet.result == 0){
                      drawSum++;
                    } else if (bet.result == 1){
                      homeSum++;
                    } else if (bet.result == 2){
                      awaySum++;
                    }
                  } else if (bet.type != null && bet.type == "FIRST_GOAL"){
                    if (bet.result == 0){
                      firstGoalDrawSum++;
                    } else if (bet.result == 1){
                      firstGoalHomeSum++;
                    } else if (bet.result == 2){
                      firstGoalAwaySum++;
                    }
                  } else if (bet.type != null && bet.type == "LESS_MORE_GOAL"){
                    if (bet.result == 0){
                      lessGoalSum++;
                    } else if (bet.result == 1){
                      moreGoalSum++;
                    }
                  } else if (bet.type != null && bet.type == "BOTH_GOAL"){
                    if (bet.result == 0){
                      bothGoalNegativeSum++;
                    } else if (bet.result == 1){
                      bothGoalPositiveSum++;
                    }
                  } else {
                    if (bet.result == 0){
                      drawSum++;
                    } else if (bet.result == 1){
                      homeSum++;
                    } else if (bet.result == 2){
                      awaySum++;
                    }
                  }
                }
              });

              //var zanibetOdds = fixture.odds.filter(od => od.bookmaker === "ZaniBet");
              fixturesBetsArr.push({ type: "1N2", bookmaker: "Players", fixture: fixture._id, one: homeSum, two: drawSum, three: awaySum, countGrilles: grilles.length });

              fixturesBetsArr.push({ type: "LESS_MORE_GOAL", bookmaker: "Players-Single", fixture: fixture._id, one: moreGoalSum, two: lessGoalSum, three: -1, countGrilles: (moreGoalSum+lessGoalSum) });

              fixturesBetsArr.push({ type: "BOTH_GOAL", bookmaker: "Players-Single", fixture: fixture._id, one: bothGoalPositiveSum, two: bothGoalNegativeSum, three: -1, countGrilles: (bothGoalPositiveSum+bothGoalNegativeSum) });

              fixturesBetsArr.push({ type: "FIRST_GOAL", bookmaker: "Players-Single", fixture: fixture._id, one: firstGoalHomeSum, two: firstGoalDrawSum, three: firstGoalAwaySum, countGrilles: (firstGoalHomeSum+firstGoalDrawSum+firstGoalAwaySum) });

              //console.log(fixturesBetsArr);
              var t1 = moment();
              //console.log("Durée d'exécution du traitements des grilles pour un match " + (t1.diff(t0, 'milliseconds')) + " milliseconds.")
              return eachFixture();
            }
          });
        }, function(err){
          //return done(err);
          if (err){
            return done(err);
          }
          return done(null, fixturesBetsArr);
        });
      },

      function(bets, done){
        //console.log(bets.length);
        async.eachLimit(bets, 1, function(bet, eachBet){
          //Fixture.update({ _id: bet.fixture }, { })
          var playerOdd;
          if (bet.type == "1N2"){
            playerOdd =  { type: "1N2", bookmaker: "Players", odds: { homeTeam: parseInt(((bet.one/bet.countGrilles)*100)), awayTeam: parseInt(((bet.three/bet.countGrilles)*100)), draw: parseInt(((bet.two/bet.countGrilles)*100)) } };
          } else if (bet.type == "LESS_MORE_GOAL"){
            playerOdd =  { type: "LESS_MORE_GOAL", bookmaker: "Players-Single", odds: { positive: parseInt(((bet.one/bet.countGrilles)*100)), negative: parseInt(((bet.two/bet.countGrilles)*100)) } };
          } else if (bet.type == "BOTH_GOAL"){
            playerOdd =  { type: "BOTH_GOAL", bookmaker: "Players-Single", odds: { positive: parseInt(((bet.one/bet.countGrilles)*100)), negative: parseInt(((bet.two/bet.countGrilles)*100)) } };
          } else if (bet.type == "FIRST_GOAL"){
            playerOdd =  { type: "FIRST_GOAL", bookmaker: "Players-Single", odds: { homeTeam: parseInt(((bet.one/bet.countGrilles)*100)), awayTeam: parseInt(((bet.three/bet.countGrilles)*100)), draw: parseInt(((bet.two/bet.countGrilles)*100)) } };
          } else {
            playerOdd =  { type: "1N2", bookmaker: "Players", odds: { homeTeam: parseInt(((bet.one/bet.countGrilles)*100)), awayTeam: parseInt(((bet.three/bet.countGrilles)*100)), draw: parseInt(((bet.two/bet.countGrilles)*100)) } };
          }

          Fixture.update({ _id: bet.fixture }, { $set: { updatedAt: moment().utc().toDate() }, $pull: { odds: { bookmaker: bet.bookmaker, type: bet.type } } }, function(err, result){
            if (err){
              return eachBet(err);
            } else {
              //console.log(result.result.n, result.result.nModified);
              Fixture.update({ _id: bet.fixture }, { $set: { updatedAt: moment().utc().toDate() }, $addToSet: { odds: playerOdd } }, function(err, result){
                if (err){
                  console.log("Error occur when trying to update fixture odds !");
                  return eachBet(err);
                } else {
                  //console.log(result.result.n, result.result.nModified);
                  return eachBet();
                }
              });
            }
          });
        }, function(err){
          if (err){
            return done(err);
          } else {
            return done(null, "OK");
          }
        });
      }

    ], function(err, result){
      if (err) return reject(err);
      return resolve(result);
    });

  });
}

// Use connect method to connect to the server
MongoClient.connect(process.env.DB_URI, function(err, db) {
  console.log(chalkInit("Connected successfully to server"));
  console.log(chalkInit("-----> Start players_odds_worker.js <-----"));
  updatePlayersOddsJob(db).then(function(res){
    //console.log(res);
    console.log(chalkDone("-----> Players Odds Job Done <-----"));
    db.close();
  }, function(err){
    console.log(err);
    db.close();
  });
});
