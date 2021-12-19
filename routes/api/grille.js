var express = require('express');
var mongoose = require('mongoose');
var router = express.Router();
var passport = require('passport');
var moment = require('moment');
var requestify = require('requestify');
var mongojs = require('mongojs');
var async = require('async');
var crypto = require('crypto');
var util = require('util');
var uniqid = require('uniqid');

var Client = mongoose.model('Client');
var Competition = mongoose.model('Competition');
var Team = mongoose.model('Team');
var Fixture = mongoose.model('Fixture');
var GameTicket = mongoose.model('GameTicket');
var Grille = mongoose.model('Grille');
var User = mongoose.model('User');

router.get('/grille/validate', function(req, res){
  var data1 = req.query.data1;
  var data2 = req.query.data2;
  var encryptionKey = "Eo97386%U@^w";

  var keyBytes = crypto.createHash('sha256').update(encryptionKey, 'utf-8').digest();
  var ivBytes = Buffer.from(data1, "hex");
  var cipher = crypto.createDecipheriv('aes-256-cbc', keyBytes, ivBytes);
  var decrypted = cipher.update(data2, 'hex', 'utf8') + cipher.final('utf8');
  var queryString = require('querystring');
  var queryParams = queryString.parse(decrypted)

  //User ID set using Appodeal.getUserSettings(this).setUserId("User#123") method in your app
  var userId = queryParams["user_id"];
  //Reward amount
  var amount = queryParams["amount"];
  //Reward currency
  var currency = queryParams["currency"];
  //Unique impression ID in the UUID form
  var impressionId = queryParams["impression_id"];
  //Timestamp of the impression
  var timestamp = queryParams["timestamp"];
  //Hash of the data used for validity confirmation
  var hash = queryParams["hash"];

  //Hash of the data calculation
  var hashString = crypto.createHash('sha1').update(util.format("user_id=%s&amount=%s&currency=%s&impression_id=%s&timestamp=%s", userId, amount, currency, impressionId, timestamp)).digest('hex');
  //If hashes match impression is valid
  if (hash.toUpperCase() === hashString.toUpperCase()) {
    async.parallel([
      // Valider la dernière grille créé par l'utilisateur
      function(callback){
        Grille.findOneAndUpdate({ user: userId, status: 'waiting_validation' }, { $set: { status: 'waiting_result', impressionId: impressionId } }, { sort: { createdAt: -1 } }, function(err, result){
          if (err) return callback(null, err);
          User.updateOne({ _id: userId }, { $inc: { "stats.totalGridMatchday": 1 } }, function(err, result){
            callback(null, result);
          });
        });
      },
      // Vérifier si des jetons sont attentes de crédit
      function(callback){
        User.findOne({ _id: userId, transaction: { $exists: true } },function(err, user){
          //console.log(user);
          if (user == null) return callback(null, "");
          if (err) return callback(null, err);
          User.update({ _id: user._id }, { $inc: { jeton: user.transaction.amount }, $unset: { transaction: "" }, $set: { lastJetonAds: moment().utc() } }, function(err, result){
            if (err) return callback(null, err);
            callback(null, result);
          });
        });
      }
    ], function(err, results){
      if (err){
        console.log(err);
        return res.status(500).json("KO");
      } else {
        return res.status(200).json("OK");
      }
    });
  } else {
    console.log("INVALID VALIDATION HASH");
    return res.status(500).json("KO");
  }
});

// Récupérer toutes les grilles jouées (filtre) [waiting_result / loose / win]
router.get('/grilles', passport.authenticate('bearer', { session: false }), function(req, res){
  var currentUser = req.user;
  var queryStatus = req.query.status;
  //console.log(queryStatus, currentUser);

  var grilleQuery = Grille.find({ user: currentUser._id, status: queryStatus, type: "MULTI" }, { user: 0 });
  if (queryStatus == "waiting_result"){
    grilleQuery.sort({ createdAt: -1 });
  } else if (queryStatus == "loose"){
    grilleQuery.sort({ updatedAt: -1 });
  } else if (queryStatus == "win"){
    grilleQuery.sort({ updatedAt: -1 });
  }

  grilleQuery.populate({ path: 'gameTicket', populate: { path: 'fixtures', populate: { path: 'homeTeam awayTeam' } } }).then(function(grilles){
    // Compter le nombre de grille jouer pour un ticket
    async.groupBy(grilles, function(grille, done){
      return done(null, grille.gameTicket._id);
    }, function(err, result){
      //console.log(result);
      if (err) return res.status(500).json(err);
      var grilleArr = [];
      //console.log('res', Object.keys(result).length);
      for (var z = 0; z < grilles.length; z++){
        for (var i = 0; i < Object.keys(result).length; i++){
          //console.log('res', result[Object.keys(result)[i]][0].gameTicket._id);
          if (String(grilles[z].gameTicket._id) === String(result[Object.keys(result)[i]][0].gameTicket._id)){
            var convertedJSON = JSON.parse(JSON.stringify(grilles[z]));
            convertedJSON.gameTicket.numberOfGrillePlay = result[Object.keys(result)[i]].length;
            grilleArr.push(convertedJSON);
          }
        }
      }
      //console.log(grilleArr.length);
      return res.status(200).json(grilleArr);
    });
  }, function(err){
    //console.log(err);
    return res.status(500).json(new CustomError(500, -1, "Erreur Interne", "Une erreur interne c'est produite, merci de réesayer ultérieurement ou contacter le support si le problème persiste."));
  });
});

// Créer une grille
router.post('/grille', passport.authenticate('bearer', { session: false }), function(req, res){
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
      Grille.create({ gameTicket : gameticket._id, user: currentUser._id, bets: bets, status: 'waiting_validation', type: "MULTI", reference: uniqid('GR-MUL-'), ip: ipAddr }, function(err, grille){
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

router.put('/grille/:grilleId/cancel', passport.authenticate('bearer', { session: false }), function(req, res){
  var paramGrilleId = req.params.grilleId;
  var currentUser = req.user;

  Grille.update({ _id: paramGrilleId, status: 'waiting_validation', user: currentUser._id }, { $set: { status: 'canceled' } }, function(err, result){
    if (err) return res.status(500).json(err);
    //console.log(result);
    res.status(200).json("OK");
  });
});

module.exports = router;
