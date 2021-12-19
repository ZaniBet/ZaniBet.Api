// If we are dev env, load dotenv
if (process.env.NODE_ENV != "production"){
  require('dotenv').config();
}

var MongoClient = require('mongodb').MongoClient;
var async = require('async');
var requestify = require('requestify');
var moment = require('moment');

var partnerStatsJob = function(db){
  return new Promise(function(resolve, reject){
    var User = db.collection('user');
    var Transaction = db.collection('transaction');

    async.waterfall([

      // Trouver les comptes partenaire
      function(done){
        User.find({ role: "partner" }).toArray().then(function(users){
          if (users.length == 0){
            return done("Aucun compte partenaire trouvé");
          } else {
            return done(null, users);
          }
        }, function(err){
          return done(err);
        });
      },

      // pour chaque compte partenaire rafraichir les statistiques
      function(partners, done){
        async.eachLimit(partners, 1, function(partner, eachPartner){

          async.parallel({
            referredToday: function(callback) {
              User.count({ "referral.referrer": partner._id, createdAt: { $gt: moment().utc().startOf('day').toDate(), $lt: moment().utc().endOf('day').toDate() } }, function(err, count){
                if (err){
                  return callback(err);
                } else {
                  return callback(null, count);
                }
              });
            },
            referredCurrentMonth: function(callback){
              User.count({ "referral.referrer": partner._id, createdAt: { $gt: moment().utc().startOf('month').toDate(), $lt: moment().utc().endOf('month').toDate() } }, function(err, count){
                if (err){
                  return callback(err);
                } else {
                  return callback(null, count);
                }
              });
            },
            totalCoinMultiTicketPlay: function(callback){
              Transaction.aggregate([
                { $match: { type: "Referral-Grid-Multi", destination: partner._id } },
                { $group: { _id: null, total: { $sum: "$amount" } } }
              ], function(err, result){
                if (err){
                  return callback(err);
                } else if (result == null || result.length == 0){
                  console.log("Empty referral multi grid transaction for :", partner.username);
                  return callback(null, 0);
                } else {
                  //console.log(result);
                  return callback(null, result[0].total);
                }
              });
            },
            totalCoinSimpleTicketPlay: function(callback){
              return callback(null, "ok");
            }
          }, function(err, result){
            if (err) return eachPartner(err);
            //console.log(partner.username, ":", result);
            User.updateOne({ _id: partner._id }, { $set: { "referral.totalReferredToday": result.referredToday, "referral.totalReferredMonth": result.referredCurrentMonth } }, function(err, res){
              if (err) return eachPartner(err);
              //console.log("Mise à jour des statistiques du compte partenaire", res.result);
              return eachPartner(null);
            });
          });

        }, function(err){
          if (err){
            return done(err);
          } else {
            return done("OK");
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

// Use connect method to connect to the server
MongoClient.connect(process.env.DB_URI, function(err, db) {
  console.log("Connected successfully to server");
  console.log("-----> Start partner_worker.js <-----");
  partnerStatsJob(db).then(function(res){
    db.close();
  }, function(err){
    console.log(err);
    db.close();
  });
});
