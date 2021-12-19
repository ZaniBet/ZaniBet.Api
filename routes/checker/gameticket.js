var express = require('express');
var mongoose = require('mongoose');
var router = express.Router();
var passport = require('passport');
var moment = require('moment');
var requestify = require('requestify');
var mongojs = require('mongojs');
var async = require('async');


var Client = mongoose.model('Client');
var Competition = mongoose.model('Competition');
var Team = mongoose.model('Team');
var Fixture = mongoose.model('Fixture');
var Grille = mongoose.model('Grille');
var GameTicket = mongoose.model('GameTicket');
var User = mongoose.model('User');
var Reward = mongoose.model('Reward');

router.get('/gametickets/single/checkDate', function(req, res){
  GameTicket.find({ status: { $in: ["close","open", "waiting_result"] }, type: "SINGLE" })
  .populate('fixtures')
  .sort({ openDate: 1 })
  .exec()
  .then(function(gametickets){
    console.log("Nombre de ticket à traîter:", gametickets.length);
    async.eachLimit(gametickets, 1, function(gameticket, eachGameTicket){
      var fixture = gameticket.fixtures[0];
      //console.log('Traitement du ticket :', gameticket.name, 'J' + gameticket.matchDay);
      //console.log('Current Fixture Date :', fixture.date, 'Open Date :',gameticket.openDate, 'Limit Date :', gameticket.limitDate, 'Result Date :', gameticket.resultDate);
      var openDate = moment(fixture.date).utc().subtract(1, 'day').startOf('day');
      var limitDate = moment(fixture.date).utc();
      var resultDate = moment(fixture.date).utc().add(3, 'hours');
      var errorOccur = false;
      var updatedStatus = gameticket.status;
      //console.log('Correct Open Date :', openDate, 'Limit Date :', limitDate, 'Result Date :', resultDate);
      if (!openDate.isSame(moment(gameticket.openDate).utc())){
        console.log("La date d'ouverture du ticket est obsolète.");
        errorOccur = true;
      }

      if (!limitDate.isSame(moment(gameticket.limitDate).utc())){
        console.log("La date limite de jeu du ticket est obsolète.");
        errorOccur = true;
      }

      if (!resultDate.isSame(moment(gameticket.resultDate).utc())){
        console.log("La date de résultat du ticket est obsolète.");
        errorOccur = true;
      }

      if (errorOccur){
        console.log("Mettre à jour les dates du ticket :", gameticket.name, 'J' + gameticket.matchDay, gameticket._id);
        console.log('Current Fixture Date :', fixture.date, 'Open Date :',gameticket.openDate, 'Limit Date :', gameticket.limitDate, 'Result Date :', gameticket.resultDate);
        console.log('Correct Open Date :', openDate, 'Limit Date :', limitDate, 'Result Date :', resultDate);
        return eachGameTicket();

        /*GameTicket.updateOne({ _id: gameticket._id }, { $set: { openDate: openDate, limitDate: limitDate, resultDate: resultDate, status: updatedStatus } }, function(err, result){
        if (err){
        return eachGameTicket(err);
      } else {
      console.log(result);
      return eachGameTicket();
    }
  });*/
} else {
  return eachGameTicket();
}
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


router.get('/gametickets/matchday/checkDate', function(req, res){
  var countError = 0;
  // Récupérer les tickets matchday ouvert et en attente de résultat
  GameTicket.find({ status: { $in: ["open", "waiting_result", "close"] }, type: "MATCHDAY", active: true })
  .populate('fixtures')
  .sort({ openDate: 1 })
  .exec()
  .then(function(gametickets){
    console.log("Nombre de ticket à traîter:", gametickets.length);
    async.eachLimit(gametickets, 1, function(gameticket, eachGameTicket){
      console.log("Traitement du ticket", gameticket._id);
      var fixtures = gameticket.fixtures;

      fixtures.sort(function(a, b){
        return a.date - b.date;
      });

      var firstFixture = fixtures[0];
      var lastFixture = fixtures[fixtures.length-1];

      var limitDate = moment(firstFixture.date).utc();
      var resultDate = moment(lastFixture.date).utc().add(2, 'hours');
      var errorOccur = false;
      var updatedStatus = gameticket.status;

      if (!limitDate.isSame(moment(gameticket.limitDate).utc())){
        console.log("La date limite de jeu du ticket est obsolète.");
        errorOccur = true;
      }

      if (!resultDate.isSame(moment(gameticket.resultDate).utc())){
        console.log("La date de résultat du ticket est obsolète.");
        errorOccur = true;
      }

      if (errorOccur){
        countError++;
        console.log("Mettre à jour les dates du ticket :", gameticket.name, gameticket._id, 'J' + gameticket.matchDay, 'Status :', gameticket.status);
        console.log('First Fixture - Date :', firstFixture.date);
        console.log('Last Fixture - Date :', lastFixture.date);
        console.log('Current Open Date :',gameticket.openDate, 'Limit Date :', gameticket.limitDate, 'Result Date :', gameticket.resultDate);
        console.log('Correct Limit Date :', limitDate, 'Result Date :', resultDate);

        if (gameticket.status == "waiting_result"){
          // Ne pas mettre à jour la date limite
          limitDate = moment(gameticket.limitDate).utc();
        } else if (gameticket.status == "open"){
          if (limitDate < moment(gameticket.limitDate).utc()){
            console.log("La bonne date limite est inférieure à la date défini");
          } else {
            // ne pas mettre à jour la date limite
            limitDate = gameticket.limitDate;
          }
        } else if (gameticket.status == "close"){

        }

        return eachGameTicket();

        /*GameTicket.updateOne({ _id: gameticket._id }, { $set: { limitDate: limitDate, resultDate: resultDate } }, function(err, result){
        if (err){
        return eachGameTicket(err);
      } else {
      console.log(result);
      return eachGameTicket();
    }
  });*/
} else {
  return eachGameTicket();
}
}, function(err){
  if (err){
    console.log(countError);
    return res.status(500).json(err);
  } else {
    console.log(countError);
    return res.status(200).json("OK");
  }
});
}, function(err){
  return res.status(500).json(err);
});
});


/*
* Vérifier que les matchs présents dans les tickets existes !
*/
router.get('/gametickets/checkFixtures', function(req, res){


  async.waterfall([
    function(done){
      GameTicket.find({ $or: [{ status: "ended"}] }, function(err, gametickets){
        if (err){
          return done(err);
        } else {
          console.log(gametickets.length);
          var fixtureArr = [];
          gametickets.forEach(gt => {
            fixtureArr = fixtureArr.concat(gt.fixtures);
          });
          console.log("Nombre de match à vérifier :", fixtureArr.length);

          var fixturesFiltered = [];
          fixtureArr.filter(function(f) {
            if(fixturesFiltered.indexOf(f) == -1){
              fixturesFiltered.push(f);
              return true;
            } else {
              return false;
            }
          });

          console.log("Nombre de match filtrés à vérifier :", fixturesFiltered.length);
          //return done("stop");
          return done(null, fixtureArr);
        }
      });
    },

    function(fixturesId, done){
      var corruptedFixtures = [];
      async.each(fixturesId, function(fixtureId, eachFixtureId){
        Fixture.findOne({ _id: fixtureId }, function(err, fixture){
          if (err){
            return eachFixtureId(err);
          } else if (fixture == null){
            console.log("ALERTE LE MATCH N'EXISTE PAS !", fixtureId);
            corruptedFixtures.push(fixtureId);
            return eachFixtureId();
          } else {
            return eachFixtureId();
          }
        });
      }, function(err){
        if (err){
          return done(err);
        } else {
          return done(null, corruptedFixtures);
        }
      });
    },

    function(corruptedFixtures, done){
      GameTicket.find({ fixtures: { $in: corruptedFixtures } }).exec().then(function(gametickets){
        console.log("Nombre de tickets devant être supprimés :", gametickets.length);
        if (gametickets.length == 0) throw "STOP";
        if (gametickets.filter(gt => gt.type == "MATCHDAY" || gt.type == "TOURNAMENT").length > 0){
          console.log(gametickets.filter(gt => gt.type == "MATCHDAY").length)
          throw "contain matchday";
        }
        return Grille.remove({ gameTicket: { $in: gametickets.map(gt => gt._id) } }).exec();
      }).then(function(result){
        console.log("Resultat de la suppression des grilles :", result);
        return GameTicket.remove({ fixtures: { $in: corruptedFixtures } }).exec();
      }).then(function(result){
        console.log("Resultat de la suppression des tickets :", result);
        return done(null);
      }, function(err){
        return done(err);
      });
    }

  ], function(err, result){
    if (err){
      return res.status(500).json(err);
    } else {
      return res.status(200).json(result);
    }
  });

});

module.exports = router;
