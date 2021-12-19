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
var Transaction = mongoose.model('Transaction');

router.get('/grilles', passport.authenticate('bearer', { session: false }), function(req, res){
  var statusQuery = req.query.status;
  var currentUser = req.user;
  var page = req.query.page;
  var limit = req.query.limit;

  if (statusQuery == null || statusQuery.length < 1){
    return res.status(500).json("Invalid request");
  }

  if (limit == null){
    limit = 100;
  }

  if (page == null){
    page = 0;
  }

  limit = parseInt(limit);
  page = parseInt(page);

  var typeArr = [];
  var statusArr = [];
  if (statusQuery == "single"){
    typeArr.push("SIMPLE");
    statusArr.push("win");
    statusArr.push("loose");
    statusArr.push("free");
  } else if (statusQuery == "waiting_result") {
    typeArr.push("SIMPLE");
    typeArr.push("MULTI");
    statusArr.push(statusQuery);
  } else if (statusQuery == "tournament"){
    typeArr.push("TOURNAMENT");
    statusArr.push("waiting_result");
    statusArr.push("win");
    statusArr.push("loose");
    statusArr.push("free");
  } else {
    typeArr.push("MULTI");
    statusArr.push(statusQuery);
  }

  //console.log(typeArr, statusArr, currentUser._id);

  // Récupérer les tickets des dernières grilles jouées
  Grille.aggregate([
    { $match: { user: currentUser._id, type: { $in: typeArr }, status: { $in: statusArr } } },
    { $group: {
      _id: "$gameTicket",
      createdAt: { $push: "$createdAt"}
    }},
    { $sort: { "createdAt": -1 } },
    { $skip: page*limit },
    { $limit: limit }
  ]).then(function(tickets){
    //console.log(tickets);
    var ticketId = tickets.map(tick => tick._id);
    //console.log(currentUser._id);
    //console.log(ticketId);
    return Grille.find({ user: currentUser._id, gameTicket: { $in: ticketId }, status: { $ne: "canceled", $in: statusArr } })
    .select('createdAt updatedAt reference type gameTicket bets status numberOfBetsWin payout standing')
    .sort({ createdAt: -1 })
    .populate({
      path: 'gameTicket',
      select: '_id type name openDate limitDate resultDate thumbnail picture fixtures betsType competition pointsPerBet bonus bonusActivation status matchDay jackpot maxNumberOfPlay numberOfGrillePlay jeton tournament',
      populate: {
        path: 'fixtures',
        select: 'date competition homeTeam awayTeam matchDay result status odds zScore',
        populate: {
          path: 'competition homeTeam awayTeam',
          select: 'name country shortName logo recentForm'
        }
      }
    }).exec();
  }).then(function(grilles){
    //console.log(grilles.length, "grilles récupérées.", statusArr);
    //console.log(grilles[0].gameTicket.name);
    async.groupBy(grilles, function(grille, groupGrille){
      if (grille.gameTicket == null){
        console.log("La grille", grille._id, "ne possède pas de ticket de jeu !");
        groupGrille("Error");
      } else {
        groupGrille(null, grille.gameTicket._id);
      }
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

router.get('/grilles/single/gameticket/:ticket_id', passport.authenticate('bearer', { session: false }), function(req, res){
  var currentUser = req.user;
  var ticketId = req.params.ticket_id;

  Grille.findOne({ user: currentUser._id, gameTicket: ticketId }, function(err, grille){
    if (err){
      return res.status(500).json(err);
    } else if (grille == null){
      return res.status(404).json("");
    }
    return res.status(200).json(grille);
  });
});

router.get('/grilles/tournament/gameticket/:ticket_id', passport.authenticate('bearer', { session: false }), function(req, res){
  var currentUser = req.user;
  var ticketId = req.params.ticket_id;

  Grille.findOne({ user: currentUser._id, gameTicket: ticketId }, function(err, grille){
    if (err){
      return res.status(500).json(err);
    } else if (grille == null){
      return res.status(404).json("");
    }
    return res.status(200).json(grille);
  });
});

router.post('/grilles', passport.authenticate('bearer', { session: false }), function(req, res){
  var currentUser = req.user;
  var currentDate = moment().utc();
  var errLocalized;
  if (currentUser.locale != null && currentUser.locale == "fr"){
    errLocalized = {
      "internal": new CustomError(500,1, "Erreur Interne", ""),
      "grid_max_play": new CustomError(500, -1, "Limite Atteinte", "Vous avez atteint la limite de grilles jouables pour ce ticket."),
      "grid_multi_ads_limit": new CustomError(500, -1, "Limite Atteinte", "Vous pouvez valider jusqu'à 8 grilles MULTI par heure. retentez votre chance plus tard ou protifez en pour effectuer vos paris simple !")
    };
  } else if (currentUser.locale != null && currentUser.locale == "pt"){
    errLocalized = {
      "internal": new CustomError(500,1, "Erreur Interne", ""),
      "grid_max_play": new CustomError(500, -1, "Limite de acerto", "Você atingiu o limite de grades jogáveis ​​para este ticket."),
      "grid_multi_ads_limit": new CustomError(500, -1, "Limite de acerto", "Você pode validar até 8 MULTI grades por hora. Tente sua sorte mais tarde ou proteste para fazer suas apostas simples!")
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

  //return res.status(500).json(errLocalized["1"]);

  var ticketId = req.body.gameTicket;
  var bets = req.body.bets;
  var instanceId = req.body.instanceId;
  var advertisingId = req.body.advertisingId;

  if (instanceId == null){
    instanceId = "";
  }

  if (advertisingId == null){
    advertisingId = "";
  }

  if (bets != null){
    // Paw conversion string to json
    if (typeof bets == 'string'){
      bets = JSON.parse(bets);
    }
  } else {
    return res.status(500).json(errLocalized["internal"]);
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
            //console.log("diff", diff);
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
          return done(errLocalized["internal"]);
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
          done(errLocalized["grid_max_play"]);
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
        if (err) {
          console.log(err);
          return done(errLocalized["internal"]);
        }
        done(null, gameticket);
      });
    },
    // Créer une grille temporaire (qui sera validé après paiement publicitaire)
    function(gameticket, done){
      for (var i = 0; i < bets.length; i++){
        bets[i].type = "1N2";
      }
      Grille.create({ gameTicket : gameticket._id, user: currentUser._id, bets: bets, status: 'waiting_validation', type: 'MULTI', reference: uniqid('GR-MUL-'), ip: ipAddr, instanceId: instanceId, advertisingId: advertisingId }, function(err, grille){
        if (err) return done(errLocalized["internal"]);
        done(null, grille);
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
  var instanceId = req.body.instanceId;

  //console.log("Instance ID :", req.body);

  if (instanceId == null){
    instanceId = "";
  }
  //console.log("Instance ID :", instanceId);

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
        //bets[gameticket.betsType[i].type] = bet;
      }
      return done(null, gameticket);
    },

    // Décréditer l'utilisateur
    function(gameticket, done){
      User.findOneAndUpdate({ _id: currentUser._id, jeton: { $gt: 0 } }, { $inc: { jeton: -Math.abs(gameticket.jeton), "stats.totalGridSimple": 1 } }, { new: true }, function(err, user){
        if (err){
          console.log(err);
          return done(err);
        }

        if (user == null){
          return done(new CustomError(500, 0, "Action impossible", "Nombre de jeton insuffisant."))
        }

        return done(null, gameticket);
      });
    },

    // Créer une grille
    function(gameticket, done){
      Grille.create({ gameTicket : gameticket._id, user: currentUser._id, bets: bets, status: 'waiting_result', type: 'SIMPLE', reference: uniqid('GR-SIM-'), ip: ipAddr, instanceId: instanceId }, function(err, grille){
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

router.post('/grilles/tournament', passport.authenticate('bearer', { session: false }), function(req, res){
  var currentUser = req.user;
  var currentDate = moment().utc();
  var errLocalized;
  if (currentUser.locale != null && currentUser.locale == "fr"){
    errLocalized = {
      "internal": new CustomError(500,1, "Erreur Interne", ""),
      "grid_max_play": new CustomError(500, -1, "Limite Atteinte", "Vous avez atteint la limite de grilles jouables pour ce ticket."),
      "insufficient_zanihash": new CustomError(500,-1, "Solde Insuffisant", "Vous n'avez pas assez de ZaniHash pour participer à ce tournoi ! Rejoignez le programme ZaniAnalytics pour recevoir quotidiennement des ZaniHash."),
    };
  } else if (currentUser.locale != null && currentUser.locale == "pt"){
    errLocalized = {
      "internal": new CustomError(500,1, "Erreur Interne", ""),
      "grid_max_play": new CustomError(500, -1, "Limite de acerto", "Você atingiu o limite de grades jogáveis ​​para este ticket."),
      "insufficient_zanihash": new CustomError(500,-1, "Equilíbrio inadequado", "Você não tem ZaniHash suficiente para participar deste torneio! Junte-se ao programa ZaniAnalytics para receber diariamente o ZaniHash."),
    };
  } else {
    errLocalized = {
      "internal": new CustomError(500,1, "Internal Error", ""),
      "grid_max_play": new CustomError(500, -1, "Limit Reach", "You have already play all your grids for this ticket."),
      "insufficient_zanihash": new CustomError(500,-1, "Insufficient Fund", "Vous n'avez pas assé de ZaniHash pour participer à ce tournoi ! Rejoignez le programme ZaniAnalytics pour recevoir quotidiennement des ZaniHash."),
    };
  }
  var ipAddr = req.headers["x-forwarded-for"];
  if (ipAddr){
    var list = ipAddr.split(",");
    ipAddr = list[list.length-1];
  } else {
    ipAddr = req.connection.remoteAddress;
  }

  //return res.status(500).json(errLocalized["1"]);

  var ticketId = req.body.gameTicket;
  var bets = req.body.bets;
  var instanceId = req.body.instanceId;
  var advertisingId = req.body.advertisingId;

  if (instanceId == null){
    instanceId = "";
  }

  if (advertisingId == null){
    advertisingId = "";
  }

  if (bets != null){
    // Paw conversion string to json
    if (typeof bets == 'string'){
      bets = JSON.parse(bets);
    }
  } else {
    return res.status(500).json(errLocalized["internal"]);
  }

  async.waterfall([
    // Vérifier si le ticket est disponible
    function(done){
      GameTicket.findOne({ _id: ticketId, openDate: { $lt: currentDate }, limitDate: { $gt: currentDate } })
      .populate('fixtures')
      .then(function(gameticket){
        if (gameticket == null){
          return done(errLocalized["internal"]);
        } else {
          // Vérifier que l'utilisateur possède suffisament de ZaniHash
          if (currentUser.wallet.zaniHash < gameticket.tournament.playCost){
            return done(errLocalized["insufficient_zanihash"]);
          }
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
          done(errLocalized["grid_max_play"]);
        }
      });
    },

    // Vérifier la validité des paris
    function(gameticket, done){
      async.eachLimit(gameticket.fixtures, 1, function(fixture, eachFixture){
        // Vérifier si le match d'un paris effectué existe
        var bet = bets.filter(e => e.fixture == fixture._id);
        if (bet.length > 0){
          /// Vérifier qu'il s'agit bien d'un paris 1N2
          if (bet[0].result <= 2 && bet[0].result >= 0){
            eachFixture();
          } else {
            eachFixture("Grille corrompue, le paris effectué n'est pas correct : " + bet[0].result);
          }
        } else {
          eachFixture("Grille corrompue : Un ou plusieurs paris sont manquant.");
        }
      }, function(err){
        if (err) {
          console.log(err);
          return done(errLocalized["internal"]);
        }
        return done(null, gameticket);
      });
    },

    // Créer une transaction pour la validation d'une grille
    function(gameticket, done){
      console.log("Création d'une transaction : Play-Tournament");
      Transaction.create({ createdAt: moment().utc().toDate(),
        updatedAt: moment().utc().toDate(),
        type: "Play-Tournament",
        description: gameticket.name,
        source: currentUser._id,
        sourceKind: "User",
        destination: gameticket._id,
        destinationKind: "GameTicket",
        amount: parseInt(gameticket.tournament.playCost) - parseInt(gameticket.tournament.playCost*2),
        status: "initial",
        currency: "ZaniHash"
      }, function(err, result){
        if (err){
          return done(err);
        } else {
          return done(null, gameticket);
        }
      });
    },

    // Récupérer la transaction dernièrement créé pour la grille et commencer à procéder à son traitement
    function(gameticket, done){
      var _transaction;
      Transaction.findOne({ type: "Play-Tournament", source: currentUser._id, destination: gameticket._id, status: "initial" }).exec()
      .then(function(transaction){
        if (transaction == null) throw "La transaction n'existe pas";
        _transaction = transaction;
        //console.log(_transaction);
        return Transaction.updateOne({ _id: transaction._id, status: "initial" }, { $set: { status: "pending", updatedAt: moment().utc().toDate() } }).exec();
      }).then(function(result){
        if (result.nModified == 1){
          // Décréditer l'utilisateur
          //var negativeCost = gameticket.tournament.playCost-(gameticket.tournament.playCost*2);
          return User.updateOne({ _id: currentUser._id, pendingTransactions: { $ne: _transaction._id }, "wallet.zaniHash": { $gt: gameticket.tournament.playCost } }, { $inc: { "wallet.zaniHash": parseInt(_transaction.amount) }, $push: { pendingTransactions: _transaction._id } }).exec();
        } else {
          throw "Impossible d'initier la transaction : " + _transaction._id;
        }
      }).then(function(result){
        if (result.nModified == 1){
          // L'utilisateur a été décrédité
          return Transaction.updateOne({ _id: _transaction._id, status: "pending" }, { $set: { updatedAt: moment().utc().toDate(), status: "applied" } }).exec();
        } else {
          throw "Impossible de décréditer le compte de l'utilisateur : " + currentUser._id;
        }
      }).then(function(result){
        if (result.nModified == 1){
          return done(null, gameticket, _transaction);
        } else {
          throw "Impossible de finaliser la transaction ! L'utilisateur a été décrédité, mais ça grille ne sera pas créé !";
        }
      }, function(err){
        console.log(err);
        return done(err);
      });
    },

    // Créer une grille
    function(gameticket, transaction, done){
      console.log("Création de la grille");
      for (var i = 0; i < bets.length; i++){
        bets[i].type = "1N2";
      }
      Grille.create({ gameTicket : gameticket._id, user: currentUser._id, bets: bets, status: 'waiting_result', type: 'TOURNAMENT', reference: uniqid('GR-TOURN-'), ip: ipAddr, instanceId: instanceId, advertisingId: advertisingId, "standing.id": currentUser.username }, function(err, grille){
        if (err) return done(errLocalized["internal"]);
        return done(null, grille, transaction);
      });
    },

    // Finaliser la transaction
    function(grille, transaction, done){
      User.updateOne({ _id: transaction.source }, { $pull: { pendingTransactions: transaction._id } }).exec().then(function(result){
        if (result.nModified == 1){
          return Transaction.updateOne({ _id: transaction._id, status: "applied" }, { $set: { updatedAt: moment().utc().toDate(), status: "done" } }).exec();
        } else {
          throw 'Impossible de retirer une transaction applied du compte de l\'utilisateur';
        }
      }).then(function(result){
        if (result.nModified == 1){
          return done(null, grille);
        } else {
          throw 'Impossible de finaliser une transaction.';
        }
      }, function(err){
        console.log(err);
        return done(null, grille);
      });
    },

    /*
    Mettre à jour les stats du tournoi
    - Ajouter un participant
    - Augmenter le pot
    - Mettre à jour le nombre de joueur payable
    */
    function(grille, done){
      GameTicket.findOne({ _id: grille.gameTicket }, function(err, gameticket){
        if (err) return done(null, grille);
        var tournament = gameticket.tournament;
        var totalPlayersPaid = ((parseInt(tournament.totalPlayers)+1)*parseInt(tournament.sharing)/100).toFixed(0);
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
        // Vérifier si la validation de la grille provoque l'activation du bonus
        if ((parseInt(tournament.totalPlayers)+1) == parseInt(gameticket.bonusActivation)){
          pot = parseInt(pot) + parseInt(gameticket.bonus);
          console.log('Pot with bonus :', pot);
        }

        GameTicket.updateOne({ _id: grille.gameTicket }, { $inc: { "tournament.totalPlayers": 1, "tournament.pot": parseInt(pot) }, $set: { "tournament.totalPlayersPaid": parseInt(totalPlayersPaid) } }, function(err, result){
          if (err){
            return done(null, grille);
          } else {
            if (result.nModified == 0){

            }
            return done(null, grille);
          }
        });

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
