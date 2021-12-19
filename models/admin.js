var mongoose = require('mongoose');

var AdminSchema = new mongoose.Schema({
  createdAt: { type: Date, default: Date.now },
  username: { type: String, unique: true },
  password: { type: String },
  firstname: { type: String },
  lastname: { type: String },
  active: { type: Boolean, default: true },
}, { collection: 'admin' });

var AdminModel = mongoose.model( 'Admin', AdminSchema );

exports.AdminModel = AdminModel;
//exports.LevelSchema = LevelSchema;
