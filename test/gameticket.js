// If we are dev env, load dotenv
if (process.env.NODE_ENV != "production"){
  require('dotenv').config();
}

var mongoose = require('mongoose');
var Benchmark = require('benchmark');
var moment = require('moment');

require('../models/user').UserModel;
require('../models/client').ClientModel;
require('../models/authorizationcode').AuthorizationCodeModel;
require('../models/accesstoken').AccessTokenModel;
require('../models/refreshtoken').RefreshTokenModel;
require('../models/competition').CompetitionModel;
require('../models/team').TeamModel;
require('../models/fixture').FixtureModel;
require('../models/gameticket').GameTicketModel;
require('../models/grille').GrilleModel;
require('../models/reward').RewardModel;
require('../models/payout').PayoutModel;
require('../models/help').HelpModel;
require('../models/gift').GiftModel;
require('../models/notification').NotificationModel;
require('../models/socialtask').SocialTaskModel;

console.log(process.env.DB_URI);
mongoose.connect(process.env.DB_URI, {
  useMongoClient: true,
});

var User = mongoose.model("User");
var GameTicket = mongoose.model("GameTicket");
var Grille = mongoose.model("Grille");
var suite = new Benchmark.Suite;
var count = 0;
// add tests
new Benchmark('RegExp#test', function() {
  count++;
  var currentDate = moment().utc();
  var ticketType = "MATCHDAY";
  var currentUser;
  var page = 0;
  var limit = 3;

  var gameticketQuery;
  if (ticketType == "SINGLE"){
    gameticketQuery = GameTicket.find({ openDate: { $lt: currentDate }, limitDate: { $gt: currentDate }, status: 'open', active: true, type: ticketType })
    .skip(page*limit)
    .limit(limit)
    .sort({ limitDate: 1 });
  } else if (ticketType == "MATCHDAY"){
    gameticketQuery = GameTicket.find({ openDate: { $lt: currentDate }, limitDate: { $gt: currentDate }, status: 'open', active: true, type: ticketType })
    .skip(page*limit)
    .limit(limit)
    .sort({ limitDate: 1 });
  } else {
    console.log("Invalid ticket type.");
    //return;
  }

  User.findOne({ _id: mongoose.Types.ObjectId("5a15fe73258cad001435a028") }).exec(function(err, user){
    if (err) {
      console.log(err);
      return false;
    }
    currentUser = user;
    // Récupérer les tickets dont la date d'ouverte est passée et dont la date limite de validation n'est pas encore arrivée
    gameticketQuery.populate({ path: 'competition' }).populate({
      path: 'fixtures',
      options: { sort: { 'date': 1 } },
      populate: {
        path: 'homeTeam awayTeam'
      }
    }).exec(function(err, gametickets){
      if (err){
        console.log(err);
        return false;
      }
      //console.log(gametickets.length);
      if (ticketType == "SINGLE"){
        //console.log(gametickets);

      }
      async.mapLimit(gametickets,1, function(gameticket, done){
        Grille.count({ gameTicket: gameticket._id, user: currentUser._id, status: { $ne: 'canceled' } }, function(err, count){
          var convertedJSON = JSON.parse(JSON.stringify(gameticket));
          convertedJSON.numberOfGrillePlay = count;
          done(null, convertedJSON);
        });
      }, function(err, result){
        return true;
      });
    });
  });
})
// add listeners
.on('cycle', function(event) {
  console.log(String(event.target));
  console.log(count);
  count = 0;
  //console.log(event);
  console.log(Math.floor(event.target.times.cycle*1000));
  console.log(event.target.times);
})
.on('complete', function() {
  console.log('done');
  console.log(count);
  process.exit();
})
.run({ 'maxTime': 1, 'initCount': 1 });
// run async
//.run({ 'async': true });
