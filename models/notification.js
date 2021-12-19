var mongoose = require('mongoose');

var NotificationSchema = new mongoose.Schema({
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
  sendAt: { type: Date, required: true },
  audience: { type: [String] }, // push / email
  eventName: { type: String, required: true }, // grid_remaining
  title: { type: String, required: true },
  message: { type: String, required: true },
  extra: { type: String },
  kind: { type: String }, // Grille
  locale: { type: String, default: 'fr' },
  target: { type: mongoose.Schema.Types.ObjectId, refPath: 'kind' },
  status: { type: String, default: 'pending' } // pending / canceled / sent
}, { collection: 'notification' });

NotificationSchema.pre('update', function() {
  this.update({},{ $set: { updatedAt: new Date() } });
});

var NotificationModel = mongoose.model( 'Notification', NotificationSchema );

exports.NotificationModel = NotificationModel;
