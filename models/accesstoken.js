var mongoose = require('mongoose');

var AccessTokenSchema = new mongoose.Schema({
  token: { type: String, trim: true, unique: true },
  expirationDate: { type: Date },
  userId: { type: String },
  clientId: { type: String },
  scope: { type: String }

}, { collection: 'accesstoken' });


AccessTokenSchema.index({
  token: 1,
  userId: 1
});

var AccessTokenModel = mongoose.model( 'AccessToken', AccessTokenSchema );

if (process.env.NODE_ENV == "local"){
  AccessTokenModel.on('index', function(error) {
    // "_id index cannot be sparse"
    console.log("AccessTokenModel on index", error);
  });
}

exports.AccessTokenModel = AccessTokenModel;
