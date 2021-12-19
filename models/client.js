var mongoose = require('mongoose');

var ClientSchema = new mongoose.Schema({
  name: { type: String, trim: true, lowercase: true },
  clientId: { type: String, trim: true, unique: true },
  clientSecret: { type: String, trim: true }
}, { collection: 'client' });

ClientSchema.index({ clientId : 1 });

var ClientModel = mongoose.model( 'Client', ClientSchema );
if (process.env.NODE_ENV == "local"){
  ClientModel.on('index', function(error) {
    // "_id index cannot be sparse"
    console.log("ClientModel on index", error);
  });
}

exports.ClientModel = ClientModel;
