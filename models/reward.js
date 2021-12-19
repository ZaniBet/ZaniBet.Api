var mongoose = require('mongoose');

var RewardSchema = new mongoose.Schema({
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
  brand: { type: String, required: true },
  name: { type: String, required: true },
  value: { type: Number, required: true },
  amount: { // deprecated
    euro: { type: Number }
  },
  price: { type: Number },
  currency: { type: String, required: true },
  active: { type: Boolean, default: true }
}, { collection: 'reward' });

//RewardSchema.index({clientId : 1}, {unique:true});

var RewardModel = mongoose.model( 'Reward', RewardSchema );

exports.RewardModel = RewardModel;
