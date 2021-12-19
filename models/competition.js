var mongoose = require('mongoose');

var Game = new mongoose.Schema({
  type: { type: String, required: true },
  active: { type: Boolean, required: true }
}, { _id: false });

var Standing = new mongoose.Schema({
  team: { type: mongoose.Schema.Types.ObjectId, ref: 'Team', required: true },
  position: { type: Number, default: -1 },
  points: { type: Number, default: 0 },
  goalDifference: { type: Number, default: 0 },
  recentForm: { type: String, default: "" },
  overall: {
    gamesPlayed: { type: Number, default: 0},
    won: { type: Number, default: 0 },
    draw: { type: Number, default: 0 },
    lost: { type: Number, default: 0 },
    goals: { type: Number, default: 0 },
    goalsAgainst: { type: Number, default: 0 },
  },
  home: {
    gamesPlayed: { type: Number, default: 0},
    won: { type: Number, default: 0 },
    draw: { type: Number, default: 0 },
    lost: { type: Number, default: 0 },
    goals: { type: Number, default: 0 },
    goalsAgainst: { type: Number, default: 0 },
  },
  away: {
    gamesPlayed: { type: Number, default: 0},
    won: { type: Number, default: 0 },
    draw: { type: Number, default: 0 },
    lost: { type: Number, default: 0 },
    goals: { type: Number, default: 0 },
    goalsAgainst: { type: Number, default: 0 },
  }
});

var CompetitionSchema = new mongoose.Schema({
  _id: { type: String, required: true, unique: true },
  createdAt : { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
  uri: { type: String },
  code: { type: String },
  openDate: { type: Date }, // date d'ouverture de la compétition
  closingDate: { type: Date }, // date de fermeture de la compétition
  logo: { type: String },
  name: { type: String, required: true }, // nom de la competition
  country: { type: String },
  confederation: { type: String },
  region: { type: String }, // Europe, Asia, Africa, South America, North America, Oceania
  division: { type: Number },
  season: { type: Number, required: true },
  teams: [ { type: mongoose.Schema.Types.ObjectId, ref: 'Team' } ],
  firstMatchDate: { type: Date },
  lastMatchDate: { type: Date },
  numberOfMatchDays: { type: Number, default: 0 },
  numberOfGames: { type: Number, default: 0 },
  numberOfTeams: { type: Number, default: 0 },
  active: { type: Boolean, default: true },
  hashtag: { type: String },
  isCup: { type: Boolean, required: true, false: false }, // définir si la compétition est un évènement avec une coupe
  isInternational: { type: Boolean, required: true, default: false },
  isCurrentSeason: { type: Boolean, required: true, default: false },
  isFriendly: { type: Boolean, default: false },
  availableGames: [Game],
  standings: [Standing],
  api : {
    footballdata: { type: Number },
    sportmonks: {
      season: Number,
      league: Number
    }
  },
  twitter: { type: String }
}, { collection: 'competition' });

CompetitionSchema.index({ active: 1 });

var CompetitionModel = mongoose.model( 'Competition', CompetitionSchema );

exports.CompetitionModel = CompetitionModel;
