if (process.env.NODE_ENV != "production"){
  require('dotenv').config();
}

var compression = require('compression');
var express = require('express');
var path = require('path');
var favicon = require('serve-favicon');
var logger = require('morgan');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');
var mongoose = require('mongoose');
var passport = require('passport');
var helmet = require('helmet');
var responseSize = require('express-response-size');
const session = require('express-session');

require('./models/admin').AdminModel;
require('./models/user').UserModel;
require('./models/user').ReferralModel;
require('./models/client').ClientModel;
require('./models/authorizationcode').AuthorizationCodeModel;
require('./models/accesstoken').AccessTokenModel;
require('./models/refreshtoken').RefreshTokenModel;
require('./models/competition').CompetitionModel;
require('./models/team').TeamModel;
require('./models/fixture').FixtureModel;
require('./models/gameticket').GameTicketModel;
require('./models/grille').GrilleModel;
require('./models/reward').RewardModel;
require('./models/payout').PayoutModel;
require('./models/help').HelpModel;
require('./models/gift').GiftModel;
require('./models/notification').NotificationModel;
require('./models/socialtask').SocialTaskModel;
require('./models/transaction').TransactionModel;
//require('./models/device').DeviceModel;

// Sponspor
require('./models/affiliate').AffiliateModel;


if (process.env.NODE_ENV == "local"){
  console.log('NODE_ENV =', process.env.NODE_ENV);
  console.log('DB_URI =', process.env.DB_URI);
  console.log('BACK_URI =', process.env.BACK_URI);
  console.log('ANDROID_VERSION =', process.env.ANDROID_VERSION);
  console.log('ANDROID_VERSION_NAME =', process.env.ANDROID_VERSION_NAME);
  console.log('GCM API KEY =', process.env.GCM_API_KEY);
}


mongoose.connect(process.env.DB_URI, {
  useMongoClient: true,
});

var oauth2 = require('./oauth2.js');
var app = express();
//app.use(helmet);
app.use(compression());
// view engine setup
//if (process.env.NODE_ENV == "local"){
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');
app.locals.moment = require('moment');

app.use(express.static(path.join(__dirname, 'public')));
//}

// uncomment after placing your favicon in /public
//app.use(favicon(path.join(__dirname, 'public', 'favicon.ico')));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(cookieParser());

if (process.env.NODE_ENV == "local"){
  app.use(logger('tiny'));
  //mongoose.set('debug', true);
  app.use(function(req, res, next){
    //console.log(req.headers);
    next();
  });
  app.use(responseSize());
  app.use(session({
    secret: 'keyboard cat',
    resave: false,
    saveUninitialized: true,
    cookie: { secure: true }
  }));

  app.locals.scripts = [];
  app.locals.addScripts = function (all) {
    app.locals.scripts = [];
    if (all != undefined) {
      app.locals.scripts =  all.map(function(script) {
        console.log(script);
        return "<script src='/js/" + script + "'></script>";
      }).join('\n ');
    }
  };

  app.locals.getScripts = function(req, res) {
    return app.locals.scripts;
  };
}

// Load passport Strategy
require('./strategy');

/*app.all('*', function(req, res, next){
console.log(req.body);
console.log(req.headers);
next();
});*/

// Demande de token, avec utiliser du middleware oauth2
app.post('/api/oauth/token', oauth2.token);
app.post('/api/v1/oauth/token', oauth2.token);

// Route de l'application
require('./routes/index')(app);


// Aucune route trouvé, catch 404
app.use(function(req, res, next) {
  var err = new Error('Not Found');
  err.status = 404;
  next(err);
});

// error handler
app.use(function(err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  // render the error page
  res.status(err.status || 500);
  res.render('error');
});

module.exports = app;
