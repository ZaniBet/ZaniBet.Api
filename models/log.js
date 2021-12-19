var mongoose = require('mongoose');

var LogSchema = new mongoose.Schema({
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },

}, { collection: 'log' });

//HelpSchema.index({clientId : 1}, {unique:true});

var LogModel = mongoose.model( 'Log', LogSchema );

exports.LogModel = LogModel;
