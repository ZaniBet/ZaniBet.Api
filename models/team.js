var mongoose = require('mongoose');

var TeamSchema = new mongoose.Schema({
  name: { type: String, required: true },
  shortName: { type: String },
  shortCode: { type: String },
  logo: { type: String },
  competition: { type: String, ref: 'Competition' },
  country: { type: String, required: true },
  isNational: { type: Boolean, default: false },
  recentForm: { type: String }, // W, D , L
  uefaRanking: {
    points: { type: Number },
    coeffiecient: { type: Number },
    position: { type: Number }
  },
  api: {
    footballdata: { type: Number },
    sportmonks: { type: Number }
  },
  twitter: { type: String }
}, { collection: 'team' });

//TeamhSchema.index({clientId : 1}, {unique:true});

var TeamModel = mongoose.model( 'Team', TeamSchema );

exports.TeamModel = TeamModel;
