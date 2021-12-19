'use strict';

var requestify = require('requestify');
var async = require('async');
const chalk = require('chalk');
const chalkInit = chalk.bold.green;
const chalkDone = chalk.bold.blue;
const chalkError = chalk.bold.red;
const chalkWarning = chalk.bold.yellow;

/*
* Récupérer les compétitions de la liste
*/
exports.getCompetitions = function(season){

  var leagueToCompetition = {
    "Ligue 1 France" : { _id: "LIGUE1-"+season, name: "Ligue 1", division: 1, season: season, country: "France", active: true, isCup: false, availableGames: [ { type: "SINGLE", active: true }, { type: "MATCHDAY", active: true }, { type: "DAILY-JACKPOT", active: true } ], isInternational: false, isFriendly: false, numberOfTeams: 0 },

    "Ligue 2 France" : { _id: "LIGUE2-"+season, name: "Ligue 2", division: 2, season: season, country: "France", active: true, isCup: false, availableGames: [ { type: "SINGLE", active: false }, { type: "MATCHDAY", active: false }, { type: "DAILY-JACKPOT", active: false } ], isInternational: false, isFriendly: false  },

    "Eredivisie": { _id: "EREDIVISIE-"+season, name:"Eredivisie", division: 1, season: season, country: "Netherlands", active: true, isCup: false, availableGames: [ { type: "SINGLE", active: true }, { type: "MATCHDAY", active: true }, { type: "DAILY-JACKPOT", active: true } ], isInternational: false, isFriendly: false  },

    "Bundesliga": { _id: "BUNDESLIGA1-"+season, name:"Bundesliga 1", division: 1, season: season, country: "Germany", active: true, isCup: false, availableGames: [ { type: "SINGLE", active: true }, { type: "MATCHDAY", active: true }, { type: "DAILY-JACKPOT", active: true } ], isInternational: false, isFriendly: false  },

    "2. Bundesliga": { _id: "BUNDESLIGA2-"+season, name:"Bundesliga 2", division: 2, season: season, country: "Germany", active: true, isCup: false, availableGames: [ { type: "SINGLE", active: false }, { type: "MATCHDAY", active: false }, { type: "DAILY-JACKPOT", active: false } ], isInternational: false, isFriendly: false  },

    "3. Liga": { _id: "LIGA3-"+season, name:"Liga", division: 3, season: season, country: "Germany", active: false, isCup: false, availableGames: [ { type: "SINGLE", active: false }, { type: "MATCHDAY", active: false }, { type: "DAILY-JACKPOT", active: false } ], isInternational: false, isFriendly: false  },

    "Serie A": { _id: "SERIEAITA-"+season, name:"Serie A", division: 1, season: season, country: "Italy", active: true, isCup: false, availableGames: [ { type: "SINGLE", active: true }, { type: "MATCHDAY", active: true }, { type: "DAILY-JACKPOT", active: true } ], isInternational: false, isFriendly: false },

    "Premier League England": {_id: "PLEAGUE-"+season, name:"Premier League", division: 1, season: season, country: "England", active: true, isCup: false, availableGames: [ { type: "SINGLE", active: true }, { type: "MATCHDAY", active: true }, { type: "DAILY-JACKPOT", active: true } ], isInternational: false, isFriendly: false },

    "Premiership Scotland": {_id: "SCOTTPRE-"+season, name:"Scottish Premiership", division: 1, season: season, country: "Scotland", active: true, isCup: false, availableGames: [ { type: "SINGLE", active: true }, { type: "MATCHDAY", active: false }, { type: "DAILY-JACKPOT", active: false } ], isInternational: false, isFriendly: false },

    "Primeira Liga Portugal": { _id: "LIGANOS-"+season, name:"Liga NOS", division: 1, season: season, country: "Portugal", active: true, isCup: false, availableGames: [ { type: "SINGLE", active: true }, { type: "MATCHDAY", active: true }, { type: "DAILY-JACKPOT", active: true } ], isInternational: false, isFriendly: false },

    "La Liga": { _id: "LALIGA-"+season, name:"LaLiga Santander", division: 1, season: season, country: "Spain", active: true, isCup: false, availableGames: [ { type: "SINGLE", active: true }, { type: "MATCHDAY", active: true }, { type: "DAILY-JACKPOT", active: true } ], isInternational: false, isFriendly: false },

    "Super Lig Turkey": { _id: "SUPERLIG-"+season, name:"Super Lig", division: 1, season: season, country: "Turkey", active: true, isCup: false, availableGames: [ { type: "SINGLE", active: true }, { type: "MATCHDAY", active: true }, { type: "DAILY-JACKPOT", active: true } ], isInternational: false, isFriendly: false },

    "Championship England": { _id: "EFLCHAMPIONSHIP-"+season, name:"EFL Championship", division: 2, season: season, country: "England", active: true, isCup: false, availableGames: [ { type: "SINGLE", active: true }, { type: "MATCHDAY", active: true }, { type: "DAILY-JACKPOT", active: true } ], isInternational: false, isFriendly: false },

    "Pro League Belgium": { _id: "PROLEAGUE-"+season, name:"Jupiler Pro League", division: 1, season: season, country: "Belgium", active: true, isCup: false, availableGames: [ { type: "SINGLE", active: true }, { type: "MATCHDAY", active: true }, { type: "DAILY-JACKPOT", active: true } ], isInternational: false, isFriendly: false },

    "Allsvenskan Sweden": { _id: "ALLSVENSKAN-"+season, name:"Allsvenskan", division: 1, season: season, country: "Sweden", active: true, isCup: false, availableGames: [ { type: "SINGLE", active: true }, { type: "MATCHDAY", active: true }, { type: "DAILY-JACKPOT", active: true } ], isInternational: false, isFriendly: false },

    "Eliteserien Norway": { _id: "ELITESERIEN-"+season, name:"Eliteserien", division: 1, season: season, country: "Norway", active: true, isCup: false, availableGames: [ { type: "SINGLE", active: true }, { type: "MATCHDAY", active: true }, { type: "DAILY-JACKPOT", active: true } ], isInternational: false, isFriendly: false },

    "Tipico Bundesliga": { _id: "TIPICOBUNDESLIGA-"+season, name:"Tipico Bundesliga", division: 1, season: season, country: "Austria", active: true, isCup: false, availableGames: [ { type: "SINGLE", active: true }, { type: "MATCHDAY", active: true }, { type: "DAILY-JACKPOT", active: true } ], isInternational: false, isFriendly: false },

    "Premier League Ukraine": {_id: "PLEAGUEUKR-"+season, name:"Premier League", division: 1, season: season, country: "Ukraine", active: true, isCup: false, availableGames: [ { type: "SINGLE", active: true }, { type: "MATCHDAY", active: true }, { type: "DAILY-JACKPOT", active: false } ], isInternational: false, isFriendly: false },

    "Champions League": { _id: "CHAMPIONSLEAGUE-"+season, name:"Champions League", division: 1, season: season, country: "Europe", active: true, isCup: true, availableGames: [ { type: "SINGLE", active: true }, { type: "MATCHDAY", active: false }, { type: "DAILY-JACKPOT", active: false } ], isInternational: true, isFriendly: false },

    "Europa League": { _id: "EUROPALEAGUE-"+season, name:"Europa League", division: 1, season: season, country: "Europe", active: true, isCup: true, availableGames: [ { type: "SINGLE", active: true }, { type: "MATCHDAY", active: false }, { type: "DAILY-JACKPOT", active: false } ], isInternational: true, isFriendly: false  },

    "Premier League Russia": { _id: "PLEAGUERUS-"+season, name:"Premier League", division: 1, season: season, country: "Russia", active: true, isCup: false, availableGames: [ { type: "SINGLE", active: true }, { type: "MATCHDAY", active: true }, { type: "DAILY-JACKPOT", active: false } ], isInternational: false, isFriendly: false  },

    "League One England": { _id: "LEAGUEONE-"+season, name:"League One", division: 3, season: season, country: "England", active: true, isCup: false, availableGames: [ { type: "SINGLE", active: true }, { type: "MATCHDAY", active: true }, { type: "DAILY-JACKPOT", active: false } ], isInternational: false, isFriendly: false  },

    "Serie A Brazil": { _id: "SERIEABRAZIL-"+season, name:"Serie A", division: 1, season: season, country: "Brazil", active: true, isCup: false, availableGames: [ { type: "SINGLE", active: false }, { type: "MATCHDAY", active: false }, { type: "DAILY-JACKPOT", active: false } ], isInternational: false, isFriendly: false  },

    "Serie B Brazil": { _id: "SERIEBBRAZIL-"+season, name:"Serie B", division: 2, season: season, country: "Brazil", active: true, isCup: false, availableGames: [ { type: "SINGLE", active: false }, { type: "MATCHDAY", active: false }, { type: "DAILY-JACKPOT", active: false } ], isInternational: false, isFriendly: false  },

    "Premier League Hong Kong": { _id: "PLEAGUEHK-"+season, name:"Premier League", division: 1, season: season, country: "Hong Kong", active: true, isCup: false, availableGames: [ { type: "SINGLE", active: false }, { type: "MATCHDAY", active: false }, { type: "DAILY-JACKPOT", active: false } ], isInternational: false, isFriendly: false  },

    "Pro League Saudi Arabia": { _id: "PROLEAGUESAUDI-"+season, name:"Saudi Arabia", division: 1, season: season, country: "Saudi Arabia", active: false, isCup: false, availableGames: [ { type: "SINGLE", active: false }, { type: "MATCHDAY", active: false }, { type: "DAILY-JACKPOT", active: false } ], isInternational: false, isFriendly: false  },

    "Girabola": { _id: "GIRABOLA-"+season, name:"Girabola", division: 1, season: season, country: "Angola", active: false, isCup: false, availableGames: [ { type: "SINGLE", active: false }, { type: "MATCHDAY", active: false }, { type: "DAILY-JACKPOT", active: false } ], isInternational: false, isFriendly: false  },

    "1. Liga Poland": { _id: "FIRSTLIGAPOLAND-"+season, name:"1. Liga", division: 2, season: season, country: "Poland", active: true, isCup: false, availableGames: [ { type: "SINGLE", active: false }, { type: "MATCHDAY", active: false }, { type: "DAILY-JACKPOT", active: false } ], isInternational: false, isFriendly: false  },

    "Ekstraklasa Poland": { _id: "EKSTRAKLASA-"+season, name:"Ekstraklasa", division: 1, season: season, country: "Poland", active: true, isCup: false, availableGames: [ { type: "SINGLE", active: false }, { type: "MATCHDAY", active: false }, { type: "DAILY-JACKPOT", active: false } ], isInternational: false, isFriendly: false  },

    "Superettan Sweden": { _id: "SUPERETTAN-"+season, name:"Superettan", division: 2, season: season, country: "Sweden", active: true, isCup: false, availableGames: [ { type: "SINGLE", active: false }, { type: "MATCHDAY", active: false }, { type: "DAILY-JACKPOT", active: false } ], isInternational: false, isFriendly: false  },

    "Premier League Malta": { _id: "PLEAGUEMALTA-"+season, name:"Premier League", division: 1, season: season, country: "Malta", active: true, isCup: false, availableGames: [ { type: "SINGLE", active: false }, { type: "MATCHDAY", active: false }, { type: "DAILY-JACKPOT", active: false } ], isInternational: false, isFriendly: false  },

    "Liga Leumit": { _id: "LIGALEUMIT-"+season, name:"Liga Leumit", division: 2, season: season, country: "Israel", active: false, isCup: false, availableGames: [ { type: "SINGLE", active: false }, { type: "MATCHDAY", active: false }, { type: "DAILY-JACKPOT", active: false } ], isInternational: false, isFriendly: false  },

    "Ligat ha'Al": { _id: "LIGATHAAL-"+season, name:"Ligat ha'Al", division: 1, season: season, country: "Israel", active: true, isCup: false, availableGames: [ { type: "SINGLE", active: true }, { type: "MATCHDAY", active: false }, { type: "DAILY-JACKPOT", active: false } ], isInternational: false, isFriendly: false  },

    "Veikkausliiga Finland": { _id: "VEIKKAUSLIIGA-"+season, name:"Veikkausliiga", division: 1, season: season, country: "Finland", active: true, isCup: false, availableGames: [ { type: "SINGLE", active: false }, { type: "MATCHDAY", active: true }, { type: "DAILY-JACKPOT", active: false } ], isInternational: false, isFriendly: false },

    // AJOUT COMPETITION MI MARS 2018

    "First Division Denmark": { _id: "FIRSTDIVDENMARK-"+season, name:"First Division", division: 2, season: season, country: "Denmark", active: true, isCup: false, availableGames: [ { type: "SINGLE", active: true }, { type: "MATCHDAY", active: false }, { type: "DAILY-JACKPOT", active: false } ], isInternational: false, isFriendly: false },

    "1. HNL Croatia": { _id: "FIRSTHNL-"+season, name:"1. HNL", division: 1, season: season, country: "Croatia", active: true, isCup: false, availableGames: [ { type: "SINGLE", active: true }, { type: "MATCHDAY", active: false }, { type: "DAILY-JACKPOT", active: false } ], isInternational: false, isFriendly: false },

    "Superliga Albania": { _id: "SUPERLIGA-"+season, name:"Superliga", division: 1, season: season, country: "Albania", active: true, isCup: false, availableGames: [ { type: "SINGLE", active: true }, { type: "MATCHDAY", active: false }, { type: "DAILY-JACKPOT", active: false } ], isInternational: false, isFriendly: false },

    "Eerste Divisie": { _id: "EERSTEDIVISIE-"+season, name:"Eerste Divisie", division: 2, season: season, country: "Netherlands", active: false, isCup: false, availableGames: [ { type: "SINGLE", active: false }, { type: "MATCHDAY", active: false }, { type: "DAILY-JACKPOT", active: false } ], isInternational: false, isFriendly: false },

    "Ligue 1 Algeria": { _id: "LIGUE1ALGERIA-"+season, name:"Ligue 1", division: 1, season: season, country: "Algeria", active: true, isCup: false, availableGames: [ { type: "SINGLE", active: true }, { type: "MATCHDAY", active: false }, { type: "DAILY-JACKPOT", active: false } ], isInternational: false, isFriendly: false },

    //"": { _id: "-"+season, name:"", division: 1, season: season, country: "", active: true, isCup: false, availableGames: [ { type: "SINGLE", active: true }, { type: "MATCHDAY", active: false }, { type: "DAILY-JACKPOT", active: false } ] },

    "Czech Liga": { _id: "CZECHLIGA-"+season, name:"Czech Liga", division: 1, season: season, country: "Czech Republic", active: true, isCup: false, availableGames: [ { type: "SINGLE", active: false }, { type: "MATCHDAY", active: false }, { type: "DAILY-JACKPOT", active: false } ], isInternational: false, isFriendly: false },

    "2. Liga FNL": { _id: "2LIFAFNL-"+season, name:"2. Liga FNL", division: 2, season: season, country: "Czech Republic", active: true, isCup: false, availableGames: [ { type: "SINGLE", active: false }, { type: "MATCHDAY", active: false }, { type: "DAILY-JACKPOT", active: false } ], isInternational: false, isFriendly: false },

    "A-League Australia": { _id: "ALEAGUE-"+season, name:"A-League", division: 1, season: season, country: "Australia", active: true, isCup: false, availableGames: [ { type: "SINGLE", active: true }, { type: "MATCHDAY", active: false }, { type: "DAILY-JACKPOT", active: false } ], isInternational: false, isFriendly: false },

    "Erste Liga": { _id: "ERSTELIGA-"+season, name:"Erste Liga", division: 2, season: season, country: "Austria", active: false, isCup: false, availableGames: [ { type: "SINGLE", active: false }, { type: "MATCHDAY", active: false }, { type: "DAILY-JACKPOT", active: false } ], isInternational: false, isFriendly: false },

    "La Liga 2": { _id: "LALIGA2-"+season, name:"La Liga 2", division: 2, season: season, country: "Spain", active: false, isCup: false, availableGames: [ { type: "SINGLE", active: false }, { type: "MATCHDAY", active: true }, { type: "DAILY-JACKPOT", active: true } ], isInternational: false, isFriendly: false },

    "Meistriliiga Estonia": { _id: "MEISTRILIIGA-"+season, name:"Meistriliiga", division: 1, season: season, country: "Estonia", active: true, isCup: false, availableGames: [ { type: "SINGLE", active: true }, { type: "MATCHDAY", active: false }, { type: "DAILY-JACKPOT", active: true } ], isInternational: false, isFriendly: false },

    "Parva Liga": { _id: "PARVALIGA-"+season, name:"Parva Liga", division: 1, season: season, country: "Bulgaria", active: true, isCup: false, availableGames: [ { type: "SINGLE", active: true }, { type: "MATCHDAY", active: false }, { type: "DAILY-JACKPOT", active: false } ], isInternational: false, isFriendly: false },

    "Premier Division Republic of Ireland": { _id: "PREMDIVISIONIREREP-"+season, name:"Premier Division", division: 1, season: season, country: "Republic of Ireland", active: true, isCup: false, availableGames: [ { type: "SINGLE", active: true }, { type: "MATCHDAY", active: true }, { type: "DAILY-JACKPOT", active: true } ], isInternational: false, isFriendly: false },

    "First Division Republic of Ireland": { _id: "FIRSTDIVIREREP-"+season, name:"First Division", division: 2, season: season, country: "Republic of Ireland", active: true, isCup: false, availableGames: [ { type: "SINGLE", active: true }, { type: "MATCHDAY", active: true }, { type: "DAILY-JACKPOT", active: true } ], isInternational: false, isFriendly: false },

    "Premier League South Africa": { _id: "PLEAGUESOUTHAFRICA-"+season, name:"Premier League", division: 1, season: season, country: "South Africa", active: true, isCup: false, availableGames: [ { type: "SINGLE", active: true }, { type: "MATCHDAY", active: false }, { type: "DAILY-JACKPOT", active: false } ], isInternational: false, isFriendly: false },

    "Primera A: Apertura Colombia": { _id: "PRIAAPERCOLOMBIA-"+season, name:"Primera A: Apertura", division: 1, season: season, country: "Colombia", active: false, isCup: false, availableGames: [ { type: "SINGLE", active: false }, { type: "MATCHDAY", active: false }, { type: "DAILY-JACKPOT", active: false } ], isInternational: false, isFriendly: false },

    "Primera A: Clausura Colombia": { _id: "PRIACLAUCOLOMBIA-"+season, name:"Primera A: Clausura", division: 1, season: season, country: "Colombia", active: false, isCup: false, availableGames: [ { type: "SINGLE", active: false }, { type: "MATCHDAY", active: false }, { type: "DAILY-JACKPOT", active: false } ], isInternational: false, isFriendly: false },

    "Serie B": { _id: "SERIEBITA-"+season, name:"Serie B", division: 2, season: season, country: "Italy", active: true, isCup: false, availableGames: [ { type: "SINGLE", active: false }, { type: "MATCHDAY", active: false }, { type: "DAILY-JACKPOT", active: false } ], isInternational: false, isFriendly: false  },

    "Super League China PR": { _id: "SLEAGUECHINA-"+season, name:"Super League", division: 1, season: season, country: "China PR", active: true, isCup: false, availableGames: [ { type: "SINGLE", active: true }, { type: "MATCHDAY", active: false }, { type: "DAILY-JACKPOT", active: false } ], isInternational: false, isFriendly: false  },

    "Superliga Argentina": { _id: "SLIGAARGENTINA-"+season, name:"Superliga", division: 1, season: season, country: "Argentina", active: true, isCup: false, availableGames: [ { type: "SINGLE", active: false }, { type: "MATCHDAY", active: false }, { type: "DAILY-JACKPOT", active: false } ], isInternational: false, isFriendly: false  },

    "Super Liga Serbia": { _id: "SLIGASERBIA-"+season, name:"Super Liga", division: 1, season: season, country: "Serbia", active: true, isCup: false, availableGames: [ { type: "SINGLE", active: false }, { type: "MATCHDAY", active: false }, { type: "DAILY-JACKPOT", active: false } ], isInternational: false, isFriendly: false  },

    "Primera B Nacional Argentina": { _id: "PRIMBNACARGENTINA-"+season, name:"Primera B Nacional", division: 2, season: season, country: "Argentina", active: false, isCup: false, availableGames: [ { type: "SINGLE", active: false }, { type: "MATCHDAY", active: false }, { type: "DAILY-JACKPOT", active: false } ], isInternational: false, isFriendly: false  },

    "League Two England": { _id: "LEAGUETWO-"+season, name:"League Two", division: 4, season: season, country: "England", active: true, isCup: false, availableGames: [ { type: "SINGLE", active: true }, { type: "MATCHDAY", active: false }, { type: "DAILY-JACKPOT", active: false } ], isInternational: false, isFriendly: false  },

    "Championship Scotland": {_id: "CHAMPIONSHIPSCOT-"+season, name:"Championship", division: 2, season: season, country: "Scotland", active: true, isCup: false, availableGames: [ { type: "SINGLE", active: false }, { type: "MATCHDAY", active: false }, { type: "DAILY-JACKPOT", active: false } ], isInternational: false, isFriendly: false  },

    "League One Scotland": {_id: "LEAGUEONESCOT-"+season, name:"League One", division: 3, season: season, country: "Scotland", active: false, isCup: false, availableGames: [ { type: "SINGLE", active: false }, { type: "MATCHDAY", active: false }, { type: "DAILY-JACKPOT", active: false } ], isInternational: false, isFriendly: false  },

    "League Two Scotland": {_id: "LEAGUETWOSCOT-"+season, name:"League Two", division: 4, season: season, country: "Scotland", active: true, isCup: false, availableGames: [ { type: "SINGLE", active: false }, { type: "MATCHDAY", active: false }, { type: "DAILY-JACKPOT", active: false } ], isInternational: false, isFriendly: false  },

    "NB 1": { _id: "NB1HUNGARY-"+season, name:"NB 1", division: 1, season: season, country: "Hungary", active: true, isCup: false, availableGames: [ { type: "SINGLE", active: false }, { type: "MATCHDAY", active: false }, { type: "DAILY-JACKPOT", active: false } ], isInternational: false, isFriendly: false  },

    "Premiership Northern Ireland": {_id: "PREMNORIRELAND-"+season, name:"Premiership", division: 1, season: season, country: "Northern Ireland", active: true, isCup: false, availableGames: [ { type: "SINGLE", active: false }, { type: "MATCHDAY", active: false }, { type: "DAILY-JACKPOT", active: false } ], isInternational: false, isFriendly: false  },

    "1. Division Cyprus": {_id: "FIRSTDIVCYPRUS-"+season, name:"1. Division", division: 1, season: season, country: "Cyprus", active: true, isCup: false, availableGames: [ { type: "SINGLE", active: false }, { type: "MATCHDAY", active: false }, { type: "DAILY-JACKPOT", active: false } ], isInternational: false, isFriendly: false  },

    "K-League Classic": { _id: "KLEAGUE1-"+season, name:"K-League 1", division: 1, season: season, country: "Korea Republic", active: true, isCup: false, availableGames: [ { type: "SINGLE", active: false }, { type: "MATCHDAY", active: false }, { type: "DAILY-JACKPOT", active: false } ], isInternational: false, isFriendly: false  },

    "Liga 1 Romania": { _id: "LIGA1ROMANIA-"+season, name:"Liga 1", division: 1, season: season, country: "Romania", active: true, isCup: false, availableGames: [ { type: "SINGLE", active: false }, { type: "MATCHDAY", active: false }, { type: "DAILY-JACKPOT", active: false } ], isInternational: false, isFriendly: false  },

    "Primera Division Chile": { _id: "FIRSTDIVCHILE-"+season, name:"Primera Division", division: 1, season: season, country: "Chile", active: true, isCup: false, availableGames: [ { type: "SINGLE", active: false }, { type: "MATCHDAY", active: false }, { type: "DAILY-JACKPOT", active: false } ], isInternational: false, isFriendly: false  },

    "Primera B Chile": { _id: "PRIMBCHILE-"+season, name:"Primera B", division: 2, season: season, country: "Chile", active: true, isCup: false, availableGames: [ { type: "SINGLE", active: false }, { type: "MATCHDAY", active: false }, { type: "DAILY-JACKPOT", active: false } ], isInternational: false, isFriendly: false },

    "National France" : { _id: "NATIONALFRA-"+season, name: "National", division: 3, season: season, country: "France", active: true, isCup: false, availableGames: [ { type: "SINGLE", active: false }, { type: "MATCHDAY", active: false }, { type: "DAILY-JACKPOT", active: false } ], isInternational: false, isFriendly: false },

    "Super Liga Slovakia": { _id: "SUPERLIGASLOVAKIA-"+season, name:"Super Liga", division: 1, season: season, country: "Slovakia", active: true, isCup: false, availableGames: [ { type: "SINGLE", active: false }, { type: "MATCHDAY", active: false }, { type: "DAILY-JACKPOT", active: false } ], isInternational: false, isFriendly: false },

    "2. Liga Slovakia": { _id: "2LIGASLOVAKIA-"+season, name:"2. Liga", division: 2, season: season, country: "Slovakia", active: true, isCup: false, availableGames: [ { type: "SINGLE", active: false }, { type: "MATCHDAY", active: false }, { type: "DAILY-JACKPOT", active: false } ], isInternational: false, isFriendly: false },

    "Premier League Wales": { _id: "PLEAGUEWALES-"+season, name:"Premier League", division: 1, season: season, country: "Wales", active: true, isCup: false, availableGames: [ { type: "SINGLE", active: false }, { type: "MATCHDAY", active: false }, { type: "DAILY-JACKPOT", active: false } ], isInternational: false, isFriendly: false },

    "Segunda B - Group 1": { _id: "SEGUNDABG1-"+season, name:"Segunda B - Group 1", division: 3, season: season, country: "Spain", active: false, isCup: false, availableGames: [ { type: "SINGLE", active: false }, { type: "MATCHDAY", active: false }, { type: "DAILY-JACKPOT", active: false } ], isInternational: false, isFriendly: false },

    "Segunda B - Group 2": { _id: "SEGUNDABG2-"+season, name:"Segunda B - Group 2", division: 3, season: season, country: "Spain", active: false, isCup: false, availableGames: [ { type: "SINGLE", active: false }, { type: "MATCHDAY", active: false }, { type: "DAILY-JACKPOT", active: false } ], isInternational: false, isFriendly: false },

    "Segunda B - Group 3": { _id: "SEGUNDABG3-"+season, name:"Segunda B - Group 3", division: 3, season: season, country: "Spain", active: false, isCup: false, availableGames: [ { type: "SINGLE", active: false }, { type: "MATCHDAY", active: false }, { type: "DAILY-JACKPOT", active: false } ], isInternational: false, isFriendly: false },

    "Segunda B - Group 4": { _id: "SEGUNDABG4-"+season, name:"Segunda B - Group 4", division: 3, season: season, country: "Spain", active: false, isCup: false, availableGames: [ { type: "SINGLE", active: false }, { type: "MATCHDAY", active: false }, { type: "DAILY-JACKPOT", active: false } ], isInternational: false, isFriendly: false },

    "Serie C: Girone A": { _id: "SERIECGIRA-"+season, name:"Serie C: Girone A", division: 3, season: season, country: "Italy", active: false, isCup: false, availableGames: [ { type: "SINGLE", active: false }, { type: "MATCHDAY", active: false }, { type: "DAILY-JACKPOT", active: false } ], isInternational: false, isFriendly: false },

    "Serie C: Girone B": { _id: "SERIECGIRB-"+season, name:"Serie C: Girone B", division: 3, season: season, country: "Italy", active: false, isCup: false, availableGames: [ { type: "SINGLE", active: false }, { type: "MATCHDAY", active: false }, { type: "DAILY-JACKPOT", active: false } ], isInternational: false, isFriendly: false },

    "Serie C: Girone C": { _id: "SERIECGIRC-"+season, name:"Serie C: Girone C", division: 3, season: season, country: "Italy", active: false, isCup: false, availableGames: [ { type: "SINGLE", active: false }, { type: "MATCHDAY", active: false }, { type: "DAILY-JACKPOT", active: false } ], isInternational: false, isFriendly: false },

    "Segunda Liga Portugal": { _id: "SEGUNLIGAPORTUGAL-"+season, name:"Segunda Liga", division: 2, season: season, country: "Portugal", active: true, isCup: false, availableGames: [ { type: "SINGLE", active: false }, { type: "MATCHDAY", active: false }, { type: "DAILY-JACKPOT", active: false } ], isInternational: false, isFriendly: false },

    "Primera Division: Apertura Uruguay": { _id: "PRIMAPERURUGUAY-"+season, name:"Primera Division: Apertura", division: 1, season: season, country: "Uruguay", active: true, isCup: false, availableGames: [ { type: "SINGLE", active: false }, { type: "MATCHDAY", active: false }, { type: "DAILY-JACKPOT", active: false } ], isInternational: false, isFriendly: false  },

    "Primera Division: Clausura Uruguay": { _id: "PRIMCLAUURUGUAY-"+season, name:"Primera Division: Clausura", division: 1, season: season, country: "Uruguay", active: true, isCup: false, availableGames: [ { type: "SINGLE", active: false }, { type: "MATCHDAY", active: false }, { type: "DAILY-JACKPOT", active: false } ], isInternational: false, isFriendly: false  },

    "Thai Premier League Thailand": { _id: "PLEAGUETHAI-"+season, name:"Thai Premier League", division: 1, season: season, country: "Thailand", active: true, isCup: false, availableGames: [ { type: "SINGLE", active: false }, { type: "MATCHDAY", active: false }, { type: "DAILY-JACKPOT", active: true } ], isInternational: false, isFriendly: false  },

    "USL 1 USA": { _id: "UNISOCCERLEAGUE1-"+season, name:"United Soccer League", division: 2, season: season, country: "USA", active: true, isCup: false, availableGames: [ { type: "SINGLE", active: false }, { type: "MATCHDAY", active: false }, { type: "DAILY-JACKPOT", active: false } ], isInternational: false, isFriendly: false  },

    "Major League Soccer USA": { _id: "MSLUSA-"+season, name:"Major League Soccer", division: 1, season: season, country: "USA", active: true, isCup: false, availableGames: [ { type: "SINGLE", active: false }, { type: "MATCHDAY", active: false }, { type: "DAILY-JACKPOT", active: false } ], isInternational: false, isFriendly: false  },

    "Botola Pro": { _id: "BOTOLAPRO-"+season, name:"Botola", division: 1, season: season, country: "Morocco", active: false, isCup: false, availableGames: [ { type: "SINGLE", active: false }, { type: "MATCHDAY", active: false }, { type: "DAILY-JACKPOT", active: false } ], isInternational: false, isFriendly: false  },

    "Liga MX": { _id: "LIGAMX-"+season, name:"Liga MX", division: 1, season: season, country: "Mexico", active: true, isCup: false, availableGames: [ { type: "SINGLE", active: false }, { type: "MATCHDAY", active: false }, { type: "DAILY-JACKPOT", active: false } ], isInternational: false, isFriendly: false  },

    "Super League Switzerland": { _id: "SLEAGUESWITZER-"+season, name:"Super League", division: 1, season: season, country: "Switzerland", active: true, isCup: false, availableGames: [ { type: "SINGLE", active: false }, { type: "MATCHDAY", active: false }, { type: "DAILY-JACKPOT", active: false } ], isInternational: false, isFriendly: false  },

    "Challenge League Switzerland": { _id: "CHALLENGESWITZER-"+season, name:"Challenge League", division: 2, season: season, country: "Switzerland", active: true, isCup: false, availableGames: [ { type: "SINGLE", active: false }, { type: "MATCHDAY", active: false }, { type: "DAILY-JACKPOT", active: false } ], isInternational: false, isFriendly: false  },

    /* add avril */
    "Super League Greece": { _id: "SLEAGUEGREEK-"+season, name:"Super League", division: 1, season: season, country: "Greece", active: true, isCup: false, availableGames: [ { type: "SINGLE", active: false }, { type: "MATCHDAY", active: false }, { type: "DAILY-JACKPOT", active: false } ], isInternational: false, isFriendly: false  },

    "Football League Greece": { _id: "FOOTLEAGUEGREEK-"+season, name:"Football League", division: 2, season: season, country: "Greece", active: true, isCup: false, availableGames: [ { type: "SINGLE", active: false }, { type: "MATCHDAY", active: false }, { type: "DAILY-JACKPOT", active: false } ], isInternational: false, isFriendly: false  },

    "Erovnuli Liga Georgia": { _id: "EROVNULI-"+season, name:"Erovnuli", division: 1, season: season, country: "Georgia", active: true, isCup: false, availableGames: [ { type: "SINGLE", active: false }, { type: "MATCHDAY", active: false }, { type: "DAILY-JACKPOT", active: false } ], isInternational: false, isFriendly: false  },

    "Premier League Kuwait": { _id: "PLEAGUEKUWAIT-"+season, name:"Premier League", division: 1, season: season, country: "Kuwait", active: true, isCup: false, availableGames: [ { type: "SINGLE", active: true }, { type: "MATCHDAY", active: false }, { type: "DAILY-JACKPOT", active: false } ], isInternational: false, isFriendly: false  },

    "J-League Japan": { _id: "JLEAGUE-"+season, name:"J-League", division: 1, season: season, country: "Japan", active: true, isCup: false, availableGames: [ { type: "SINGLE", active: true }, { type: "MATCHDAY", active: true }, { type: "DAILY-JACKPOT", active: true } ], isInternational: false, isFriendly: false  },

    "J2-League Japan": { _id: "J2LEAGUE-"+season, name:"J2 League", division: 2, season: season, country: "Japan", active: true, isCup: false, availableGames: [ { type: "SINGLE", active: true }, { type: "MATCHDAY", active: false }, { type: "DAILY-JACKPOT", active: false } ], isInternational: false, isFriendly: false  },

    "J3-League Japan": { _id: "J3LEAGUE-"+season, name:"J3 League", division: 3, season: season, country: "Japan", active: true, isCup: false, availableGames: [ { type: "SINGLE", active: false }, { type: "MATCHDAY", active: false }, { type: "DAILY-JACKPOT", active: false } ], isInternational: false, isFriendly: false  },

    "Esiliiga Estonia": { _id: "ESILIIGA-"+season, name:"Esiliiga", division: 2, season: season, country: "Estonia", active: true, isCup: false, availableGames: [ { type: "SINGLE", active: true }, { type: "MATCHDAY", active: false }, { type: "DAILY-JACKPOT", active: false } ], isInternational: false, isFriendly: false  },

    "League One China PR": { _id: "LEAGUEONECHINA-"+season, name:"League One", division: 2, season: season, country: "China PR", active: true, isCup: false, availableGames: [ { type: "SINGLE", active: true }, { type: "MATCHDAY", active: false }, { type: "DAILY-JACKPOT", active: false } ], isInternational: false, isFriendly: false  },

    "Prva Liga Serbia": { _id: "PRVALIGASERBIA-"+season, name:"Prva Liga", division: 2, season: season, country: "Serbia", active: true, isCup: false, availableGames: [ { type: "SINGLE", active: true }, { type: "MATCHDAY", active: false }, { type: "DAILY-JACKPOT", active: false } ], isInternational: false, isFriendly: false  },

    "First League Macedonia FYR": { _id: "FIRSTLIGMACEDONIA-"+season, name:"First League", division: 1, season: season, country: "Macedonia FYR", active: true, isCup: false, availableGames: [ { type: "SINGLE", active: true }, { type: "MATCHDAY", active: false }, { type: "DAILY-JACKPOT", active: false } ], isInternational: false, isFriendly: false  },

    "Superliga Denmark": { _id: "SUPERLIGADENMARK-"+season, name:"Superliga", division: 1, season: season, country: "Denmark", active: true, isCup: false, availableGames: [ { type: "SINGLE", active: true }, { type: "MATCHDAY", active: true }, { type: "DAILY-JACKPOT", active: true } ], isInternational: false, isFriendly: false  },


    "Primera A: Apertura Ecuador": { _id: "PRIMAPERECUADOR-"+season, name:"Primera A: Apertura", division: 1, season: season, country: "Ecuador", active: true, isCup: false, availableGames: [ { type: "SINGLE", active: true }, { type: "MATCHDAY", active: false }, { type: "DAILY-JACKPOT", active: true } ], isInternational: false, isFriendly: false  },

    "Primera A: Clausura Ecuador": { _id: "PRIMACLAUECUADOR-"+season, name:"Primera A: Clausura", division: 1, season: season, country: "Ecuador", active: true, isCup: false, availableGames: [ { type: "SINGLE", active: true }, { type: "MATCHDAY", active: false }, { type: "DAILY-JACKPOT", active: true } ], isInternational: false, isFriendly: false  },

    "Primera B Ecuador": { _id: "PRIMBECUADOR-"+season, name:"Primera B", division: 2, season: season, country: "Ecuador", active: true, isCup: false, availableGames: [ { type: "SINGLE", active: true }, { type: "MATCHDAY", active: false }, { type: "DAILY-JACKPOT", active: false } ], isInternational: false, isFriendly: false  },

    "Premier League Azerbaijan": { _id: "PLEAGUEAZER-"+season, name:"Premier League", division: 1, season: season, country: "Azerbaijan", active: true, isCup: false, availableGames: [ { type: "SINGLE", active: true }, { type: "MATCHDAY", active: false }, { type: "DAILY-JACKPOT", active: false } ], isInternational: false, isFriendly: false  },

    "Birinci Dasta Azerbaijan": { _id: "BIRINCIAZER-"+season, name:"Birinci Dasta", division: 2, season: season, country: "Azerbaijan", active: true, isCup: false, availableGames: [ { type: "SINGLE", active: true }, { type: "MATCHDAY", active: false }, { type: "DAILY-JACKPOT", active: false } ], isInternational: false, isFriendly: false  },

    "Vysshaya Liga Belarus": { _id: "VYSSHAYAAZER-"+season, name:"Vysshaya Liga", division: 1, season: season, country: "Belarus", active: true, isCup: false, availableGames: [ { type: "SINGLE", active: true }, { type: "MATCHDAY", active: false }, { type: "DAILY-JACKPOT", active: false } ], isInternational: false, isFriendly: false  },

    "First Division Belarus": { _id: "FIRSTDIVBELARUS-"+season, name:"First Division", division: 2, season: season, country: "Belarus", active: true, isCup: false, availableGames: [ { type: "SINGLE", active: true }, { type: "MATCHDAY", active: false }, { type: "DAILY-JACKPOT", active: true } ], isInternational: false, isFriendly: false  },

    "Second Division Belarus": { _id: "SECONDIVBELARUS-"+season, name:"Second Division", division: 3, season: season, country: "Belarus", active: false, isCup: false, availableGames: [ { type: "SINGLE", active: false }, { type: "MATCHDAY", active: false }, { type: "DAILY-JACKPOT", active: false } ], isInternational: false, isFriendly: false  },

    "Premier Liga Bosnia and Herzegovina": { _id: "PLIGABOSNIA-"+season, name:"Premier Liga", division: 1, season: season, country: "Bosnia and Herzegovina", active: true, isCup: false, availableGames: [ { type: "SINGLE", active: true }, { type: "MATCHDAY", active: false }, { type: "DAILY-JACKPOT", active: false } ], isInternational: false, isFriendly: false  },

    "Liga 2 Georgia": { _id: "LIGA2GEORGIA-"+season, name:"Liga 2", division: 2, season: season, country: "Georgia", active: true, isCup: false, availableGames: [ { type: "SINGLE", active: true }, { type: "MATCHDAY", active: false }, { type: "DAILY-JACKPOT", active: false } ], isInternational: false, isFriendly: false  },

    "Pepsideild Iceland": { _id: "PEPSIICELAND-"+season, name:"Pepsideild", division: 1, season: season, country: "Iceland", active: true, isCup: false, availableGames: [ { type: "SINGLE", active: true }, { type: "MATCHDAY", active: false }, { type: "DAILY-JACKPOT", active: true } ], isInternational: false, isFriendly: false  },

    "Inkasso-Deildin Iceland": { _id: "INKASSOICELAND-"+season, name:"Inkasso-Deildin", division: 2, season: season, country: "Iceland", active: true, isCup: false, availableGames: [ { type: "SINGLE", active: true }, { type: "MATCHDAY", active: false }, { type: "DAILY-JACKPOT", active: false } ], isInternational: false, isFriendly: false  },

    "2. Deild Iceland": { _id: "DEILDICELAND-"+season, name:"2. Deild", division: 3, season: season, country: "Iceland", active: false, isCup: false, availableGames: [ { type: "SINGLE", active: false }, { type: "MATCHDAY", active: false }, { type: "DAILY-JACKPOT", active: false } ], isInternational: false, isFriendly: false  },

    "Liga 1 Indonesia": { _id: "LIGA1INDONESIA-"+season, name:"Liga 1", division: 1, season: season, country: "Indonesia", active: true, isCup: false, availableGames: [ { type: "SINGLE", active: true }, { type: "MATCHDAY", active: true }, { type: "DAILY-JACKPOT", active: false } ], isInternational: false, isFriendly: false  },

    "Liga 2 Indonesia": { _id: "LIGA2INDONESIA-"+season, name:"Liga 2", division: 2, season: season, country: "Indonesia", active: false, isCup: false, availableGames: [ { type: "SINGLE", active: false }, { type: "MATCHDAY", active: false }, { type: "DAILY-JACKPOT", active: false } ], isInternational: false, isFriendly: false  },

    "Virsliga Latvia": { _id: "VIRSLIGALATVIA-"+season, name:"Virsliga", division: 1, season: season, country: "Latvia", active: true, isCup: false, availableGames: [ { type: "SINGLE", active: true }, { type: "MATCHDAY", active: false }, { type: "DAILY-JACKPOT", active: true } ], isInternational: false, isFriendly: false  },

    "First Liga Latvia": { _id: "FIRSTLIGALATVIA-"+season, name:"First Liga", division: 2, season: season, country: "Latvia", active: false, isCup: false, availableGames: [ { type: "SINGLE", active: false }, { type: "MATCHDAY", active: false }, { type: "DAILY-JACKPOT", active: false } ], isInternational: false, isFriendly: false  },

    "A Lyga Lithuania": { _id: "ALYGALITH-"+season, name:"A Lyga", division: 1, season: season, country: "Lithuania", active: true, isCup: false, availableGames: [ { type: "SINGLE", active: true }, { type: "MATCHDAY", active: false }, { type: "DAILY-JACKPOT", active: false } ], isInternational: false, isFriendly: false  },

    "1. Lyga Lithuania": { _id: "1LYGALITH-"+season, name:"1. Lyga", division: 2, season: season, country: "Lithuania", active: false, isCup: false, availableGames: [ { type: "SINGLE", active: false }, { type: "MATCHDAY", active: false }, { type: "DAILY-JACKPOT", active: false } ], isInternational: false, isFriendly: false  },

    "Premier League Kazakhstan": { _id: "PLEAGUEKAZAK-"+season, name:"Premier League", division: 1, season: season, country: "Kazakhstan", active: false, isCup: false, availableGames: [ { type: "SINGLE", active: false }, { type: "MATCHDAY", active: false }, { type: "DAILY-JACKPOT", active: false } ], isInternational: false, isFriendly: false  },

    "First Division Kazakhstan": { _id: "FIRSTDIVKAZAK-"+season, name:"First Division", division: 2, season: season, country: "Kazakhstan", active: false, isCup: false, availableGames: [ { type: "SINGLE", active: false }, { type: "MATCHDAY", active: false }, { type: "DAILY-JACKPOT", active: false } ], isInternational: false, isFriendly: false  },

    "Premier League Malaysia": { _id: "PLEAGUEMALAYSIA-"+season, name:"Premier League", division: 1, season: season, country: "Malaysia", active: true, isCup: false, availableGames: [ { type: "SINGLE", active: true }, { type: "MATCHDAY", active: false }, { type: "DAILY-JACKPOT", active: true } ], isInternational: false, isFriendly: false  },

    "Super League Malaysia": { _id: "SLEAGUEMALAYSIA-"+season, name:"Super League", division: 2, season: season, country: "Malaysia", active: false, isCup: false, availableGames: [ { type: "SINGLE", active: false }, { type: "MATCHDAY", active: false }, { type: "DAILY-JACKPOT", active: false } ], isInternational: false, isFriendly: false  },

    "Premiership New Zealand": { _id: "PREMSNEWZELAND-"+season, name:"Premiership", division: 1, season: season, country: "New Zealand", active: true, isCup: false, availableGames: [ { type: "SINGLE", active: true }, { type: "MATCHDAY", active: false }, { type: "DAILY-JACKPOT", active: false } ], isInternational: false, isFriendly: false  },

    "Division 1: Apertura Paraguay": { _id: "DIV1APERPARA-"+season, name:"Division 1: Apertura", division: 1, season: season, country: "Paraguay", active: true, isCup: false, availableGames: [ { type: "SINGLE", active: true }, { type: "MATCHDAY", active: false }, { type: "DAILY-JACKPOT", active: false } ], isInternational: false, isFriendly: false  },

    "Division 1: Clausura Paraguay": { _id: "DIV1CLAUPARA-"+season, name:"Division 1: Clausura", division: 1, season: season, country: "Paraguay", active: true, isCup: false, availableGames: [ { type: "SINGLE", active: true }, { type: "MATCHDAY", active: false }, { type: "DAILY-JACKPOT", active: false } ], isInternational: false, isFriendly: false  },

    "Division Intermedia Paraguay": { _id: "DIVINTERPARA-"+season, name:"Division Intermedia", division: 2, season: season, country: "Paraguay", active: false, isCup: false, availableGames: [ { type: "SINGLE", active: false }, { type: "MATCHDAY", active: false }, { type: "DAILY-JACKPOT", active: false } ], isInternational: false, isFriendly: false  },

    "UFL Philippines": { _id: "UFLPHILIP-"+season, name:"UFL", division: 1, season: season, country: "Philippines", active: false, isCup: false, availableGames: [ { type: "SINGLE", active: false }, { type: "MATCHDAY", active: false }, { type: "DAILY-JACKPOT", active: false } ], isInternational: false, isFriendly: false  },

    "FNL Russia": { _id: "FNLRUSSIA-"+season, name:"FNL", division: 2, season: season, country: "Russia", active: false, isCup: false, availableGames: [ { type: "SINGLE", active: false }, { type: "MATCHDAY", active: false }, { type: "DAILY-JACKPOT", active: false } ], isInternational: false, isFriendly: false  },

    "Youth League Russia": { _id: "YOUTHRUSSIA-"+season, name:"Youth League", division: 3, season: season, country: "Russia", active: false, isCup: false, availableGames: [ { type: "SINGLE", active: false }, { type: "MATCHDAY", active: false }, { type: "DAILY-JACKPOT", active: false } ], isInternational: false, isFriendly: false  },

    "S. League Singapore": { _id: "SLEAGUESINGAPORE-"+season, name:"S. League", division: 1, season: season, country: "Singapore", active: true, isCup: false, availableGames: [ { type: "SINGLE", active: true }, { type: "MATCHDAY", active: false }, { type: "DAILY-JACKPOT", active: true } ], isInternational: false, isFriendly: false  },

    "Persha Liga Ukraine": { _id: "PERSHALIGAUKR-"+season, name:"Persha Liga", division: 2, season: season, country: "Ukraine", active: false, isCup: false, availableGames: [ { type: "SINGLE", active: false }, { type: "MATCHDAY", active: false }, { type: "DAILY-JACKPOT", active: false } ], isInternational: false, isFriendly: false  },

    "Segunda Division Uruguay": { _id: "SEGUNDADIVURU-"+season, name:"Segunda Division", division: 3, season: season, country: "Uruguay", active: false, isCup: false, availableGames: [ { type: "SINGLE", active: false }, { type: "MATCHDAY", active: false }, { type: "DAILY-JACKPOT", active: false } ], isInternational: false, isFriendly: false  },

    "First Division B Belgium": { _id: "FIRSTDIVBBELGIUM-"+season, name:"First Division B", division: 2, season: season, country: "Belgium", active: true, isCup: false, availableGames: [ { type: "SINGLE", active: true }, { type: "MATCHDAY", active: false }, { type: "DAILY-JACKPOT", active: false } ], isInternational: false, isFriendly: false  },

    "Liga Nacional Guatemala": { _id: "LIGANACIOGUAT-"+season, name:"Liga Nacional", division: 2, season: season, country: "Guatemala", active: false, isCup: false, availableGames: [ { type: "SINGLE", active: false }, { type: "MATCHDAY", active: false }, { type: "DAILY-JACKPOT", active: false } ], isInternational: false, isFriendly: false  },

    "Primera Division Guatemala": { _id: "PRIMDIVGUAT-"+season, name:"Primera Division", division: 1, season: season, country: "Guatemala", active: true, isCup: false, availableGames: [ { type: "SINGLE", active: true }, { type: "MATCHDAY", active: false }, { type: "DAILY-JACKPOT", active: false } ], isInternational: false, isFriendly: false  },


    //"": { _id: "-"+season, name:"", division: 1, season: season, country: "", active: true, isCup: false, availableGames: [ { type: "SINGLE", active: true }, { type: "MATCHDAY", active: false }, { type: "DAILY-JACKPOT", active: false } ], isInternational: false, isFriendly: false },

    "Serie C Brazil": { _id: "SERIECBRAZIL-"+season, name:"Serie C", division: 3, season: season, country: "Brazil", active: false, isCup: false, availableGames: [ { type: "SINGLE", active: false }, { type: "MATCHDAY", active: false }, { type: "DAILY-JACKPOT", active: false } ], isInternational: false, isFriendly: false  },

    "Serie D Brazil": { _id: "SERIEDBRAZIL-"+season, name:"Serie D", division: 4, season: season, country: "Brazil", active: false, isCup: false, availableGames: [ { type: "SINGLE", active: false }, { type: "MATCHDAY", active: false }, { type: "DAILY-JACKPOT", active: false } ], isInternational: false, isFriendly: false  },

    "Primera B Metropolitana Argentina": { _id: "PRIMBMETROARGENTINA-"+season, name:"Primera B Metropolitana", division: 3, season: season, country: "Argentina", active: false, isCup: false, availableGames: [ { type: "SINGLE", active: false }, { type: "MATCHDAY", active: false }, { type: "DAILY-JACKPOT", active: false } ], isInternational: false, isFriendly: false  },

    "Primera C Argentina": { _id: "PRIMCARGENTINA-"+season, name:"Primera C", division: 4, season: season, country: "Argentina", active: false, isCup: false, availableGames: [ { type: "SINGLE", active: false }, { type: "MATCHDAY", active: false }, { type: "DAILY-JACKPOT", active: false } ], isInternational: false, isFriendly: false  },

    "Primera D Metropolitana Argentina": { _id: "PRIMDMETROARGENTINA-"+season, name:"Primera D Metropolitana", division: 5, season: season, country: "Argentina", active: false, isCup: false, availableGames: [ { type: "SINGLE", active: false }, { type: "MATCHDAY", active: false }, { type: "DAILY-JACKPOT", active: false } ], isInternational: false, isFriendly: false  },

    "Liga 2: Serie 1 Romania": { _id: "LIGA2SER1ROMANIA-"+season, name:"Liga 2", division: 2, season: season, country: "Romania", active: false, isCup: false, availableGames: [ { type: "SINGLE", active: false }, { type: "MATCHDAY", active: false }, { type: "DAILY-JACKPOT", active: false } ], isInternational: false, isFriendly: false  },

    "Liga 2: Seria 2 Romania": { _id: "LIGA2SER2ROMANIA-"+season, name:"Liga 2", division: 2, season: season, country: "Romania", active: false, isCup: false, availableGames: [ { type: "SINGLE", active: false }, { type: "MATCHDAY", active: false }, { type: "DAILY-JACKPOT", active: false } ], isInternational: false, isFriendly: false  },

    "2. Division Group 1 Denmark": { _id: "2DIVGROUP1DENMARK-"+season, name:"2. Division : Group 1", division: 3, season: season, country: "Denmark", active: false, isCup: false, availableGames: [ { type: "SINGLE", active: false }, { type: "MATCHDAY", active: false }, { type: "DAILY-JACKPOT", active: false } ], isInternational: false, isFriendly: false },

    "2. Division Group 2 Denmark": { _id: "2DIVGROUP2DENMARK-"+season, name:"2. Division : Group 2", division: 3, season: season, country: "Denmark", active: false, isCup: false, availableGames: [ { type: "SINGLE", active: false }, { type: "MATCHDAY", active: false }, { type: "DAILY-JACKPOT", active: false } ], isInternational: false, isFriendly: false },

    "2. Division Group 3 Denmark": { _id: "2DIVGROUP3DENMARK-"+season, name:"2. Division : Group 3", division: 3, season: season, country: "Denmark", active: false, isCup: false, availableGames: [ { type: "SINGLE", active: false }, { type: "MATCHDAY", active: false }, { type: "DAILY-JACKPOT", active: false } ], isInternational: false, isFriendly: false },

    "2. Division Group East Denmark": { _id: "2DIVGROUPEASTDENMARK-"+season, name:"2. Division : Group East", division: 3, season: season, country: "Denmark", active: false, isCup: false, availableGames: [ { type: "SINGLE", active: false }, { type: "MATCHDAY", active: false }, { type: "DAILY-JACKPOT", active: false } ], isInternational: false, isFriendly: false },

    "2. Division Group West Denmark": { _id: "2DIVGROUPWESTDENMARK-"+season, name:"2. Division : Group West", division: 3, season: season, country: "Denmark", active: false, isCup: false, availableGames: [ { type: "SINGLE", active: false }, { type: "MATCHDAY", active: false }, { type: "DAILY-JACKPOT", active: false } ], isInternational: false, isFriendly: false },

    "First League Montenegro": { _id: "FIRSTLEAGUEMONTEN-"+season, name:"First League", division: 1, season: season, country: "Montenegro", active: true, isCup: false, availableGames: [ { type: "SINGLE", active: true }, { type: "MATCHDAY", active: false }, { type: "DAILY-JACKPOT", active: false } ], isInternational: false, isFriendly: false  },

    "Second League Montenegro": { _id: "SECONDLEAGUEMONTEN-"+season, name:"Second League", division: 2, season: season, country: "Montenegro", active: false, isCup: false, availableGames: [ { type: "SINGLE", active: false }, { type: "MATCHDAY", active: false }, { type: "DAILY-JACKPOT", active: false } ], isInternational: false, isFriendly: false  },

    "Obos-Ligaen Norway": { _id: "OBOSLIGAEN-"+season, name:"Obos-Ligaen", division: 2, season: season, country: "Norway", active: true, isCup: false, availableGames: [ { type: "SINGLE", active: false }, { type: "MATCHDAY", active: false }, { type: "DAILY-JACKPOT", active: false } ], isInternational: false, isFriendly: false },

    "2. Division: Group 1 Norway": { _id: "2DIVGROUP1NORWAY-"+season, name:"2. Division: Group 1", division: 3, season: season, country: "Norway", active: false, isCup: false, availableGames: [ { type: "SINGLE", active: false }, { type: "MATCHDAY", active: false }, { type: "DAILY-JACKPOT", active: false } ], isInternational: false, isFriendly: false },

    "2. Division: Group 2 Norway": { _id: "2DIVGROUP2NORWAY-"+season, name:"2. Division: Group 2", division: 3, season: season, country: "Norway", active: false, isCup: false, availableGames: [ { type: "SINGLE", active: false }, { type: "MATCHDAY", active: false }, { type: "DAILY-JACKPOT", active: false } ], isInternational: false, isFriendly: false },

    "2. Division: Group 3 Norway": { _id: "2DIVGROUP3NORWAY-"+season, name:"2. Division: Group 3", division: 3, season: season, country: "Norway", active: false, isCup: false, availableGames: [ { type: "SINGLE", active: false }, { type: "MATCHDAY", active: false }, { type: "DAILY-JACKPOT", active: false } ], isInternational: false, isFriendly: false },

    "2. Division: Group 4 Norway": { _id: "2DIVGROUP4NORWAY-"+season, name:"2. Division: Group 4", division: 3, season: season, country: "Norway", active: false, isCup: false, availableGames: [ { type: "SINGLE", active: false }, { type: "MATCHDAY", active: false }, { type: "DAILY-JACKPOT", active: false } ], isInternational: false, isFriendly: false },

    "2. Liga East Poland": { _id: "2LIGAEASTPOLAND-"+season, name:"2. Liga East", division: 3, season: season, country: "Poland", active: false, isCup: false, availableGames: [ { type: "SINGLE", active: false }, { type: "MATCHDAY", active: false }, { type: "DAILY-JACKPOT", active: false } ], isInternational: false, isFriendly: false  },

    "2. Liga West Poland": { _id: "2LIGAWESTPOLAND-"+season, name:"2. Liga West", division: 3, season: season, country: "Poland", active: false, isCup: false, availableGames: [ { type: "SINGLE", active: false }, { type: "MATCHDAY", active: false }, { type: "DAILY-JACKPOT", active: false } ], isInternational: false, isFriendly: false  },

    "Ykkonen Finland": { _id: "YKKONENFINLAND-"+season, name:"Ykkonen", division: 2, season: season, country: "Finland", active: false, isCup: false, availableGames: [ { type: "SINGLE", active: false }, { type: "MATCHDAY", active: false }, { type: "DAILY-JACKPOT", active: false } ], isInternational: false, isFriendly: false },

    "Kakkonen-LohkoA Finland": { _id: "KAKKONEN1FINLAND-"+season, name:"Kakkonen-LohkoA", division: 3, season: season, country: "Finland", active: false, isCup: false, availableGames: [ { type: "SINGLE", active: false }, { type: "MATCHDAY", active: false }, { type: "DAILY-JACKPOT", active: false } ], isInternational: false, isFriendly: false },

    "Kakkonen-LohkoB Finland": { _id: "KAKKONEN2FINLAND-"+season, name:"Kakkonen-LohkoB", division: 3, season: season, country: "Finland", active: false, isCup: false, availableGames: [ { type: "SINGLE", active: false }, { type: "MATCHDAY", active: false }, { type: "DAILY-JACKPOT", active: false } ], isInternational: false, isFriendly: false },

    "Kakkonen-LohkoC Finland": { _id: "KAKKONEN3FINLAND-"+season, name:"Kakkonen-LohkoC", division: 3, season: season, country: "Finland", active: false, isCup: false, availableGames: [ { type: "SINGLE", active: false }, { type: "MATCHDAY", active: false }, { type: "DAILY-JACKPOT", active: false } ], isInternational: false, isFriendly: false },

    "Kakkonen-LohkoD Finland": { _id: "KAKKONEN4FINLAND-"+season, name:"Kakkonen-LohkoD", division: 3, season: season, country: "Finland", active: false, isCup: false, availableGames: [ { type: "SINGLE", active: false }, { type: "MATCHDAY", active: false }, { type: "DAILY-JACKPOT", active: false } ], isInternational: false, isFriendly: false },

    // 18 Mai 2018
    "Primera Division Venezuela": { _id: "PRIMDIVVENEZUELA-"+season, name:"Primera Division", division: 1, season: season, country: "Venezuela", active: false, isCup: false, availableGames: [ { type: "SINGLE", active: false }, { type: "MATCHDAY", active: false }, { type: "DAILY-JACKPOT", active: false } ], isInternational: false, isFriendly: false },

    "Segunda Division Venezuela": { _id: "SEGONDADIVVENEZUELA-"+season, name:"Segunda Division", division: 2, season: season, country: "Venezuela", active: false, isCup: false, availableGames: [ { type: "SINGLE", active: false }, { type: "MATCHDAY", active: false }, { type: "DAILY-JACKPOT", active: false } ], isInternational: false, isFriendly: false },

    "V-League Vietnam": { _id: "VLEAGUE-"+season, name:"V-League", division: 1, season: season, country: "Vietnam", active: true, isCup: false, availableGames: [ { type: "SINGLE", active: true }, { type: "MATCHDAY", active: false }, { type: "DAILY-JACKPOT", active: false } ], isInternational: false, isFriendly: false },

    "V-League 2 Vietnam": { _id: "VLEAGUE2-"+season, name:"V-League 2", division: 2, season: season, country: "Vietnam", active: false, isCup: false, availableGames: [ { type: "SINGLE", active: false }, { type: "MATCHDAY", active: false }, { type: "DAILY-JACKPOT", active: false } ], isInternational: false, isFriendly: false },

    "Thai League Two Thailand": { _id: "THAILEAGUETWO-"+season, name:"Thai League Two", division: 2, season: season, country: "Thailand", active: false, isCup: false, availableGames: [ { type: "SINGLE", active: false }, { type: "MATCHDAY", active: false }, { type: "DAILY-JACKPOT", active: false } ], isInternational: false, isFriendly: false  },

    "1.Liga Classic Switzerland": { _id: "1LIGACLASSIC-"+season, name:"1.Liga Classic", division: 3, season: season, country: "Switzerland", active: false, isCup: false, availableGames: [ { type: "SINGLE", active: false }, { type: "MATCHDAY", active: false }, { type: "DAILY-JACKPOT", active: false } ], isInternational: false, isFriendly: false  },

    "Superliga Kosovo": { _id: "SUPERLIGAKOSOVO-"+season, name:"Superliga", division: 1, season: season, country: "Kosovo", active: true, isCup: false, availableGames: [ { type: "SINGLE", active: true }, { type: "MATCHDAY", active: false }, { type: "DAILY-JACKPOT", active: false } ], isInternational: false, isFriendly: false },

    // 19 mai
    "Segunda B - Playoffs": { _id: "SEGUNDABGPLAYOFFS-"+season, name:"Segunda B - Playoffs", division: 3, season: season, country: "Spain", active: false, isCup: false, availableGames: [ { type: "SINGLE", active: false }, { type: "MATCHDAY", active: false }, { type: "DAILY-JACKPOT", active: false } ], isInternational: false, isFriendly: false },

    "Tercera - Group 1": { _id: "TERCERAGP1-"+season, name:"Tercera - Group 1", division: 4, season: season, country: "Spain", active: false, isCup: false, availableGames: [ { type: "SINGLE", active: false }, { type: "MATCHDAY", active: false }, { type: "DAILY-JACKPOT", active: false } ], isInternational: false, isFriendly: false },

    "Tercera - Group 2": { _id: "TERCERAGP2-"+season, name:"Tercera - Group 2", division: 4, season: season, country: "Spain", active: false, isCup: false, availableGames: [ { type: "SINGLE", active: false }, { type: "MATCHDAY", active: false }, { type: "DAILY-JACKPOT", active: false } ], isInternational: false, isFriendly: false },

    "Tercera - Group 3": { _id: "TERCERAGP3-"+season, name:"Tercera - Group 3", division: 4, season: season, country: "Spain", active: false, isCup: false, availableGames: [ { type: "SINGLE", active: false }, { type: "MATCHDAY", active: false }, { type: "DAILY-JACKPOT", active: false } ], isInternational: false, isFriendly: false },

    "Tercera - Group 4": { _id: "TERCERAGP4-"+season, name:"Tercera - Group 4", division: 4, season: season, country: "Spain", active: false, isCup: false, availableGames: [ { type: "SINGLE", active: false }, { type: "MATCHDAY", active: false }, { type: "DAILY-JACKPOT", active: false } ], isInternational: false, isFriendly: false },

    "Tercera - Group 5": { _id: "TERCERAGP5-"+season, name:"Tercera - Group 5", division: 4, season: season, country: "Spain", active: false, isCup: false, availableGames: [ { type: "SINGLE", active: false }, { type: "MATCHDAY", active: false }, { type: "DAILY-JACKPOT", active: false } ], isInternational: false, isFriendly: false },

    "Tercera - Group 6": { _id: "TERCERAGP6-"+season, name:"Tercera - Group 6", division: 4, season: season, country: "Spain", active: false, isCup: false, availableGames: [ { type: "SINGLE", active: false }, { type: "MATCHDAY", active: false }, { type: "DAILY-JACKPOT", active: false } ], isInternational: false, isFriendly: false },

    "Tercera - Group 7": { _id: "TERCERAGP7-"+season, name:"Tercera - Group 7", division: 4, season: season, country: "Spain", active: false, isCup: false, availableGames: [ { type: "SINGLE", active: false }, { type: "MATCHDAY", active: false }, { type: "DAILY-JACKPOT", active: false } ], isInternational: false, isFriendly: false },

    "Tercera - Group 8": { _id: "TERCERAGP8-"+season, name:"Tercera - Group 8", division: 4, season: season, country: "Spain", active: false, isCup: false, availableGames: [ { type: "SINGLE", active: false }, { type: "MATCHDAY", active: false }, { type: "DAILY-JACKPOT", active: false } ], isInternational: false, isFriendly: false },

    "Tercera - Group 9": { _id: "TERCERAGP9-"+season, name:"Tercera - Group 9", division: 4, season: season, country: "Spain", active: false, isCup: false, availableGames: [ { type: "SINGLE", active: false }, { type: "MATCHDAY", active: false }, { type: "DAILY-JACKPOT", active: false } ], isInternational: false, isFriendly: false },

    "Tercera - Group 10": { _id: "TERCERAGP10-"+season, name:"Tercera - Group 10", division: 4, season: season, country: "Spain", active: false, isCup: false, availableGames: [ { type: "SINGLE", active: false }, { type: "MATCHDAY", active: false }, { type: "DAILY-JACKPOT", active: false } ], isInternational: false, isFriendly: false },

    "Tercera - Group 11": { _id: "TERCERAGP11-"+season, name:"Tercera - Group 11", division: 4, season: season, country: "Spain", active: false, isCup: false, availableGames: [ { type: "SINGLE", active: false }, { type: "MATCHDAY", active: false }, { type: "DAILY-JACKPOT", active: false } ], isInternational: false, isFriendly: false },

    "Tercera - Group 12": { _id: "TERCERAGP12-"+season, name:"Tercera - Group 12", division: 4, season: season, country: "Spain", active: false, isCup: false, availableGames: [ { type: "SINGLE", active: false }, { type: "MATCHDAY", active: false }, { type: "DAILY-JACKPOT", active: false } ], isInternational: false, isFriendly: false },

    "Tercera - Group 13": { _id: "TERCERAGP13-"+season, name:"Tercera - Group 13", division: 4, season: season, country: "Spain", active: false, isCup: false, availableGames: [ { type: "SINGLE", active: false }, { type: "MATCHDAY", active: false }, { type: "DAILY-JACKPOT", active: false } ], isInternational: false, isFriendly: false },

    "Tercera - Group 14": { _id: "TERCERAGP14-"+season, name:"Tercera - Group 14", division: 4, season: season, country: "Spain", active: false, isCup: false, availableGames: [ { type: "SINGLE", active: false }, { type: "MATCHDAY", active: false }, { type: "DAILY-JACKPOT", active: false } ], isInternational: false, isFriendly: false },

    "Tercera - Group 15": { _id: "TERCERAGP15-"+season, name:"Tercera - Group 15", division: 4, season: season, country: "Spain", active: false, isCup: false, availableGames: [ { type: "SINGLE", active: false }, { type: "MATCHDAY", active: false }, { type: "DAILY-JACKPOT", active: false } ], isInternational: false, isFriendly: false },

    "Tercera - Group 16": { _id: "TERCERAGP16-"+season, name:"Tercera - Group 16", division: 4, season: season, country: "Spain", active: false, isCup: false, availableGames: [ { type: "SINGLE", active: false }, { type: "MATCHDAY", active: false }, { type: "DAILY-JACKPOT", active: false } ], isInternational: false, isFriendly: false },

    "Tercera - Group 17": { _id: "TERCERAGP17-"+season, name:"Tercera - Group 17", division: 4, season: season, country: "Spain", active: false, isCup: false, availableGames: [ { type: "SINGLE", active: false }, { type: "MATCHDAY", active: false }, { type: "DAILY-JACKPOT", active: false } ], isInternational: false, isFriendly: false },

    "Tercera - Group 18": { _id: "TERCERAGP18-"+season, name:"Tercera - Group 18", division: 4, season: season, country: "Spain", active: false, isCup: false, availableGames: [ { type: "SINGLE", active: false }, { type: "MATCHDAY", active: false }, { type: "DAILY-JACKPOT", active: false } ], isInternational: false, isFriendly: false },

    "Tweede Divisie": { _id: "TWEEDEDIVISIE-"+season, name:"Tweede Divisie", division: 3, season: season, country: "Netherlands", active: false, isCup: false, availableGames: [ { type: "SINGLE", active: false }, { type: "MATCHDAY", active: false }, { type: "DAILY-JACKPOT", active: false } ], isInternational: false, isFriendly: false },

    "Eredivisie Women": { _id: "EREDIVISIEWOMEN-"+season, name:"Eredivisie Women", division: 1, season: season, country: "Netherlands", active: false, isCup: false, availableGames: [ { type: "SINGLE", active: false }, { type: "MATCHDAY", active: false }, { type: "DAILY-JACKPOT", active: false } ], isInternational: false, isFriendly: false },

    "1. Lig Turkey": { _id: "1LIGTURKEY-"+season, name:"1. Lig", division: 2, season: season, country: "Turkey", active: false, isCup: false, availableGames: [ { type: "SINGLE", active: false }, { type: "MATCHDAY", active: false }, { type: "DAILY-JACKPOT", active: false } ], isInternational: false, isFriendly: false },

    "Paulista A1 Brazil": { _id: "PAULISTA1BRAZIL-"+season, name:"Campeonato Paulista A1", division: 1, season: season, country: "Brazil", active: false, isCup: false, availableGames: [ { type: "SINGLE", active: false }, { type: "MATCHDAY", active: false }, { type: "DAILY-JACKPOT", active: false } ], isInternational: false, isFriendly: false  },

    "Paulista A2 Brazil": { _id: "PAULISTA2BRAZIL-"+season, name:"Campeonato Paulista A2", division: 2, season: season, country: "Brazil", active: false, isCup: false, availableGames: [ { type: "SINGLE", active: false }, { type: "MATCHDAY", active: false }, { type: "DAILY-JACKPOT", active: false } ], isInternational: false, isFriendly: false  },

    "Paulista A3 Brazil": { _id: "PAULISTA3BRAZIL-"+season, name:"Campeonato Paulista A3", division: 3, season: season, country: "Brazil", active: false, isCup: false, availableGames: [ { type: "SINGLE", active: false }, { type: "MATCHDAY", active: false }, { type: "DAILY-JACKPOT", active: false } ], isInternational: false, isFriendly: false  },

    "Carioca 1 Brazil": { _id: "CARIOCA1BRAZIL-"+season, name:"Carioca 1", division: 1, season: season, country: "Brazil", active: false, isCup: false, availableGames: [ { type: "SINGLE", active: false }, { type: "MATCHDAY", active: false }, { type: "DAILY-JACKPOT", active: false } ], isInternational: false, isFriendly: false  },

    "Carioca 2 Brazil": { _id: "CARIOCA2BRAZIL-"+season, name:"Carioca 2", division: 2, season: season, country: "Brazil", active: false, isCup: false, availableGames: [ { type: "SINGLE", active: true }, { type: "MATCHDAY", active: false }, { type: "DAILY-JACKPOT", active: false } ], isInternational: false, isFriendly: false  },

    "Carioca 3 Brazil": { _id: "CARIOCA3BRAZIL-"+season, name:"Carioca 3", division: 3, season: season, country: "Brazil", active: false, isCup: false, availableGames: [ { type: "SINGLE", active: false }, { type: "MATCHDAY", active: false }, { type: "DAILY-JACKPOT", active: false } ], isInternational: false, isFriendly: false  },

    "First League: FBiH Bosnia and Herzegovina": { _id: "FIRSTLEAGUEBOSNIA-"+season, name:"First League: FBiH", division: 2, season: season, country: "Bosnia and Herzegovina", active: false, isCup: false, availableGames: [ { type: "SINGLE", active: false }, { type: "MATCHDAY", active: false }, { type: "DAILY-JACKPOT", active: false } ], isInternational: false, isFriendly: false  },

    "B PFG": { _id: "BPFGBULGARIA-"+season, name:"B PFG", division: 2, season: season, country: "Bulgaria", active: false, isCup: false, availableGames: [ { type: "SINGLE", active: false }, { type: "MATCHDAY", active: false }, { type: "DAILY-JACKPOT", active: false } ], isInternational: false, isFriendly: false },

    "K2-League": { _id: "KLEAGUE2-"+season, name:"K-League 2", division: 2, season: season, country: "Korea Republic", active: false, isCup: false, availableGames: [ { type: "SINGLE", active: false }, { type: "MATCHDAY", active: false }, { type: "DAILY-JACKPOT", active: false } ], isInternational: false, isFriendly: false  },

    "National Division Luxembourg": { _id: "NATIONALDIVLUX-"+season, name:"National Division", division: 1, season: season, country: "Luxembourg", active: true, isCup: false, availableGames: [ { type: "SINGLE", active: true }, { type: "MATCHDAY", active: false }, { type: "DAILY-JACKPOT", active: false } ], isInternational: false, isFriendly: false  },

    //"1.Liga Classic Switzerland": { _id: "1LIGASWITZER-"+season, name:"1.Liga Classic", division: 3, season: season, country: "Switzerland", active: true, isCup: false, availableGames: [ { type: "SINGLE", active: true }, { type: "MATCHDAY", active: false }, { type: "DAILY-JACKPOT", active: false } ], isInternational: false, isFriendly: false  },

    "1.Liga Promotion Switzerland": { _id: "1LIGAPROMOSWITZER-"+season, name:"1.Liga Promotion", division: 3, season: season, country: "Switzerland", active: false, isCup: false, availableGames: [ { type: "SINGLE", active: false }, { type: "MATCHDAY", active: false }, { type: "DAILY-JACKPOT", active: false } ], isInternational: false, isFriendly: false  },

    "Wsl 1 Women England": { _id: "WSL1ENGLAND-"+season, name:"Wsl 1 Women", division: 1, season: season, country: "England", active: true, isCup: false, availableGames: [ { type: "SINGLE", active: true }, { type: "MATCHDAY", active: false }, { type: "DAILY-JACKPOT", active: false } ], isInternational: false, isFriendly: false },

    "Wsl 2 Women England": { _id: "WSL2ENGLAND-"+season, name:"Wsl 2 Women", division: 2, season: season, country: "England", active: false, isCup: false, availableGames: [ { type: "SINGLE", active: false }, { type: "MATCHDAY", active: false }, { type: "DAILY-JACKPOT", active: false } ], isInternational: false, isFriendly: false },

    "NB 2: East": { _id: "NB2EASTHUNGARY-"+season, name:"NB 2 East", division: 2, season: season, country: "Hungary", active: false, isCup: false, availableGames: [ { type: "SINGLE", active: false }, { type: "MATCHDAY", active: false }, { type: "DAILY-JACKPOT", active: false } ], isInternational: false, isFriendly: false  },

    "NB 2: West": { _id: "NB2WESTHUNGARY-"+season, name:"NB 2 West", division: 2, season: season, country: "Hungary", active: false, isCup: false, availableGames: [ { type: "SINGLE", active: false }, { type: "MATCHDAY", active: false }, { type: "DAILY-JACKPOT", active: false } ], isInternational: false, isFriendly: false  },

    // 21 Mai
    "Premier League Ghana": { _id: "PLEAGUEGHANA-"+season, name:"Premier League", division: 1, season: season, country: "Ghana", active: false, isCup: false, availableGames: [ { type: "SINGLE", active: false }, { type: "MATCHDAY", active: false }, { type: "DAILY-JACKPOT", active: false } ], isInternational: false, isFriendly: false  },

    "Damallsvenskan Sweden": { _id: "DAMALLSVENSKAN-"+season, name:"Damallsvenskan Women", division: 1, season: season, country: "Sweden", active: true, isCup: false, availableGames: [ { type: "SINGLE", active: true }, { type: "MATCHDAY", active: true }, { type: "DAILY-JACKPOT", active: true } ], isInternational: false, isFriendly: false  },

    "Primera Division Peru": { _id: "PRIMDIVPERU-"+season, name:"Primera Division", division: 1, season: season, country: "Peru", active: true, isCup: false, availableGames: [ { type: "SINGLE", active: true }, { type: "MATCHDAY", active: true }, { type: "DAILY-JACKPOT", active: false } ], isInternational: false, isFriendly: false  },

    "Segunda Division Peru": { _id: "SEGUNDADIVPERU-"+season, name:"Segunda Division", division: 2, season: season, country: "Peru", active: false, isCup: false, availableGames: [ { type: "SINGLE", active: false }, { type: "MATCHDAY", active: false }, { type: "DAILY-JACKPOT", active: false } ], isInternational: false, isFriendly: false  },

    "3. Liga CFL": { _id: "3LIGACFL-"+season, name:"3. Liga CFL", division: 3, season: season, country: "Czech Republic", active: false, isCup: false, availableGames: [ { type: "SINGLE", active: false }, { type: "MATCHDAY", active: false }, { type: "DAILY-JACKPOT", active: false } ], isInternational: false, isFriendly: false },

    "Premier League Kenya": { _id: "PLEAGUEKENYA-"+season, name:"Premier League", division: 1, season: season, country: "Kenya", active: false, isCup: false, availableGames: [ { type: "SINGLE", active: false }, { type: "MATCHDAY", active: false }, { type: "DAILY-JACKPOT", active: false } ], isInternational: false, isFriendly: false  },

    "Premier League Nigeria": { _id: "PLEAGUENIGERIA-"+season, name:"Premier League", division: 1, season: season, country: "Nigeria", active: false, isCup: false, availableGames: [ { type: "SINGLE", active: false }, { type: "MATCHDAY", active: false }, { type: "DAILY-JACKPOT", active: false } ], isInternational: false, isFriendly: false  },

    //
    "Elite One Cameroon": { _id: "ELITEONECAM-"+season, name:"Elite One", division: 1, season: season, country: "Cameroon", active: false, isCup: false, availableGames: [ { type: "SINGLE", active: false }, { type: "MATCHDAY", active: false }, { type: "DAILY-JACKPOT", active: false } ], isInternational: false, isFriendly: false  },

    "Champoinnat D1 Gabon": { _id: "CHAMPOINNATGABON-"+season, name:"Champoinnat D1", division: 1, season: season, country: "Gabon", active: false, isCup: false, availableGames: [ { type: "SINGLE", active: false }, { type: "MATCHDAY", active: false }, { type: "DAILY-JACKPOT", active: false } ], isInternational: false, isFriendly: false  },

    "Super League Malawi": { _id: "SLEAGUEMALAWI-"+season, name:"Super League", division: 1, season: season, country: "Malawi", active: false, isCup: false, availableGames: [ { type: "SINGLE", active: false }, { type: "MATCHDAY", active: false }, { type: "DAILY-JACKPOT", active: false } ], isInternational: false, isFriendly: false  },

    "Professional League Oman": { _id: "PROLEAGUEOMAN-"+season, name:"Professional League", division: 1, season: season, country: "Oman", active: false, isCup: false, availableGames: [ { type: "SINGLE", active: false }, { type: "MATCHDAY", active: false }, { type: "DAILY-JACKPOT", active: false } ], isInternational: false, isFriendly: false  },

    "National Soccer League Rwanda": { _id: "NLSRWANDA-"+season, name:"National Soccer League", division: 1, season: season, country: "Rwanda", active: false, isCup: false, availableGames: [ { type: "SINGLE", active: false }, { type: "MATCHDAY", active: false }, { type: "DAILY-JACKPOT", active: false } ], isInternational: false, isFriendly: false  },

    "2. Liga: West Slovakia": { _id: "2LIGAWESTSLOVAKIA-"+season, name:"2. Liga West", division: 2, season: season, country: "Slovakia", active: false, isCup: false, availableGames: [ { type: "SINGLE", active: false }, { type: "MATCHDAY", active: false }, { type: "DAILY-JACKPOT", active: false } ], isInternational: false, isFriendly: false },

    "2. Liga: East Slovakia": { _id: "2LIGAEASTSLOVAKIA-"+season, name:"2. Liga East", division: 2, season: season, country: "Slovakia", active: false, isCup: false, availableGames: [ { type: "SINGLE", active: false }, { type: "MATCHDAY", active: false }, { type: "DAILY-JACKPOT", active: false } ], isInternational: false, isFriendly: false },

    "Super League Zambia": { _id: "SLEAGUEZAMBIA-"+season, name:"Super League", division: 1, season: season, country: "Zambia", active: false, isCup: false, availableGames: [ { type: "SINGLE", active: false }, { type: "MATCHDAY", active: false }, { type: "DAILY-JACKPOT", active: false } ], isInternational: false, isFriendly: false  },

    "Liga De Futbol Prof Bolivia": { _id: "LIGAFUTBOLIVIA-"+season, name:"Liga De Futbol Prof", division: 1, season: season, country: "Bolivia", active: true, isCup: false, availableGames: [ { type: "SINGLE", active: false }, { type: "MATCHDAY", active: false }, { type: "DAILY-JACKPOT", active: false } ], isInternational: false, isFriendly: false  },

    "Division d'Honneur Guadeloupe": { _id: "DIVHONNEURGWADA-"+season, name:"Division d'Honneur", division: 1, season: season, country: "Guadeloupe", active: false, isCup: false, availableGames: [ { type: "SINGLE", active: false }, { type: "MATCHDAY", active: false }, { type: "DAILY-JACKPOT", active: false } ], isInternational: false, isFriendly: false  },

    //
    "Denmark Series Group 1 Denmark": { _id: "DENMARKSERIES1-"+season, name:"Denmark Series Group 1", division: 4, season: season, country: "Denmark", active: false, isCup: false, availableGames: [ { type: "SINGLE", active: false }, { type: "MATCHDAY", active: false }, { type: "DAILY-JACKPOT", active: false } ], isInternational: false, isFriendly: false },

    "Denmark Series Group 2 Denmark": { _id: "DENMARKSERIES2-"+season, name:"Denmark Series Group 2", division: 4, season: season, country: "Denmark", active: false, isCup: false, availableGames: [ { type: "SINGLE", active: false }, { type: "MATCHDAY", active: false }, { type: "DAILY-JACKPOT", active: false } ], isInternational: false, isFriendly: false },

    "Denmark Series Group 3 Denmark": { _id: "DENMARKSERIES3-"+season, name:"Denmark Series Group 3", division: 4, season: season, country: "Denmark", active: false, isCup: false, availableGames: [ { type: "SINGLE", active: false }, { type: "MATCHDAY", active: false }, { type: "DAILY-JACKPOT", active: false } ], isInternational: false, isFriendly: false },

    "Denmark Series Group 4 Denmark": { _id: "DENMARKSERIES4-"+season, name:"Denmark Series Group 4", division: 4, season: season, country: "Denmark", active: false, isCup: false, availableGames: [ { type: "SINGLE", active: false }, { type: "MATCHDAY", active: false }, { type: "DAILY-JACKPOT", active: false } ], isInternational: false, isFriendly: false },

    "Premier League Ethiopia": { _id: "PLEAGUEETHIOPIA-"+season, name:"Premier League", division: 1, season: season, country: "Ethiopia", active: false, isCup: false, availableGames: [ { type: "SINGLE", active: false }, { type: "MATCHDAY", active: false }, { type: "DAILY-JACKPOT", active: false } ], isInternational: false, isFriendly: false  },

    "PDL USA": { _id: "PDLUSA-"+season, name:"PDL", division: 3, season: season, country: "USA", active: false, isCup: false, availableGames: [ { type: "SINGLE", active: false }, { type: "MATCHDAY", active: false }, { type: "DAILY-JACKPOT", active: false } ], isInternational: false, isFriendly: false  },

    "National Division Moldova": { _id: "NATDIVMOLDOVA-"+season, name:"National Division", division: 1, season: season, country: "Moldova", active: false, isCup: false, availableGames: [ { type: "SINGLE", active: false }, { type: "MATCHDAY", active: false }, { type: "DAILY-JACKPOT", active: false } ], isInternational: false, isFriendly: false  },

    "Division A Moldova": { _id: "DIVAMOLDOVA-"+season, name:"Division A", division: 2, season: season, country: "Moldova", active: false, isCup: false, availableGames: [ { type: "SINGLE", active: false }, { type: "MATCHDAY", active: false }, { type: "DAILY-JACKPOT", active: false } ], isInternational: false, isFriendly: false  },

    "Division 1: North Sweden": { _id: "DIV1NORTHSWEDEN-"+season, name:"Division 1: North", division: 3, season: season, country: "Sweden", active: false, isCup: false, availableGames: [ { type: "SINGLE", active: false }, { type: "MATCHDAY", active: false }, { type: "DAILY-JACKPOT", active: false } ], isInternational: false, isFriendly: false  },

    "Division 1: South Sweden": { _id: "DIV1SOUTHSWEDEN-"+season, name:"Division 1: South", division: 3, season: season, country: "Sweden", active: false, isCup: false, availableGames: [ { type: "SINGLE", active: false }, { type: "MATCHDAY", active: false }, { type: "DAILY-JACKPOT", active: false } ], isInternational: false, isFriendly: false  },

    "Canadian Soccer League Canada": { _id: "CANASOCCERLEAGUE-"+season, name:"Canadian Soccer League", division: 1, season: season, country: "Canada", active: true, isCup: false, availableGames: [ { type: "SINGLE", active: true }, { type: "MATCHDAY", active: false }, { type: "DAILY-JACKPOT", active: false } ], isInternational: false, isFriendly: false  },

    "PCSL Canada": { _id: "PCSLCANADA-"+season, name:"PCSL", division: 2, season: season, country: "Canada", active: false, isCup: false, availableGames: [ { type: "SINGLE", active: false }, { type: "MATCHDAY", active: false }, { type: "DAILY-JACKPOT", active: false } ], isInternational: false, isFriendly: false  },

    "Professional Football League Uzbekistan": { _id: "PROLEAGUEUZBEK-"+season, name:"Professional Football League", division: 1, season: season, country: "Uzbekistan", active: false, isCup: false, availableGames: [ { type: "SINGLE", active: false }, { type: "MATCHDAY", active: false }, { type: "DAILY-JACKPOT", active: false } ], isInternational: false, isFriendly: false  },

    "Premier League Burkina Faso": { _id: "PLEAGUEBURKINA-"+season, name:"Premier League", division: 1, season: season, country: "Burkina Faso", active: false, isCup: false, availableGames: [ { type: "SINGLE", active: false }, { type: "MATCHDAY", active: false }, { type: "DAILY-JACKPOT", active: false } ], isInternational: false, isFriendly: false  },

    //

    "Topklasse Suriname": { _id: "TOPKLASSESURINAME-"+season, name:"Topklasse", division: 1, season: season, country: "Suriname", active: false, isCup: false, availableGames: [ { type: "SINGLE", active: false }, { type: "MATCHDAY", active: false }, { type: "DAILY-JACKPOT", active: false } ], isInternational: false, isFriendly: false  },

    "Npl Western Australia Australia": { _id: "NPLWESTERNAUSTRALIA-"+season, name:"Npl Western Australia", division: 2, season: season, country: "Australia", active: false, isCup: false, availableGames: [ { type: "SINGLE", active: false }, { type: "MATCHDAY", active: false }, { type: "DAILY-JACKPOT", active: false } ], isInternational: false, isFriendly: false },

    "Npl Tasmania Australia": { _id: "NPMTASMANIA-"+season, name:"Npl Tasmania", division: 2, season: season, country: "Australia", active: false, isCup: false, availableGames: [ { type: "SINGLE", active: false }, { type: "MATCHDAY", active: false }, { type: "DAILY-JACKPOT", active: false } ], isInternational: false, isFriendly: false },

    "Npl Queensland Australia": { _id: "NPMQUEENSLAND-"+season, name:"Npl Queensland", division: 2, season: season, country: "Australia", active: false, isCup: false, availableGames: [ { type: "SINGLE", active: false }, { type: "MATCHDAY", active: false }, { type: "DAILY-JACKPOT", active: false } ], isInternational: false, isFriendly: false },

    "Npl Victoria Australia": { _id: "NPLVICTORIA-"+season, name:"Npl Victoria", division: 2, season: season, country: "Australia", active: false, isCup: false, availableGames: [ { type: "SINGLE", active: false }, { type: "MATCHDAY", active: false }, { type: "DAILY-JACKPOT", active: false } ], isInternational: false, isFriendly: false },

    "Npl South Australian Australia": { _id: "NPLSOUTHAUSTRALIA-"+season, name:"Npl South Australian", division: 2, season: season, country: "Australia", active: false, isCup: false, availableGames: [ { type: "SINGLE", active: false }, { type: "MATCHDAY", active: false }, { type: "DAILY-JACKPOT", active: false } ], isInternational: false, isFriendly: false },

    "Premier Soccer League Zimbabwe": { _id: "PSLZIMBABWE-"+season, name:"Premier Soccer League", division: 1, season: season, country: "Zimbabwe", active: false, isCup: false, availableGames: [ { type: "SINGLE", active: false }, { type: "MATCHDAY", active: false }, { type: "DAILY-JACKPOT", active: false } ], isInternational: false, isFriendly: false  },

    "C-League Cambodia": { _id: "CLEAGUECAMBO-"+season, name:"C-League", division: 1, season: season, country: "Cambodia", active: true, isCup: false, availableGames: [ { type: "SINGLE", active: true }, { type: "MATCHDAY", active: false }, { type: "DAILY-JACKPOT", active: false } ], isInternational: false, isFriendly: false  },

    "2. HNL Croatia": { _id: "2HNLCROATIA-"+season, name:"2. HNL", division: 2, season: season, country: "Croatia", active: false, isCup: false, availableGames: [ { type: "SINGLE", active: false }, { type: "MATCHDAY", active: false }, { type: "DAILY-JACKPOT", active: false } ], isInternational: false, isFriendly: false },

    "3. HNL - Istok Croatia": { _id: "3HNLISTOK-"+season, name:"3. HNL - Istok", division: 3, season: season, country: "Croatia", active: false, isCup: false, availableGames: [ { type: "SINGLE", active: false }, { type: "MATCHDAY", active: false }, { type: "DAILY-JACKPOT", active: false } ], isInternational: false, isFriendly: false },

    "3. HNL - Jug Croatia": { _id: "3HNLJUG-"+season, name:"3. HNL - Jug", division: 3, season: season, country: "Croatia", active: false, isCup: false, availableGames: [ { type: "SINGLE", active: false }, { type: "MATCHDAY", active: false }, { type: "DAILY-JACKPOT", active: false } ], isInternational: false, isFriendly: false },

    "3. HNL - Sjever Croatia": { _id: "3HNLSJEVER-"+season, name:"3. HNL - Sjever", division: 3, season: season, country: "Croatia", active: false, isCup: false, availableGames: [ { type: "SINGLE", active: false }, { type: "MATCHDAY", active: false }, { type: "DAILY-JACKPOT", active: false } ], isInternational: false, isFriendly: false },

    "3. HNL - Sredite Croatia": { _id: "3HNLSREDITE-"+season, name:"3. HNL - Sredite", division: 3, season: season, country: "Croatia", active: false, isCup: false, availableGames: [ { type: "SINGLE", active: false }, { type: "MATCHDAY", active: false }, { type: "DAILY-JACKPOT", active: false } ], isInternational: false, isFriendly: false },

    "3. HNL - Zapad Croatia": { _id: "3HNLZAPAD-"+season, name:"3. HNL - Zapad", division: 3, season: season, country: "Croatia", active: false, isCup: false, availableGames: [ { type: "SINGLE", active: false }, { type: "MATCHDAY", active: false }, { type: "DAILY-JACKPOT", active: false } ], isInternational: false, isFriendly: false },

    "Srpska Liga - Belgrade Serbia": { _id: "SRPSKABELGRADE-"+season, name:"Srpska Liga - Belgrade", division: 3, season: season, country: "Serbia", active: false, isCup: false, availableGames: [ { type: "SINGLE", active: false }, { type: "MATCHDAY", active: false }, { type: "DAILY-JACKPOT", active: false } ], isInternational: false, isFriendly: false  },

    "Srpska Liga - Vojvodina Serbia": { _id: "SRPSKVOJVODINA-"+season, name:"Srpska Liga - Vojvodina", division: 3, season: season, country: "Serbia", active: false, isCup: false, availableGames: [ { type: "SINGLE", active: false }, { type: "MATCHDAY", active: false }, { type: "DAILY-JACKPOT", active: false } ], isInternational: false, isFriendly: false  },

    "Srpska Liga - East Serbia": { _id: "SRPSKEAST-"+season, name:"Srpska Liga - East", division: 3, season: season, country: "Serbia", active: false, isCup: false, availableGames: [ { type: "SINGLE", active: false }, { type: "MATCHDAY", active: false }, { type: "DAILY-JACKPOT", active: false } ], isInternational: false, isFriendly: false  },

    "Srpska Liga - West Serbia": { _id: "SRPSKWEST-"+season, name:"Srpska Liga - West", division: 3, season: season, country: "Serbia", active: false, isCup: false, availableGames: [ { type: "SINGLE", active: false }, { type: "MATCHDAY", active: false }, { type: "DAILY-JACKPOT", active: false } ], isInternational: false, isFriendly: false  },

    "Gaucho 1 Brazil": { _id: "GAUCHO1BRAZIL-"+season, name:"Gaucho 1", division: 1, season: season, country: "Brazil", active: false, isCup: false, availableGames: [ { type: "SINGLE", active: false }, { type: "MATCHDAY", active: false }, { type: "DAILY-JACKPOT", active: false } ], isInternational: false, isFriendly: false  },

    "Gaucho 2 Brazil": { _id: "GAUCHO2BRAZIL-"+season, name:"Gaucho 2", division: 2, season: season, country: "Brazil", active: false, isCup: false, availableGames: [ { type: "SINGLE", active: false }, { type: "MATCHDAY", active: false }, { type: "DAILY-JACKPOT", active: false } ], isInternational: false, isFriendly: false  },

    "Amapaense Brazil": { _id: "AMAPAENSEBRAZIL-"+season, name:"Amapaense", division: 1, season: season, country: "Brazil", active: false, isCup: false, availableGames: [ { type: "SINGLE", active: false }, { type: "MATCHDAY", active: false }, { type: "DAILY-JACKPOT", active: false } ], isInternational: false, isFriendly: false  },

    "Ligue 1 Senegal": { _id: "LIGUE1SENEGAL-"+season, name:"Ligue 1", division: 1, season: season, country: "Senegal", active: false, isCup: false, availableGames: [ { type: "SINGLE", active: false }, { type: "MATCHDAY", active: false }, { type: "DAILY-JACKPOT", active: false } ], isInternational: false, isFriendly: false  },

    "Super Ligue Congo": { _id: "SUPERLIGUECONGO-"+season, name:"Super Ligue", division: 1, season: season, country: "Congo", active: false, isCup: false, availableGames: [ { type: "SINGLE", active: false }, { type: "MATCHDAY", active: false }, { type: "DAILY-JACKPOT", active: false } ], isInternational: false, isFriendly: false  },

    //

    "2. Division: Centro Portugal": { _id: "2DIVCENTROPORTUGAL-"+season, name:"2. Division: Centro", division: 3, season: season, country: "Portugal", active: false, isCup: false, availableGames: [ { type: "SINGLE", active: false }, { type: "MATCHDAY", active: false }, { type: "DAILY-JACKPOT", active: false } ], isInternational: false, isFriendly: false },

    "2. Division: Norte Portugal": { _id: "2DIVNORTEPORTUGAL-"+season, name:"2. Division: Norte", division: 3, season: season, country: "Portugal", active: false, isCup: false, availableGames: [ { type: "SINGLE", active: false }, { type: "MATCHDAY", active: false }, { type: "DAILY-JACKPOT", active: false } ], isInternational: false, isFriendly: false },

    "2. Division: Sul Portugal": { _id: "2DIVSULPORTUGAL-"+season, name:"2. Division: Sul", division: 3, season: season, country: "Portugal", active: false, isCup: false, availableGames: [ { type: "SINGLE", active: false }, { type: "MATCHDAY", active: false }, { type: "DAILY-JACKPOT", active: false } ], isInternational: false, isFriendly: false },

    "2. Division: Group A Portugal": { _id: "2DIVGROUPAPORTUGAL-"+season, name:"2. Division: Group A", division: 3, season: season, country: "Portugal", active: false, isCup: false, availableGames: [ { type: "SINGLE", active: false }, { type: "MATCHDAY", active: false }, { type: "DAILY-JACKPOT", active: false } ], isInternational: false, isFriendly: false },

    "2. Division: Group B Portugal": { _id: "2DIVGROUPBPORTUGAL-"+season, name:"2. Division: Group B", division: 3, season: season, country: "Portugal", active: false, isCup: false, availableGames: [ { type: "SINGLE", active: false }, { type: "MATCHDAY", active: false }, { type: "DAILY-JACKPOT", active: false } ], isInternational: false, isFriendly: false },

    "2. Division: Group C Portugal": { _id: "2DIVGROUPCPORTUGAL-"+season, name:"2. Division: Group C", division: 3, season: season, country: "Portugal", active: false, isCup: false, availableGames: [ { type: "SINGLE", active: false }, { type: "MATCHDAY", active: false }, { type: "DAILY-JACKPOT", active: false } ], isInternational: false, isFriendly: false },

    "2. Division: Group D Portugal": { _id: "2DIVGROUPDPORTUGAL-"+season, name:"2. Division: Group D", division: 3, season: season, country: "Portugal", active: false, isCup: false, availableGames: [ { type: "SINGLE", active: false }, { type: "MATCHDAY", active: false }, { type: "DAILY-JACKPOT", active: false } ], isInternational: false, isFriendly: false },

    "2. Division: Group E Portugal": { _id: "2DIVGROUPEPORTUGAL-"+season, name:"2. Division: Group E", division: 3, season: season, country: "Portugal", active: false, isCup: false, availableGames: [ { type: "SINGLE", active: false }, { type: "MATCHDAY", active: false }, { type: "DAILY-JACKPOT", active: false } ], isInternational: false, isFriendly: false },

    "2. Division: Group F Portugal": { _id: "2DIVGROUPFPORTUGAL-"+season, name:"2. Division: Group F", division: 3, season: season, country: "Portugal", active: false, isCup: false, availableGames: [ { type: "SINGLE", active: false }, { type: "MATCHDAY", active: false }, { type: "DAILY-JACKPOT", active: false } ], isInternational: false, isFriendly: false },

    "2. Division: Group G Portugal": { _id: "2DIVPGROUPGORTUGAL-"+season, name:"2. Division: Group G", division: 3, season: season, country: "Portugal", active: false, isCup: false, availableGames: [ { type: "SINGLE", active: false }, { type: "MATCHDAY", active: false }, { type: "DAILY-JACKPOT", active: false } ], isInternational: false, isFriendly: false },

    "2. Division: Group H Portugal": { _id: "2DIVGROUPHPORTUGAL-"+season, name:"2. Division: Group H", division: 3, season: season, country: "Portugal", active: false, isCup: false, availableGames: [ { type: "SINGLE", active: false }, { type: "MATCHDAY", active: false }, { type: "DAILY-JACKPOT", active: false } ], isInternational: false, isFriendly: false },


    /* INTERNATIONNAL */
    "Friendly International": { _id: "FRIENDLYINTER-"+season, name:"Friendly International", division: 1, season: season, country: "International", active: true, isCup: false, availableGames: [ { type: "SINGLE", active: true }, { type: "MATCHDAY", active: false }, { type: "DAILY-JACKPOT", active: false } ], isInternational: true, isFriendly: true },

    "Club Friendlies": { _id: "CLUBFRIENDLIES-"+season, name:"Club Friendlies", division: 1, season: season, country: "International", active: true, isCup: false, availableGames: [ { type: "SINGLE", active: true }, { type: "MATCHDAY", active: false }, { type: "DAILY-JACKPOT", active: false } ], isInternational: true, isFriendly: true },

    "Euro U17": { _id: "EUROU17-"+season, name:"Euro U17", division: 1, season: season, country: "Europe", active: true, isCup: true, availableGames: [ { type: "SINGLE", active: true }, { type: "MATCHDAY", active: false }, { type: "DAILY-JACKPOT", active: false } ], isInternational: true, isFriendly: false },

    "Euro U19": { _id: "EUROU19-"+season, name:"Euro U19", division: 1, season: season, country: "Europe", active: true, isCup: true, availableGames: [ { type: "SINGLE", active: true }, { type: "MATCHDAY", active: false }, { type: "DAILY-JACKPOT", active: false } ], isInternational: true, isFriendly: false },

    "Euro U21": { _id: "EUROU21-"+season, name:"Euro U21", division: 1, season: season, country: "Europe", active: true, isCup: true, availableGames: [ { type: "SINGLE", active: true }, { type: "MATCHDAY", active: false }, { type: "DAILY-JACKPOT", active: false } ], isInternational: true, isFriendly: false },

    "Asian Cup Qualification": { _id: "ASIANCUPQUAL-"+season, name:"Asian Cup Qualification", division: 1, season: season, country: "International", active: true, isCup: true, availableGames: [ { type: "SINGLE", active: true }, { type: "MATCHDAY", active: false }, { type: "DAILY-JACKPOT", active: false } ], isInternational: true, isFriendly: false },

    "Asian Cup": { _id: "ASIANCUP-"+season, name:"Asian Cup", division: 1, season: season, country: "International", active: true, isCup: true, availableGames: [ { type: "SINGLE", active: true }, { type: "MATCHDAY", active: false }, { type: "DAILY-JACKPOT", active: false } ], isInternational: true, isFriendly: false },

    "Copa do Brasil Brazil": { _id: "COPADOBRASIL-"+season, name:"Copa do Brasil", division: 1, season: season, country: "Brazil", active: true, isCup: true, availableGames: [ { type: "SINGLE", active: true }, { type: "MATCHDAY", active: false }, { type: "DAILY-JACKPOT", active: false } ], isInternational: false, isFriendly: false  },

    "US Open Cup USA": { _id: "USOPENCUP-"+season, name:"US Open Cup", division: 1, season: season, country: "USA", active: true, isCup: true, availableGames: [ { type: "SINGLE", active: true }, { type: "MATCHDAY", active: false }, { type: "DAILY-JACKPOT", active: true } ], isInternational: false, isFriendly: false  },

    "Nabisco Cup Japan": { _id: "NABISCOCUP-"+season, name:"Nabisco Cup", division: 1, season: season, country: "Japan", active: true, isCup: true, availableGames: [ { type: "SINGLE", active: true }, { type: "MATCHDAY", active: false }, { type: "DAILY-JACKPOT", active: true } ], isInternational: false, isFriendly: false  },

    "Copa Libertadores South America": { _id: "COPALIBERTADORES-"+season, name:"Copa Libertadores", division: 1, season: season, country: "South America", active: true, isCup: true, availableGames: [ { type: "SINGLE", active: true }, { type: "MATCHDAY", active: false }, { type: "DAILY-JACKPOT", active: false } ], isInternational: true, isFriendly: false },

    "AFC Cup": { _id: "AFCCUP-"+season, name:"AFC Cup", division: 1, season: season, country: "Asia", active: true, isCup: true, availableGames: [ { type: "SINGLE", active: true }, { type: "MATCHDAY", active: false }, { type: "DAILY-JACKPOT", active: true } ], isInternational: true, isFriendly: false },

    "AFC Champions League": { _id: "AFCCHAMPIONSLEAGUE-"+season, name:"AFC Champions League", division: 1, season: season, country: "Asia", active: true, isCup: true, availableGames: [ { type: "SINGLE", active: true }, { type: "MATCHDAY", active: false }, { type: "DAILY-JACKPOT", active: false } ], isInternational: true, isFriendly: false },

    "CAF Confederations Cup": { _id: "CAFCONFECUP-"+season, name:"CAF Confederations Cup", division: 1, season: season, country: "International", active: true, isCup: true, availableGames: [ { type: "SINGLE", active: true }, { type: "MATCHDAY", active: false }, { type: "DAILY-JACKPOT", active: false } ], isInternational: true, isFriendly: false },

    "Ffa Cup Australia": { _id: "FFACUP-"+season, name:"FFA Cup", division: 1, season: season, country: "Australia", active: true, isCup: true, availableGames: [ { type: "SINGLE", active: true }, { type: "MATCHDAY", active: false }, { type: "DAILY-JACKPOT", active: true } ], isInternational: false, isFriendly: false  },

    "Iceland Cup Iceland": { _id: "ICELANDCUP-"+season, name:"Iceland Cup", division: 1, season: season, country: "Iceland", active: true, isCup: true, availableGames: [ { type: "SINGLE", active: true }, { type: "MATCHDAY", active: false }, { type: "DAILY-JACKPOT", active: true } ], isInternational: false, isFriendly: false  },

    "League Cup Iceland": { _id: "LEAGUECUPICELAND-"+season, name:"League Cup", division: 1, season: season, country: "Iceland", active: true, isCup: true, availableGames: [ { type: "SINGLE", active: true }, { type: "MATCHDAY", active: false }, { type: "DAILY-JACKPOT", active: true } ], isInternational: false, isFriendly: false  },

    "Latvian Cup Latvia": { _id: "LATVIANCUP-"+season, name:"Latvian Cup", division: 1, season: season, country: "Latvia", active: true, isCup: true, availableGames: [ { type: "SINGLE", active: true }, { type: "MATCHDAY", active: false }, { type: "DAILY-JACKPOT", active: true } ], isInternational: false, isFriendly: false  },

    "Norway Cup Norway": { _id: "NORWAYCUP-"+season, name:"Norway Cup", division: 1, season: season, country: "Norway", active: true, isCup: true, availableGames: [ { type: "SINGLE", active: true }, { type: "MATCHDAY", active: false }, { type: "DAILY-JACKPOT", active: true } ], isInternational: false, isFriendly: false  },

    "World Cup": { _id: "WORLDCUP-"+season, name:"World Cup", division: 1, season: season, country: "World", active: true, isCup: true, availableGames: [ { type: "SINGLE", active: true }, { type: "MATCHDAY", active: false }, { type: "DAILY-JACKPOT", active: true } ], isInternational: true, isFriendly: false },

    "Emperor Cup Japan": { _id: "EMPERORCUP-"+season, name:"Emperor Cup", division: 1, season: season, country: "Japan", active: true, isCup: true, availableGames: [ { type: "SINGLE", active: true }, { type: "MATCHDAY", active: false }, { type: "DAILY-JACKPOT", active: true } ], isInternational: false, isFriendly: false  },

    "Chilean Cup Chile": { _id: "CHILEANCUP-"+season, name:"Chilean Cup", division: 1, season: season, country: "Chile", active: true, isCup: true, availableGames: [ { type: "SINGLE", active: true }, { type: "MATCHDAY", active: false }, { type: "DAILY-JACKPOT", active: true } ], isInternational: false, isFriendly: false  },

    "FA Cup China PR": { _id: "FACUPCHINA-"+season, name:"FA Cup China", division: 1, season: season, country: "China PR", active: true, isCup: true, availableGames: [ { type: "SINGLE", active: true }, { type: "MATCHDAY", active: false }, { type: "DAILY-JACKPOT", active: true } ], isInternational: false, isFriendly: false  },

    "Friendly International Women": { _id: "FRIENDLYINTERWOMEN-"+season, name:"Friendly International Women", division: 1, season: season, country: "International", active: true, isCup: false, availableGames: [ { type: "SINGLE", active: true }, { type: "MATCHDAY", active: false }, { type: "DAILY-JACKPOT", active: false } ], isInternational: true, isFriendly: true },

    "World Cup Women": { _id: "WORLDCUPWOMEN-"+season, name:"World Cup Women", division: 1, season: season, country: "World", active: true, isCup: true, availableGames: [ { type: "SINGLE", active: true }, { type: "MATCHDAY", active: false }, { type: "DAILY-JACKPOT", active: true } ], isInternational: true, isFriendly: false },

    "Euro Women": { _id: "EUROWOMEN-"+season, name:"Euro Women", division: 1, season: season, country: "Europe", active: true, isCup: true, availableGames: [ { type: "SINGLE", active: true }, { type: "MATCHDAY", active: false }, { type: "DAILY-JACKPOT", active: true } ], isInternational: true, isFriendly: false },

    "Belarusian Cup Belarus": { _id: "BELARUSIANCUP-"+season, name:"Belarusian Cup", division: 1, season: season, country: "Belarus", active: true, isCup: true, availableGames: [ { type: "SINGLE", active: true }, { type: "MATCHDAY", active: false }, { type: "DAILY-JACKPOT", active: true } ], isInternational: false, isFriendly: false  },

    "FA Cup Thailand": { _id: "FACUPTHAI-"+season, name:"FA Cup Thailand", division: 1, season: season, country: "China PR", active: true, isCup: true, availableGames: [ { type: "SINGLE", active: true }, { type: "MATCHDAY", active: false }, { type: "DAILY-JACKPOT", active: true } ], isInternational: false, isFriendly: false  },

    "Kazakhstan Cup Kazakhstan": { _id: "KAZAKCUP-"+season, name:"Kazakhstan Cup", division: 1, season: season, country: "Kazakhstan", active: true, isCup: true, availableGames: [ { type: "SINGLE", active: true }, { type: "MATCHDAY", active: false }, { type: "DAILY-JACKPOT", active: true } ], isInternational: false, isFriendly: false  },

    "Svenska Cupen Sweden": { _id: "SVENSKACUPEN-"+season, name:"Svenska Cupen", division: 1, season: season, country: "Sweden", active: true, isCup: true, availableGames: [ { type: "SINGLE", active: true }, { type: "MATCHDAY", active: false }, { type: "DAILY-JACKPOT", active: true } ], isInternational: false, isFriendly: false  },

    "Estonian Cup Estonia": { _id: "ESTONIANCUP-"+season, name:"Estonian Cup", division: 1, season: season, country: "Estonia", active: true, isCup: true, availableGames: [ { type: "SINGLE", active: true }, { type: "MATCHDAY", active: false }, { type: "DAILY-JACKPOT", active: true } ], isInternational: false, isFriendly: false  },

    "Aff Championship U19": { _id: "AFFCHAMPU19-"+season, name:"AFF Championship U19", division: 1, season: season, country: "Asia", active: true, isCup: true, availableGames: [ { type: "SINGLE", active: true }, { type: "MATCHDAY", active: false }, { type: "DAILY-JACKPOT", active: true } ], isInternational: true, isFriendly: false  },

    "Belgian Cup Belgium": { _id: "BELGIANCUP-"+season, name:"Belgian Cup", division: 1, season: season, country: "Belgium", active: true, isCup: true, availableGames: [ { type: "SINGLE", active: true }, { type: "MATCHDAY", active: false }, { type: "DAILY-JACKPOT", active: true } ], isInternational: false, isFriendly: false  },

    "Toto Cup": { _id: "TOTOCUP-"+season, name:"Toto Cup", division: 1, season: season, country: "Israel", active: true, isCup: true, availableGames: [ { type: "SINGLE", active: true }, { type: "MATCHDAY", active: false }, { type: "DAILY-JACKPOT", active: true } ], isInternational: false, isFriendly: false  },

    //"": { _id: "-"+season, name:"", division: 1, season: season, country: "", active: true, isCup: false, availableGames: [ { type: "SINGLE", active: true }, { type: "MATCHDAY", active: false }, { type: "DAILY-JACKPOT", active: false } ] },

  };

  return new Promise(function(resolve, reject){
    var pages = [1,2,3,4,5,6,7,8];
    var competitionArr = [];

    async.eachLimit(pages, 1, function(page, eachPage){
      console.log("Current page:", page);
      requestify.get("https://soccer.sportmonks.com/api/v2.0/leagues?api_token=iNRlejLeBLcdtm1oYqCTOyG3eUAJIMqsXbLm2fXxSVDWWKnaEGxsgVLYhDac&include=country,season:filter(is_current_season|true)&page="+ String(page) )
      .then(function(response){
        var competitions = response.getBody().data;
        //console.log(competitions);
        async.eachLimit(competitions, 1, function(competition, eachCompetition){
          if (leagueToCompetition[competition.name] != null || leagueToCompetition[competition.name + " " + competition.country.data.name] != null){
            // Vérifier la saison
            console.log(competition.season.data.name, competition.name,competition.country.data.name );
            var seasonArr = competition.season.data.name.split('/');
            var seasonInt = parseInt(seasonArr[0]);
            if (seasonInt != parseInt(season)){
              console.log(chalkWarning("Skip la compétition", competition.name, competition.id , "car elle ne correspond pas à la saison demandé. Pays:", competition.country.data.name));
              return eachCompetition();
            }

            // Vérifier si le pays correspond bien à la compétition à installer
            if (competition.country.data.name == "Russia" ||
            competition.country.data.name == "Thailand" ||
            competition.country.data.name == "Venezuela" ||
            competition.country.data.name == "Luxembourg" ||
            competition.country.data.name == "Vietnam" ||
            competition.country.data.name == "Kosovo" ||
            competition.country.data.name == "Cameroon" ||
            competition.country.data.name == "Ethiopia" ||
            competition.country.data.name == "Sweden" ||
            competition.country.data.name == "Canada" ||
            competition.country.data.name == "Cambodia" ||
            competition.country.data.name == "Croatia" ||
            competition.country.data.name == "Zimbabwe" ||
            competition.country.data.name == "Suriname" ||
            competition.country.data.name == "Senegal" ||
            competition.country.data.name == "Moldova" ||
            competition.country.data.name == "Burkina Faso" ||
            competition.country.data.name == "Uzbekistan" ||
            competition.country.data.name == "Oman" ||
            competition.country.data.name == "Gabon" ||
            competition.country.data.name == "Malawi" ||
            competition.country.data.name == "Rwanda" ||
            competition.country.data.name == "Zambia" ||
            competition.country.data.name == "Guadeloupe" ||
            competition.country.data.name == "Bolivia" ||
            competition.country.data.name == "Guatemala" ||
            competition.country.data.name == "Azerbaijan" ||
            competition.country.data.name == "Congo" ||
            competition.country.data.name == "Belgium" ||
            competition.country.data.name == "Uruguay" ||
            competition.country.data.name == "Singapore" ||
            competition.country.data.name == "Philippines" ||
            competition.country.data.name == "Paraguay" ||
            competition.country.data.name == "New Zealand" ||
            competition.country.data.name == "Malaysia" ||
            competition.country.data.name == "Montenegro" ||
            competition.country.data.name == "Norway" ||
            competition.country.data.name == "Poland" ||
            competition.country.data.name == "Finland" ||
            competition.country.data.name == "Australia" ||
            competition.country.data.name == "Kazakhstan" ||
            competition.country.data.name == "Indonesia" ||
            competition.country.data.name == "Latvia" ||
            competition.country.data.name == "Lithuania" ||
            competition.country.data.name == "Peru" ||
            competition.country.data.name == "Ghana" ||
            competition.country.data.name == "Kenya" ||
            competition.country.data.name == "Nigeria" ||
            competition.country.data.name == "Georgia" ||
            competition.country.data.name == "Belarus" ||
            competition.country.data.name == "Bosnia and Herzegovina" ||
            competition.country.data.name == "Ecuador" ||
            competition.country.data.name == "Iceland" ||
            competition.country.data.name == "Ukraine" ||
            competition.country.data.name == "Estonia" ||
            competition.country.data.name == "Turkey" ||
            competition.country.data.name == "Japan" ||
            competition.country.data.name == "Kuwait" ||
            competition.country.data.name == "Greece" ||
            competition.country.data.name == "Georgia" ||
            competition.country.data.name == "Brazil" ||
            competition.country.data.name == "Macedonia FYR" ||
            competition.country.data.name == "Denmark" ||
            competition.country.data.name == "France" ||
            competition.country.data.name == "Malta" ||
            competition.country.data.name == "Uruguay" ||
            competition.country.data.name == "Saudi Arabia" ||
            competition.country.data.name == "Republic of Ireland" ||
            competition.country.data.name == "China PR" ||
            competition.country.data.name == "Cyprus" ||
            competition.country.data.name == "Albania" ||
            competition.country.data.name == "Argentina" ||
            competition.country.data.name == "Romania" ||
            competition.country.data.name == "Serbia" ||
            competition.country.data.name == "Slovakia" ||
            competition.country.data.name == "Chile" ||
            competition.country.data.name == "Northern Ireland" ||
            competition.country.data.name == "England" ||
            competition.country.data.name == "Scotland" ||
            competition.country.data.name == "USA" ||
            competition.country.data.name == "Algeria" ||
            competition.country.data.name == "Wales" ||
            competition.country.data.name == "Switzerland" ||
            competition.country.data.name == "Colombia" ||
            competition.country.data.name == "South America" ||
            competition.country.data.name == "South Africa" ||
            competition.country.data.name == "Portugal" ||
            competition.country.data.name == "Hong Kong"){
              competition.name = competition.name + " " + competition.country.data.name;
              console.log("Name correction", competition.name);
            }

            if (leagueToCompetition[competition.name].country == competition.country.data.name){
              competitionArr.push({
                _id: leagueToCompetition[competition.name]._id,
                name: leagueToCompetition[competition.name].name,
                division: leagueToCompetition[competition.name].division,
                season: season,
                api: {
                  sportmonks: {
                    season: competition.season.data.id,
                    league: competition.id
                  }
                },
                active: leagueToCompetition[competition.name].active,
                country: leagueToCompetition[competition.name].country.replace(' PR', '').replace(' FYR', '').replace('International', 'World').replace('South America', 'World').replace('Asia', 'World'),
                isCup: leagueToCompetition[competition.name].isCup,
                availableGames: leagueToCompetition[competition.name].availableGames,
                isCurrentSeason: competition.season.data.is_current_season,
                isInternational: leagueToCompetition[competition.name].isInternational,
                isFriendly: leagueToCompetition[competition.name].isFriendly,
                // id de la saison
                //numberOfGames: competition.numberOfGames,
                //numberOfTeams: competition.numberOfTeams,
                //numberOfMatchDays: competition.numberOfMatchdays
              });
              return eachCompetition();
            } else {
              console.log(chalkWarning("Skip la compétition", competition.name, competition.id, "car il y a une confusion dans le nom par rapport au pays ciblé. Pays:", competition.country.data.name));
              return eachCompetition();
            }
          } else {
            console.log(chalkWarning("Skip la compétition", competition.name, competition.id, "car elle n'est pas dans la liste d'installation. Pays:", competition.country.data.name));
            return eachCompetition();
          }
        }, function(err){
          //if (err) return reject(err);
          //resolve(competitionArr);
          return eachPage(err);
        });
      })
      .fail(function(response){
        console.log(response);
        //reject(response.body);
        return eachPage();
      });
    }, function(err, result){
      if (err) return reject(err);
      resolve(competitionArr);
    });
  });
};

/*
* Récupérer la saison d'une compétition
*/
exports.getSeasonsForLeague = function(competition){
  return new Promise(function(resolve, reject){
    requestify.get("https://soccer.sportmonks.com/api/v2.0/leagues/"+ competition.api.sportmonks.league + "?api_token=iNRlejLeBLcdtm1oYqCTOyG3eUAJIMqsXbLm2fXxSVDWWKnaEGxsgVLYhDac&include=seasons,country")
    .then(function(response){
      var seasons = response.getBody().data.seasons.data;
      resolve(seasons);
    })
    .fail(function(response){
      reject(response.body);
    });
  });
};

/*
* Récupérer les données d'une saison
*/
exports.getSeasonForId = function(competition){
  return new Promise(function(resolve, reject){
    requestify.get("https://soccer.sportmonks.com/api/v2.0/seasons/"+ competition.api.sportmonks.season + "?api_token=iNRlejLeBLcdtm1oYqCTOyG3eUAJIMqsXbLm2fXxSVDWWKnaEGxsgVLYhDac")
    .then(function(response){
      var season = response.getBody().data;
      resolve(season);
    })
    .fail(function(response){
      reject(response.body);
    });
  });
};

/*
* Récupérer les équipes d'une compétition
*/
exports.getTeamsForCompetition = function(competition){
  return new Promise(function(resolve, reject){
    requestify.get("https://soccer.sportmonks.com/api/v2.0/teams/season/"+ competition.api.sportmonks.season + "?api_token=iNRlejLeBLcdtm1oYqCTOyG3eUAJIMqsXbLm2fXxSVDWWKnaEGxsgVLYhDac&include=country,stats,uefaranking")
    .then(function(response){
      var teams = response.getBody().data;
      //console.log(teams);
      var teamArr = [];
      async.eachLimit(teams, 1, function(team, eachTeam){
        if (team.name == "Rangers" && competition._id == "PLEAGUEHK-2017"){
          return eachTeam();
        } else if (team.name == "Unión La Calera" && competition._id == "PRIMBCHILE-2017"){
          return eachTeam();
        }

        var country = "";
        if (team.country != null && !competition.isInternational){
          country = team.country.data.name;
        } else if (team.country != null && competition.isInternational && competition.country == "World" && !competition.isFriendly){
          country = team.country.data.name;
        } else if (team.country_id == null && !competition.isInternational) {
          country = competition.country;
        } else {
          country = "World";
        }

        var uefaRanking = null;
        if (team.uefaranking != null){
          uefaRanking = team.uefaranking.data;
        }

        teamArr.push({ name: team.name, competition: competition._id, api: { sportmonks: team.id  }, logo: team.logo_path, country: country, shortCode: team.short_code, twitter: team.twitter, uefaRanking: uefaRanking });
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

/*
* Récupérer les matchs d'une compétition pour une période
*/
exports.getFixtureForCompetition = function(competition, from, to){
  return new Promise(function(resolve, reject){
    console.log("League ID :", competition.api.sportmonks.league, "From:", from, "To:", to);
    requestify.get("https://soccer.sportmonks.com/api/v2.0/fixtures/between/"+from+"/"+to+"?leagues="+ competition.api.sportmonks.league +"&api_token=iNRlejLeBLcdtm1oYqCTOyG3eUAJIMqsXbLm2fXxSVDWWKnaEGxsgVLYhDac&include=localTeam,visitorTeam,round,venue")
    .then(function(response){
      var fixtures = response.getBody().data;
      console.log(fixtures.length);
      var fixtureArr = [];
      //if (competition.country == "World") console.log(fixtures);
      async.eachLimit(fixtures, 1, function(fixture, eachFixture){
        //if (competition.country == "World") console.log(fixture);
        var venue = null;
        if (fixture.venue_id != null){
          venue = { name: fixture.venue.data.name, address: fixture.venue.data.address, city: fixture.venue.data.city, capacity: fixture.venue.data.capacity };
        }

        if (competition.isInternational == true && competition.isCup == false){
          fixtureArr.push({
            date: fixture.time.starting_at.date_time,
            timestamp: fixture.time.starting_at.timestamp,
            venue: venue,
            matchDay: 0,
            homeTeam: {
              api: {
                sportmonks: fixture.localTeam.data.id
              }
            },
            awayTeam: {
              api: {
                sportmonks: fixture.visitorTeam.data.id
              }
            },
            result: {
              homeScore: fixture.scores.localteam_score,
              awayScore: fixture.scores.visitorteam_score
            },
            api: {
              sportmonks: fixture.id
            },
            status: fixture.time.status
          });
        } else if (competition.isCup == false){
          fixtureArr.push({
            date: fixture.time.starting_at.date_time,
            timestamp: fixture.time.starting_at.timestamp,
            venue: venue,
            matchDay: fixture.round.data.name,
            homeTeam: {
              api: {
                sportmonks: fixture.localTeam.data.id
              }
            },
            awayTeam: {
              api: {
                sportmonks: fixture.visitorTeam.data.id
              }
            },
            result: {
              homeScore: fixture.scores.localteam_score,
              awayScore: fixture.scores.visitorteam_score
            },
            api: {
              sportmonks: fixture.id
            },
            status: fixture.time.status
          });
        } else {
          fixtureArr.push({
            date: fixture.time.starting_at.date_time,
            timestamp: fixture.time.starting_at.timestamp,
            venue: venue,
            matchDay: 0,
            homeTeam: {
              api: {
                sportmonks: fixture.localTeam.data.id
              }
            },
            awayTeam: {
              api: {
                sportmonks: fixture.visitorTeam.data.id
              }
            },
            result: {
              homeScore: fixture.scores.localteam_score,
              awayScore: fixture.scores.visitorteam_score
            },
            api: {
              sportmonks: fixture.id
            },
            status: fixture.time.status
          });
        }
        if (fixture.id == 1710960) console.log(fixture.time.status);
        eachFixture();
      }, function(err, result){
        //console.log(fixtureArr);
        console.log(err);
        resolve(fixtureArr);
      });
    })
    .fail(function(response){
      reject(response.body);
    });
  });
};

exports.getFixturesForSeason = function(competition){
  return new Promise(function(resolve, reject){
    requestify.get("https://soccer.sportmonks.com/api/v2.0/seasons/" + String(competition.api.sportmonks.season) +"?api_token=iNRlejLeBLcdtm1oYqCTOyG3eUAJIMqsXbLm2fXxSVDWWKnaEGxsgVLYhDac&include=fixtures.localTeam,fixtures.visitorTeam,fixtures.round,fixtures.venue,fixtures.events").then(function(response){
      var fixtures = response.getBody().data.fixtures.data;
      console.log(fixtures.length);
      var fixtureArr = [];
      //if (competition.country == "World") console.log(fixtures);
      async.eachLimit(fixtures, 1, function(fixture, eachFixture){
        //if (competition.country == "World") console.log(fixture);
        var venue = null;
        if (fixture.venue_id != null){
          venue = { name: fixture.venue.data.name, address: fixture.venue.data.address, city: fixture.venue.data.city, capacity: fixture.venue.data.capacity };
        }

        var events = [];
        fixture.events.data.forEach(function(event){
          var teamId = "";
          if (event.team_id == fixture.localteam_id) teamId = "home";
          if (event.team_id == fixture.visitorteam_id) teamId = "away";
          if (event.result == null && event.type == "goal" ||
          event.result == null && event.type == "own-goal" ||
          event.result == null && event.type == "penalty" ||
          teamId == ""){
            //console.log("Ne pas prendre en compte l'évènement, car il semble être corrompu :", event.id);
          } else {
            events.push({ team: teamId, type: event.type, minute: event.minute, api: { sportmonks: event.id }, custom: false });
          }
        });

        if (competition.isInternational == true && competition.isCup == false){
          fixtureArr.push({
            date: fixture.time.starting_at.date_time,
            timestamp: fixture.time.starting_at.timestamp,
            venue: venue,
            matchDay: 0,
            homeTeam: {
              api: {
                sportmonks: fixture.localTeam.data.id
              }
            },
            awayTeam: {
              api: {
                sportmonks: fixture.visitorTeam.data.id
              }
            },
            result: {
              homeScore: fixture.scores.localteam_score,
              awayScore: fixture.scores.visitorteam_score
            },
            api: {
              sportmonks: fixture.id
            },
            events: events,
            status: fixture.time.status
          });
        } else if (competition.isCup == false){
          fixtureArr.push({
            date: fixture.time.starting_at.date_time,
            timestamp: fixture.time.starting_at.timestamp,
            venue: venue,
            matchDay: fixture.round.data.name,
            homeTeam: {
              api: {
                sportmonks: fixture.localTeam.data.id
              }
            },
            awayTeam: {
              api: {
                sportmonks: fixture.visitorTeam.data.id
              }
            },
            result: {
              homeScore: fixture.scores.localteam_score,
              awayScore: fixture.scores.visitorteam_score
            },
            api: {
              sportmonks: fixture.id
            },
            events: events,
            status: fixture.time.status
          });
        } else {
          fixtureArr.push({
            date: fixture.time.starting_at.date_time,
            timestamp: fixture.time.starting_at.timestamp,
            venue: venue,
            matchDay: 0,
            homeTeam: {
              api: {
                sportmonks: fixture.localTeam.data.id
              }
            },
            awayTeam: {
              api: {
                sportmonks: fixture.visitorTeam.data.id
              }
            },
            result: {
              homeScore: fixture.scores.localteam_score,
              awayScore: fixture.scores.visitorteam_score
            },
            api: {
              sportmonks: fixture.id
            },
            events: events,
            status: fixture.time.status
          });
        }
        eachFixture();
      }, function(err, result){
        console.log(err);
        resolve(fixtureArr);
      });
    })
    .fail(function(response){
      reject(response.body);
    });
  });
};

exports.getFixtureEventsForCompetition = function(competition, from, to){
  return new Promise(function(resolve, reject){
    //console.log(competition.api.sportmonks.league);
    //console.log(from);
    //console.log(to);
    console.log(chalkInit("SportMonks: getFixtureEventsForCompetition -", competition.name, "From:", from, "To:", to, "-", competition.country));
    requestify.get("https://soccer.sportmonks.com/api/v2.0/fixtures/between/"+from+"/"+to+"?leagues="+ competition.api.sportmonks.league +"&api_token=iNRlejLeBLcdtm1oYqCTOyG3eUAJIMqsXbLm2fXxSVDWWKnaEGxsgVLYhDac&include=localTeam,visitorTeam,events")
    .then(function(response){
      var fixtures = response.getBody().data;
      //console.log(fixtures.length);
      var fixtureArr = [];
      async.eachLimit(fixtures, 1, function(fixture, eachFixture){
        //console.log(fixture);
        var events = [];
        fixture.events.data.forEach(function(event){
          var teamId = "";
          if (event.team_id == fixture.localteam_id) teamId = "home";
          if (event.team_id == fixture.visitorteam_id) teamId = "away";
          if (event.result == null && event.type == "goal" ||
          event.result == null && event.type == "own-goal" ||
          event.result == null && event.type == "penalty" ||
          teamId == ""){
            //console.log("Ne pas prendre en compte l'évènement, car il semble être corrompu :", event.id);
          } else {
            events.push({ team: teamId, type: event.type, minute: event.minute, api: { sportmonks: event.id }, custom: false });
          }
        });

        fixtureArr.push({
          date: fixture.time.starting_at.date_time,
          timestamp: fixture.time.starting_at.timestamp,
          homeTeam: {
            name: fixture.localTeam.data.name,
            api: {
              sportmonks: fixture.localTeam.data.id
            }
          },
          awayTeam: {
            name: fixture.visitorTeam.data.name,
            api: {
              sportmonks: fixture.visitorTeam.data.id
            }
          },
          result: {
            homeScore: fixture.scores.localteam_score,
            awayScore: fixture.scores.visitorteam_score,
            halfScore: fixture.scores.ht_score,
            fullScore: fixture.scores.ft_score
          },
          api: {
            sportmonks: fixture.id
          },
          status: fixture.time.status,
          events: events
        });
        if (fixture.id == 1710960) console.log(fixture.time.status);
        eachFixture();
      }, function(err){
        //console.log(fixtureArr);
        resolve(fixtureArr);
      });
    })
    .fail(function(response){
      reject(response.body);
    });
  });
};

/*
* Récupérer les informations d'un match
*/
exports.getFixture = function(fixtureId){
  return new Promise(function(resolve, reject){
    requestify.get("https://soccer.sportmonks.com/api/v2.0/fixtures/" + fixtureId + "?api_token=iNRlejLeBLcdtm1oYqCTOyG3eUAJIMqsXbLm2fXxSVDWWKnaEGxsgVLYhDac&include=localTeam,visitorTeam,round")
    .then(function(response){
      var fixture = response.getBody().data;
      var fixtureObj = {
        date: fixture.time.starting_at.date_time,
        timestamp: fixture.time.starting_at.timestamp,
        matchDay: fixture.round.data.name,
        homeTeam: {
          api: {
            sportmonks: fixture.localTeam.data.id
          }
        },
        awayTeam: {
          api: {
            sportmonks: fixture.visitorTeam.data.id
          }
        },
        result: {
          homeScore: fixture.scores.localteam_score,
          awayScore: fixture.scores.visitorteam_score
        },
        api: {
          sportmonks: fixture.id
        },
        status: fixture.time.status
      };

      resolve(fixtureObj);
    })
    .fail(function(response){
      reject(response.body);
    });
  });
};

/*
*
*/
exports.getFixtureEvents = function(fixtureId){
  return new Promise(function(resolve, reject){
    requestify.get("https://soccer.sportmonks.com/api/v2.0/fixtures/" + fixtureId + "?api_token=iNRlejLeBLcdtm1oYqCTOyG3eUAJIMqsXbLm2fXxSVDWWKnaEGxsgVLYhDac&include=localTeam,visitorTeam,events")
    .then(function(response){
      var fixture = response.getBody().data;
      var events = [];
      fixture.events.data.forEach(function(event){
        var teamId = "";
        if (event.team_id == fixture.localteam_id) teamId = "home";
        if (event.team_id == fixture.visitorteam_id) teamId = "away";
        if (event.result == null && event.type == "goal" ||
        event.result == null && event.type == "own-goal" ||
        event.result == null && event.type == "penalty" ||
        teamId == ""){
          //console.log("Ne pas prendre en compte l'évènement, car il semble être corrompu :", event);
        } else {
          events.push({ team: teamId, type: event.type, minute: event.minute, api: { sportmonks: event.id }, custom: false });
        }
      });

      var fixtureObj = {
        date: fixture.time.starting_at.date_time,
        timestamp: fixture.time.starting_at.timestamp,
        homeTeam: {
          name: fixture.localTeam.data.name,
          api: {
            sportmonks: fixture.localTeam.data.id
          }
        },
        awayTeam: {
          name: fixture.visitorTeam.data.name,
          api: {
            sportmonks: fixture.visitorTeam.data.id
          }
        },
        result: {
          homeScore: fixture.scores.localteam_score,
          awayScore: fixture.scores.visitorteam_score,
          halfScore: fixture.scores.ht_score,
          fullScore: fixture.scores.ft_score
        },
        api: {
          sportmonks: fixture.id
        },
        status: fixture.time.status,
        events: events };

        resolve(fixtureObj);
      })
      .fail(function(response){
        reject(response.body);
      });
    });
  };

  /*
  *
  */
  exports.getFixtureOdds = function(fixtureId){
    return new Promise(function(resolve, reject){
      requestify.get("https://soccer.sportmonks.com/api/v2.0/fixtures/" + fixtureId + "?api_token=iNRlejLeBLcdtm1oYqCTOyG3eUAJIMqsXbLm2fXxSVDWWKnaEGxsgVLYhDac&include=odds")
      .then(function(response){
        var fixture = response.getBody().data;
        var threeWayOdds = [];
        fixture.odds.data.forEach(function(odds){
          //console.log(odds);
          if (odds.name == "3Way Result"){
            //console.log(odds.name);
            odds.bookmaker.data.forEach(function(bookmaker){
              threeWayOdds.push({ fixture: fixtureId, bookmaker: bookmaker.name, odds: bookmaker.odds.data });
            });
          }
        });

        resolve(threeWayOdds);
      })
      .fail(function(response){
        reject(response.body);
      });
    });
  };

  /*
  *
  */
  exports.getLeagueStanding = function(season){
    return new Promise(function(resolve, reject){
      requestify.get("https://soccer.sportmonks.com/api/v2.0/standings/season/" + season + "?api_token=iNRlejLeBLcdtm1oYqCTOyG3eUAJIMqsXbLm2fXxSVDWWKnaEGxsgVLYhDac")
      .then(function(response){
        var standings = response.getBody().data;
        var standingArr = [];
        standings[0].standings.data.forEach(function(std){
          var standing = {
            team: std.team_id,
            position: std.position,
            points: std.total.points,
            goalDifference: std.total.goal_difference,
            recentForm: std.recent_form,
            overall: {
              gamesPlayed: std.overall.games_played,
              won: std.overall.won,
              draw: std.overall.draw,
              lost: std.overall.lost,
              goals: std.overall.goals_scored,
              goalsAgainst: std.overall.goals_against
            },
            home: {
              gamesPlayed: std.home.games_played,
              won: std.home.won,
              draw: std.home.draw,
              lost: std.home.lost,
              goals: std.home.goals_scored,
              goalsAgainst: std.home.goals_against
            },
            away: {
              gamesPlayed: std.away.games_played,
              won: std.away.won,
              draw: std.away.draw,
              lost: std.away.lost,
              goals: std.away.goals_scored,
              goalsAgainst: std.away.goals_against
            }
          };
          standingArr.push(standing);
        });

        resolve(standingArr);
      })
      .fail(function(response){
        reject(response.body);
      });
    });
  };
