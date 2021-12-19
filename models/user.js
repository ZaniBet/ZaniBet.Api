var mongoose = require('mongoose');
var passportLocalMongoose = require('passport-local-mongoose');
var uniqid = require('uniqid');

var TransactionSchema = new mongoose.Schema({
  createdAt: { type: Date, default: Date.now },
  type: { type: String, required: true },
  amount: { type: Number, required: true },
  status: { type: String, default: 'waiting_paiement' }
});

var ReferralSchema = new mongoose.Schema({
  rank: { type: String, default: "Basic" },
  invitationCode: { type: String, required: true },
  invitationCodeEditAttempt: { type: Number, default: 0 },
  invitationBonus: { type: Number, default: 1000 },
  coinRewardPercent: { type: Number, default: 10 },
  coinPerMultiTicketPlay: { type: Number, default: 5 },
  coinPerSimpleTicketPlay: { type: Number, default: 0},
  jetonReward: { type: Number, default: 50 },
  referrer: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  totalReferred: { type: Number, default: 0 }, // Nombre total de filleul
  totalReferredToday: { type: Number, default: 0 }, // Nombre total de filleul
  totalReferredMonth: { type: Number, default: 0 }, // Nombre total de filleul
  totalCoin: { type: Number, default: 0 }, // Revenu total en coin issu du parainnage
  totalCoinMultiTicketPlay: { type: Number, default: 0 },
  totalCoinSimpleTicketPlay: { type: Number, default: 0 },
  totalJeton: { type: Number, default: 0 }, // Revenu total en jeton issu du parainnage
  totalTransaction: { type: Number, default: 0 }, // Nombre total de transaction issu du parainnage
}, { _id : false });
var ReferralModel = mongoose.model( 'Referral', ReferralSchema );

var UserSchema = new mongoose.Schema({
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
  status: { type: String, default: 'active' }, // active, sleeping, verified, banned, removal_asked
  role: { type: String, default: 'user' }, // user, partner
  notifications: [{
    date: { type: Date, required: true },
    id: { type: String, required: true }
  }], // notifications envoyées à l'utilisateur
  username: { type: String, unique: true },
  usernameEditAttempt: { type: Number, default: 0 },
  email: { type: String, unique: true, trim: true, lowercase: true, required: true },
  emailVerified: { type: Boolean, default: false },
  emailVerifyToken: String,
  emailResetExpires: Date,
  facebookId: { type: String },
  facebookAccessToken : { type: String },
  resetPasswordToken: String,
  resetPasswordExpires: Date,
  fcmToken: String,
  locale: String,
  lastname: { type: String },
  firstname: { type: String },
  gender: { type: String }, // MALE, FEMALE, OTHER
  birthday: { type: String },
  paypal: { type: String },
  bitcoin: { type: String },
  address: {
    street: { type: String },
    city: { type: String },
    zipcode: { type: String },
    country: { type: String }
  },
  point: { type: Number, default: 0 }, // DEPRECATED
  jeton: { type: Number, default: 40 }, // DEPRECATED
  zaniHashEnabled: { type: Boolean, default: false },
  wallet: {
    zaniCoin: { type: Number, default: 0 }, // zc disponible pour etre utilisé
    zaniHash: { type: Number, default: 0 }, // zh disponible pour être utilisé
    chips: { type: Number, default: 40 }, // jeton disponible à l'utilisation
    totalZaniCoin: { type: Number, default: 0 }, // total de zc acquis depuis l'inscription
    totalZaniHash: { type: Number, default: 0 }, // total des zh minés depuis l'inscription
  },
  stats: {
    totalGridMatchday: { type: Number, default: 0 },
    totalGridSimple: { type: Number, default: 0 }
  },
  lastJetonAds: { type: Date },
  lastFreeJeton: { type: Date, default: Date.now },
  transaction: TransactionSchema, // DEPRECATED
  pendingTransactions: [],
  referral: ReferralSchema,
  manager: { // Account manager
    name: String,
    skype: String,
    email: String
  }
}, { collection: 'user' });

UserSchema.plugin(passportLocalMongoose, { usernameField: 'email', selectFields:'+salt +hash' });

/*UserSchema.index({
  _id: 1,
  createdAt: 1,
  emailVerifyToken: 1,
  role: 1,
  email: 1,
  jeton: 1,
  pendingTransactions: 1,
  "referral.invitationCode": 1,
  "referral.coinPerMultiTicketPlay": 1,
  "referral.referrer": 1
}, {
  name: "user_global_index",
  background: true
});*/

UserSchema.index({
  facebookId: 1
}, { unique: true, sparse: true, background: true });

UserSchema.pre('update', function() {
  this.update({},{ $set: { updatedAt: new Date() } });
});

UserSchema.post('init', function(user){
  //console.log("POST INIT USER", user.referral);
  // Définir un code d'invitation pour chaque utilisateur
  //console.log(user.isSelected("referral"));
  if (user.referral == null && user.isSelected('referral')){
    console.log("Create referral for", user.username);
    var referral = new ReferralModel();
    referral.invitationCode = uniqid.time();
    //user.update({ _id: user._id, referral: { $exists: false } }, { $set: { referral: referral } }, { setDefaultsOnInsert: true });
    //user.update({ })
    user.set({ referral: referral });
    user.save();
  } else if (user.role == null && user.isSelected('role')){
    user.set({ role: 'user' });
    user.save();
  } else if (user.wallet == null && user.isSelected('wallet')){
    var wallet = { zaniHash: 0, totalZaniHash: 0 };
    user.set({ wallet: wallet });
    user.save();
  }
});

var UserModel = mongoose.model( 'User', UserSchema );

if (process.env.NODE_ENV == "local"){
  UserModel.on('index', function(error) {
    // "_id index cannot be sparse"
    console.log("UserModel on index", error);
  });
}

exports.UserModel = UserModel;
exports.ReferralModel = ReferralModel;
