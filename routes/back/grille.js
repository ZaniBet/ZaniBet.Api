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
var chance = new Chance();
var uniqid = require('uniqid');
moment.locale('fr');
var fs = require('fs');
//var wkhtmltopdf = require('wkhtmltopdf');

var Client = mongoose.model('Client');
var Competition = mongoose.model('Competition');
var Team = mongoose.model('Team');
var Fixture = mongoose.model('Fixture');
var GameTicket = mongoose.model('GameTicket');
var Grille = mongoose.model('Grille');
var User = mongoose.model('User');

router.get('/grilles', function(req, res){
  var queryStatus = req.query.status;

  Grille.find({ status: queryStatus }).populate('user').then(function(grilles){
    return res.status(200).json(grilles);
  });
});

router.get('/grilles/:grille_id', function(req, res){
  var grilleId = req.params.grille_id;

  Grille.findOne({ _id: grilleId }).populate({
    path: "gameTicket",
    populate: {
      path: "fixtures",
      options: { sort: { 'date': -1 } },
      populate: {
        path: "competition homeTeam awayTeam"
      }
    }
  }).populate({
    path: 'bets.fixture',
    //options: { sort: { 'date': -1 } },
    populate: {
      path: 'competition homeTeam awayTeam'
    }
  }).exec(function(err, grille){
    console.log(grille);
    console.log(err);
    if (err || grille == null){
      return res.render('error', { error: err, message: "404" });
    } else {
      grille.bets.sort(function(a,b) {
        //console.log(a)
        return a.fixture.date < b.fixture.date
      });
      return res.render('admin/grilles/details', { activePage: 'grilles', grille: grille });
    }
  });
});

router.get('/grilles/:user_id/previewSummary', function(req, res){
  var userId = req.params.user_id;

  async.parallel({
    gridsMulti: function(callback){
      Grille.aggregate([
        { $match: { user: mongoose.Types.ObjectId(userId), $or: [{ status: "loose" }, { status: "win" }], type: "MULTI" } },
        { $sort: { createdAt: 1 } },
        { $lookup: { from: "gameTicket", localField: "gameTicket", foreignField: "_id", as: "gameTicket" } },
        { $group: { _id: "$gameTicket.competition", grilles: { $push: "$$ROOT" }, totalCoin: { $sum: "$payout.point" } } },
        { $lookup: { from: "competition", localField: "_id", foreignField: "_id", as: "competition" } },
        { $group: { _id: "$competition.name", grilles: { $push: "$grilles" }, totalCoin: { $push: "$totalCoin" } } },
        { $unwind: "$grilles" },
        { $unwind: "$totalCoin" },
        { $unwind: "$_id" }
      ]).exec(function(err, result){
        //console.log(result);
        console.log(err);
        callback(null, result);
      });
    },

    countGridMulti: function(callback){
      Grille.count({ user: mongoose.Types.ObjectId(userId), $or: [{ status: "loose" }, { status: "win" }], type: "MULTI" }, function(err, count){
        callback(null, count);
      });
    },

    gridsSimple: function(callback){
      Grille.aggregate([
        { $match: { user: mongoose.Types.ObjectId(userId), $or: [{ status: "loose" }, { status: "win" }], type: "SIMPLE" } },
        { $sort: { createdAt: 1 } },
        { $lookup: { from: "gameTicket", localField: "gameTicket", foreignField: "_id", as: "gameTicket" } },
        { $group: { _id: "$gameTicket.competition", grilles: { $push: "$$ROOT" }, totalCoin: { $sum: "$payout.point" } } },
        { $lookup: { from: "competition", localField: "_id", foreignField: "_id", as: "competition" } },
        { $group: { _id: "$competition.name", grilles: { $push: "$grilles" }, totalCoin: { $push: "$totalCoin" } } },
        { $unwind: "$grilles" },
        { $unwind: "$totalCoin" },
        { $unwind: "$_id" }
      ]).exec(function(err, result){
        //console.log(result);
        console.log(err);
        callback(null, result);
      });
    },

    countGridSimple: function(callback){
      Grille.count({ user: mongoose.Types.ObjectId(userId), $or: [{ status: "loose" }, { status: "win" }], type: "SIMPLE" }, function(err, count){
        callback(null, count);
      });
    },

    user: function(callback){
      User.findOne({ _id: mongoose.Types.ObjectId(userId) }, function(err, result){
        callback(null, result);
      });
    }
  }, function(err, result){
    //console.log(result.gridsMulti[0]);
    return res.render('admin/grids-summary', { gridsMulti: result.gridsMulti, gridsSimple: result.gridsSimple, countGridMulti: result.countGridMulti, countGridSimple: result.countGridSimple, user: result.user });

    /*res.render('admin/grids-summary', { gridsMulti: result.gridsMulti, gridsSimple: result.gridsSimple, countGridMulti: result.countGridMulti, countGridSimple: result.countGridSimple, user: result.user }, function(err, html){
    //console.log(html);
    wkhtmltopdf(html).pipe(fs.createWriteStream('out.pdf')).on("finish", function(){
    return res.render('admin/grids-summary', { gridsMulti: result.gridsMulti, gridsSimple: result.gridsSimple, countGridMulti: result.countGridMulti, countGridSimple: result.countGridSimple, user: result.user });
  });
});*/
});
});

/*
*
*/
router.put('/grilles/simple/fixCanceled', function(req, res){
  var gameticketId = req.body.gameticket;

  Grille.updateMany({ status: "canceled", gameTicket: mongoose.Types.ObjectId(gameticketId) }, { $set: { status: "waiting_result" } }, function(err, result){
    if (err){
      return res.status(500).json(err);
    } else {
      return res.status(200).json(result);
    }
  });
});

/*
*
*/
router.put('/grilles/multi/fixBetsType', function(req, res){
  Grille.updateMany({ type: "MULTI", "bets.fixture": { $exists: true } }, { $set: { "bets.$.type": "1N2" } }, function(err, result){
    if (err){
      return res.status(500).json(err);
    } else {
      return res.status(200).json(result);
    }
  });
});

/*
* R??activer des grilles qui ont ??t?? annul??es
*/
router.put('/grilles/fixCanceled', function(req, res){
  //var startDate = moment().utc().startOf('month');
  //var endDate = moment().utc().endOf('month');

  var startDate = moment('2018-01-29').utc();
  var endDate = moment('2018-01-29').utc();

  async.parallel({
    countCanceledGrid: function(done){
      Grille.count({ status: 'canceled', type:'MULTI', createdAt: { $lt: endDate.toDate(), $gt: startDate.toDate() } }, function(err, count){
        if (err) return done(err);
        return done(null, count);
      });
    },

    countRollbackGrid: function(done){
      return done(null);
      Grille.find({ status: 'canceled', type:'MULTI', createdAt: { $lt: endDate.toDate(), $gt: startDate.toDate() } }).populate('gameTicket').then(function(grilles){
        var rollbackable = grilles.filter(gr => gr.gameTicket.status === "waiting_result" || gr.gameTicket.status === "open");
        async.eachLimit(rollbackable, 1, function(grille, eachGrille){
          Grille.findOneAndUpdate({ _id: grille._id }, { $set: { status: 'waiting_result' } }, { new: true }, function(err, result){
            if (err){
              console.log("Une erreur c'est produite lors de la mise ?? jour de la grille :", grille._id);
              return eachGrille(err);
            } else {
              console.log("Mise ?? jour de la grille", grille._id, result.status);
              return eachGrille();
            }
          });
        }, function(err){
          if (err){
            return done(err);
          } else {
            return done(null, rollbackable.length);
          }
        });
      }, function(err){
        return done(err);
      });
    }
  }, function(err, result){
    if (err){
      return res.status(500).json(err);
    } else {
      console.log(result);
      return res.status(200).json(result);
    }
  });
});

/*
* V??rifier que les r??sultats de toutes les grilles simples correspondent bien
* aux r??sultats du match
*/
router.get('/grilles/simple/checkResult', function(req, res){
  async.waterfall([
    // Trouver les grilles simples termin??s ?? v??rifier
    function(done){
      Grille.find({ type: "SIMPLE", $or: [{ status: 'win' }, { status: 'loose' }] }).populate({
        path: "gameTicket",
        populate: {
          path: "fixtures", populate: {
            path: "homeTeam awayTeam"
          }
        }
      }).then(function(grilles){
        if (grilles.length == 0) return done("Aucune grille ?? v??rifier.");
        return done(null, grilles);
      }, function(err){
        return done(err);
      });
    },

    // V??rification des r??sultats de chaque grille
    function(grilles, done){
      var corruptedGridArr = [];

      async.each(grilles, function(grille, eachGrille){
        var gameticket = grille.gameTicket;
        var fixture = gameticket.fixtures[0];
        var betsType = gameticket.betsType;
        var bets = grille.bets;

        for (var i = 0; i < betsType.length; i++){
          for (var z = 0; z < bets.length; z++){
            if (bets[z].type == betsType[i].type){
              // Comparer
              switch(betsType[i].type){
                case "1N2":
                var goodResult = -1;
                if (fixture.result.homeScore == fixture.result.awayScore){
                  goodResult = 0;
                } else if (fixture.result.homeScore > fixture.result.awayScore){
                  goodResult = 1;
                } else if (fixture.result.awayScore > fixture.result.homeScore){
                  goodResult = 2;
                } else {
                  corruptedGridArr.push(grille);
                  console.log("ERREUR FATALE : Impossible de d??finir le bon r??sultat pour le pari 1N2 de la grille", grille._id);
                  return eachGrille();
                }

                // V??rifier si le r??sultat accord?? au pari jou?? correspond bien aux r??sultats du match
                if (bets[z].status == "win"){
                  if (bets[z].result != goodResult){
                    console.log("Un pari 1N2 a ??t?? consid??r?? comme gagnant alors qu'il ne correspond pas aux bons r??sultat. Grille:", grille._id, "Utilisateur:", grille.user, "Ticket:", gameticket.name);
                    corruptedGridArr.push(grille);
                  }
                } else if (bets[z].status == "loose"){
                  if (bets[z].result == goodResult){
                    console.log("Un pari 1N2 a ??t?? consid??r?? comme perdant alors qu'il ne correspond pas aux bons r??sultat. Grille:", grille._id, "Utilisateur:", grille.user, "Ticket:", gameticket.name);
                    corruptedGridArr.push(grille);
                  }
                } else {
                  console.log("ERREUR FATALE : Un paris contenu dans la grille", grille._id, "poss??de un status invalide ?!");
                  corruptedGridArr.push(grille);
                }
                break;

                case "BOTH_GOAL":
                var goodResult = -1;
                if (fixture.result.homeScore > 0 && fixture.result.awayScore > 0){
                  goodResult = 1;
                } else {
                  goodResult = 0;
                }

                if (bets[z].status == "win"){
                  if (bets[z].result != goodResult){
                    console.log("Un pari BOTH_GOAL a ??t?? consid??r?? comme gagnant alors qu'il ne correspond pas aux bons r??sultat. Grille:", grille._id, "Utilisateur:", grille.user, "Ticket:", gameticket.name, "Paris jou??:", bets[z].result);
                    corruptedGridArr.push(grille);
                  }
                } else if (bets[z].status == "loose"){
                  if (bets[z].result == goodResult){
                    console.log("Un pari BOTH_GOAL a ??t?? consid??r?? comme perdant alors qu'il ne correspond pas aux bons r??sultat. Grille:", grille._id, "Utilisateur:", grille.user, "Ticket:", gameticket.name, "Paris jou??:", bets[z].result);
                    corruptedGridArr.push(grille);
                  }
                } else {
                  console.log("ERREUR FATALE : Un paris contenu dans la grille", grille._id, "poss??de un status invalide ?!");
                  corruptedGridArr.push(grille);
                }
                break;

                case "FIRST_GOAL":
                var goodResult = -1;
                if (fixture.result.homeScore == 0 && fixture.result.awayScore == 0){
                  goodResult = 0;
                } else {
                  // R??cup??rer l'??quipe qui a marqu?? en premier
                  var eventsFilter = fixture.events.filter(ev => ev.type === "goal" || ev.type === "penalty" || ev.type === "own-goal");
                  eventsFilter.sort(function(a, b){
                    return a.minute - b.minute;
                  });
                  //console.log('??v??nement filtr??s et tri??s:', eventsFilter);
                  if (eventsFilter[0].team.equals(fixture.homeTeam._id)){
                    goodResult = 1;
                  } else if (eventsFilter[0].team.equals(fixture.awayTeam._id)){
                    goodResult = 2;
                  } else {
                    console.log("ERREUR FATALE : Impossible de d??finir le bon r??sultat pour le pari FIRST_GOAL de la grille", grille._id);
                    corruptedGridArr.push(grille);
                    return eachGrille();
                  }
                }

                if (bets[z].result == 0){
                  //console.log("Ne pas prendre en compte ce pari car aucune ??quipe n'a marqu??.");
                  return eachGrille();
                }

                if (bets[z].status == "win"){
                  if (bets[z].result != goodResult){
                    //console.log("??quipe ayant marqu?? en premier:", eventsFilter[0].team, "Bon r??sultat:",goodResult, "Pari jou??:",bets[z].result,"Pour la grille:", grille._id);
                    console.log("Un pari FIRST_GOAL a ??t?? consid??r?? comme gagnant alors qu'il ne correspond pas aux bons r??sultat. Grille:", grille._id, "Utilisateur:", grille.user, "Ticket:", gameticket.name);
                    corruptedGridArr.push(grille);
                  }
                } else if (bets[z].status == "loose"){
                  if (bets[z].result == goodResult){
                    //console.log("??quipe ayant marqu?? en premier:", eventsFilter[0].team, "Bon r??sultat:",goodResult, "Pari jou??:",bets[z].result,"Pour la grille:", grille._id);
                    console.log("Un pari FIRST_GOAL a ??t?? consid??r?? comme perdant alors qu'il ne correspond pas aux bons r??sultat. Grille:", grille._id, "Utilisateur:", grille.user, "Ticket:", gameticket.name);
                    corruptedGridArr.push(grille);
                  }
                } else {
                  console.log("ERREUR FATALE : Un paris contenu dans la grille", grille._id, "poss??de un status invalide ?!");
                  corruptedGridArr.push(grille);
                }
                break;

                case "LESS_MORE_GOAL":
                var goodResult = -1;
                var totalScore = fixture.result.homeScore + fixture.result.awayScore;
                if (totalScore > 2){
                  goodResult = 1;
                } else {
                  goodResult = 0;
                }

                if (bets[z].status == "win"){
                  if (bets[z].result != goodResult){
                    console.log("Un pari LESS_MORE_GOAL a ??t?? consid??r?? comme perdant alors qu'il ne correspond pas aux bons r??sultat. Grille:", grille._id, "Utilisateur:", grille.user, "Ticket:", gameticket.name);
                    corruptedGridArr.push(grille);
                  }
                } else if (bets[z].status == "loose"){
                  if (bets[z].result == goodResult){
                    console.log("Un pari LESS_MORE_GOAL a ??t?? consid??r?? comme perdant alors qu'il ne correspond pas aux bons r??sultat. Grille:", grille._id, "Utilisateur:", grille.user, "Ticket:", gameticket.name);
                    corruptedGridArr.push(grille);
                  }
                } else {
                  console.log("ERREUR FATALE : Un paris contenu dans la grille", grille._id, "poss??de un status invalide ?!");
                }
                break;

                default:
                console.log("ERREUR FATALE : Un type de pari non g??r?? est pr??sent dans le ticket", gameticket._id, "pour la grille", grille._id);
                break;
              }
            }
          }
        }
        return eachGrille();
      }, function(err){
        console.log("Nombre de grilles corrompues:", corruptedGridArr.length);
        if (err) return done(err);

        async.eachLimit(corruptedGridArr, 1, function(corruptedGrid, eachCorruptedGrid){
          requestify.request('http://localhost:5000/back/grilles/simple/' + corruptedGrid._id + '/fixResult', { method: 'PUT' }).catch(function(error){
            if (error) console.log(error);
            return eachCorruptedGrid();
          }).then(function(response){
            return eachCorruptedGrid();
          });
        }, function(err){
          if (err) return done(err);
          return done(null, "OK");
        });
      });
    }

  ], function(err, result){
    if (err) return res.status(500).json(err);
    return res.status(200).json("OK");
  });
});

/*
* V??rifier toutes les grilles simples jou??es par un utilisateur :
*   - Les grilles doivent avoir ??t?? valid??s par le syst??me
*   - V??rifier que le montant du payout est correct
*/
router.get('/grilles/:user_id/simple/checkResult', function(req, res){
  var userId = req.params.user_id;

  Grille.find({ user: userId, $or: [{ status: 'win' }, { status: 'loose' }] })
  .populate('gameTicket')
  .exec()
  .then(function(grilles){
    console.log("Nombre de grille ?? analyser:", grilles.length);
    async.eachLimit(grilles, 1, function(grille, eachGrille){
      var pointsPerBet = grille.gameTicket.pointsPerBet;
      var numberOfBetsWin = grille.numberOfBetsWin;

      var payout = pointsPerBet * numberOfBetsWin;
      var bonus = 0;
      if (numberOfBetsWin == grille.bets.length && grille.type == "MULTI"){
        bonus = 1000;
      }
      payout += bonus;

      if (grille.payout.point != payout){
        console.log("PROBL??ME : Le montant enregistr?? dans la grille", grille.payout.point, "ne correspond pas au montant qui aurait du ??tre pay??", payout);
        console.log("Grille:", grille._id, "Ticket:", grille.gameTicket.name);
      } else {
        console.log("Tout va bien pour la grille", grille._id, grille.type, "montant pay?? :", payout);
      }

      return eachGrille();
    }, function(err){
      if (err){
        return res.status(500).json(err);
      } else {
        return res.status(200).json("OK");
      }
    });
  }, function(err){
    return res.status(500).json(err);
  });
});

/*
* V??rifier que les r??sultats de toutes les grilles multi correspondent bien
* aux r??sultats des matchs
*/
router.get('/grilles/multi/checkResult', function(req, res){
  // R??cup??rer les grilles de pronostic multiple ??tant termin??
  Grille.find({ type: "MULTI", status: "loose", createdAt: { $gt: moment().utc().startOf('month') } }).populate("bets.fixture").populate({
    path: "gameTicket", populate: {
      path: "fixtures", populate: {
        path: "homeTeam awayTeam"
      }
    }
  }).then(function(grilles){
    console.log(grilles.length);
    //console.log(grilles[0]);
    //return res.status(200).json("OK");
    // V??rifier pour chaque grille que les r??sultats des paris sont valides
    var corruptedGridArr = [];
    async.eachLimit(grilles, 1, function(grille, eachGrille){
      var gameticket = grille.gameTicket;
      var bets = grille.bets;
      var betsWin = 0;

      console.log("Traitement de la grille", grille._id, "pour le ticket:", gameticket.name, "J", gameticket.matchDay ,".Nombre de paris gagnant:", grille.numberOfBetsWin);
      console.log(bets.length);
      for (var i = 0; i < bets.length; i++){
        if (bets[i] !== undefined){
          var bet = bets[i];
          var goodResult = -1;
          if (bet.fixture.result.homeScore == bet.fixture.result.awayScore) goodResult = 0;
          if (bet.fixture.result.homeScore > bet.fixture.result.awayScore) goodResult = 1;
          if (bet.fixture.result.awayScore > bet.fixture.result.homeScore) goodResult = 2;

          if (bet.result == goodResult && bet.status != "canceled") betsWin++;
          if (bet.status == "canceled") betsWin++;
        } else {
          console.log("Paris inconnu ?!", i);
        }
      }

      console.log("ok");

      if (betsWin != grille.numberOfBetsWin){
        console.log("ERREUR FATALE: La grille", grille._id, "est probablement corrompue, car le nombre de paris gagnant calcul?? est diff??rent de celui enregistr??. Ticket:", gameticket.name, "J", gameticket.matchDay, betsWin);
        //console.log(betsWin, "-", grille.numberOfBetsWin);
        corruptedGridArr.push(grille);
      }
      return eachGrille();
    }, function(err){
      console.log("Nombre de grilles corrumpues:", corruptedGridArr.length);
      return res.status(200).json("OK");
    });
  }, function(err){
    console.log(err);
    return res.status(500).json(err);
  });
});

/*
* V??rifier que les r??sultats d'une grille multi correspondent bien aux r??sultats
* des matchs
*/
router.get('/grilles/multi/:grille_id/fixResult', function(req, res){
  var grilleId = req.params.grille_id;
  Grille.findOne({ _id: grilleId, type: "MULTI" }).populate({ path: "bets.fixture", populate: { path: "homeTeam awayTeam" } }).populate({
    path: "gameTicket", populate: {
      path: "fixtures", populate: {
        path: "homeTeam awayTeam"
      }
    }
  }).then(function(grille){
    grille.bets.forEach(function(bet){
      console.log(bet);
    });
    return res.status(200).json("OK");
  }, function(err){
    return res.status(500).json("KO");
  });
});

/*
* V??rfier que les r??sultats d'une grille simple termin?? ont ??t?? correctement d??fini
*/
router.put('/grilles/simple/:grille_id/fixResult', function(req, res){
  var grilleId = req.params.grille_id;

  Grille.findOne({ _id: grilleId, type: "SIMPLE", $or: [{ status: "win" }, { status: "loose" }] })
  .populate('user')
  .populate({ path: 'gameTicket', populate: { path: "fixtures" } }).then(function(grille){
    //console.log(grille);
    var gameticket = grille.gameTicket;
    var fixture = gameticket.fixtures[0];

    // V??rifier que tous les paris ont ??t?? valid??s
    gameticket.betsType.forEach(function(bt){
      console.log(bt);
      if (grille.bets.filter(be => be.type === bt.type).length == 0){
        console.log("Il manque le pronostic", bt.type, "dans la grille", grille._id);
        return res.status(500).json("Un pronostic est manquant");
      }
    });

    async.eachLimit(grille.bets, 1, function(bet, eachBet){
      if (bet.type === "1N2"){
        // R??cup??rer le bon r??sultat
        var goodResult = -1;
        if (fixture.result.homeScore > fixture.result.awayScore){
          goodResult = 1;
        } else if (fixture.result.awayScore > fixture.result.homeScore){
          goodResult = 2;
        } else if (fixture.result.awayScore == fixture.result.homeScore){
          goodResult = 0;
        }

        if (bet.status == "win" && bet.result != goodResult){
          console.log("Le pari 1N2 a ??t?? consid??r?? comme gagnant alors qu'il devrait ??tre perdant !");
          return eachBet();
        } else if (bet.status == "loose" && bet.result == goodResult){
          console.log("Le pari 1N2 a ??t?? consid??r?? comme perdant alors qu'il devrait ??tre gagnant !");
          Grille.findOneAndUpdate({ _id: grille._id, "bets._id": bet._id }, { $set: { "bets.$.status": "win", "bets.$.winner": goodResult }, $inc: { numberOfBetsWin: 1, "payout.point": gameticket.pointsPerBet } }, { new: true }).then(function(grid){
            //console.log("Updated bets", grid.bets);
            // Cr??diter l'utilisateur
            return User.findOneAndUpdate({ _id: grille.user }, { $inc: { point: gameticket.pointsPerBet } }, { new: true });
          }).then(function(user){
            console.log("Updated user:", user.username, "Ancien Solde :", grille.user.point, "Nouveau Solde :", user.point);
            return eachBet();
          }, function(err){
            console.log(err);
            return eachBet();
          });
        } else {
          console.log("TOUT VA BIEN POUR LE PARI 1N2")
          return eachBet();
        }
      } else if (bet.type === "BOTH_GOAL") {
        var goodResult = -1;
        if (fixture.result.homeScore > 0 && fixture.result.awayScore > 0){
          goodResult = 1;
        } else {
          goodResult = 0;
        }

        if (bet.status == "win" && bet.result != goodResult){
          console.log("Le pari BOTH_GOAL a ??t?? consid??r?? comme gagnant alors qu'il devrait ??tre perdant !");
          return eachBet();
        } else if (bet.status == "loose" && bet.result == goodResult){
          console.log("Le pari BOTH_GOAL a ??t?? consid??r?? comme perdant alors qu'il devrait ??tre gagnant !");
          Grille.findOneAndUpdate({ _id: grille._id, "bets._id": bet._id }, { $set: { "bets.$.status": "win", "bets.$.winner": goodResult }, $inc: { numberOfBetsWin: 1, "payout.point": gameticket.pointsPerBet } }, { new: true }).then(function(grid){
            //console.log("Updated bets", grid.bets);
            // Cr??diter l'utilisateur
            return User.findOneAndUpdate({ _id: grid.user }, { $inc: { point: gameticket.pointsPerBet } }, { new: true});
          }).then(function(user){
            console.log("Updated user:", user.username, "Ancien Solde :", grille.user.point, "Nouveau Solde :", user.point);
            return eachBet();
          }, function(err){
            console.log(err);
            return eachBet();
          });
        } else {
          console.log("TOUT VA BIEN POUR LE PARI BOTH_GOAL");
          return eachBet();
        }
      } else if (bet.type === "FIRST_GOAL"){
        // R??cup??rer le bon r??sultat
        var goodResult = -1;
        if (fixture.result.homeScore == 0 && fixture.result.awayScore == 0){
          goodResult = 0;
        } else {
          // R??cup??rer l'??quipe qui a marqu?? en premier
          var eventsFilter = fixture.events.filter(ev => ev.type === "goal" || ev.type === "penalty" || ev.type === "own-goal");
          eventsFilter.sort(function(a, b){
            return a.minute - b.minute;
          });
          //console.log('??v??nement filtr??s et tri??s:', eventsFilter);
          console.log("??quipe ayant marqu?? en premier:", eventsFilter[0].team);
          console.log("Pari de l'utilisateur:", bet.result, bet.type);
          //console.log("Home:", fixture.homeTeam);
          //console.log("Away:", fixture.awayTeam);
          //console.log(eventsFilter[0].team == fixture.homeTeam);
          if (eventsFilter[0].team.equals(fixture.homeTeam)){
            goodResult = 1;
          } else if (eventsFilter[0].team.equals(fixture.awayTeam)){
            goodResult = 2;
          } else {
            console.log("ERREUR FATALE: Impossible de d??finir le bon r??sultat pour le pari FIRST_GOAL de la grille", grille._id);
          }
        }

        // Comparer le bon r??sultat par rapport au pari jou??
        if (bet.status == "win" && bet.result != goodResult){
          console.log("Le pari FIRST_GOAL a ??t?? consid??r?? comme gagnant alors qu'il devrait ??tre perdant !");
          return eachBet();
        } else if (bet.status == "loose" && bet.result == goodResult){
          console.log("Le pari FIRST_GOAL a ??t?? consid??r?? comme perdant alors qu'il devrait ??tre gagnant !");
          Grille.findOneAndUpdate({ _id: grille._id, "bets._id": bet._id }, { $set: { "bets.$.status": "win", "bets.$.winner": goodResult }, $inc: { numberOfBetsWin: 1, "payout.point": gameticket.pointsPerBet } }, { new: true }).then(function(grid){
            //console.log("Updated bets", grid.bets);
            // Cr??diter l'utilisateur
            return User.findOneAndUpdate({ _id: grid.user }, { $inc: { point: gameticket.pointsPerBet } }, { new: true});
          }).then(function(user){
            console.log("Updated user:", user.username);
            return eachBet();
          }, function(err){
            console.log(err);
            return eachBet();
          });
        } else {
          console.log("TOUT VA BIEN POUR LE PARI FIRST_GOAL !");
          return eachBet();
        }
      } else if (bet.type === "LESS_MORE_GOAL"){
        var goodResult = -1;
        var totalScore = fixture.result.homeScore + fixture.result.awayScore;
        console.log("Score total:", totalScore);
        if (totalScore > 2){
          goodResult = 1;
        } else {
          goodResult = 0;
        }

        // Comparer le bon r??sultat par rapport au pari jou??
        if (bet.status == "win" && bet.result != goodResult){
          console.log("Le pari LESS_MORE_GOAL a ??t?? consid??r?? comme gagnant alors qu'il devrait ??tre perdant !");
          return eachBet();
        } else if (bet.status == "loose" && bet.result == goodResult){
          console.log("Le pari LESS_MORE_GOAL a ??t?? consid??r?? comme perdant alors qu'il devrait ??tre gagnant !");
          Grille.findOneAndUpdate({ _id: grille._id, "bets._id": bet._id }, { $set: { "bets.$.status": "win", "bets.$.winner": goodResult }, $inc: { numberOfBetsWin: 1, "payout.point": gameticket.pointsPerBet } }, { new: true }).then(function(grid){
            //console.log("Updated bets", grid.bets);
            // Cr??diter l'utilisateur
            return User.findOneAndUpdate({ _id: grid.user }, { $inc: { point: gameticket.pointsPerBet } }, { new: true });
          }).then(function(user){
            console.log("Updated user:", user.username);
            return eachBet();
          }, function(err){
            console.log(err);
            return eachBet();
          });
        } else {
          console.log("TOUT VA BIEN POUR LE PARI LESS_MORE_GOAL !");
          return eachBet();
        }
      }
    }, function(err){
      if (err){
        return res.status(500).json(err);
      } else {
        // Mettre ?? jour le payout de la grille
        Grille.findOne({ _id: grille._id }).then(function(grille){
          var nbWin = grille.bets.filter(bt => bt.status === "win").length;
          console.log("Mise ?? jour du nombre de paris gagnant:", nbWin);
          Grille.update({ _id: grille._id }, { $set: { numberOfBetsWin: nbWin } }, function(err, result){
            if (err) return res.status(500).json(err);
            console.log("R??sultat de la mise ?? jour du nombre de paris gagnant:", result);
            return res.status(200).json("OK");
          });
        }, function(err){
          console.log(err);
          return res.status(500).json(err);
        });
      }
    });
  }, function(err){
    console.log(err);
    return res.status(500).json(err);
  });

});



// Cr??ateur de grille
router.post('/grille', function(req, res){
  // bets / ticketId / userId

  var userId = req.body.userId;
  var ticketId = req.body.ticketId;
  var bets = req.body.best;
  var status = req.body.status;

  // V??rifier que tous les paris sont remplis apr??s avoir v??rifi?? que le ticket existe

  // Find ticket where open date is older than current date && limit date is beyond current date
  var currentDate = moment();

  GameTicket.findOne({ _id: ticketId }).then(function(gameticket){
    var bets = [];
    async.eachLimit(gameticket.fixtures, 1, function(fixture, eachFixture){
      bets.push({ fixture: fixture,  result: Math.floor(Math.random() * 3) });
      eachFixture();
    }, function(err){
      if (!err){
        var type = "";
        if (gameticket.type == "MATCHDAY") type = "MULTI";
        if (gameticket.type == "SINGLE") type = "SIMPLE";

        Grille.create({ gameTicket: gameticket, user: userId, bets: bets, status: status, type: type }, function(err, grille){
          if (err){
            return res.status(500).json(err);
          } else {
            return res.status(200).json(grille);
          }
        });
      } else {
        return res.status(500).json(err);
      }
    });
  }, function(err){
    return res.status(500).json(err);
  });

});

// Cr??er une grille al??atoire
router.post('/grilles/random', function(req, res){
  var userId = req.body.userId;
  var grilleType = req.body.grilleType;

  var ticketQuery;
  if (grilleType == "MULTI"){
    ticketQuery = GameTicket.find({ status: "ended", type: "MATCHDAY" }).sort({ resultDate: -1 }).limit(20);
  } else if (grilleType == "SIMPLE"){
    ticketQuery = GameTicket.find({ status: "ended", type: "SINGLE" }).sort({ resultDate: -1 }).limit(20);
  } else {
    return res.status(500).json("invalid params");
  }

  ticketQuery.then(function(gametickets){
    console.log(gametickets.length);
    var chance = new Chance();
    if (gametickets == null || gametickets.length == 0){
      return res.status(500).json("Aucun ticket trouv?? !");
    } else {
      var bets = [];
      var gameticket = gametickets[chance.integer({ min: 0, max: gametickets.length-1 })];
      console.log(gameticket);
      if (gameticket.type == "SINGLE"){
        var fixture = gameticket.fixtures[0];
        gameticket.betsType.forEach(function(bt){
          if (bt.type == "1N2"){
            bets.push({ type: "1N2", result: chance.integer({ min: 0, max: 2}) });
          } else if (bt.type == "FIRST_GOAL"){
            bets.push({ type: "FIRST_GOAL", result: chance.integer({ min: 0, max: 2}) });
          } else if (bt.type == "BOTH_GOAL"){
            bets.push({ type: "BOTH_GOAL", result: chance.integer({ min: 0, max: 1}) });
          } else if (bt.type == "LESS_MORE_GOAL"){
            bets.push({ type: "LESS_MORE_GOAL", result: chance.integer({ min: 0, max: 1}) });
          }
        });
      } else if (gameticket.type == "MATCHDAY") {
        gameticket.fixtures.forEach(function(fixture){
          bets.push({ fixture: fixture,  result: chance.integer({ min: 0, max: 2 }) });
        });
      }

      Grille.create({ gameTicket: gameticket, user: userId, bets: bets, status: "waiting_result", type: grilleType }, function(err, grille){
        if (err){
          return res.status(500).json(err);
        } else {
          return res.status(200).json(grille);
        }
      });
    }
  }, function(err){
    return res.status(500).json(err);
  });
});

router.delete('/grilles/tournament', function(req, res){
  Grille.remove({ type: "TOURNAMENT" }, function(err, result){
    return res.status(200).json("OK");
  });
});

// Cr??er une grille al??atoire
router.post('/grilles/random/tournament', function(req, res){
  var amountUser = req.body.amountUser;
  var ticketId = req.body.ticketId;

  async.waterfall([

    function(done){
      User.find().limit(parseInt(amountUser)).then(function(users){
        return done(null, users);
      }, function(err){
        return done(err);
      });
    },

    function(users, done){
      GameTicket.findOne({ _id: ticketId, type: 'TOURNAMENT' }, function(err, gameticket){
        if (err){
          return done(err);
        } else {
          return done(null, users, gameticket);
        }
      });
    },

    function(users, gameticket, done){
      async.eachLimit(users, 1, function(user, eachUser){
        var bets = [];
        gameticket.fixtures.forEach(function(fixture){
          bets.push({ fixture: fixture,  result: chance.integer({ min: 0, max: 2 }) });
        });

        Grille.create({ gameTicket : gameticket._id, user: user._id, bets: bets, status: 'waiting_result', type: 'TOURNAMENT', reference: uniqid('GR-TOURN-'), ip: "", instanceId: "", advertisingId: "", "standing.id": user.username }, function(err, grille){
          if (err) return eachUser(err);
          GameTicket.findOne({ _id: grille.gameTicket }, function(err, gt){
            if (err) return eachUser(err);
            var tournament = gt.tournament;
            var totalPlayers = parseInt(tournament.totalPlayers+1);
            var sharing = parseInt(tournament.sharing);
            var bonusActivation = parseInt(gt.bonusActivation);
            var bonus = parseInt(gt.bonus);

            var totalPlayersPaid = (totalPlayers*sharing/100).toFixed(0);
            console.log('totalPlayersPaid :', totalPlayersPaid);
            if (totalPlayersPaid == 0) totalPlayersPaid = 1;

            var pot = 0;
            console.log("Reward Type :", tournament.rewardType);
            if (tournament.rewardType == "ZaniHash"){
              console.log("Update ZaniHash Pot !");
              pot = parseInt(tournament.playCost);
            } else {
              pot = (parseInt(tournament.playCost)/parseInt(process.env.ZH_TO_ZC)).toFixed(0);
            }

            console.log('Pot without bonus :', pot);
            // V??rifier si la validation de la grille provoque l'activation du bonus
            if ((parseInt(tournament.totalPlayers)+1) == parseInt(gameticket.bonusActivation)){
              pot = parseInt(pot) + parseInt(gameticket.bonus);
              console.log('Pot with bonus :', pot);
            }

            GameTicket.updateOne({ _id: grille.gameTicket }, { $inc: { "tournament.totalPlayers": 1, "tournament.pot": pot }, $set: { "tournament.totalPlayersPaid": totalPlayersPaid } }, function(err, result){
              if (err){
                return eachUser(null);
              } else {
                if (result.nModified == 0){
                }
                return eachUser(null);
              }
            });
          });
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
    if (err){
      console.log(err);
      return res.status(500).json(err);
    } else {
      return res.status(200).json("OK");
    }
  });
});

// Cr??aeur de grille gagnante
router.post('/grille/jackpot', function(req, res){
  var userId = req.body.userId;
  var ticketId = req.body.ticketId;
  var status = req.body.status;
  var payoutStatus = req.body.payoutStatus;
  var payoutAmount = req.body.payoutAmount;
  var payoutPoint = req.body.payoutPoint;

  var _currentUser;

  // Find ticket where open date is older than current date && limit date is beyond current date
  var currentDate = moment();
  User.findOne({ _id: userId }).then(function(user){
    //console.log(user);
    if (user == null){
      return Promise.reject("User not exist");
    }
    _currentUser = user;
    return GameTicket.findOne({ _id: ticketId }).populate('fixtures');
  }).then(function(gameticket){
    console.log("promise 2");
    if (gameticket == null){
      return Promise.reject("GameTicket not exist");
    }

    var bets = [];
    async.eachLimit(gameticket.fixtures, 1, function(fixture, eachFixture){
      bets.push({ fixture: fixture, result: fixture.result.winner, status: "win" });
      eachFixture();
    }, function(err){
      if (!err){
        var type = "";
        if (gameticket.type == "MATCHDAY") type = "MULTI";
        if (gameticket.type == "SINGLE") type = "SIMPLE";

        return Grille.create({ gameTicket: gameticket,
          reference: uniqid('GR-MUL-'),
          user: _currentUser._id,
          type: type,
          bets: bets,
          status: status,
          numberOfBetsWin: bets.length,
          "payout.status": payoutStatus,
          "payout.point": payoutPoint,
          "payout.amount": payoutAmount });
        } else {
          console.log("Promise reject");
          return Promise.reject(err);
        }
      });
    }).then(function(grille){
      console.log("Cr??ation d'une grille gagnante:", grille);
      _currentUser.point += parseInt(payoutPoint);
      _currentUser.save();
      return res.status(200).json("OK");
    }, function(err){
      console.log(err);
      return res.status(500).json(err);
    });

  });


  /*
  * Cr??er une grille simple gagnante
  */

  router.post('/grilles/simple/jackpot', function(req, res){
    var userId = req.body.userId;
    var ticketId = req.body.ticketId;

    var _currentUser;

    // Find ticket where open date is older than current date && limit date is beyond current date
    var currentDate = moment();
    User.findOne({ _id: userId }).then(function(user){
      //console.log(user);
      if (user == null){
        return Promise.reject("User not exist");
      }
      _currentUser = user;
      return GameTicket.findOne({ _id: ticketId, type: "SINGLE" }).populate('fixtures');
    }).then(function(gameticket){
      console.log("promise 2");
      if (gameticket == null){
        return Promise.reject("GameTicket not exist");
      }

      var bets = [];
      async.eachLimit(gameticket.betsType, 1, function(betsType, eachBetType){
        bets.push({ type: betsType.type, result: betsType.result });
        eachBetType();
      }, function(err){
        if (!err){
          var type = "SIMPLE";
          return Grille.create({ gameTicket: gameticket,
            reference: uniqid('GR-SIM-'),
            user: _currentUser._id,
            type: type,
            bets: bets,
            status: "waiting_result" });
          } else {
            console.log("Promise reject");
            return Promise.reject(err);
          }
        });
      }).then(function(grille){
        console.log("Cr??ation d'une grille gagnante:", grille);
        return res.status(200).json("OK");
      }, function(err){
        console.log(err);
        return res.status(500).json(err);
      });

    });

    // Valider une grille
    router.put('/grilles/:grille_id/validate', function(req, res){
      var grilleId = req.params.grille_id;

      Grille.findOneAndUpdate({ _id: grilleId }, { $set: { status: 'waiting_result' } }, function(err, grille){
        if (err) return res.status(500).json(err);
        res.status(200).json(grille);
      });
    });


    // Valider toutes les grilles
    router.put('/grilles/validate', function(req, res){
      Grille.updateMany({ status: 'waiting_validation' }, { $set: {  status: 'waiting_result' } }, function(err, result){
        if (err) return res.status(500).json(err);
        res.status(200).json(result);
      });
    });

    // D??sactiver les grilles en attente de r??sultat et dont le ticket est annul??e
    router.put('/grilles/cancel', function(req, res){
      Grille.find({ status: 'waiting_result' }).populate({
        path: 'gameTicket',
        match: {
          active: false
        }
      }).then(function(grilles){
        console.log(grilles.length);

        grilles = grilles.filter(function(grille) {
          return grille.gameTicket; // return only users with email matching 'type: "Gmail"' query
        });
        console.log(grilles.length);

        Grille.updateMany({ status: 'waiting_result', _id: { $in: grilles } }, { $set: { status: 'canceled' } }).then(function(result){
          console.log(result);
          return res.status(200).json("OK");
        });
      }, function(err){
        return res.status(500).json(err);
      });
    });

    router.put('/grilles/fixUpdate', function(req, res){
      GameTicket.find({ status: 'ended' }).then(function(gametickets){
        async.eachLimit(gametickets, 1, function(gameticket, eachGameTicket){
          Grille.updateMany({ gameTicket: gameticket._id }, { $set: { updatedAt: gameticket.resultDate } }, { $upsert: false }, function(err, result){
            if (err) return eachGameTicket(err);
            console.log(result);
            eachGameTicket();
          });
        }, function(err){
          if (err) return res.status(500).json(err);
          return res.status(200).json("OK");
        });
      }, function(err){
        return res.status(500).json(err);
      });
    });

    router.put('/grilles/fixType', function(req, res){
      GameTicket.find().then(function(gametickets){
        var single = gametickets.filter(gameticket => gameticket.type === "SINGLE");
        var multi = gametickets.filter(gameticket => gameticket.type === "MATCHDAY");

        Grille.updateMany({ gameTicket: { $in: multi.map(m => m._id) } }, { $set: { type: 'MULTI' } }, function(err, result){
          if (err) return res.status(500).json(err);
          console.log(result.nModified, "grilles ont ??t?? mise ?? jour. Status : MULTI");
          Grille.updateMany({ gameTicket: { $in: single.map(m => m._id) } }, { $set: { type: 'SIMPLE' } }, function(err, result){
            if (err) return res.status(500).json(err);
            console.log(result.nModified, "grilles ont ??t?? mise ?? jour. Status : SIMPLE");
            return res.status(200).json(result);
          });
        });
      }, function(err){
        return res.status(500).json(err);
      });
    });

    router.put('/grilles/fixPayout', function(req, res){
      Grille.updateMany({ payout: { $exists: false } }, {"payout.point": 0, "payout.amount": 0 }, function(err, result){
        if (err) return res.status(500).json(err);
        return res.status(200).json(result);
      });
    });

    /*
    *
    */
    router.put('/grilles/fixReference', function(req, res){
      Grille.find({ reference: { $exists: false } }).exec(function(err, grilles){
        if (err) return res.status(500).json(err);
        console.log("Nombre de grilles sans r??f??rence:", grilles.length);
        async.eachLimit(grilles, 1, function(grille, eachGrille){
          var reference;
          if (grille.type === "SIMPLE"){
            reference = uniqid('GR-SIM-');
          } else if (grille.type === "MULTI"){
            reference = uniqid('GR-MUL-');
          } else {
            return eachGrille("La grille ne poss??de pas de type:" + grille._id);
          }
          Grille.update({ _id: grille._id }, { $set: { reference: reference } }, function(err, result){
            if (err) return eachGrille(err);
            return eachGrille();
          });
        }, function(err){
          if (err) return res.status(500).json(err);
          return res.status(200).json("OK");
        });
      });
    });

    /*
    * Mettre ?? jour le match des paris pour les grilles simples
    */
    router.put('/grilles/fixBetsFixture', function(req, res){
      Grille.find({ type: "SIMPLE", "bets.fixture": { $exists: false } }).populate('gameTicket').exec().then(function(grilles){
        console.log(grilles.length);
        async.eachLimit(grilles, 1, function(grille, eachGrille){
          console.log(grille.gameTicket.fixtures[0], grille._id);
          for (var i = 0; i < grille.bets.length; i++){
            grille.bets[i].fixture = grille.gameTicket.fixtures[0];
          }

          Grille.findOneAndUpdate({ _id: grille._id, "bets.fixture": { $exists: false } }, { $set: { bets: grille.bets } }, { new: true }, function(err, result){
            if (err){
              return eachGrille(err);
            } else {
              console.log("Mise ?? jour des paris simple de la grille", grille._id);
              return eachGrille();
            }
          });
        }, function(err){
          console.log(err)
          return res.status(200).json("OK");
        });
      }, function(err){
        return res.status(500).json(err);
      });
    });


    router.put('/grilles/multi/fixBonus', function(req, res){
      Grille.count({ type: "MULTI", "payout.bonus": { $exists: true }, numberOfBetsWin: { $gt: 3 }, status: { $in: ["loose", "win"] } }, function(err, count){
        if (err){
          console.log(err);
          return res.status(500).json(err);
        } else {
          console.log(count);
          return res.status(200).json("OK");
        }
      });

      async.waterfall([
        function(done){

        }
      ], function(err, result){
        if (err){
          console.log(err);
          return res.status(500).json(err);
        } else {
          console.log(result);
          return res.status(200).json("OK");
        }
      });

    });

    // Netoyer les grilles ayant des tickets obsolete
    router.delete('/grilles', function(req, res){
      Grille.find().then(function(grilles){
        async.eachLimit(grilles, 1, function(grille, eachGrille){
          GameTicket.findOne({ _id: grille.gameTicket }).then(function(ticket){
            if (ticket == null){
              console.log(ticket);
              Grille.deleteOne({ _id: grille._id }, function(err, result){
                console.log(result.result);
                eachGrille();
              });
            } else {
              eachGrille();
            }
          });
        }, function(err){
          return res.status(200).json("OK");
        });
      }, function(err){
        return res.status(500).json(err);
      });
    });


    module.exports = router;
