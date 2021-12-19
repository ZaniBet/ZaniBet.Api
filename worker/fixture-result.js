// If we are dev env, load dotenv
if (process.env.NODE_ENV != "production"){
  require('dotenv').config();
}

var MongoClient = require('mongodb').MongoClient;
var async = require('async');
var requestify = require('requestify');
var moment = require('moment');

moment.locale('fr');
/*
* - Récupérer les tickets en attente de résultat
* - Pour chaque ticket, récupérer les résultats de tous les matchs
* - Si tous les résultats sont disponibles pour un ticket, procéder à la validation des grilles
*/
var getFixtureToValidate = function(db){
  return new Promise(function(resolve, reject){
    var GameTicket = db.collection('gameTicket');
    var Fixture = db.collection('fixture');
    var currentDate = new Date();
    var fixtureArr = [];

    async.waterfall([
      // Récupérer les tickets de jeu en attente de vérification de résult, et dont la date de résultat est atteinte
      function(done){
        GameTicket.find({ status: "waiting_result", resultDate: { $lt: currentDate } }).toArray(function(err, gameTickets){
          if (err){
            done(err);
          } else {
            console.log('gametickets', gameTickets);
            async.eachLimit(gameTickets, 1, function(gameTicket, eachGameTicket){
              async.eachLimit(gameTicket.fixtures, 1, function(fixtureId, eachFixture){
                console.log('Fixture ID:', fixtureId);
                Fixture.find({ _id: fixtureId }).next(function(err, fixture){
                  if (err) return eachFixture(err);
                  console.log('Fixture API ID:', fixture.apiId.footballData);
                  requestify.get('http://api.football-data.org/v1/fixtures/' + parseInt(fixture.apiId.footballData), { headers: { 'X-Auth-Token': 'afddb7f282a940b7bb85e447b34f35ff' } }).then(function(response){
                    return updateFixture(db, response, fixture);
                  }).then(function(fixture){
                    //console.log('Updated fixture:', fixture._id, fixture);
                    fixtureArr.push(fixture);
                    //return eachFixture("test");
                    eachFixture();
                  }, function(err){
                    eachFixture(err);
                  });
                });
              }, function(err){
                if (err) {
                  console.log(err);
                  return eachGameTicket();
                }
                // mettre à jour le status du ticket
                updateGameTicket(db, gameTicket).then(function(result){
                  console.log('Updated ticket:', gameTicket._id);
                  //return eachGameTicket("test");

                  // Valider les grilles
                  validateGrilles(db, gameTicket, fixtureArr).then(function(result){
                    //return eachGameTicket("test");
                    fixtureArr = [];
                    eachGameTicket();
                  }, function(err){
                    eachGameTicket();
                  });
                }, function(err){
                  eachGameTicket(err);
                });
              });
            }, function(err){
              if (err) return done(err);
              done(null, fixtureArr);
            });
          }
        });
      }
    ], function(err, result){
      if (err) return reject(err);
      resolve(result);
    });

  });
};

var updateFixture = function(db, response, fixture){
  return new Promise(function(resolve, reject){
    var Fixture = db.collection('fixture');
    var _fixture = response.getBody().fixture;
    var homeScore = _fixture.result.goalsHomeTeam;
    var awayScore = _fixture.result.goalsAwayTeam;
    var winner = null;

    // Vérifier si les scores sont disponible
    if (homeScore == null || awayScore == null){
      return reject("Un match contenu dans le ticket, n'a pas encore de résultat");
    }

    if (homeScore == awayScore){
      winner = 0;
    } else if (homeScore > awayScore){
      winner = 1;
    } else if (awayScore > homeScore){
      winner = 2;
    }

    Fixture.findOneAndUpdate({ _id: fixture._id }, { $set: {
      'result.homeScore': _fixture.result.goalsHomeTeam,
      'result.awayScore': _fixture.result.goalsAwayTeam,
      'result.winner': winner,
      'status': 'done'
    } }, { returnOriginal: false }, function(err, result){
      if (err) return reject(err);
      resolve(result.value);
    });
  });
};

var updateGameTicket = function(db, gameTicket){
  return new Promise(function(resolve, reject){
    var GameTicket = db.collection('GameTicket');
    GameTicket.findOneAndUpdate({ _id: gameTicket._id }, { $set: { 'status':'waiting_result' } }, { returnOriginal: false }, function(err, result){
      if (err) reject(err);
      resolve(result.value);
    });
  });
};

/*
* - Récupérer toutes les grilles ayant un status en attente de résultat && appartenant à un ticket terminé
* - Pour chaque paris dans une grille, vérifier le résultat
*/
var validateGrilles = function(db, gameTicket, fixtureArr){
  return new Promise(function(resolve, reject){
    var Grille = db.collection('grille');
    Grille.find({ status: 'waiting_result', gameTicket: gameTicket._id }).toArray(function(err, grilles){
      if (err) return reject(err);
      async.eachLimit(grilles, 1, function(grille, eachGrille){
        //console.log(grille.bets);
        console.log('GrilleID', grille._id);
        //console.log('Fixture array:', fixtureArr);
        //console.log('Bets', grille.bets[0]);
        //console.log('Fixture for bets:', fixtureArr[grille.bets[0].fixture]);
        var countWin = 0;
        var point = 0;
        var reward = 0;
        var status = "waiting_result";

        //console.log('bet length', grille.bets.length, 'fixture arr length', fixtureArr.length);
        for (var i = 0; i < grille.bets.length; i++){
          for (var z = 0; z < fixtureArr.length; z++){
            //console.log('Bets', grille.bets[i].fixture, '- Fixture',fixtureArr[z]._id );
            if (String(grille.bets[i].fixture) === String(fixtureArr[z]._id)){
              console.log('OK');
              if (grille.bets[i].result == fixtureArr[z].result.winner){
                countWin += 1;
              }
            }
          }
        }
        console.log('NB bets', grille.bets.length, 'count win', countWin);

        if (countWin == grille.bets.length){
          console.log('JACKPOT');
          grille.reward = gameTicket.jackpot;
          grille.point = (countWin*10) + 1000;
          grille.status = 'win';
          grille.numberOfBetsWin = countWin;
        } else {
          grille.point = countWin*10;
          grille.reward = 0;
          grille.status = 'loose';
          grille.numberOfBetsWin = countWin;
        }

        updateGrille(db, grille).then(function(grille){
          console.log('Grille updated:', grille._id);
          if (grille.status == 'win'){
            // create payout
            createPayout(db, grille).then(function(result){
              console.log('Create payout:', result.result);
              return rewardUser(db, grille);
            }, function(err){
              // Une erreur à eu lieu lors de la création du payout
              eachGrille(err);
            });
          } else {
            return rewardUser(db, grille);
          }
        }).then(function(user){
          console.log('User ', user._id, 'win', grille.point, 'flickcoin');
          eachGrille();
        }, function(err){
          eachGrille(err);
        });
      }, function(err){
        if (err) return reject(err);
        resolve();
      });
    });
  });
};

var updateGrille = function(db, grille){
  return new Promise(function(resolve, reject){
    var Grille = db.collection('grille');
    Grille.findOneAndUpdate({ _id: grille._id, status: 'waiting_result' }, { $set: {
      reward: grille.reward,
      point: grille.point,
      status: grille.status,
      numberOfBetsWin: grille.numberOfBetsWin
    } }, { returnOriginal: false }, function(err, grille){
        if (err) return reject(err);
        resolve(grille.value);
    });
  });
};

var rewardUser = function(db, grille){
  return new Promise(function(resolve, reject){
    var User = db.collection('user');
    User.findOneAndUpdate({ _id: grille.user },  { $inc: { point: grille.point } } , { returnOriginal: false}, function(err, user){
      if (err) return reject(err);
      resolve(user.value);
    });
  });
};

var createPayout = function(db, grille){
  return new Promise(function(resolve, reject){
    var Payout = db.collection('payout');
    payout.insertOne({ user: grille.user, type: 'Grille', for: grille._id, amount: grille.reward, status: 'waiting_paiement'}, function(err, result){
      if (err) return reject(err);
      resolve(result);
    });
  });
};


var url = "mongodb://localhost:27017/footbet";
//var url = "mongodb://devolios:ZaAY8pIjLj@ds143883-a0.mlab.com:43883,ds143883-a1.mlab.com:43883/crummyprod?replicaSet=rs-ds143883";

// Use connect method to connect to the server
MongoClient.connect(url, function(err, db) {
  console.log("Connected successfully to server");
  getFixtureToValidate(db).then(function(res){
    //console.log(res);
    db.close();
  }, function(err){
    console.log(err);
    db.close();
  });
});
