var mongoose = require('mongoose');
var passportLocalMongoose = require('passport-local-mongoose');
var uniqid = require('uniqid');

var AffiliateSchema = new mongoose.Schema({
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
  username: { type: String, unique: true, required: true },
  email: { type: String, unique: true, trim: true, lowercase: true },
  emailVerified: { type: Boolean, default: false },
  emailVerifyToken: String,
  firstname: { type: String, required: true },
  lastname: { type: String, required: true },
  point: { type: Number, default: 0 },
  paypal: String,
  status: { type: String, default: 'active' },
  comment: String,
  referral: {
    invitationCode: { type: String, required: true, unique: true },
    invitationBonus: { type: Number, default: 1000 },
    coinRewardPercent: { type: Number, default: 20 },
    adsReward: { type: Number, default: 1 },
    freeReward: { type: Number, default: 0 }
  },
  stats: {
    totalReferred: { type: Number, default: 0 }, // Nombre total de filleul
    totalCoin: { type: Number, default: 0 }, // Revenu total de coin issu du parainnage
    totalMatchdayTransaction: { type: Number, default: 0 }, // Total des tickets multi joués
    totalSimpleTransaction: { type: Number, default: 0 } // Total des tickets simple joués
  }
}, { collection: 'affiliate' });

AffiliateSchema.plugin(passportLocalMongoose, { usernameField: 'email', selectFields:'+salt +hash' });


AffiliateSchema.pre('update', function() {
  this.update({},{ $set: { updatedAt: new Date() } });
});

var AffiliateModel = mongoose.model( 'Affiliate', AffiliateSchema );

exports.AffiliateModel = AffiliateModel;
//exports.LevelSchema = LevelSchema;
