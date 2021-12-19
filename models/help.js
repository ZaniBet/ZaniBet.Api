var mongoose = require('mongoose');

var HelpSchema = new mongoose.Schema({
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
  priority: { type: Number },
  subject: { type: String },
  caption: { type: String },
  icon: { type: String },
  qa: [{
    question: { type: String },
    answer: { type: String }
  }],
  lang: { type: String, required: true }
}, { collection: 'help' });

//HelpSchema.index({clientId : 1}, {unique:true});

var HelpModel = mongoose.model( 'Help', HelpSchema );

exports.HelpModel = HelpModel;
