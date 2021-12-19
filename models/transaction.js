var mongoose = require('mongoose');

/*var StatusSchema = new mongoose.Schema({
  createdAt: { type: Date, default: Date.now },
  status: { type: String, required: true },
  comment: String
});

var AdsNetworkSchema = new mongoose.Schema({
  _id: String, // transactionId
  network: { type: String, required: true },
  offerId: String,
  commission: Number,
});*/

var TransactionSchema = new mongoose.Schema({
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
  type: { type: String, required: true }, // Jeton, Grille, Referral-Coin, Referral-Jeton, Tournament, ZaniHash, Play-Tournament
  action: { type: String }, // fund / withdrawal / refund
  description: { type: String },
  source: { type: mongoose.Schema.Types.Mixed, required: true, refPath: 'sourceKind' }, // Adscend, IronSource, GrilleId, ZaniAnalytics, GameTicketId
  sourceRef: { type: String },
  sourceKind: { type: String, required: true }, // AdsNetwork, Grille, ZaniAnalytics, GameTicket
  destination: { type: mongoose.Schema.Types.Mixed, required: true, refPath: 'destinationKind' },
  destinationKind: { type: String, required: true }, // User, Partner
  amount: { type: Number, required: true },
  currency: { type: String }, // ZaniCoin - ZaniHash - Jeton - Euro
  status: { type: String, default: "inital", required: true }, // initial, pending, applied, canceling, canceled, done
  
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, // DEPRECATED
  from: { type: String }, // DEPRECATED
  fromId: { type: mongoose.Schema.Types.Mixed }, // DEPRECATED
}, { collection: 'transaction' });

TransactionSchema.pre('update', function() {
  this.update({},{ $set: { updatedAt: new Date() } });
});

var TransactionModel = mongoose.model( 'Transaction', TransactionSchema );

exports.TransactionModel = TransactionModel;
