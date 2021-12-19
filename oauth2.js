var mongoose = require('mongoose');
var oauth2orize = require('oauth2orize');
var passport = require('passport');
var utils  = require('./lib/utils.js');
var config = require('./config/global.js');
var crypto = require('crypto');

// Charger les modèles
var User = mongoose.model('User');
var Client = mongoose.model('Client');
var AccessToken = mongoose.model('AccessToken');
var RefreshToken = mongoose.model('RefreshToken');

// Démarrer le serveur Oauth2
var server = oauth2orize.createServer();

/**
* Exchange user id and password for access tokens.
*
* The callback accepts the `client`, which is exchanging the user's name and password
* from the token request for verification. If these values are validated, the
* application issues an access token on behalf of the user who authorized the code.
*/
server.exchange(oauth2orize.exchange.password(function (client, username, password, scope, done) {
  //Validate the user
  username = username.toLowerCase();
  User.findOne({ email: username},'hash salt status', function (err, user) {
    if (err) {
      return done(err);
    }

    if (user == null) {
      return done(null, false, { message: 'Identifiant ou mot de passe incorrect.'});
    }

    if (user.status == "banned"){
      //return done(Error("Account suspended : Fraud"));
      return done(null, false, { message: 'Account suspended : Fraud' });
    } else if (user.status == "removal_request"){
      return done(null, false, { message: "Vous avez demandé la suppression de votre compte, celui ci à donc été désactivé et toutes les données relatives à votre compte seront supprimées à l'échéance du délai légal." });
      //return done(null, false);
    }

    if(user.hash == null || user.salt == null){
      return done(null, false, { message: 'Identifiant ou mot de passe incorrect.'});
    }

    // Check if password match hash
    const key = crypto.pbkdf2Sync(password, user.salt, 25000, 512, 'sha256');

    if (key.toString('hex') !== user.hash ){
      return done(null, false, { message: 'Identifiant ou mot de passe incorrect.'});
    }


    var token = utils.uid(config.token.accessTokenLength);
    var refreshToken = utils.uid(config.token.accessTokenLength);

    // Création du token
    AccessToken.create({ token: token, expirationDate: config.token.calculateExpirationDate(), userId: user._id, clientId: client.clientId, scope: scope }, function (err, tok) {
      if (err) {
        return done(err);
      }

      // Création du token de refraîchissement
      RefreshToken.create({ refreshToken: refreshToken, clientId: client.clientId, userId: user._id }, function(err, refreshTok){
        if (err){
          return done(err);
        }
        return done(null, token, refreshToken, {expires_in: config.token.expiresIn});
      })
    });
  });
}));

//Refresh Token
server.exchange(oauth2orize.exchange.refreshToken(function (client, refreshToken, scope, done) {
    //var refreshTokenHash = crypto.createHash('sha1').update(refreshToken).digest('hex')

    RefreshToken.findOne({ 'refreshToken': refreshToken }, function (err, token) {
        if (err) return done(err)
        if (!token) return done(null, false)
        if (client.clientId !== token.clientId) return done(null, false)

        var newAccessToken = utils.uid(256)
        //var accessTokenHash = crypto.createHash('sha1').update(newAccessToken).digest('hex')

        var expirationDate = new Date(new Date().getTime() + (3600 * 1000))

        AccessToken.update({ userId: token.userId }, { $set: {token: newAccessToken, scope: scope, expirationDate: expirationDate } }, function (err) {
            if (err){
              return done(err)
            }
            return done(null, newAccessToken, refreshToken, { expires_in: expirationDate });
        })
    })
}));


// token endpoint
//
// `token` middleware handles client requests to exchange authorization grants
// for access tokens.  Based on the grant type being exchanged, the above
// exchange middleware will be invoked to handle the request.  Clients must
// authenticate when making requests to this endpoint.

exports.token = [
  passport.authenticate('oauth2-client-password', { session: false }),
  server.token(),
  server.errorHandler()
]
