// If we are dev env, load dotenv
if (process.env.NODE_ENV != "production"){
  require('dotenv').config();
}

var MongoClient = require('mongodb').MongoClient;
var async = require('async');
var requestify = require('requestify');
var moment = require('moment');
var SportMonks = require('../../fetcher/sportmonks');

const chalk = require('chalk');
const chalkInit = chalk.bold.green;
const chalkDone = chalk.bold.blue;
const chalkError = chalk.bold.red;
const chalkWarning = chalk.bold.yellow;

var updateFixtureJob = function(db){
  return new Promise(function(resolve, reject){
    // Récupérer tous les matchs dont la date de commencement est dépassé et dont les résultats ne sont pas connus
    var Fixture = db.collection('fixture');
    var Competition = db.collection('competition');

    var currentDate = moment().utc();
    console.log("Current date:", currentDate);


    async.waterfall([

      /*
      * Récupérer les compétitions des derniers matchs passé et ceux à venir
      */
      function(done){
        var from = moment().utc().subtract(14, 'days');
        var to = moment().utc().add(14, 'days');
        Fixture.distinct('competition', { date: { $gt: from.toDate(), $lt: to.toDate() } }, function(err, competitionsId){
          if (err){
            console.log(err);
            return done(err);
          }
          console.log("Nombre de compétitions ayant des matchs :", competitionsId.length);
          return done(null, competitionsId);
        });
      },

      /*
      ** Pour chaque compétitions récupérer tous les matchs ayant eu lieu les 14
      ** derniers jours
      */
      function(competitionsId, done){
        Competition.find({ _id: { $in: competitionsId }, active: true, isCurrentSeason: true, "availableGames": { $elemMatch: { type: "SINGLE", active: true } } }).toArray(function(err, competitions){
          if (err){
            console.log("Error occur :", err);
            return done(err);
          }

          var fixturesToCheckArr = [];
          async.eachLimit(competitions, 1, function(competition, eachCompetition){
            var from = moment().utc().subtract(7, 'days').format("YYYY-MM-DD");
            var to = moment().utc().add(7, 'days').format("YYYY-MM-DD");
            SportMonks.getFixtureEventsForCompetition( competition, from, to ).then(function ( fixtures ){
              if (fixtures === null){
                console.log("Failled to found fixtures because no fixtures available :", competition.name);
                eachCompetition();
              } else {
                fixturesToCheckArr = fixturesToCheckArr.concat(fixtures);
                eachCompetition();
              }
            }, function(err){
              console.log("Failled to found fixtures for competition", competition.name);
              console.log(err);
              eachCompetition();
            });
          }, function(err){
            done(null, fixturesToCheckArr);
          });
        });
      },

      /*
      ** Créer un tableau contenant uniquement les ids des matchs à vérifier
      */
      function(fixturesToCheck, done){
        //console.log(fixturesToCheck);
        async.map(fixturesToCheck, function(fixture, mapFixture){
          mapFixture(null, parseInt(fixture.api.sportmonks));
        }, function(err, results){
          console.log("Nombre de matchs récupérés auprès du fournisseur:", results.length);
          done(null, fixturesToCheck, results);
        });
      },

      // Rechercher dans la base de donnée les matchs n'ayant pas de résultat,
      // et qui sont présent dans la liste à vérifier
      function(fixturesToCheck, fixturesId, done){
        //console.log(fixturesId);
        var startDate = moment().utc().add(7, 'days');
        Fixture.find({ date: { $lt: startDate.toDate() }, $or: [{status: 'playing'}, {status: 'soon'}, {status: 'postphoned'}], "api.sportmonks": { $in: fixturesId } }).toArray(function(err, fixtures){
          if (err){
            return done(err);
          }
          console.log("Il y a", fixtures.length, "à vérifier dans la base de données.");
          async.eachLimit(fixtures, 1, function(fixture, eachFixture){

            async.eachLimit(fixturesToCheck, 1, function(fixtureToCheck, eachFixtureToCheck){
              if (fixtureToCheck.api.sportmonks == fixture.api.sportmonks){
                if (fixtureToCheck.status != "NS"){
                  //console.log(chalkInit("Lancer la mise à jour du match, API ID :", fixture.api.sportmonks, "- Current Stutus :", fixture.status, "- API Status :", apiFixture.status, "- Equipes :", apiFixture.homeTeam.name, "-", apiFixture.awayTeam.name));
                }
                updateFixture(db, fixture, fixtureToCheck).then(function(updatedFixture){
                  //return eachFixtureToCheck("Stop");
                  process.nextTick(function() {
                    eachFixtureToCheck("Stop");
                  });
                }, function(err){
                  //console.log("Error occur when trying to update fixture");
                  //console.log(err);
                  process.nextTick(function() {
                    eachFixtureToCheck("Stop");
                  });
                });
              } else {
                process.nextTick(function() {
                  eachFixtureToCheck();
                });
              }
            }, function(err){
              process.nextTick(function() {
                eachFixture();
              });
            });
          }, function(err){
            return done(null);
          });
        });
      }
    ], function(err, result){
      if (err) return reject(err);
      resolve();
    });

  });
};


var updateFixture = function(db, fixture, apiFixture){
  return new Promise(function(resolve, reject){
    var Fixture = db.collection('fixture');

    var homeScore = apiFixture.result.homeScore;
    var awayScore = apiFixture.result.awayScore;
    var winner = null;
    var updateQuery = null;
    var events = [];
    var customEvents = [];
    var setCustomEvents = false;

    // Vérifier si il y a de nouveaux évènements à sauvegarder
    if (fixture.date < moment().utc()){
      if (apiFixture.events != null){
        if (fixture.events != null){
          apiFixture.events.forEach(function(event){
            if (fixture.events.filter(ev => ev.api.sportmonks === event.api.sportmonks).length == 0){
              if (event.team == "home"){
                event.team = fixture.homeTeam;
              } else if (event.team == "away") {
                event.team = fixture.awayTeam;
              }
              //console.log("Ajout d'un évènement", event.type, event.minute + "min", "pour le match", apiFixture.homeTeam, "vs", apiFixture.awayTeam);
              events.push(event);
            }
          });
        } else {
          apiFixture.events.forEach(function(event){
            if (event.team == "home"){
              event.team = fixture.homeTeam;
            } else if (event.team == "away") {
              event.team = fixture.awayTeam;
            }
            //console.log(event.api.sportmonks);
            //console.log("Ajout d'un évènement", event.type, event.minute + "min", "pour le match", apiFixture.homeTeam, "vs", apiFixture.awayTeam);
            events.push(event)
          });
        }
        //console.log("Il y a", events.length, " évènements à mettre à jour pour le match", fixture._id);
      }
    } else {
      //console.log("Le match n'a pas encore commencé, donc skip l'étape de vérification des évènements");
    }

    if ( fixture.status == "soon" && !moment(fixture.date).isSame(moment.unix(apiFixture.timestamp).utc().toDate()) ||
    fixture.status == "postphoned" && !moment(fixture.date).isSame(moment.unix(apiFixture.timestamp).utc().toDate()) ){
      console.log(chalkWarning("La date d'un match à venir n'est pas valide :", apiFixture.api.sportmonks, moment(fixture.date), apiFixture.date, moment.unix(apiFixture.timestamp).utc().toDate()));
      // Metre à jour la date du match
      updateQuery = Fixture.findOneAndUpdate({ _id: fixture._id }, { $set: {
        updatedAt: moment().utc().toDate(),
        date: moment.unix(apiFixture.timestamp).utc().toDate(),
        'result.homeScore': -1,
        'result.awayScore': -1,
        'result.winner': -1
      } }, { returnOriginal: false });
    } else if (fixture.status == 'playing' && apiFixture.status == 'LIVE'){
      // Mettre à jour les évènements du match en cours
      updateQuery = Fixture.findOneAndUpdate({ _id: fixture._id }, { $set: {
        updatedAt: moment().utc().toDate(),
        'result.homeScore': parseInt(homeScore),
        'result.awayScore': parseInt(awayScore)
      }, $push: { events: { $each: events } } }, { returnOriginal: false });
    } else if (apiFixture.status != 'POSTP' && apiFixture.status != 'TBA' && apiFixture.status != 'DELAYED' && fixture.status == "postphoned"){
      // Mettre à jour le status d'un match qui avait été reporté
      console.log(chalkInit("Mettre à jour un match qui avait été reporté."));
      updateQuery = Fixture.findOneAndUpdate({ _id: fixture._id }, { $set: {
        date: moment.unix(apiFixture.timestamp).utc().toDate(),
        updatedAt: moment().utc().toDate(),
        'result.homeScore': -1,
        'result.awayScore': -1,
        'result.winner': -1,
        'status': 'soon'
      } }, { returnOriginal: false });
    } else if (fixture.status == 'soon' && apiFixture.status == 'POSTP' || fixture.status == 'soon' && apiFixture.status == 'TBA' || fixture.status == 'soon' && apiFixture.status == 'DELAYED' ){
      // Le match est reporté
      console.log(chalkInit("Le match est reporté, mettre à jour la date de la rencontre et le status."));
      updateQuery = Fixture.findOneAndUpdate({ _id: fixture._id }, { $set: {
        status: 'postphoned',
        updatedAt: moment().utc().toDate(),
        date: moment.unix(apiFixture.timestamp).utc().toDate(),
        'result.homeScore': -1,
        'result.awayScore': -1,
        'result.winner': -1
      } }, { returnOriginal: false });
    } /*else if (fixture.status == 'playing' && apiFixture.status == 'CANCL'){
      // Le match était en cours, mais a été annulé, CE CAS N'EST PAS CENSÉ SE PRODUIRE
      updateQuery = Fixture.findOneAndUpdate({ _id: fixture._id }, { $set: {
      updatedAt: moment().utc().toDate(),
      'result.homeScore': parseInt(homeScore),
      'result.awayScore': parseInt(awayScore),
      'status': 'canceled'
    } }, { returnOriginal: false });
  }*/ else if (fixture.status == 'playing' && apiFixture.status == 'ABAN' || fixture.status == 'playing' && apiFixture.status == 'SUSP'
  || fixture.status == 'playing' && apiFixture.status == 'INT' || fixture.status == 'playing' && apiFixture.status == 'AWARDED'){
    // Le match était en cours, mais a été interrompu
    updateQuery = Fixture.findOneAndUpdate({ _id: fixture._id }, { $set: {
      updatedAt: moment().utc().toDate(),
      'result.homeScore': -1,
      'result.awayScore': -1,
      'status': 'postphoned'
    } }, { returnOriginal: false });
  } else if ( fixture.status == 'playing' && apiFixture.status == 'FT' || fixture.status == 'soon' && apiFixture.status == 'FT' ||
  fixture.status == 'playing' && apiFixture.status == 'AET' || fixture.status == 'soon' && apiFixture.status == 'AET' ||
  fixture.status == 'playing' && apiFixture.status == 'FT_PEN' || fixture.status == 'soon' && apiFixture.status == 'FT_PEN' || fixture.status == 'playing' && apiFixture.status == 'WO' || fixture.status == 'soon' && apiFixture.status == 'WO' ){
    // Le match est terminé
    console.log("Le match", apiFixture.homeTeam, "vs", apiFixture.awayTeam, "est terminé avec le score", homeScore, "-", awayScore, "ID :", apiFixture.api.sportmonks);

    // Vérifier que le score final est disponible
    if (apiFixture.result.fullScore == null){
      console.log(chalkError("Le score final n'existe pas !"));
      return eachFixture("stop");
    }

    // Récupérer le nombre de buts marqués par équipe
    console.log(chalkInit("Lancer la vérification des scores."));
    homeScore = parseInt(apiFixture.result.homeScore);
    awayScore = parseInt(apiFixture.result.awayScore);

    // Récupérer  les scores à la mi-temps et pour l'intégralité du match
    var halfTimeSplit = apiFixture.result.halfScore.split("-");
    var htHomeScore = parseInt(halfTimeSplit[0]);
    var htAwayScore = parseInt(halfTimeSplit[1]);

    var fullTimeSplit = apiFixture.result.fullScore.split("-");
    var ftHomeScore = parseInt(fullTimeSplit[0]);
    var ftAwayScore = parseInt(fullTimeSplit[1]);
    console.log("Résultat du match d'après le score de fin de match :", ftHomeScore, "-", ftAwayScore);

    if (ftHomeScore != homeScore || ftAwayScore != awayScore){
      console.log(chalkError("Le nombre de but marqué et le score final ne coresspondent pas pour l'une des équipes !"));
      if (fixture.result.auto) return reject("Le nombre de but marqué et le score final ne coresspondent pas pour l'une des équipes !");
    }

    console.log("Vérification de la validité du score avec l'utilisation des évènements.")
    if (fixture.events == null && events.length == 0){
      console.log("1 - ERREUR FATAL: Aucun évènement enregistrés pour le match!");
      return reject("Aucun évènement enregistré pour le match!");
    } else if(fixture.events != null && fixture.events.length == 0 && events.length == 0){
      console.log(chalkError("2 - ERREUR FATAL: Aucun évènement enregistrés pour le match!"));
      // Créer des évènements personnalisé pour passer la vérification
      customEvents = [];
      setCustomEvents = true;

      if (homeScore == 0 && awayScore == 0){
        console.log(chalkWarning("Il n'y a eu aucun but dans le match, donc créer un event custom pour passer la vérification"));
        customEvents.push({ team: fixture.homeTeam, type: "ZaniBet", minute: 0, custom: true });
        fixture.events = customEvents;
      } else {
        console.log(chalkWarning("Créer des évènements de buts pour les équipes concernées."));

        for (var ht = 0; ht < homeScore; ht++){
          console.log(chalkWarning("Ajout d'un évènement goal pour l'équipe à domicile."))
          customEvents.push({ team: fixture.homeTeam, type: "goal", minute: ht+1, custom: true });
        }

        for (var vt = 0; vt < awayScore; vt++){
          console.log(chalkWarning("Ajout d'un évènement goal pour l'équipe visiteuse."))
          customEvents.push({ team: fixture.awayTeam, type: "goal", minute: ht+2, custom: true });
        }
        fixture.events = customEvents;
        //return reject("Aucun évènement enregistré pour le match!");
      }
    } else if (apiFixture.events != null && apiFixture.events.length == 0 || apiFixture.events == null){
      console.log("3 - ERREUR FATAL: Aucun évènement enregistrés pour le match!");
      return reject("Aucun évènement enregistré pour le match!");
    }

    var homePendingGoal = 0;
    var awayPendingGoal = 0;
    var homeGoal = 0;
    var awayGoal = 0;

    if (fixture.events != null){
      // Calculer les buts par rapport aux évènements enregistrés
      homeGoal = fixture.events.filter(ev => ev.type == "goal" && ev.team.equals(fixture.homeTeam)
      || ev.type == "penalty" && ev.team.equals(fixture.homeTeam)
      || ev.type == "own-goal" && ev.team.equals(fixture.homeTeam)).length;

      awayGoal = fixture.events.filter(ev => ev.type == "goal" && ev.team.equals(fixture.awayTeam)
      || ev.type == "penalty" && ev.team.equals(fixture.awayTeam)
      || ev.type == "own-goal" && ev.team.equals(fixture.awayTeam)).length;
      console.log("Calcul des buts par rapport aux évènements enregistrés dans la BDD, domicile:", homeGoal, "extérieur:", awayGoal);
    }

    // Ajuster le calcul par rapport aux évènements en attentes
    homePendingGoal = events.filter(ev => ev.type == "goal" && ev.team.equals(fixture.homeTeam) && ev.minute != null
    || ev.type == "penalty" && ev.team.equals(fixture.homeTeam) && ev.minute != null
    || ev.type == "own-goal" && ev.team.equals(fixture.homeTeam) && ev.minute != null).length;

    awayPendingGoal = events.filter(ev => ev.type == "goal" && ev.team.equals(fixture.awayTeam) && ev.minute != null
    || ev.type == "penalty" && ev.team.equals(fixture.awayTeam) && ev.minute != null
    || ev.type == "own-goal" && ev.team.equals(fixture.awayTeam) && ev.minute != null).length;

    console.log("Ajustement des buts par rapport aux évènements manquant, domicile:", homePendingGoal, "extérieur:", awayPendingGoal);
    console.log("Score définitif:", homeGoal+homePendingGoal, "-", awayGoal+awayPendingGoal);


    if ((homeGoal+homePendingGoal) != homeScore || (awayGoal+awayPendingGoal) != awayScore){
      console.log(chalkError("Le score du match ne correspond pas aux évènements enregistrés !"));
      if (fixture.result.auto == false){
        console.log(chalkInit("Le score a été défini manuellement, donc reconstruire l'arbre d'évènements."));
        if (customEvents.length > 0){
          return reject("Impossible de reconstruire l'arbre d'évènements !");
        }
        console.log(chalkWarning("Créer des évènements de buts pour les équipes concernées."));

        for (var ht = 0; ht < homeScore; ht++){
          console.log(chalkWarning("Ajout d'un évènement goal pour l'équipe à domicile."))
          customEvents.push({ team: fixture.homeTeam, type: "goal", minute: ht+1, custom: true });
        }

        for (var vt = 0; vt < awayScore; vt++){
          console.log(chalkWarning("Ajout d'un évènement goal pour l'équipe visiteuse."))
          customEvents.push({ team: fixture.awayTeam, type: "goal", minute: ht+2, custom: true });
        }

        setCustomEvents = true;
      } else {
        console.log(chalkError("Les administrateurs doivent vérifier le score manuellement !", fixture.api.sportmonks));
        return reject("Les administrateurs doivent vérifier le score manuellement !");
      }
    }

    if (setCustomEvents){
      console.log(chalkWarning("Custom events activés !"));
      events = customEvents;
      winner = getWinner(parseInt(homeScore), parseInt(awayScore));
      if (winner == -1) return reject("Aucun resultat n'est disponible pour ce match !");
      updateQuery = Fixture.findOneAndUpdate({ _id: fixture._id }, { $set: {
        date: moment.unix(apiFixture.timestamp).utc().toDate(),
        updatedAt: moment().utc().toDate(),
        'result.homeScore': parseInt(homeScore),
        'result.awayScore': parseInt(awayScore),
        'result.winner': parseInt(winner),
        'status': 'done',
        'events': events
      } }, { returnOriginal: false });
    } else {
      winner = getWinner(homeScore, awayScore);
      if (winner == -1) return reject("Aucun resultat n'est disponible pour ce match !");
      updateQuery = Fixture.findOneAndUpdate({ _id: fixture._id }, { $set: {
        date: moment.unix(apiFixture.timestamp).utc().toDate(),
        updatedAt: moment().utc().toDate(),
        'result.homeScore': parseInt(homeScore),
        'result.awayScore': parseInt(awayScore),
        'result.winner': parseInt(winner),
        'status': 'done'
      },  $push: { events: { $each: events } } }, { returnOriginal: false });
    }
  } else if (fixture.status == 'soon' && apiFixture.status == 'LIVE'){
    // Le match a commencé
    updateQuery = Fixture.findOneAndUpdate({ _id: fixture._id }, { $set: {
      updatedAt: moment().utc().toDate(),
      'result.homeScore': parseInt(homeScore),
      'result.awayScore': parseInt(awayScore),
      'status': 'playing'
    }, $push: { events: { $each: events } } }, { returnOriginal: false });
  } else if (fixture.status == 'soon' && apiFixture.status == 'CANCL'){
    // Le match a été annulé
    updateQuery = Fixture.findOneAndUpdate({ _id: fixture._id }, { $set: {
      updatedAt: moment().utc().toDate(),
      'status': 'canceled',
      'result.homeScore': -1,
      'result.awayScore': -1,
      'result.winner': -1
    } }, { returnOriginal: false });
  }

  //console.log(fixture.status, apiFixture.status, updateQuery);
  if (updateQuery == null){
    return reject("Internal error !");
  }

  updateQuery.then(function(result){
    return resolve(result.value);
  }, function(err){
    return reject(err);
  });
});
};


function getWinner(homeScore, awayScore){
  var winner;
  if (homeScore == null || awayScore == null){
    //return reject("Un match contenu dans le ticket, n'a pas encore de résultat");
    return -1;
  }

  if (homeScore == awayScore){
    winner = 0;
  } else if (homeScore > awayScore){
    winner = 1;
  } else if (awayScore > homeScore){
    winner = 2;
  }

  return winner;
}

//var url = "mongodb://localhost:27017/footbet";
//var url = "mongodb://devolios:ZaAY8pIjLj@ds143883-a0.mlab.com:43883,ds143883-a1.mlab.com:43883/crummyprod?replicaSet=rs-ds143883";

// Use connect method to connect to the server
MongoClient.connect(process.env.DB_URI, function(err, db) {
  console.log(chalkInit("Connected successfully to server"));
  console.log(chalkInit("-----> Start fixture_worker.js <-----"));
  updateFixtureJob(db).then(function(res){
    //console.log(res);
    console.log(chalkDone("-----> Fixture Worker Job Done <-----"));
    db.close();
  }, function(err){
    console.log(err);
    db.close();
  });
});
