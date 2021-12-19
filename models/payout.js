var mongoose = require('mongoose');


var PayoutSchema = new mongoose.Schema({
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
  paidAt: { type: Date }, // date de paiement
  reference: { type: String, required: true },
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  kind: { type: String, required: true }, // Source de la demande de paiement : Reward / Grille
  target: { type: mongoose.Schema.Types.ObjectId, refPath: 'kind', required: true }, // Référence de la source
  status: { type: String, default: 'waiting_paiement' }, // waiting_paiement / canceled / fraud / paid
  verified: { type: Boolean, default: false }, // Indique si la transaction est éligible au mass-payment

  description: { type: String }, // deprecated
  amount: { type: Number }, // deprecated
  rewardCost: { type: Number }, // deprecated

  notifications: [{
    _id: { type: String, required: true }, // PAID_EMAIL
    date: { type: Date, required: true }
  }],
  invoice: {
    firstname: { type: String },
    lastname: { type: String },
    address: { type: String },
    paymentMethod: { type: String }, // PayPal / Amazon / Bitcoin
    paymentAddress: { type: String },
    paymentReference: { type: String },
    paymentBatchReference: { type: String }, // Paypal Batch ID
    price: { type: Number, default: 0 }, // Montant payé pour obtenir la récompense
    amount: { type: Number }, // Montant due à l'utilisateur
  }
}, { collection: 'payout' });

//PayoutSchema.index({ kind: 1, for: 1}, { unique: true });
PayoutSchema.pre('update', function() {
  this.update({},{ $set: { updatedAt: new Date() } });
});

var PayoutModel = mongoose.model( 'Payout', PayoutSchema );

exports.PayoutModel = PayoutModel;
