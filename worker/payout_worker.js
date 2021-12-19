// If we are dev env, load dotenv
if (process.env.NODE_ENV != "production"){
  require('dotenv').config();
}


var MongoClient = require('mongodb').MongoClient;
var async = require('async');
var requestify = require('requestify');
var moment = require('moment');

/*
* Mettre à jour les grilles gagnantes n'ayant pas de demande de paiement
*/
var checkWaitingPaiementGrid = function(db) {
  return new Promise(function(resolve, reject){
    var Grille = db.collection('grille');
    var Payout = db.collection('payout');
    async.waterfall([
      // Récupérer les payouts ayants besoin d'une mise à jour de facture
      function(done){
        Payout.aggregate([
          { $match: { $or: [ { invoice: { $exists: false } }, { "invoice.paymentAddress": { $exists: false } } ] } },
          { $lookup: {
            from: 'user',
            localField: 'user',
            foreignField: '_id',
            as: 'user'
          } }
        ]).toArray(function(err, payouts){
          if (err){
            return done(err);
          } else if (payouts.length == 0){
            return done("Empty payouts");
          } else {
            console.log("Nombre de demandes de paiement devant être mise à jour :", payouts.length);
            return done(null, payouts);
          }
        });
      },

      function(payouts, done){
        //var payoutsWithoutInvoice = payouts.filter(pa => pa.invoice == null || pa.invoice == 'undefined');
        //var payoutsWithInvoice = payouts.filter(pa => pa.invoice != null);
        async.eachLimit(payouts, 1, function(payout, eachPayout){
          console.log(payout.user);
          return eachPayout("stop");
          if (typeof payout.invoice === 'undefined' || payout.invoice == null){

          } else {

          }
          eachPayout();
        }, function(err){
          if (err){
            return done(err);
          } else {
            return resolve("OK");
          }
        });
      }
    ], function(err, result){
      if (err){
        reject(err);
      } else {
        resolve(result);
      }
    });

  });

  /*Grille.find({ status: "win", "payout.status": "waiting_paiement" }).toArray().then(function(grilles){
  async.eachLimit(grilles, 1, function(grille, eachGrille){
  createPayout(db, grille).then(function(payout){
  eachGrille();
}, function(err){
console.log(err);
eachGrille();
});
}, function(err){
resolve();
});
}, function(err){
console.log('Impossible de trouver des grilles en attente de paiement');
reject(err);
});
});*/
};

/*
*
*/

var createPayout = function(db, grille){
  return new Promise(function(resolve, reject){
    var Payout = db.collection('payout');
    var Grille = db.collection('grille');
    //Payout.ensureIndex( { "kind": 1, "for": 1 }, { unique: true } );
    Payout.findOneAndUpdate({ target: grille._id, kind: 'Grille' }, { $set: { updatedAt: moment().utc().toDate(), user: grille.user, status: 'waiting_paiement', amount: grille.payout.amount } }, { upsert: true, returnOriginal: false }, function(err, result){
      if (err) return reject(err);
      console.log('Payout créé pour la grille:', result.value._id)
      Grille.findOneAndUpdate({ _id: result.value.target }, { $set: { updatedAt: moment().utc().toDate(), "payout.status": "payout_created" } }, { upsert: false, returnOriginal: false }, function(err, result){
        if (err) return reject(err);
        resolve(result);
      });
    });
  });
};



MongoClient.connect(process.env.DB_URI, function(err, db) {
  console.log("Connected successfully to server");
  console.log("-----> Start payout_worker.js <-----");
  checkWaitingPaiementGrid(db).then(function(res){
    console.log("-----> Payout Worker Job Done <-----");
    db.close();
  }, function(error){
    console.log('Error occur:', error)
    db.close();
  });
});
