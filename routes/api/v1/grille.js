var express = require('express');
var mongoose = require('mongoose');
var router = express.Router();
var passport = require('passport');
var moment = require('moment');
var async = require('async');
var CustomError = require('../../../lib/customerror');
var uniqid = require('uniqid');

var Grille = mongoose.model('Grille');
var GameTicket = mongoose.model('GameTicket');
var User = mongoose.model('User');

router.get('/grilles', passport.authenticate('bearer', { session: false }), function(req, res){
  var statusQuery = req.query.status;
  var currentUser = req.user;

  if (statusQuery == null || statusQuery.length < 1){
    return res.status(500).json("Invalid request");
  }

  var typeArr = [];
  var statusArr = [];
  if (statusQuery == "waiting_result") {
    typeArr.push("MULTI");
    statusArr.push(statusQuery);
  } else {
    typeArr.push("MULTI");
    statusArr.push(statusQuery);
  }

  //console.log(typeArr, statusArr, currentUser._id);
  Grille.aggregate([
    { $match: { user: currentUser._id, type: { $in: typeArr }, status: { $in: statusArr } } },
    { $group: {
      _id: "$gameTicket",
      createdAt: { $push: "$createdAt"}
    }},
    { $sort: { "createdAt": -1 } }
  ]).then(function(tickets){
    //console.log(tickets);
    var ticketId = tickets.map(tick => tick._id);
    //console.log(ticketId);
    return Grille.find({ user: currentUser._id, gameTicket: { $in: ticketId }, status: { $ne: "canceled", $in: statusArr } }).sort({ createdAt: -1 }).populate({
      path: 'gameTicket',
      populate: {
        path: 'fixtures',
        populate: {
          path: 'competition homeTeam awayTeam'
        }
      }
    });
  }).then(function(grilles){
    //console.log(grilles.length, "grilles récupérées.");
    //console.log(grilles[0].gameTicket.name);
    async.groupByLimit(grilles,1, function(grille, groupGrille){
      return groupGrille(null, grille.gameTicket._id);
    }, function(err, result){
      //console.log(err);
      if (err) return res.status(500).json(err);
      //console.log(result);
      return res.status(200).json(result);

    });
  }, function(err){
    //console.log(err);
    return res.status(500).json(err);
  });
});

router.post('/grilles', passport.authenticate('bearer', { session: false }), function(req, res){
  var currentUser = req.user;
  var currentDate = moment().utc();

  var errLocalized;
  if (currentUser.locale != null && currentUser.locale == "fr"){
    errLocalized = {
      "internal": new CustomError(500,1, "Erreur Interne", ""),
      "grid_max_play": new CustomError(500, -1, "Limite Atteinte", "Vous avez atteind la limite de grilles jouables pour ce ticket."),
      "grid_multi_ads_limit": new CustomError(500, -1, "Limite Atteinte", "Vous pouvez valider jusqu'à 8 grilles MULTI par heure. retentez votre chance plus tard ou protifez en pour effectuer vos paris simple !")
   };
  } else {
    errLocalized = {
      "internal": new CustomError(500,1, "Internal Error", ""),
      "grid_max_play": new CustomError(500, -1, "Limit Reach", "You have already play all your grids for this ticket."),
      "grid_multi_ads_limit": new CustomError(500, -1, "Limit Reach", "You've reach the maximum MULTI grid playable per hour. You can proceed 8 grids per hours. Come back later for your chance to win !")
    };
  }

  var ipAddr = req.headers["x-forwarded-for"];
  if (ipAddr){
    var list = ipAddr.split(",");
    ipAddr = list[list.length-1];
  } else {
    ipAddr = req.connection.remoteAddress;
  }

  var ticketId = req.body.gameTicket;
  var bets = req.body.bets;

  if (bets != null){
    // Paw conversion string to json
    if (typeof bets == 'string'){
      bets = JSON.parse(bets);
    }
  } else {
    return res.status(500).json('Missing bets');
  }

  async.waterfall([
    // Vérifier le nombre de grilles joués durant la dernière heure
    function(done){
      Grille.find({ user: currentUser._id, type: "MULTI", status: "waiting_result" })
      .sort({ createdAt: -1 })
      .limit(parseInt(process.env.MAX_MULTI_GRID_PER_HOUR))
      .exec(function(err, grilles){
          if (err){
            return done(errLocalized["internal"]);
          } else {
            if (grilles.length == parseInt(process.env.MAX_MULTI_GRID_PER_HOUR)){
              var lastGrid = grilles[grilles.length-1];
              var diff = moment().utc().diff(moment(lastGrid.createdAt).utc(), 'hours');
              //console.log(moment().utc(), moment(lastGrid.createdAt).utc());
              console.log("diff", diff);
              //console.log(grilles);
              if (diff == 0){
                return done(errLocalized["grid_multi_ads_limit"]);
              }
              return done(null);
            } else {
              return done(null);
            }
          }
      });
    },

    // Vérifier si le ticket est disponible
    function(done){
      GameTicket.findOne({ _id: ticketId, openDate: { $lt: currentDate }, limitDate: { $gt: currentDate } }).populate('fixtures').then(function(gameticket){
        if (gameticket == null){
          done('Le ticket n\'existe pas !');
        } else {
          done(null, gameticket);
        }
      }, function(err){

      });
    },
    // Vérifier que le nombre de grille jouable n'est pas dépassé
    function(gameticket, done){
      Grille.count({ user: currentUser._id, gameTicket: gameticket._id, status: { $ne: 'canceled' } }, function(err, count){
        if (count < gameticket.maxNumberOfPlay){
          done(null, gameticket);
        } else {
          done('Nombre maximum de grille pour ce ticket atteind.')
        }
      });
    },
    // Vérifier la validité des paris
    function(gameticket, done){
      async.eachLimit(gameticket.fixtures, 1, function(fixture, eachFixture){
        //console.log('Check if fixture exists in bets array :', fixture._id);
        //if (bets.hasOwnProperty(fixture._id)){
        //console.log(bets);
        var bet = bets.filter(e => e.fixture == fixture._id);
        if (bet.length > 0){
          //if (parseInt(bets[fixture._id]) <= 2){
          if (bet[0].result <= 2){
            eachFixture();
          } else {
            eachFixture("Grille corrompue, le score n'est pas correct.");
          }
        } else {
          eachFixture("Grille corrompue : Un ou plusieurs paris sont manquant.");
        }
      }, function(err){
        if (err) return done(err);
        done(null, gameticket);
      });
    },
    // Créer une grille temporaire (qui sera validé après paiement publicitaire)
    function(gameticket, done){
      for (var i = 0; i < bets.length; i++){
        bets[i].type = "1N2";
      }
      Grille.create({ gameTicket: gameticket._id, user: currentUser._id, bets: bets, status: 'waiting_validation', type: 'MULTI', reference: uniqid('GR-MUL-'), ip: ipAddr }, function(err, grille){
        if (err) return done(err);
        done(null, grille);
      });
    }
  ], function(err, grille){
    if (err) {
      //console.log(err);
      return res.status(500).json(err);
    }
    res.status(200).json(grille);
  });
});

router.post('/grilles/single', passport.authenticate('bearer', { session: false }), function(req, res){
  var currentUser = req.user;
  var currentDate = moment().utc();
  var ipAddr = req.headers["x-forwarded-for"];
  if (ipAddr){
    var list = ipAddr.split(",");
    ipAddr = list[list.length-1];
  } else {
    ipAddr = req.connection.remoteAddress;
  }

  var ticketId = req.body.gameTicket;
  var bets = req.body.bets;

  if (bets != null){
    // Paw conversion string to json
    if (typeof bets == 'string'){
      bets = JSON.parse(bets);
    }
  } else {
    return res.status(500).json('Missing bets');
  }


  async.waterfall([
    // Vérifier si le ticket est disponible
    function(done){
      GameTicket.findOne({ _id: ticketId, openDate: { $lt: currentDate }, limitDate: { $gt: currentDate } }).populate('fixtures').then(function(gameticket){
        if (gameticket == null){
          return done(new CustomError(500, 0, "Action impossible", "Vous ne pouvez plus miser sur ce match car il n'existe pas ou a déjà commencé."))
        } else {
          return done(null, gameticket);
        }
      }, function(err){

      });
    },
    // Vérifier que le nombre de grille jouable n'est pas dépassé
    function(gameticket, done){
      Grille.count({ user: currentUser._id, gameTicket: gameticket._id, status: { $ne: 'canceled' } }, function(err, count){
        if (count == 0){
          return done(null, gameticket);
        } else {
          return done(new CustomError(500, 0, "Action impossible", "Vous avez déjà effectué vos paris pour ce match."))
        }
      });
    },
    // Vérifier si l'utilisateur dispose de suffisament de jeton
    function(gameticket, done){
      if (currentUser.jeton < gameticket.jeton){
        return done(new CustomError(500, 0, "Action impossible", "Nombre de jeton insuffisant."))
      } else {
        return done(null, gameticket);
      }
    },
    // Vérifier la validité des paris
    function(gameticket, done){
      //console.log('Check if fixture exists in bets array :', fixture._id);
      //if (bets.hasOwnProperty(fixture._id)){
      //console.log(bets);
      for (var i = 0; i < gameticket.betsType.length; i++){

        if (bets.filter(bet => bet.type === gameticket.betsType[i].type).length == 0) {
          return done("Il manque un pronostic dans cette grille: " + gameticket.betsType[i]);
        }

        if (gameticket.betsType[i].type == "1N2" && bets[gameticket.betsType[i].type] > 2 || gameticket.betsType[i].type == "FIRST_GOAL" && bets[gameticket.betsType[i].type] > 2){
          return done("Valeur incorrecte pour le paris 1N2 ou FIRST_GOAL");
        } else if  (gameticket.betsType[i].type == "BOTH_GOAL" && bets[gameticket.betsType[i].type] > 1 || gameticket.betsType[i].type == "LESS_MORE_GOAL" && bets[gameticket.betsType[i].type] > 1){
          return done("Valeur incorrecte pour le paris BOTH_GOAL ou LESS_MORE_GOAL");
        }

        //console.log(bets[gameticket.betsType[i].type]);
        if (bets[i] !== null){
          bets[i].fixture = gameticket.fixtures[0]._id;
        }
        //console.log(bets[i]);
      }
      return done(null, gameticket);
    },
    // Décréditer l'utilisateur
    function(gameticket, done){
      User.findOneAndUpdate({ _id: currentUser._id, jeton: { $gt: 0 } }, { $inc: { jeton: -Math.abs(gameticket.jeton), "stats.totalGridSimple": 1 } }, { new: true }, function(err, user){
        if (err) return done(err);
        if (user == null){
          return done(new CustomError(500, 0, "Action impossible", "Nombre de jeton insuffisant."))
        }

        return done(null, gameticket);
      });
    },
    // Créer une grille
    function(gameticket, done){
      Grille.create({ gameTicket : gameticket._id, user: currentUser._id, bets: bets, status: 'waiting_result', type: 'SIMPLE', ip: ipAddr }, function(err, grille){
        if (err) return done(err);
        return done(null, grille);
      });
    }
  ], function(err, grille){
    if (err) {
      //console.log(err);
      return res.status(500).json(err);
    }
    return res.status(200).json(grille);
  });
});

router.put('/grilles/:grilleId/cancel', passport.authenticate('bearer', { session: false }), function(req, res){
  var paramGrilleId = req.params.grilleId;
  var currentUser = req.user;

  Grille.update({ _id: paramGrilleId, status: 'waiting_validation', user: currentUser._id }, { $set: { status: 'canceled' } }, function(err, result){
    if (err) return res.status(500).json(err);
    //console.log(result);
    res.status(200).json("OK");
  });
});

module.exports = router;
