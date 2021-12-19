var mongoose = require('mongoose');

var AuthorizationCodeSchema = new mongoose.Schema({
  code: { type: String, trim: true },
  clientId: { type: String, trim: true },
  redirectURI: { type: String, trim: true },
  userID: { type: String },
  scope: { type: String }

}, { collection: 'authorizationCode' });

var AuthorizationCodeModel = mongoose.model( 'AuthorizationCode', AuthorizationCodeSchema );

exports.AuthorizationCodeModel = AuthorizationCodeModel;
