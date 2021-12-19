// If we are dev env, load dotenv
if (process.env.NODE_ENV != "production"){
  require('dotenv').config();
}

var MongoClient = require('mongodb').MongoClient;
var async = require('async');
var moment = require('moment');
var GCM = require('../lib/gcm');

const chalk = require('chalk');
const chalkInit = chalk.bold.green;
const chalkTask = chalk.bold.cyan;
const chalkDone = chalk.bold.blue;
const chalkError = chalk.bold.red;
const chalkWarning = chalk.bold.yellow;


/*
** Ouvrir les tickets dont la date d'ouverture est dépassé
** Mettre en attente de résultat les ticket dont la date limite de jeu est atteinte
** Terminer les tickets dont tous les matchs sont finis
*/
var updateTicketWorker = function(db){
  return new Promise(function(resolve, reject){

    var GameTicket = db.collection('gameTicket');
    var Fixture = db.collection('fixture');

    var currentDate = moment().utc();
    console.log("Current date:", currentDate.toDate());

    async.waterfall([
      // Vérifier la date des tickets simple actifs et à venir
      function(done){
        console.log(chalkTask("TASK : Vérification des dates pour les tickets de jeu SINGLE"));
        GameTicket.aggregate([
          {
            $match: { "type": "SINGLE", "status": { $in: ["open", "close", "waiting_result"] } }
          },
          { $sort: { openDate: 1 } },
          { $limit: 500 },
          /*{
          $unwind: "$fixtures"
        },*/
        {
          $lookup:
          {
            from: "fixture",
            localField: "fixtures",
            foreignField: "_id",
            as: "fixtures"
          }
        },
        {
          $match: { "fixtures": { $ne: [] } }
        }
      ], function(err, gametickets){
        //console.log(gametickets.length);
        //console.log(gametickets[0]);
        async.eachLimit(gametickets, 1, function(gameticket, eachGameTicket){
          var fixture = gameticket.fixtures[0];
          //console.log(chalkInit('Traitement du ticket :', gameticket.name, 'J' + gameticket.matchDay));
          //console.log('Current Fixture Date :', fixture.date, 'Open Date :',gameticket.openDate, 'Limit Date :', gameticket.limitDate, 'Result Date :', gameticket.resultDate);
          var openDate = moment(fixture.date).utc().subtract(3, 'day').startOf('day');
          var limitDate = moment(fixture.date).utc();
          var resultDate = moment(fixture.date).utc().add(3, 'hours');
          var errorOccur = false;
          var updatedStatus = gameticket.status;
          //console.log('Correct Open Date :', openDate, 'Limit Date :', limitDate, 'Result Date :', resultDate);
          if ( !openDate.isSame(moment(gameticket.openDate).utc()) ){
            //console.log(chalkWarning("La date d'ouverture du ticket est obsolète."));
            errorOccur = true;
          }

          if ( !limitDate.isSame(moment(gameticket.limitDate).utc()) ){
            //console.log(chalkWarning("La date limite de jeu du ticket est obsolète."));
            errorOccur = true;
          }

          if ( !resultDate.isSame(moment(gameticket.resultDate).utc()) ){
            //console.log(chalkWarning("La date de résultat du ticket est obsolète."));
            errorOccur = true;
          }

          if ( errorOccur ){
            if ( gameticket.status == "close" ){
              if ( limitDate < moment().utc() ){
                console.log("Changer le status du ticket de close -> waiting_result");
                updatedStatus = "waiting_result";
              }
            } else if (gameticket.status == "open"){
              if ( limitDate < moment().utc() ){
                console.log("Changer le status du ticket de open -> waiting_result");
                updatedStatus = "waiting_result";
              }
            } else if ( gameticket.status == "waiting_result" ){

            }

            //console.log(chalkWarning("Mettre à jour les dates du ticket :", gameticket.name, 'J' + gameticket.matchDay, gameticket._id));
            //console.log('Current Fixture Date :', fixture.date, 'Open Date :',gameticket.openDate, 'Limit Date :', gameticket.limitDate, 'Result Date :', gameticket.resultDate);
            //console.log('Correct Open Date :', openDate, 'Limit Date :', limitDate, 'Result Date :', resultDate);
            GameTicket.updateOne({ _id: gameticket._id }, { $set: { openDate: openDate.toDate(), limitDate: limitDate.toDate(), resultDate: resultDate.toDate(), status: updatedStatus } }, function(err, result){
              if (err){
                return eachGameTicket(err);
              } else {
                if (result.result.nModified == 1) console.log("Les dates du ticket ont été modifiées.");
                return eachGameTicket();
              }
            });
          } else {
            return eachGameTicket();
          }
        }, function(err){
          if (err){
            return done(err);
          } else {
            return done();
          }
        });
      });
    },

    // Vérifier la date des tickets MATCHDAY actifs et à venir
    function(done){
      console.log(chalkTask("TASK : Vérification des dates pour les tickets de jeu MATCHDAY"));
      GameTicket.aggregate([
        {
          $match: { "type": "MATCHDAY", "status": { $in: ["open", "close", "waiting_result"] }, "competition": { $ne: "MULTILEAGUE" } }
        },
        { $sort: { openDate: 1 } },
        { $limit: 500 },
        /*{
        $unwind: "$fixtures"
      },*/
      {
        $lookup:
        {
          from: "fixture",
          localField: "fixtures",
          foreignField: "_id",
          as: "fixtures"
        }
      },
      {
        $match: { "fixtures": { $ne: [] } }
      }
    ], function(err, gametickets){
      //console.log(gametickets.length);
      //console.log(gametickets[0]);
      //return done("stop");
      async.eachLimit(gametickets, 1, function(gameticket, eachGameTicket){
        //console.log(chalkInit("Traitement du ticket", gameticket._id));
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

        //console.log('Correct Open Date :', openDate, 'Limit Date :', limitDate, 'Result Date :', resultDate);
        /*if ( !openDate.isSame(moment(gameticket.openDate).utc()) ){
        console.log("La date d'ouverture du ticket est obsolète.");
        errorOccur = true;
      }*/

      if ( !limitDate.isSame(moment(gameticket.limitDate).utc()) ){
        //console.log(chalkWarning("La date limite de jeu du ticket est obsolète."));
        errorOccur = true;
      }

      if ( !resultDate.isSame(moment(gameticket.resultDate).utc()) ){
        //console.log(chalkWarning("La date de résultat du ticket est obsolète."));
        errorOccur = true;
      }

      var correctOpenDate = moment(firstFixture.date).utc().subtract(7, 'day');
      var newStatus = gameticket.status;
      if ( !correctOpenDate.isSame(moment(gameticket.openDate).utc()) ){
        errorOccur = true;
        if (gameticket.status == "open" && correctOpenDate > moment().utc().add(7, 'day')) {
          console.log("Mise à jour du status d'un ticket ouvert !");
          newStatus = "close";
        }
      }

      if ( errorOccur ){
        //console.log(chalkWarning("Mettre à jour les dates du ticket :", gameticket.name, gameticket._id, 'J' + gameticket.matchDay, 'Status :', gameticket.status));
        //console.log('First Fixture - Date :', firstFixture.date);
        //console.log('Last Fixture - Date :', lastFixture.date);
        //console.log('Current Open Date :',gameticket.openDate, 'Limit Date :', gameticket.limitDate, 'Result Date :', gameticket.resultDate);
        //console.log('Correct Limit Date :', limitDate, 'Result Date :', resultDate);

        if (gameticket.status == "waiting_result"){
          // Ne pas mettre à jour la date limite
          limitDate = moment(gameticket.limitDate).utc();
        } else if (gameticket.status == "open"){
          if (limitDate < moment(gameticket.limitDate).utc()){
            console.log("La bonne date limite est inférieure à la date défini");
          } else {
            // ne pas mettre à jour la date limite
            limitDate = moment(gameticket.limitDate).utc();
          }
        } else if (gameticket.status == "close"){

        }

        GameTicket.updateOne({ _id: gameticket._id, competition: { $ne: "MULTILEAGUE" } }, { $set: { openDate: correctOpenDate.toDate(), limitDate: limitDate.toDate(), resultDate: resultDate.toDate(), status: newStatus } }, function(err, result){
          if (err){
            return eachGameTicket(err);
          } else {
            if (result.result.nModified == 1) console.log("Les dates du ticket ont été modifiées.");
            //console.log(result.result);
            return eachGameTicket();
          }
        });
      } else {
        return eachGameTicket();
      }
    }, function(err){
      if (err){
        return done(err);
      } else {
        return done();
      }
    });
  });
},

// Vérifier la date des tickets MATCHDAY actifs et à venir
function(done){
  console.log(chalkTask("TASK : Vérification des dates pour les tickets de jeu TOURNAMENT"));
  GameTicket.aggregate([
    {
      $match: { "type": "TOURNAMENT", "status": { $in: ["open", "close", "waiting_result"] } }
    },
    { $sort: { openDate: 1 } },
    { $limit: 500 },
    {
      $lookup:
      {
        from: "fixture",
        localField: "fixtures",
        foreignField: "_id",
        as: "fixtures"
      }
    },
    {
      $match: { "fixtures": { $ne: [] } }
    }
  ], function(err, gametickets){
    //console.log(gametickets.length);
    //console.log(gametickets[0]);
    //return done("stop");
    async.eachLimit(gametickets, 1, function(gameticket, eachGameTicket){
      //console.log(chalkInit("Traitement du ticket", gameticket._id));
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

      //console.log('Correct Open Date :', openDate, 'Limit Date :', limitDate, 'Result Date :', resultDate);
      /*if ( !openDate.isSame(moment(gameticket.openDate).utc()) ){
      console.log("La date d'ouverture du ticket est obsolète.");
      errorOccur = true;
    }*/

    if ( !limitDate.isSame(moment(gameticket.limitDate).utc()) ){
      //console.log(chalkWarning("La date limite de jeu du ticket est obsolète."));
      errorOccur = true;
    }

    if ( !resultDate.isSame(moment(gameticket.resultDate).utc()) ){
      //console.log(chalkWarning("La date de résultat du ticket est obsolète."));
      errorOccur = true;
    }

    if ( errorOccur ){
      //console.log(chalkWarning("Mettre à jour les dates du ticket :", gameticket.name, gameticket._id, 'J' + gameticket.matchDay, 'Status :', gameticket.status));
      //console.log('First Fixture - Date :', firstFixture.date);
      //console.log('Last Fixture - Date :', lastFixture.date);
      //console.log('Current Open Date :',gameticket.openDate, 'Limit Date :', gameticket.limitDate, 'Result Date :', gameticket.resultDate);
      //console.log('Correct Limit Date :', limitDate, 'Result Date :', resultDate);

      if (gameticket.status == "waiting_result"){
        // Ne pas mettre à jour la date limite
        limitDate = moment(gameticket.limitDate).utc();
      } else if (gameticket.status == "open"){
        if (limitDate < moment(gameticket.limitDate).utc()){
          console.log("La bonne date limite est inférieure à la date défini");
        } else {
          // ne pas mettre à jour la date limite
          limitDate = moment(gameticket.limitDate).utc();
        }
      } else if (gameticket.status == "close"){

      }

      GameTicket.updateOne({ _id: gameticket._id }, { $set: { limitDate: limitDate.toDate(), resultDate: resultDate.toDate() } }, function(err, result){
        if (err){
          return eachGameTicket(err);
        } else {
          if (result.result.nModified == 1) console.log("Les dates du ticket ont été modifiées.");
          return eachGameTicket();
        }
      });
    } else {
      return eachGameTicket();
    }
  }, function(err){
    if (err){
      return done(err);
    } else {
      return done();
    }
  });
});
},

// Ouvrir les tickets
function(done){
  console.log(chalkTask("TASK : Ouverture des tickets"));
  GameTicket.find({ status: "close", openDate: { $lt: currentDate.toDate() }, active: true }).toArray().then(function(gametickets){
    //console.log(gametickets);
    // Mettre à jour chaque ticket
    async.eachLimit(gametickets, 1, function(gameticket, eachGameTicket){
      GameTicket.findOneAndUpdate({ _id: gameticket._id }, { $set: { updatedAt: moment().utc().toDate(), "status": "open" } }, { returnOriginal: false }, function(err, result){
        if (err) return eachGameTicket(err);
        // Vérifier si ll s'agit bien de la première ouverture du ticket, pour envoyer une notification push
        if (result.value != null && result.value.status != gameticket.status && result.value.limitDate > currentDate && result.value.type == "MATCHDAY"){
          var topic_global = "topic_open_gameticket_" + result.value.competition.toLowerCase();
          var topic_en = "topic_open_gameticket_en_" + result.value.competition.toLowerCase();
          var topic_fr = "topic_open_gameticket_fr_" + result.value.competition.toLowerCase();
          var topic_pt = "topic_open_gameticket_pt_" + result.value.competition.toLowerCase();

          console.log("Envoi d'une notification push pour prévenir les utilisateurs qu'un nouveau ticket est disponible. Topic:", topic_global);
          var topics = {
            "GLOBAL": { subject: "ZaniBet", message: "The " + result.value.name +" J"+ result.value.matchDay +" ticket is available! Validate your prediction grids and win a part of the "+ result.value.jackpot +"€ jackpot." },

            "FR": { subject: "ZaniBet", message: "Le ticket " + result.value.name +" J"+ result.value.matchDay +" est disponible ! Validez vos grilles et remporter une partie du jackpot de "+ result.value.jackpot +"€" },

            "EN": { subject: "ZaniBet", message: "The " + result.value.name +" J"+ result.value.matchDay +" ticket is available! Validate your prediction grids and win a part of the "+ result.value.jackpot +"€ jackpot." },

            "PT": { subject: "ZaniBet", message: "O ingresso do " + result.value.name +" J"+ result.value.matchDay +" está disponível ! Valide suas redes de previsão e ganhe parte do jackpot de "+ result.value.jackpot +"€" }
          };

          // Envoyer le message en français
          GCM.sendTopicMessage(topic_fr, topics["FR"].subject, topics["FR"].message).then(function(success){
            // Envoyer le message dans la langue global (old version)
            return GCM.sendTopicMessage(topic_global, topics["GLOBAL"].subject, topics["GLOBAL"].message);
          }).then(function(sucess){
            // Envoyer le messag en anglais
            return GCM.sendTopicMessage(topic_en, topics["EN"].subject, topics["EN"].message);
          }).then(function(success){
            // Envoyer le message en portugais
            return GCM.sendTopicMessage(topic_pt, topics["PT"].subject, topics["PT"].message);
          }).then(function(success){
            console.log("Nouvelle ouverture du ticket", result.value.name, " - Status:", result.value.status, ' - Date Limite:', result.value.limitDate);
            eachGameTicket();
          }, function(err){
            console.log("Échec lors de l'envoi de la notification d'ouverture du ticket", result.value.name);
            eachGameTicket();
          });
          //eachGameTicket();
        } else if (result.value != null && result.value.status != gameticket.status && result.value.limitDate > currentDate && result.value.type == "TOURNAMENT"){
          eachGameTicket();
        } else {
          // Le ticket n'est pas ouvert pour la première fois, donc passer son chemin
          console.log("Ré-ouverture du ticket", result.value.name, " - Status:", result.value.status, ' - Date Limite:', result.value.limitDate);
          eachGameTicket();
        }
      });
    }, function(err){
      if (err) return done(err);
      done(null);
    });
  });
},

// Mettre les tickets en attente de résultat
function(done){
  console.log(chalkTask("TASK : Mise en attente des tickets"));
  GameTicket.find({ status: "open", limitDate: { $lt: currentDate.toDate() }, active: true }).toArray().then(function(gametickets){
    // Mettre à jour chaque ticket
    async.eachLimit(gametickets, 1, function(gameticket, eachGameticket){
      GameTicket.findOneAndUpdate({ _id: gameticket._id }, { $set: { updatedAt: moment().utc().toDate(), "status": "waiting_result" } }, { returnOriginal: false }, function(err, result){
        if (err) return eachGameticket(err);
        //console.log("En attente de résultat pour le ticket", result.value.name, " - Status:", result.value.status, ' - Date des résultats:', result.value.resultDate);
        eachGameticket();
      });
    }, function(err){
      if (err) return done(err);
      done(null);
    });
  });
},

// Trouver les tickets en attente de vérification de résultat
function(done){
  console.log(chalkTask("TASK : Vérification des résultats des tickets"));
  GameTicket.find({ status: "waiting_result", resultDate: { $lt: currentDate.toDate() }, active: true }).toArray().then(function(gametickets){
    // Mettre à jour chaque ticket
    console.log("Nombre de ticket en attente de résultat :", gametickets.length);
    async.eachLimit(gametickets, 1, function(gameticket, eachGameticket){
      console.log(chalkInit("Traitement du ticket", gameticket.name, gameticket._id));
      Fixture.find({ _id: { $in: gameticket.fixtures } }).toArray().then(function(fixtures){
        // Vérifier si tous les matchs sont terminés
        async.eachLimit(fixtures, 1, function(fixture, eachFixture){
          if (fixture.status != "done" && fixture.status != "canceled" && fixture.status != "postphoned"){
            //console.log("Un match contenu dans le ticket", gameticket.type ,gameticket.name ,"J:", fixture.matchDay ,"n'a pas encore de resultat:", fixture._id, fixture.status, fixture.date, fixture.api.sportmonks);
            return eachFixture("Un match contenu dans le ticket n'a pas encore de resultat:" + fixture._id);
          }

          if (fixture.status == "canceled"){
            //console.log("Un match contenu dans le ticket", gameticket.type ,gameticket.name ,"J:", fixture.matchDay ,"est annulé:", fixture._id, fixture.status, fixture.date);
            return eachFixture();
          }

          if (fixture.status == "postphoned"){
            if (gameticket.type == "TOURNAMENT"){
              //console.log("Un match contenu dans le ticket", gameticket.type ,gameticket.name ,"J:", fixture.matchDay ,"est reporté:", fixture._id, fixture.status, fixture.date);
              return eachFixture();

            } else {
              //console.log("Un match contenu dans le ticket", gameticket.type ,gameticket.name ,"J:", fixture.matchDay ,"n'a pas encore de resultat car il est reporté :", fixture._id, fixture.status, fixture.date, fixture.api.sportmonks);
              return eachFixture("Un match contenu dans le ticket n'a pas encore de resultat:" + fixture._id);
            }
          }

          if (gameticket.passFixtureCheck == true){
            console.log("Ne pas vérifier les résultats du match par rapport aux évènements.");
            return eachFixture();
          }

          //console.log("Vérification des résultats du match par rapport aux évènements enregistrés.");
          // Vérifier que le score est valide par rapport aux évènements récupérés
          if (fixture.events == null || fixture.events.length == 0){
            console.log(chalkError("ERREUR FATAL : Il n'y a aucun évènement enregistrés pour le match !", fixture._id));
            return eachFixture("ERREUR FATAL : Il n'y a aucun évènement enregistrés pour le match !");
          }

          var homeGoal = fixture.events.filter(ev => ev.type == "goal" && ev.team.equals(fixture.homeTeam)
          || ev.type == "penalty" && ev.team.equals(fixture.homeTeam)
          || ev.type == "own-goal" && ev.team.equals(fixture.homeTeam) ).length;

          var awayGoal = fixture.events.filter(ev => ev.type == "goal" && ev.team.equals(fixture.awayTeam)
          || ev.type == "penalty" && ev.team.equals(fixture.awayTeam)
          || ev.type == "own-goal" && ev.team.equals(fixture.awayTeam)).length;

          if (fixture.result.homeScore != homeGoal){
            console.log("Home:", homeGoal, "Away:", awayGoal);
            console.log(chalkError("ERREUR FATAL : Le score enregistré pour l'équipe à domicile ne correspond pas aux évènements ! Match :", fixture._id, fixture.api.sportmonks));

            return eachFixture("ERREUR FATAL : Le score enregistré pour l'équipe à domicile ne correspond pas aux évènements ! Match:" + fixture._id);
          } else if (fixture.result.awayScore != awayGoal){
            console.log("Home:", homeGoal, "Away:", awayGoal);
            console.log(chalkError("ERREUR FATAL : Le score enregistré pour l'équipe extérieur ne correspond pas aux évènements ! Match :", fixture._id, fixture.api.sportmonks));

            return eachFixture("ERREUR FATAL : Le score enregistré pour l'équipe extérieur ne correspond pas aux évènements ! Match:" + fixture._id);
          }

          return eachFixture();
        }, function(err){
          // Error handler eachFixture
          if (err) return eachGameticket();
          // Si le ticket est de type SINGLE, récupérer les résultats des différents type de comparaisons
          if (gameticket.type == "SINGLE" && fixtures[0].status != "canceled"){
            console.log(chalkInit("Vérification des paris pour le ticket simple", gameticket.name, "prévu le", fixtures[0].date));
            var betsType = [];
            var homeScored = (fixtures[0].result.homeScore > 0) ? true : false;
            var awayScored = (fixtures[0].result.awayScore > 0) ? true : false;
            var totalScore = fixtures[0].result.homeScore + fixtures[0].result.awayScore;
            gameticket.betsType.forEach(function(betType){
              if (betType.type == "1N2"){
                betType.result = fixtures[0].result.winner;
                betsType.push(betType);
              } else if (betType.type == "BOTH_GOAL"){
                if (!homeScored && !awayScored){
                  betType.result = 0;
                } else if (homeScored && awayScored){
                  betType.result = 1;
                } else {
                  betType.result = 0;
                }
                betsType.push(betType);
              } else if (betType.type == "FIRST_GOAL"){
                console.log("Score du match:", fixtures[0].result.homeScore, fixtures[0].result.awayScore);
                if (!homeScored && !awayScored){
                  betType.result = 0;
                } else {
                  //console.log('Events', fixtures[0].events);
                  var eventsFilter = fixtures[0].events.filter(ev => ev.type == "goal" || ev.type == "penalty");
                  eventsFilter.sort(function(a, b){
                    return a.minute - b.minute;
                  });

                  if (eventsFilter == null || eventsFilter.length == 0){
                    console.log(chalkWarning("Bug : L'évènement de but n'est pas disponible"));
                    if (fixtures[0].result.homeScore > fixtures[0].result.awayScore){
                      betType.result = 1;
                    } else if (fixtures[0].result.awayScore > fixtures[0].result.homeScore){
                      betType.result = 2;
                    } else {
                      betType.result = 0;
                    }
                  } else {
                    if (eventsFilter[0].team.equals(fixtures[0].homeTeam)){
                      betType.result = 1;
                    } else if (eventsFilter[0].team.equals(fixtures[0].awayTeam)){
                      betType.result = 2;
                    }
                  }
                }
                betsType.push(betType);
              } else if (betType.type == "LESS_MORE_GOAL"){
                if (totalScore > 2){
                  betType.result = 1;
                } else {
                  betType.result = 0;
                }
                betsType.push(betType);
              }
            });

            // Tous les matchs du ticket sont terminés, changer le status du ticket de jeu
            GameTicket.findOneAndUpdate({ _id: gameticket._id }, { $set: { updatedAt: moment().utc().toDate(), status: 'ended', betsType: betsType } }, { returnOriginal: false}, function(err, result){
              if (err) return eachGameticket();
              console.log("Tous les résultats du ticket simple", result.value.name, "sont disponibles. - Status:", result.value.status);
              eachGameticket();
            });
          } else if (gameticket.type == "SINGLE" && fixtures[0].status == "canceled"){
            GameTicket.findOneAndUpdate({ _id: gameticket._id }, { $set: { updatedAt: moment().utc().toDate(), status: 'canceled' } }, { returnOriginal: false}, function(err, result){
              if (err) return eachGameticket();
              console.log("Annulation du ticket de jeu simple", result.value.name, "- Status:", result.value.status);
              eachGameticket();
            });
          } else {
            // Tous les matchs du ticket sont terminés, changer le status du ticket de jeu
            GameTicket.findOneAndUpdate({ _id: gameticket._id }, { $set: { updatedAt: moment().utc().toDate(), status: 'ended' } }, { returnOriginal: false}, function(err, result){
              if (err) return eachGameticket();
              console.log("Tous les résultats du ticket multi", result.value.name, "sont disponibles. - Status:", result.value.status);
              eachGameticket();
            });
          }
        });
      }, function(err){
        console.log("Une erreur est survenue, lors de la récupération des fixtures du ticket de jeu", err);
        eachGameticket();
      });
    }, function(err){
      // Error handler eachGameticket
      if (err) return done(err);
      done(null);
    });
  });
}

], function(err, result){
  if (err) return reject(err);
  resolve(result);
});
});
};

// Use connect method to connect to the server
MongoClient.connect(process.env.DB_URI, function(err, db) {
  console.log(chalkInit("Connected successfully to server"));
  console.log(chalkInit("-----> Start ticket_worker.js <-----"));
  updateTicketWorker(db).then(function(res){
    console.log(chalkDone("-----> Ticket Worker Job Done <-----"));
    db.close();
  }, function(error){
    console.log('Error occur:', error)
    db.close();
  });
});
