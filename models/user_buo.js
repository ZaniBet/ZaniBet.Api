var mongoose = require('mongoose');
var passportLocalMongoose = require('passport-local-mongoose');
var uniqid = require('uniqid');

var UserSchema = new mongoose.Schema({
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
  status: { type: String, default: 'active' }, // active, sleeping, verified, banned, removal_asked
  role: { type: String, default: 'user' }, // user, partner
  email: { type: String, unique: true, trim: true, lowercase: true, required: true },
  emailVerified: { type: Boolean, default: false },
  emailVerifyToken: String,
  emailResetExpires: Date,
  facebookId: { type: String },
  facebookAccessToken : { type: String },
  resetPasswordToken: String,
  resetPasswordExpires: Date,
  locale: String,
  lastname: { type: String },
  firstname: { type: String },
  gender: { type: String }, // MALE, FEMALE, OTHER
  birthday: { type: String },
  premium: {
    active: { type: Boolean, default: false },
    createdAt: { type: Date },
    renewAt: { type: Date },
    expireAt: { type: Date }
  }
}, { collection: 'user_buo' });

UserSchema.plugin(passportLocalMongoose, { usernameField: 'email', selectFields:'+salt +hash' });

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
