// If we are dev env, load dotenv
if (process.env.NODE_ENV != "production"){
  require('dotenv').config();
}

var MongoClient = require('mongodb').MongoClient;
var async = require('async');
var requestify = require('requestify');
var memjs = require('memjs');

var mc = memjs.Client.create(process.env.MEMCACHIER_SERVERS, {
  failover: true,  // default: false
  timeout: 1,      // default: 0.5 (seconds)
  keepAlive: true  // default: false
});

var cacheJob = function(db){
  return new Promise(function(resolve, reject){

    async.parallel([

      // Rafraîchir le cache des compétitions
      function(done){
        var Competition = db.collection("competition");
        Competition.find({ active: true, isCurrentSeason: true })
        .project({ _id:1, name:1, logo:1, country:1, division:1 })
        .sort({ country: 1 })
        .toArray(function(err, competitions){
          if (err){
            console.log(err);
            done(err);
          } else if (competitions == null || competitions.length == 0) {
            done("La liste des compétitions est vide");
          } else {
            console.log(competitions[0]);
            mc.set('competitions', JSON.stringify(competitions), { expires:600 }, function(err, val) {
              if (err){
                console.log(err);
                return done(err);
              } else {
                console.log("Les compétitions ont été mise en cache !", val);
                return done(null, "OK");
              }
            });
          }
        });
      },

      // Rafraîhcir le cache des compétitions matchday
      function(done){
        var Competition = db.collection("competition");
        Competition.find({ active: true, isCurrentSeason: true, availableGames: { $elemMatch: { type: "MATCHDAY", active: true } } })
        .project({_id:1, name:1, logo:1, country:1, division:1})
        .sort({ country: 1 })
        .toArray(function(err, competitions){
          if (err){
            console.log(err);
            return done(err);
          } else if (competitions == null || competitions.length == 0) {
            return done("La liste des compétitions est vide");
          } else {
            mc.set('competitions_matchday', JSON.stringify(competitions), { expires:600 }, function(err, val) {
              if (err){
                console.log(err);
                return done(err);
              } else {
                console.log("Les compétitions matchday ont été mise en cache !");
                return done(null, "OK");
              }
            });
          }
        });
      },

      // Rafraîhcir le cache des récompenses en ZaniCoins
      function(done){
        var Reward = db.collection("reward");
        Reward.find({ currency: "ZaniCoin" })
        .sort({ value: 1 })
        .project({ _id:1, value:1, name:1, brand:1, price:1 })
        .toArray(function(err, rewards){
          if (err){
            console.log(err);
            return done(err);
          } else if (rewards == null || rewards.length == 0) {
            return done("La liste des récompenses en ZaniCoin est vide");
          } else {
            mc.set('rewards_zanicoin', JSON.stringify(rewards), { expires:600 }, function(err, val) {
              if (err){
                console.log(err);
                return done(err);
              } else {
                console.log("Les récompenses achetablent en ZaniCoin ont été mise en cache !");
                return done(null, "OK");
              }
            });
          }
        });
      },

      // Rafraîhcir le cache des récompenses en ZaniHash
      function(done){
        var Reward = db.collection("reward");
        Reward.find({ currency: "ZaniHash" })
        .sort({ value: 1 })
        .project({ _id:1, value:1, name:1, brand:1, price:1 })
        .toArray(function(err, rewards){
          if (err){
            console.log(err);
            return done(err);
          } else if (rewards == null || rewards.length == 0) {
            return done("La liste des récompenses en ZaniHash est vide");
          } else {
            mc.set('rewards_zanihash', JSON.stringify(rewards), { expires:600 }, function(err, val) {
              if (err){
                console.log(err);
                return done(err);
              } else {
                console.log("Les récompenses achetablent en ZaniHash ont été mise en cache !");
                return done(null, "OK");
              }
            });
          }
        });
      }

    ], function(err, result){
      if (err){
        return reject(err);
      } else {
        return resolve(result);
      }
    });

  });
};


MongoClient.connect(process.env.DB_URI, function(err, db) {
  console.log("Connected successfully to server");
  console.log("-----> Start cache_worker.js <-----");
  cacheJob(db).then(function(res){
    console.log(res);
    db.close();
    mc.close();
  }, function(err){
    console.log(err);
    db.close();
    mc.close();
  });
});
