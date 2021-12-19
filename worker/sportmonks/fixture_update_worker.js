// If we are dev env, load dotenv
if (process.env.NODE_ENV != "production"){
  require('dotenv').config();
}

var MongoClient = require('mongodb').MongoClient;
var async = require('async');
var requestify = require('requestify');
var moment = require('moment');
var SportMonks = require('../../fetcher/sportmonks');
var Chance = require('chance');
var chance = new Chance();

var updateJob = function(db){
  return new Promise(function(resolve, reject){

    var Fixture = db.collection("fixture");
    var Competition = db.collection("competition");
    var Team = db.collection("team");
    var GameTicket = db.collection("gameTicket");

    var from = moment().utc().startOf('month').format("YYYY-MM-DD");
    var to = moment().utc().endOf('month').format("YYYY-MM-DD");

    var allowedLeagues = [
      "LIGUE1-2018",
      "EREDIVISIE-2018",
      "BUNDESLIGA1-2018",
      "SERIEAITA-2018",
      "PLEAGUE-2018",
      "LIGANOS-2018",
      "LALIGA-2018",
      "SUPERLIG-2018",
      "EFLCHAMPIONSHIP-2018",
      "PROLEAGUE-2018",
      "ALLSVENSKAN-2018",
      "ELITESERIEN-2018",
      "TIPICOBUNDESLIGA-2018",
      "PLEAGUEUKR-2018",
      "CHAMPIONSLEAGUE-2018",
      "EUROPALEAGUE-2018",
      "PLEAGUERUS-2018",
      "LEAGUEONE-2018",
      "SCOTTPRE-2018"
    ];

    Competition.find({ /*_id: { $in: allowedLeagues },*/ active: true, isCurrentSeason: true, "api.sportmonks": { $exists: true }, availableGames: { $elemMatch: { type: "SINGLE", active: true } } }).toArray(function(err, competitions){
      if (err){
        return reject(err);
      }

      // Pour chaque compétition, récupérer tous les matchs
      console.log("Nombre de compétition actives:", competitions.length);

      async.eachLimit(competitions, 1, function(competition, eachCompetition){
        //console.log(competition);
        SportMonks.getFixtureForCompetition(competition, from, to).then(function(fixtures){
          //console.log(fixtures);
          console.log(fixtures.length, "matchs récupérés pour la compétition", competition.name);
          async.eachLimit(fixtures, 1, function(fixture, eachFixture){
            // Trouver les équipes en opposition grace à l'ID de l'api
            Team.find({ $or : [{ "api.sportmonks": fixture.homeTeam.api.sportmonks }, { "api.sportmonks": fixture.awayTeam.api.sportmonks }] }).toArray(function(err, teams){
              if (!err){
                if (teams.length < 2){
                  console.log("Impossible de trouver une équipe pour le match:", fixture);
                  //return eachFixture("Impossible de trouver une équipe pour un match.");
                  return eachFixture();
                }

                var homeTeam, awayTeam;
                for (team in teams){
                  if (teams[team].api.sportmonks == fixture.homeTeam.api.sportmonks){
                    homeTeam = teams[team];
                  } else if (teams[team].api.sportmonks == fixture.awayTeam.api.sportmonks){
                    awayTeam = teams[team];
                  }
                }

                if (homeTeam == null || awayTeam == null){
                  console.log("Impossible de trouver une équipe pour le match:", fixture);
                  return eachFixture();
                }

                //console.log(homeTeam, awayTeam);
                // Vérifier si un match existe déjà dans la BDD
                //}, {$and: [{homeTeam: homeTeam}, {awayTeam:awayTeam}]}
                Fixture.findOne({ $or: [{ "api.sportmonks": fixture.api.sportmonks }, { homeTeam: homeTeam, awayTeam: awayTeam, competition: competition._id, matchDay: fixture.matchDay }, { homeTeam: homeTeam._id, awayTeam: awayTeam._id, competition: competition._id, matchDay: fixture.matchDay }] }, function(err, fix){
                  if (err){
                    console.log("Echec de la vérification de l'existence d'un match pour la compétition:", competition._id);
                    return eachFixture();
                  } else if (fix == null){
                    // Le match n'existe pas
                    //console.log(fixture.api.sportmonks, homeTeam, awayTeam);
                    console.log("Lancer la création du match", homeTeam.name, "-", awayTeam.name);
                    /*Fixture.insertOne({
                      createdAt: moment().utc().toDate(),
                      updatedAt: moment().utc().toDate(),
                      competition: competition._id,
                      date: moment.unix(fixture.timestamp).utc().toDate(),
                      name: homeTeam.name + " - " + awayTeam.name,
                      matchDay: fixture.matchDay,
                      status: "soon",
                      isCup: competition.isCup,
                      isFriendly: competition.isFriendly,
                      venue: fixture.venue,
                      homeTeam: homeTeam._id,
                      awayTeam: awayTeam._id,
                      result: {
                        auto: true,
                        winner: -1,
                        homeScore: fixture.result.homeScore,
                        awayScore: fixture.result.awayScore
                      },
                      api: {
                        sportmonks: fixture.api.sportmonks
                      },
                      zScore: chance.integer({ min: 100, max: 300 })
                    }, function(err, result){
                      if (err){
                        console.log(err);
                        console.log("Echec lors de la création d'un match pour la compétition:", competition._id);
                      } else {
                        console.log("Création du match", homeTeam.name, "-", awayTeam.name, "pour la competition:", competition._id);
                      }

                      return eachFixture();
                    });*/
                    return eachFixture();
                  } else {
                    // Le match existe déjà
                    console.log("Le match", homeTeam.name, "-", awayTeam.name, "existe déjà. -", competition._id);
                    /*if (typeof fix.homeTeam === 'object' || typeof fix.awayTeam === 'object'){
                      console.log("Bad type");
                      Fixture.updateOne({ _id: fix._id }, { $set: { homeTeam: homeTeam._id, awayTeam: awayTeam._id } }, function(err, result){
                        if (err){
                          console.log("La mise à jour à échouée :", err);
                          return eachFixture();
                        } else {
                          return eachFixture();
                        }
                      });
                    } else*/ if (fix.api.sportmonks != fixture.api.sportmonks){
                      console.log("L'ancien ID d'api du match est corrumpu, effectuer la modification !");
                      Fixture.updateOne({ _id: fix._id }, { $set: { "api.sportmonks": fixture.api.sportmonks } }, function(err, result){
                        if (err){
                          console.log("La mise à jour à échouée :", err);
                          return eachFixture();
                        } else {
                          return eachFixture();
                        }
                      });
                    } else if (fix.isFriendly == null || fix.venue == null || fix.name == null){
                      console.log("Indiquer si le match est amical ou non :", competition.isFriendly);
                      //console.log("Venue :", fixture.venue);
                      Fixture.updateOne({ _id: fix._id }, { $set: { isFriendly: competition.isFriendly, venue: fixture.venue, name: homeTeam.name + " - " + awayTeam.name } }, function(err, result){
                        if (err){
                          console.log("La mise à jour à échouée :", err);
                          return eachFixture();
                        } else {
                          return eachFixture();
                        }
                      });
                    } else if (moment(fix.date).utc() > moment.unix(fixture.timestamp).utc()){
                      console.log("Mise à jour de la date du match !", fix.api.sportmonks );
                      Fixture.updateOne({ _id: fix._id }, { $set: { date: moment.unix(fixture.timestamp).utc().toDate() } }, function(err, result){
                        if (err){
                          console.log("La mise à jour à échouée :", err);
                          return eachFixture();
                        } else {
                          //return eachFixture();
                          // Mettre à jour le ticket simple si celui ci existe
                          GameTicket.updateOne({ type: "SINGLE", fixtures: { $in: [ fix._id ] } }, { $set: { openDate: moment.unix(fixture.timestamp).utc().subtract(3, 'day').toDate() } }, function(err, result){
                            if (err){
                              console.log("Une erreure c'est produite lors de la mise à jour de la date d'ouverture du ticket :", err);
                              return eachFixture();
                            } else {
                              console.log(moment.unix(fixture.timestamp).utc().subtract(3, 'day').toDate());
                              console.log("Mise à jour de la date d'ouverture du ticket :", result.nModified);
                              return eachFixture();
                            }
                          });
                        }
                      });
                    } else {
                      return eachFixture();
                    }
                  }
                });
              } else {
                if (err) console.log("Failled to find teams for fixture", fixture);
                eachFixture();
              }
            });
          }, function(err){
            // Switch to next competition
            console.log("Finished create/update fixture for comptetition:", competition._id);
            eachCompetition();
          });
        }, function(err){
          // Failled to get fixture for competition
          //console.log(err);
          console.log(err);
          if (err) console.log("Failled to find fixture for competition", competition._id);
          eachCompetition();
        });
      }, function(err){
        if (err){
          reject(err);
        } else {
          resolve("OK");
        }
      });

    });

  });

};

  // Use connect method to connect to the server
  MongoClient.connect(process.env.DB_URI, function(err, db) {
    console.log("Connected successfully to server");
    console.log("-----> Start fixture_update_worker.js <-----");
    updateJob(db).then(function(res){
      //console.log(res);
      console.log("-----> Fixture Update Job Done <-----")
      db.close();
    }, function(err){
      console.log(err);
      db.close();
    });
  });
