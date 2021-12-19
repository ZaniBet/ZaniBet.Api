'use strict';

var requestify = require('requestify');
var async = require('async');

exports.getCompetitions = function(season){

  var leagueToCompetition = {
    "FL1" : { _id: "LIGUE1-"+season, name: "Ligue 1", division: 1, season: season },
    "FL2": { _id: "LIGUE2-"+season, name:"Ligue 2", division: 2, season: season },
    "DED": { _id: "EREDIVISIE-"+season, name:"Eredivisie", division: 1, season: season },
    "BL1": { _id: "BUNDESLIGA1-"+season, name:"Bundesliga 1", division: 1, season: season },
    "BL2": { _id: "BUNDESLIGA2-"+season, name:"Bundesliga 2", division: 2, season: season },
    "SA": { _id: "SERIEAITA-"+season, name:"Serie A", division: 1, season: season  },
    "PL": {_id: "PLEAGUE-"+season, name:"Premier League", division: 1, season: season  },
    "PPL": { _id: "LIGANOS-"+season, name:"Liga NOS", division: 1, season: season },
    "PD": { _id: "LALIGA-"+season, name:"LaLiga Santander", division: 1, season: season }
  };

  return new Promise(function(resolve, reject){
    requestify.get("http://api.football-data.org/v1/competitions/?season="+season, { headers: { 'X-Auth-Token': 'afddb7f282a940b7bb85e447b34f35ff' } })
    .then(function(response){
      var competitions = response.getBody();
      //console.log(competitions);
      var competitionArr = [];
      async.eachLimit(competitions, 1, function(competition, eachCompetition){
        if (leagueToCompetition[competition.league] != null){
          competitionArr.push({ _id: leagueToCompetition[competition.league]._id,
            name: leagueToCompetition[competition.league].name,
            season: season,
            api: { footballdata: competition.id },
            numberOfGames: competition.numberOfGames,
            numberOfTeams: competition.numberOfTeams,
            numberOfMatchDays: competition.numberOfMatchdays
          });
          return eachCompetition();
        }

        eachCompetition();
      }, function(err){
        if (err) return reject(err);
        resolve(competitionArr);
      });
    })
    .fail(function(response){
      console.log(response);
      reject(response.body);
    });
  });
};

exports.getTeamsForCompetition = function(competition){
  return new Promise(function(resolve, reject){
    requestify.get('http://api.football-data.org/v1/competitions/' + competition.api.footballdata +'/teams',  { headers: { 'X-Auth-Token': 'afddb7f282a940b7bb85e447b34f35ff' } })
    .then(function(response){
      var teams = response.getBody().teams;
      var teamArr = [];
      async.eachLimit(teams, 1, function(team, eachTeam){
        var teamLink = team._links.self.href.split('/');
        console.log(teamLink);
        teamArr.push({ name: team.name, shortName: team.shortName, competition: competition._id, api: { footballdata: teamLink[5] } });
        eachTeam();
      }, function(err, result){
        resolve(teamArr);
      });
    })
    .fail(function(response){
      reject(response.body);
    });
  });
};

exports.getFixtureForCompetition = function(competition, timeFrame){
  return new Promise(function(resolve, reject){
    requestify.get('http://api.football-data.org/v1/competitions/' + competition.api.footballdata +'/fixtures?timeFrame='+timeFrame,  { headers: { 'X-Auth-Token': 'afddb7f282a940b7bb85e447b34f35ff' } })
    .then(function(response){
      var fixtures = response.getBody().fixtures;
      var fixtureArr = [];
      async.eachLimit(fixtures, 1, function(fixture, eachFixture){
        var fixtureLink = fixture._links.self.href.split('/');
        var homeTeamLink = fixture._links.homeTeam.href.split('/');
        var awayTeamLink = fixture._links.awayTeam.href.split('/');

        fixtureArr.push({ date: fixture.date, matchDay: fixture.matchday, homeTeam: { api: { footballdata: homeTeamLink[5] } }, awayTeam: { api: { footballdata: awayTeamLink[5] } }, result: { homeScore: fixture.result.goalsHomeTeam, awayScore: fixture.result.goalsAwayTeam }, api: { footballdata: fixtureLink[5] }, status: fixture.status });
        eachFixture();
      }, function(err, result){
        //console.log(fixtureArr);
        resolve(fixtureArr);
      });
    })
    .fail(function(response){
      reject(response.body);
    });
  });
};

exports.getFixture = function(fixtureId){
  return new Promise(function(resolve, reject){
    requestify.get("http://api.football-data.org/v1/fixtures/" + parseInt(fixtureId), { headers: { 'X-Auth-Token': 'afddb7f282a940b7bb85e447b34f35ff' } })
    .then(function(response){
      resolve(response.getBody().fixture);
    })
    .fail(function(response){
      reject(response.body);
    });
  });
};
