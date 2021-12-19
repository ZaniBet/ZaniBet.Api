var mongoose = require('mongoose');

var GiftSchema = new mongoose.Schema({
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
  kind: { type: String, required: true }, // Point, Grid,
  amount: { type: Number, required: true },
  activationDate: { type: Date, required: true },
  recipientCount: { type: Number, default: 0 },
  status: { type: String, default: 'pending' },
  notification: {
    enabled: { type: Boolean, default: false },
    title: String,
    message: String
  },
  target: {
    audience: { type: String, required: true }, // Everybody , Single
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
  }
}, { collection: 'gift' });

GiftSchema.pre('update', function() {
  this.update({},{ $set: { updatedAt: new Date() } });
});

var GiftModel = mongoose.model( 'Gift', GiftSchema );

exports.GiftModel = GiftModel;
