var mongoose = require('mongoose');

var OddsSchema = new mongoose.Schema({
  type: { type: String, required: true }, // 1N2
  bookmaker: { type: String, default: "ZaniBet" },
  odds: {
    homeTeam: Number,
    draw: Number,
    awayTeam: Number,
    positive: Number,
    negative: Number
  }
});

var EventSchema = new mongoose.Schema({
  team: { type: mongoose.Schema.Types.ObjectId, ref: 'Team', required: true },
  type: { type: String, required: true },
  minute: { type: Number, required: true },
  custom: { type: Boolean, default: false },
  api: {
    sportmonks: { type: Number }
  }
});

var FixtureSchema = new mongoose.Schema({
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
  uri: { type: String },
  name: { type: String },
  competition: { type: String, ref: 'Competition' },
  date : { type: Date, required: true },
  matchDay: { type: Number },
  group: { type: String },
  homeTeam: { type: mongoose.Schema.Types.ObjectId, ref: 'Team', required: true },
  awayTeam: { type: mongoose.Schema.Types.ObjectId, ref: 'Team', required: true },
  result: {
    auto: { type: Boolean, default: true },
    winner: { type: Number, default: -1 }, // 0 = equal 1= home 2= away
    homeScore: { type: Number, default: -1 },
    awayScore : { type: Number, default: -1 }
  },
  venue: {
    name: { type: String },
    address: { type: String },
    city: { type: String },
    capacity: { type: Number }
  },
  status: { type: String, default: 'soon'}, // soon / canceled / playing / done / postphoned
  tvstations: [String],
  odds: [OddsSchema],
  events: [EventSchema],
  isCup: { type: Boolean, default: false },
  isFriendly : { type: Boolean, default: false },
  zScore: { type: Number, default: 0 }, // valeur utilisé pour définir la valeur des pronostics pour le match
  api: {
    footballdata: { type: Number },
    sportmonks: { type: Number }
  },
  twitter: { type: String },
  comment: { type: String }
}, { collection: 'fixture' });

//FixtureSchema.index({ status: 1 });

/*FixtureSchema.index({
  _id: 1,
  date: 1,
  competition: 1,
  matchDay: 1,
  status: 1,
  homeTeam: 1,
  awayTeam: 1,
  "api.sportmonks": 1,
  "result.auto": 1
});*/


FixtureSchema.pre('update', function() {
  this.update({},{ $set: { updatedAt: new Date() } });
});

var FixtureModel = mongoose.model( 'Fixture', FixtureSchema );

if (process.env.NODE_ENV == "local"){
  FixtureModel.on('index', function(error) {
    // "_id index cannot be sparse"
    console.log("FixtureModel on index", error);
  });
}

exports.FixtureModel = FixtureModel;
