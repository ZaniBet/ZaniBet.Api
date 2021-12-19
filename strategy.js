var mongoose = require('mongoose');
var passport = require('passport');
var moment = require('moment');

var ClientPasswordStrategy  = require('passport-oauth2-client-password').Strategy;
var BearerStrategy = require('passport-http-bearer').Strategy;
var LocalStrategy = require('passport-local').Strategy;
var User = mongoose.model('User');
var Admin = mongoose.model('Admin');
var Client = mongoose.model('Client');
var AccessToken = mongoose.model('AccessToken');
var RefreshToken = mongoose.model('RefreshToken');
var Affiliate = mongoose.model('Affiliate');

// Affiliate passport strategy
/*passport.use('affiliate-local', new LocalStrategy(
  function(username, password, done) {
    User.findOne({ username: username, active: true, role: 'affiliate' }, function (err, admin) {
      if (err) { return done(err); }
      if (!admin) {
        return done(null, false, { message: 'Incorrect username.' });
      }
      if (admin.password != password) {
        return done(null, false, { message: 'Incorrect password.' });
      }
      return done(null, admin);
    });
  }
));*/

//passport.use( 'affiliate-local', new LocalStrategy( Affiliate.createStrategy() ) );
passport.use( 'affiliate-local', Affiliate.createStrategy() );

// Configure client password-strategy
passport.use(new ClientPasswordStrategy(
  function(clientId, clientSecret, done) {
    Client.findOne({ clientId: clientId }, function (err, client) {
      if (err) { return done(err); }
      if (!client) { return done(null, false); }
      if (client.clientSecret != clientSecret) { return done(null, false); }
      return done(null, client);
    });
  }
));

// Access token strategy
passport.use(new BearerStrategy(function (accessToken, done) {
  //var accessTokenHash = crypto.createHash('sha1').update(accessToken).digest('hex')
  AccessToken.findOne({ token: accessToken }, function (err, token) {
    if (err){
      return done(err);
    }

    if (!token){
      return done(null, false);
    }

    if (new Date() > token.expirationDate) {
      AccessToken.remove({ token: accessToken }, function (err) {
        return done(err)
      });
    } else {
      User.findOne({ _id: token.userId },'-hash -salt -emailVerifyToken -updatedAt -devices -fcmToken -pendingTransactions -emailVerified -__v -facebookAccessToken -facebookId -transaction -comment', function (err, user) {
        if (err) {
          return done(err);
        }

        if (!user){
          return done(null, false);
        }

        if (user.status == "banned"){
          //return done(Error("Account suspended : Fraud"));
          AccessToken.remove({ token: accessToken }, function (err) {
            return done(null, false);
          });
        } else if (user.status == "removal_request"){
          //return done(new CustomError(500, 0, "Erreur", "Vous avez demandé la suppression de votre compte, celui ci à donc été désactivé et toutes les données relatives à votre compte seront supprimées à l'échéance du délai légal."));
          AccessToken.remove({ token: accessToken }, function (err) {
            return done(null, false);
          });
        }

        // no use of scopes for no
        var info = { scope: '*' }
        return done(null, user, info);
      });
    }
  });
}));

passport.serializeUser(function(user, done) {
  if (user instanceof Affiliate){
    done(null, user);
  } else {
    done(null, user._id);
  }
});

passport.deserializeUser(function(id, done) {
  if (id instanceof Affiliate){
    Affiliate.findById(id._id, function(err, affiliate) {
      done(err, affiliate);
    });
  } else {
    User.findById(id, function(err, user) {
      done(err, user);
    });
  }
});
