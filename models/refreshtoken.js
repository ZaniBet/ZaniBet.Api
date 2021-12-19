var mongoose = require('mongoose');

var RefreshTokenSchema = new mongoose.Schema({
  refreshToken: { type: String, trim: true },
  clientId: { type: String },
  userId: { type: String }
}, { collection: 'refreshToken' });

//accessTokenSchema.index({email : 1}, {unique:true});

var RefreshTokenModel = mongoose.model( 'RefreshToken', RefreshTokenSchema );

exports.RefreshTokenModel = RefreshTokenModel;
