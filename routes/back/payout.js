var express = require('express');
var mongoose = require('mongoose');
var router = express.Router();
var passport = require('passport');
var moment = require('moment');
var requestify = require('requestify');
var mongojs = require('mongojs');
var async = require('async');
var FootballDataApi = require('../../fetcher/footballdata');
var gcm = require('../../lib/gcm');
var mailer = require('../../lib/mailer');
var paypal = require('paypal-rest-sdk');
paypal.configure({
  'mode': 'live', //sandbox or live
  'client_id': process.env.PAYPAL_CLIENT_LIVE,
  'client_secret': process.env.PAYPAL_SECRET_LIVE
});

moment.locale('fr');

var User = mongoose.model('User');
var Grille = mongoose.model('Grille');
var Payout = mongoose.model('Payout');

// Récupérer la liste des demandes de paiement
router.get('/payouts', function(req, res){
  var status = req.session.status;
  var from = req.session.from;
  var to = req.session.to;

  var payoutQuery = Payout.find();
  if (status != null) payoutQuery.where('status').equals(status);
  if (from != null && to != null) payoutQuery.where('createdAt').gt(from).lt(from);
  payoutQuery.populate('user').populate('target');
  payoutQuery.exec(function(err, payouts){
    res.render('admin/payouts', { payouts: payouts, activePage: "payouts" });
  });
});

router.get('/payouts/verified', function(req, res){
  Payout.find({ status: "waiting_paiement", verified: true }).populate('user').populate({ path: 'target', populate: { path: 'gameTicket', model: 'GameTicket' } }).sort({ createdAt: 1}).exec(function(err, payouts){
    res.render('admin/payouts/verified', { payouts: payouts, activePage: "payouts/verified" });
  });
});

router.get('/payouts/:payoutId/payment-message', function(req, res){
  var payoutId = req.params.payoutId;
  Payout.findOne({ _id: payoutId }).populate('user').populate({ path: "target", populate: { path: "gameTicket", model: "GameTicket" } }).exec(function(err, payout){
    if (err){
      return res.status(500).json(err);
    } else if (payout == null){
      return res.status(500).json("La demande de paiement n'existe pas");
    } else {
      var message = "Empty";
      if (payout.kind == "Grille"){

        switch(payout.user.locale){
          case "fr":
          message = "Paiement de vos gains sur l'application ZaniBet, pour une partie du jackpot de la grille "+ payout.target.reference +". Nous vous remercions infiniment pour votre confiance. N'hésitez pas à nous laisser une bonne note sur le PlayStore ou l’AppStore, cela contribue énormément à la croissance et l'amélioration de ZaniBet.";
          break;
          case "pt":
          message = "Pagando seus ganhos no aplicativo ZaniBet, por uma parte do jackpot da grade "+ payout.target.reference +". Agradecemos muito pela sua confiança. Não hesite em nos deixar uma boa classificação na PlayStore, isso contribui enormemente para o crescimento e melhoria do ZaniBet.";
          break;
          case "es":
          message = "Payment of your reward on the ZaniBet app, for part of the grid jackpot "+ payout.target.reference +". We thank you very much for your trust. Do not hesitate to leave us a good rating on the PlayStore, it contributes enormously to the growth and improvement of ZaniBet.";
          break;
          default:
          message = "Payment of your reward on the ZaniBet app, for part of the grid jackpot "+ payout.target.reference +". We thank you very much for your trust. Do not hesitate to leave us a good rating on the PlayStore, it contributes enormously to the growth and improvement of ZaniBet.";
          break;
        }

      } else if (payout.kind == "Reward"){
        switch(payout.user.locale){
          case "fr":
          message = "Paiement de votre récompense dans la l’application ZaniBet. ID : "+ payout._id +" - Nous vous remercions infiniment pour votre confiance. N'hésitez pas à nous laisser une bonne note sur le PlayStore ou l’Itunes Store, cela contribue énormément à la croissance et l'amélioration de ZaniBet.";
          break;
          case "pt":
          message = "Pague sua recompensa no aplicativo ZaniBet. ID: "+ payout._id +" - Agradecemos muito pela sua confiança. Sinta-se à vontade para nos deixar uma boa classificação na PlayStore ou iTunes Store, isso contribui enormemente para o crescimento e melhoria do ZaniBet.";
          break;
          case "es":
          message = "Pague su recompensa en la aplicación ZaniBet. ID: "+ payout._id +" - Le agradecemos mucho por su confianza. Siéntase libre de dejarnos una buena calificación en PlayStore o iTunes Store, esto contribuye enormemente al crecimiento y la mejora de ZaniBet.";
          break;
          default:
          message = "Payment for your reward in the ZaniBet app. ID: "+ payout._id +" - We thank you very much for your trust. Feel free to leave us a good rating on the PlayStore or Itunes Store, this contributes enormously to the growth and improvement of ZaniBet.";
          break;
        }
      }

      return res.status(200).json({ message: message });
    }
  });
});

// Récupérer la liste des demandes de paiement en attente [DATATABLE]
router.get('/payouts/dt/pending', function(req, res){
  var drawQuery = parseInt(req.query.draw);
  var startQuery = parseInt(req.query.start);
  var lengthQuery = parseInt(req.query.length);

  async.parallel({
    payouts: function(callback){
      var rangeStart = moment().utc().startOf('day');
      var rangeStop = moment().utc().endOf('day');
      Payout.find({ status: "waiting_paiement"})
      .skip(startQuery)
      .limit(lengthQuery)
      .populate('target user')
      .sort({ createdAt: -1 })
      .exec(function(err, payouts){
        if (err) return callback(err);
        callback(null, payouts);
      });
    },
    countPayouts: function(callback){
      Payout.count({ status: "waiting_paiement" }, function(err, count){
        if (err) return callback(err);
        callback(null, count);
      });
    }
  }, function(err, result){
    if (err) return res.status(500).json(err);
    return res.status(200).json({ draw: drawQuery, data: result.payouts, recordsTotal: result.countPayouts, recordsFiltered: result.countPayouts });
  });
});

/*
* Valider une demande de paiement
*/
router.get('/payouts/:payout_id/validate', function(req, res){
  var payoutId = req.params.payout_id;
  Payout.findOneAndUpdate({ _id: payoutId }, { $set: { verified: true } }, function(err, result){
    if (err){
      return res.status(500).json(err);
    } else {
      return res.status(200).json("OK");
    }
  });
});

/*
*
*/
router.get('/payouts/invoice/preview', function(req, res){
  Payout.findOne({ kind: "Reward", status: "paid", description: "PayPal" }).populate('user').exec(function(err, result){
    res.render('admin/invoice', { payout: result });
  });
});

router.get('/payouts/paypal/accessToken', function(req, res){
  requestify.request('https://api.paypal.com/v1/oauth2/token', {
    method: "POST",
    auth: {
      username: process.env.PAYPAL_CLIENT_LIVE,
      password: process.env.PAYPAL_SECRET_LIVE
    },
    header: {
      "Content-Type": "application/json",
      "Accept-Language": "en_US"
    },
    body: {
      grant_type: "client_credentials"
    },
    dataType: "form-url-encoded"
  }).then(function(response) {
    // Get the response body
    console.log(response.getBody());
    return res.status(200).json(response.getBody());
  }, function(err){
    console.log(err);
    return res.status(500).json(err);
  });
});

/*
*
*/
router.get('/payouts/paypal/activities/:access_token', function(req, res){

  var accessToken = req.params.access_token;
  requestify.get('https://api.paypal.com/v1/activities/activities?start_time=2018-01-01T00:00:01.000Z&end_time=2018-01-31T23:59:59.999Z&page_size=10', {
    header: {
      "Content-Type": "application/json",
      "Authorization": "Bearer " + accessToken
    }
  }).then(function(response) {
    // Get the response body
    console.log(response.getBody());
    return res.status(200).json(response.getBody());
  }, function(err){
    console.log(err);
    return res.status(500).json(err);
  });
});

router.post('/payouts/grids/massPayment', function(req, res){

  async.waterfall([

    // Récupérer toutes les demandes de paiement en attente et vérifiés pour les grilles
    function(done){
      Payout.find({ kind: "Grille", verified: true, status: "waiting_paiement", "payout.paymentReference": { $exists: false } })
      .populate('target user')
      .exec(function(err, payouts){
        if (err){
          return done(err);
        } else if (payouts.length == 0){
          return done("Il n'y a aucune demande de paiement en attente !");
        } else {
          return done(null, payouts);
        }
      });
    },

    // Vérifier si les paiements n'ont pas encore été envoyé
    function(payouts, done){
      var payoutArr = [];
      async.eachLimit(payouts, 1, function(payout, eachPayout){
        paypal.payoutItem.get(payout.invoice.paymentReference, function (error, payoutItem) {
          if (error) {
            console.log("Aucun paiement n'existe pour cette demande :", error);
            payoutArr.push(payout);
            return eachPayout();
          } else {
            console.log("Un paiement a déjà été effectué pour cette demande !");
            console.log(JSON.stringify(payoutItem));
            return eachPayout();

            /*Payout.updateOne({ "invoice.paymentBatchReference": payoutItem.payout_item.payout_batch_id, "invoice.paymentReference": payoutItem.payout_item.payout_item_id }, { $set: { status: "paid" } }, function(err, result){
            if (err){
            console.log(err);
          }
          console.log(result);
          return eachPayout();
        });*/
      }
    });
  }, function(err){
    //return done("stop");
    if (err){
      return done(err);
    } else if (payoutArr.length == 0){
      return done("Aucune demande de paiement a traiter");
    } else {
      return done(null, payoutArr);
    }
  });
},

// Procéder à la création des items PayPal
function(payouts, done){
  var itemArr = [];
  async.eachLimit(payouts, 1, function(payout, eachPayout){
    var message = "Payment of your reward on the ZaniBet app, for part of the grid jackpot " + payout.target.reference + ". We thank you very much for your trust. Do not hesitate to leave us a good rating on the PlayStore or AppStore, it contributes enormously to the growth and improvement of ZaniBet.";
    var user = payout.user;

    if (user.locale == "pt"){
      message = "Pagando seus ganhos no aplicativo ZaniBet, por uma parte do jackpot da grade " + payout.target.reference + ". Agradecemos muito pela sua confiança. Não hesite em nos deixar uma boa classificação na PlayStore, isso contribui enormemente para o crescimento e melhoria do ZaniBet.";
    } else if (user.locale == "es"){
      message = "Pagando seus ganhos no aplicativo ZaniBet, por uma parte do jackpot da grade " + payout.target.reference + ". Agradecemos muito pela sua confiança. Não hesite em nos deixar uma boa classificação na PlayStore, isso contribui enormemente para o crescimento e melhoria do ZaniBet.";
    } else if (user.locale == "fr"){
      message = "Paiement de vos gains sur l'application ZaniBet, pour une partie du jackpot de la grille " + payout.target.reference + ". Nous vous remercions infiniment pour votre confiance. N'hésitez pas à nous laisser une bonne note sur le PlayStore ou l’AppStore, cela contribue énormément à la croissance et l'amélioration de ZaniBet.";
    }

    itemArr.push({
      "recipient_type": "EMAIL",
      "amount": {
        "value": payout.amount,
        "currency": "EUR"
      },
      //"receiver": user.paypal,
      "receiver": "contact-buyer@devolios.eu",
      "note": message,
      "sender_item_id": payout.reference
    });

    return eachPayout();

  }, function(err){
    if (err){
      return done(err);
    } else {
      return done(null, itemArr);
    }
  });
},

function(items, done){
  var sender_batch_id = Math.random().toString(36).substring(9);

  var create_payout_json = {
    "sender_batch_header": {
      "sender_batch_id": sender_batch_id,
      "email_subject": "Payout for your ZaniBet reward!"
    },
    "items": items
  };

  paypal.payout.create(create_payout_json, function (error, payout) {
    if (error) {
      console.log(error.response);
      return done(err);
    } else {
      console.log("Create Payout Response");
      console.log(payout);
      // Mettre à jour la réference de paiement des demandes
      Payout.updateMany({ reference: { $in: items.map(i => i.sender_item_id) } }, {  $set: { "invoice.paymentBatchReference": payout.batch_header.payout_batch_id } }, function(err, result){
        if (err){
          return done(err);
        } else {
          console.log(result);
          return done(null, payout);
        }
      });
    }
  });
},

// Attendre la confirmation d'envoi des paiements
function(receip, done){
  var transactionEnded = false;
  async.until(function(){
    return transactionEnded;
  }, function(callback){
    paypal.payout.get(receip.batch_header.payout_batch_id, function (error, payout) {
      if (error) {
        console.log(error);
        callback(error);
      } else {
        console.log("Get Payout Response");
        console.log(JSON.stringify(payout));

        if (payout.batch_header.batch_status == "PENDING" || payout.batch_header.batch_status == "PROCESSING" || payout.batch_header.batch_status == "ACKNOWLEDGED" || payout.batch_header.batch_status == "NEW"){
          setTimeout(function() {
            callback(null);
          }, 15000);
        } else if (payout.batch_header.batch_status == "DENIED" || payout.batch_header.batch_status == "CANCELED"){
          return callback(payout);
        } else if (payout.batch_header.batch_status == "SUCCESS"){
          transactionEnded = true;
          return callback(null, payout);
        }
      }
    });
  }, function(err, result){
    if (err){
      return done(err);
    } else {
      return done(null, result);
    }
  });
},


// Mettre à jour les demandes de paiement
function(payout, done){
  async.eachLimit(payout.items, 1, function(item, eachItem){
    Payout.findOneAndUpdate({ reference: item.payout_item.sender_item_id }, { $set: { status: "paid", "invoice.paymentReference": item.payout_item_id } }, function(err, result){
      if (err){
        return eachItem(err);
      } else {
        console.log(result);
        return eachItem();
      }
    });
  }, function(err){
    if (err){
      return done(err);
    } else {
      return done(null,"OK");
    }
  });
}


], function(err, result){
  if (err){
    return res.status(500).json(err);
  } else {
    console.log(result);
    return res.status(200).json(result);
  }
});

});


/*
*
*/
router.get('/payout/:user_id/recalculatingZanicoin', function(req, res){
  var userId = req.params.user_id;

  var totalEarn = 0;
  var totalSpent = 0;
  var _user;
  var _grilles;

  User.findOne({ _id: userId }).then(function(user){
    if (user == null){
      return res.status(500).json("User not found");
    }
    _user = user;
    return Grille.find({ user: _user._id, $or: [{ status: 'loose' }, { status: 'win' }] });
  }).then(function(grilles){
    _grilles = grilles;
    for (var i = 0; i < grilles.length; i++){
      totalEarn += grilles[i].payout.point;
    }
    return Payout.find({ user: _user._id, kind: 'Reward' }).populate('for');
  }).then(function(payouts){
    console.log(payouts);
    for (var i = 0; i < payouts.length; i++){
      totalSpent += payouts[i].rewardCost;
    }

    var totalCoins = totalEarn-totalSpent;
    console.log('Dépense:', totalSpent, 'Gain:', totalEarn ,'Solde final:', totalCoins, 'Nombre de grilles:', _grilles.length);
    return res.status(200).json("OK");
  }, function(err){
    console.log(err);
    return res.status(500).json(err);
  });

});

/*
* Notifier l'utilisateur que son paiement a été effectuée
*/
router.post('/payouts/notify/payment', function(req, res){
  var payoutId = req.body.payoutId;
  if (payoutId == null){
    return res.status(500).json("Empty ID");
  }

  async.waterfall([
    function(done){
      Payout.findOne({ _id: mongoose.Types.ObjectId(payoutId), $or: [ { notifications: { $elemMatch: { _id: { $ne: "PAID_EMAIL" } } } }, { notifications: { $exists: false } }, { notifications: { $exists: true, $eq: [] } } ] }).populate('user').populate({
        path: 'target',
        populate: {
          path: 'gameTicket',
          model: 'GameTicket'
        }
      }).exec(function(err, payout){
        if (err){
          return done(err);
        } else if (payout == null){
          return done("empty payout");
        } else if (payout.status == "paid"){
          return done("incorrect status : " + payout.status)
        } else if (payout.user.paypal == null){
          return done("Missing PayPal !");
        } else if (payout.user.role == "partner"){
          return done("partner account");
        }

        return done(null, payout);
      });
    },

    function(payout, done){
      console.log(payout);
      if (payout.kind == "Reward"){
        mailer.sendRewardPaid(res, payout).then(function(result){
          Payout.updateOne({ _id: payout._id }, { $push: { notifications: { date: moment().utc(), _id: "PAID_EMAIL" } }, $set: { status: "paid" } }).exec(function(err, result){
            if (err){
              return done(err);
            }
            return done(null, result);
          });
        }, function(err){
          return done(err);
        });
      } else if (payout.kind == "Grille"){
        mailer.sendRewardPaid(res, payout).then(function(result){
          Payout.updateOne({ _id: payout._id }, { $push: { notifications: { date: moment().utc(), _id: "PAID_EMAIL" } }, $set: { status: "paid" } }).exec(function(err, result){
            if (err){
              return done(err);
            }
            return done(null, result);
          });
        }, function(err){
          return done(err);
        });
      } else {
        return done("unknow kind");
      }
    }

  ], function(err, result){
    if (err){
      console.log(err);
      return res.status(500).json(err);
    }
    return res.status(200).json(result);
  });
});

// Recalculer tous les gains zanicoins - dépense
/*router.post('/payout/recalculatingZanicoin', function(req, res){
var userId = req.body.userId;

var totalEarn = 0;
var totalSpent = 0;
var _user;

User.findOne({ _id: userId }).then(function(user){
if (user == null){
return res.status(500).json("User not found");
}
_user = user;
return Grille.find({ user: _user._id, $or: [{ status: 'loose' }, { status: 'win' }] });
}).then(function(grilles){
for (var i = 0; i < grilles.length; i++){
totalEarn += grilles[i].payout.point;
}
return Payout.find({ user: _user._id, kind: 'Reward' }).populate('for');
}).then(function(payouts){
console.log(payouts);
for (var i = 0; i < payouts.length; i++){
totalSpent += payouts[i].for.price;
}

var totalCoins = totalEarn-totalSpent;
// TODO : check if current point different than calculated coins
console.log('Solde:', totalCoins);
return User.findOneAndUpdate({ _id: _user._id }, { point: totalCoins }, { new: true });
}).then(function(user){
console.log('User zanicoins solde:', user.point);
return gcm.sendSingleMessage(user.fcmToken, "ZaniBet", "Votre solde de ZaniCoins a été mis à jour.");
}).then(function(response){
return res.status(200).json("OK");
}, function(err){
console.log(err);
return res.status(500).json(err);
});

});*/

/*router.delete('/payouts', function(req, res){
Payout.find({ kind: "Grille" }).then(function(payouts){
async.eachLimit(payouts, 1, function(payout, eachPayout){
Grille.findOne({ _id: payout.target }).then(function(grille){
if (grille == null){
Payout.deleteOne({ _id: payout._id }, function(err, result){
if (!err) console.log("Delete payout:", payout._id);
eachPayout();
});
} else {
eachPayout();
}
}, function(err){
eachPayout();
});
}, function(err){
return res.status(200).json("OK");
});
}, function(err){
return res.status(500).json(err);
});
});*/

module.exports = router;
