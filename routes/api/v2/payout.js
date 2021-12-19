var express = require('express');
var mongoose = require('mongoose');
var router = express.Router();
var passport = require('passport');
var moment = require('moment');
var requestify = require('requestify');
var mongojs = require('mongojs');
var async = require('async');
var CustomError = require('../../../lib/customerror');
var uniqid = require('uniqid');

moment.locale('fr');

var Payout = mongoose.model('Payout');
var Reward = mongoose.model('Reward');
var User = mongoose.model('User');
var Transaction = mongoose.model('Transaction');

router.get('/payouts', passport.authenticate('bearer', { session: false }), function(req, res){
  var currentUser = req.user;

  Payout.find({ user: currentUser._id }).sort({ createdAt: -1 })
  .populate({
    path: 'target',
    populate: {
      path: 'gameTicket',
      model: 'GameTicket',
      populate: {
        path: 'fixtures',
        model: 'Fixture',
        select: 'homeTeam awayTeam',
        populate: {
          path: 'homeTeam awayTeam',
          model: 'Team'
        }
      }
    }
  }).exec().then(function(payouts){
    res.status(200).json(payouts);
  }, function(err){
    res.status(500).json(err);
  });
});

// Créer une demande de paiement d'une récompense
router.post('/payout/reward', passport.authenticate('bearer', { session: false }), function(req, res){
  var currentUser = req.user;
  var rewardId = req.body._id;

  var _reward;
  var errLocalized;
  if (currentUser.locale != null && currentUser.locale == "fr"){
    errLocalized = {
      "internal": new CustomError(500,1, "Erreur", "Merci de contacter le support à contact@zanibet.com si le problème persiste."),
      "insufficient_zanicoin": new CustomError(500,1, "Erreur", "Vous ne disposez pas de suffisamment de ZaniCoins pour acquérir cette récompense."),
      "insufficient_zanihash": new CustomError(500,1, "Erreur", "Vous ne disposez pas de suffisamment de ZaniHashs pour acquérir cette récompense."),
      "missing_data": new CustomError(500,1, "Erreur", "Merci de compléter vos informations de paiement depuis votre profil, afin de pouvoir effectuer l'achat d'une récompense."),
      "missing_paypal": new CustomError(500, 1, "Erreur", "Merci d'indiquer votre adresse PayPal dans vos informations de paiement depuis votre profil, afin de pouvoir effectuer l'achat de votre récompense."),
      "missing_bitcoin": new CustomError(500, 1, "Erreur", "Merci d'indiquer l'adresse de votre wallet Bitcoin dans vos informations de paiement depuis votre profil, afin de pouvoir effectuer l'achat de votre récompense.")
    };
  } else if (currentUser.locale != null && currentUser.locale == "pt"){
    errLocalized = {
      "internal": new CustomError(500,1, "Erro", "Entre em contato com o suporte em contact@zanibet.com se o problema persistir."),
      "insufficient_zanicoin": new CustomError(500,1, "Erro", "Você não tem ZaniCoins suficientes para ganhar essa recompensa."),
      "insufficient_zanihash": new CustomError(500,1, "Erro", "Você não tem ZaniHashs suficientes para ganhar essa recompensa."),
      "missing_data": new CustomError(500,1, "Erro", "Por favor, preencha suas informações de pagamento do seu perfil, para que você possa comprar uma recompensa."),
      "missing_paypal": new CustomError(500, 1, "Erro", "Por favor, insira seu endereço do PayPal nas informações de pagamento do seu perfil, para que você possa comprar sua recompensa."),
      "missing_bitcoin": new CustomError(500, 1, "Erro", "Indique o endereço da sua carteira Bitcoin na sua informação de pagamento do seu perfil, para poder comprar o seu prémio.")
    };
  } else {
    errLocalized = {
      "internal": new CustomError(500,1, "Internal Error", "Please contact the support at contact@zanibet.com if the problem persist."),
      "insufficient_zanicoin": new CustomError(500,1, "Error", "You don't have enought ZaniCoins for acquire this reward."),
      "insufficient_zanihash": new CustomError(500,1, "Error", "You don't have enought ZaniHashs for acquire this reward."),
      "missing_data": new CustomError(500,1, "Error", "Please complete your payment informations before requesting a reward."),
      "missing_paypal": new CustomError(500, 1, "Error", "Please enter your PayPal address into your payment information from your profile so that you can purchase your reward."),
      "missing_bitcoin": new CustomError(500, 1, "Error", "Please enter the address of your Bitcoin wallet in your payment information from your profile, so that you can purchase your reward.")
    };
  }


  Reward.findOne({ _id: rewardId }).exec().then(function(reward){
    //console.log('reward', reward);
    //console.log(currentUser.address.country);
    if (reward == null){
      throw errLocalized["internal"];
    } else if (reward.currency == "ZaniCoin" && parseInt(currentUser.point) < parseInt(reward.price)){
      throw errLocalized["insufficient_zanicoin"];
    } else if (reward.currency == "ZaniHash" && parseInt(currentUser.wallet.zaniHash) < parseInt(reward.price)){
      throw errLocalized["insufficient_zanihash"];
    } else if (currentUser.address == null || typeof currentUser.address.country == "undefined" ){
      throw errLocalized["missing_data"];
    }

    // Décrédité l'utilisateur
    _reward = reward;
    if (reward.currency == "ZaniCoin"){
      if (reward.brand == "PayPal" && typeof currentUser.paypal == "undefined"){
        throw errLocalized["missing_paypal"];
      } else if (reward.brand == "Bitcoin" && typeof currentUser.bitcoin == "undefined"){
        throw errLocalized["missing_bitcoin"];
      }

      currentUser.point -= reward.price;
    } else if (reward.currency == "ZaniHash"){
      // Ne rien faire
      //currentUser.wallet.zaniHash -= reward.price;
    } else {
      throw errLocalized["internal"];
    }

    return currentUser.save();
  }).then(function(user){

    if (_reward.currency == "ZaniCoin"){
      var reference = uniqid.process('PAY-'); // 16 bytes
      var paymentAddress = "";
      if (_reward.brand == "Bitcoin"){
        paymentAddress = currentUser.bitcoin;
      } else if (_reward.brand == "PayPal"){
        paymentAddress = currentUser.paypal;
      } else {
        paymentAddress = currentUser.email;
      }

      Payout.create({
        reference: reference,
        user: user._id,
        kind: 'Reward',
        target: _reward._id,
        amount: _reward.value, // deprecated
        rewardCost: _reward.price, //deprecated
        description: _reward.name, // deprecated
        "invoice.firstname": currentUser.firstname,
        "invoice.lastname": currentUser.lastname,
        "invoice.address": currentUser.address.street + " - " + currentUser.address.city + " " + currentUser.address.zipcode + " - " + currentUser.address.country,
        "invoice.paymentMethod": _reward.brand,
        "invoice.paymentAddress": paymentAddress,
        "invoice.price": _reward.price,
        "invoice.amount": _reward.value
      }, function(err, payout){
        if (err) {
          console.log(err);
          throw errLocalized["internal"];
        } else {
          //process.nextTick(function(){
          res.status(200).json("OK");
          //});
        }
      });
    } else if (_reward.currency == "ZaniHash"){
      async.waterfall([
        // Initier une transaction
        function(done){
          var transactionArr = [ { createdAt: moment().utc().toDate(),
            updatedAt: moment().utc().toDate(),
            type: _reward.brand,
            action: "fund",
            source: "Reward",
            sourceRef: _reward._id,
            sourceKind: "Reward",
            destination: currentUser._id,
            destinationKind: "User",
            amount: parseInt(_reward.value),
            status: "initial"
          },
          { createdAt: moment().utc().toDate(),
            updatedAt: moment().utc().toDate(),
            type: "ZaniHash",
            action: "withdrawal",
            description: String(_reward.value) + " " + _reward.name,
            source: "Reward",
            sourceRef: _reward._id,
            sourceKind: "Reward",
            destination: currentUser._id,
            destinationKind: "User",
            amount: -Math.abs(_reward.price),
            status: "initial"
          } ];

          Transaction.create( transactionArr, function(err, transactions){
            if (err){
              return done(err);
            } else {
              return done(null, transactions);
            }
          });
        },

        // Récupérer la transaction dernièrement créé et commencer à procéder à son traitement
        function(transactions, done){
          if (transactions == null || transactions.length !== 2) throw "Les transactions n'existent pas";

          Transaction.updateMany({ $or: [{ _id: transactions[0]._id }, { _id: transactions[1]._id }], status: "initial" }, { $set: { status: "pending", updatedAt: moment().utc().toDate() } }).exec().then(function(result){
            if (result.nModified == 2){
              // Créditer l'user
              if (transactions[0].type == "Jeton"){
                return User.updateOne({ _id: user._id, pendingTransactions: { $nin: [transactions[0]._id, transactions[1]._id] } }, { $inc: { "wallet.zaniHash": -Math.abs(transactions[1].amount), jeton: parseInt(transactions[0].amount) }, $push: { pendingTransactions: transactions } }).exec();
              } else if (transactions[0].type == "ZaniCoin"){
                return User.updateOne({ _id: user._id, pendingTransactions: { $nin: [transactions[0]._id, transactions[1]._id] } }, { $inc: { "wallet.zaniHash": -Math.abs(transactions[1].amount), point: parseInt(transactions[0].amount) }, $push: { pendingTransactions: transactions } }).exec();
              } else {
                throw "Impossible d'initier les transactions à cause d'une récompense inconnue : " + transactions[0]._id + " - " + transactions[1]._id;
              }
            } else {
              throw "Impossible d'initier les transactions : " + transactions[0]._id + " - " + transactions[1]._id;
            }
          }).then(function(result){
            if (result.nModified == 1){
              // L'user a été crédité'
              return done(null, transactions);
            } else {
              return done("Impossible de créditer le compte de l'utilisateur : " + currentUser._id);
            }
          }, function(err){
            return done(err);
          });
        },

        // Finaliser la transaction
        function(transactions, done){
          Transaction.updateMany({ $or: [{ _id: transactions[0]._id }, { _id: transactions[1]._id }], status: "pending" }, { $set: { updatedAt: moment().utc().toDate(), status: "applied" } }).exec().then(function(result){
            if (result.nModified == 2){
              // La transaction a été mise à jour
              return User.updateOne({ _id: transactions[0].destination }, { $pull: { pendingTransactions: transactions } }).exec();
            } else {
              throw "Impossible de finaliser les transactions :" + transactions[0]._id + " - " + transactions[1]._id;
            }
          }).then(function(result){
            if (result.nModified == 1){
              // Les transactions en attente de l'utilisateur ont été mises à jour
              return Transaction.updateMany({ $or: [{ _id: transactions[0]._id }, { _id: transactions[1]._id }], status: "applied" }, { $set: { updatedAt: moment().utc().toDate(), status: "done" } }).exec();
            } else {
              throw "Impossible de mettre à jour les transactions de l'utilisateur :" + currentUser._id;
            }
          }).then(function(){
            return done(null);
          }, function(err){
            return done(err);
          });
        }

      ], function(err, result){
        if (err){
          console.log(err);
          throw errLocalized["internal"];
        } else {
          //process.nextTick(function(){
          res.status(200).json("OK");
          //});
        }
      });
    } else {
      throw errLocalized["internal"];
    }
  }, function(err){
    res.status(500).json(err);
  });
});

// Modifier une demande de paiement qui est attente de traitement
router.put('/payouts/:payoutId', passport.authenticate('bearer', { session: false }), function(req, res){
  var currentUser = req.user;
  var payoutId = req.params.payoutId;
  var paymentMethod = req.body.paymentMethod;

  console.log(paymentMethod);
  var errLocalized;
  if (currentUser.locale != null && currentUser.locale == "fr"){
    errLocalized = {
      "internal": new CustomError(500,1, "Erreur", "Merci de contacter le support à contact@zanibet.com si le problème persiste."),
      "edition_disabled": new CustomError(500,1, "Modification impossible", "Impossible de modifier cette demande de paiement."),
      "no_change": new CustomError(500,1, "Aucun changement", "Aucun changement n'a été effectué."),
      "missing_paypal": new CustomError(500,1, "Informations manquantes", "Merci d'indiquer votre adresse PayPal dans vos informations de paiement, afin de pouvoir modifier votre demande de paiement."),
      "missing_bitcoin": new CustomError(500,1, "Informations manquantes", "Merci d'indiquer l'adresse de votre portefeuille Bitcoin dans vos informations de paiement, afin de pouvoir modifier votre demande de paiement.")
    };
  } else if (currentUser.locale != null && currentUser.locale == "pt"){
    errLocalized = {
      "internal": new CustomError(500,1, "Erro", "Entre em contato com o suporte em contact@zanibet.com se o problema persistir."),
      "edition_disabled": new CustomError(500,1, "Modificação Impossível", "Não é possível editar esta solicitação de pagamento."),
      "no_change": new CustomError(500,1, "Nenhuma mudança", "Nenhuma alteração foi feita."),
      "missing_paypal": new CustomError(500,1, "Informação perdida", "Por favor, digite seu endereço do PayPal nas informações de pagamento para que você possa modificar sua solicitação de pagamento."),
      "missing_bitcoin": new CustomError(500,1, "Informação perdida", "Por favor, indique o endereço da sua carteira Bitcoin em suas informações de pagamento, para que você possa modificar sua solicitação de pagamento.")
    };
  } else if (currentUser.locale != null && currentUser.locale == "es") {
    errLocalized = {
      "internal": new CustomError(500,1, "Internal Error", "Please contact the support at contact@zanibet.com if the problem persist."),
      "edition_disabled": new CustomError(500,1, "Modificación imposible", "No se puede editar esta solicitud de pago."),
      "no_change": new CustomError(500,1, "Ningún cambio", "No se han realizado cambios."),
      "missing_paypal": new CustomError(500,1, "Falta información", "Ingrese su dirección de PayPal en su información de pago para que pueda modificar su solicitud de pago."),
      "missing_bitcoin": new CustomError(500,1, "Falta información", "Indique la dirección de su billetera Bitcoin en su información de pago, para que pueda modificar su solicitud de pago.")
    };
  } else {
    errLocalized = {
      "internal": new CustomError(500,1, "Error", "Please contact support at contact@zanibet.com if the problem persists."),
      "edition_disabled": new CustomError(500,1, "Error", "Can not edit this payment request."),
      "no_change": new CustomError(500,1, "No change", "No changes have been made."),
      "missing_paypal": new CustomError(500,1, "Missing data", "Please enter your PayPal address in your payment information so that you can modify your payment request."),
      "missing_bitcoin": new CustomError(500,1, "Missing data", "Please indicate the address of your Bitcoin wallet in your payment information, so that you can modify your payment request.")
    };
  }

  if (paymentMethod == null || paymentMethod != "PayPal" && paymentMethod != "Bitcoin"){
    console.log("Invald payment method");
    return res.status(500).json(errLocalized["internal"]);
  }

  Payout.findOne({ _id: payoutId }).exec().then(function(payout){
    if (payout == null || payout.kind != "Grille"){
      throw errLocalized["internal"]
    } else {
      if (payout.status != "waiting_paiement"){
        throw errLocalized["edition_disabled"]
      } else if (payout.invoice != null && paymentMethod == payout.invoice.paymentMethod){
        throw errLocalized["no_change"]
      } else if (paymentMethod == "PayPal" && currentUser.paypal == null){
        throw errLocalized["missing_paypal"]
      } else if (paymentMethod == "Bitcoin" && currentUser.bitcoin == null){
        throw errLocalized["missing_bitcoin"]
      }

      payout.invoice.paymentMethod = paymentMethod;
      if (paymentMethod == "Bitcoin"){
        payout.invoice.paymentAddress = currentUser.bitcoin;
      } else if (paymentMethod == "PayPal"){
        payout.invoice.paymentAddress = currentUser.paypal;
      }

      return payout.save();
    }
  }).then(function(payout){
    res.status(200).json(payout);
  }, function(err){
    console.log(err);
    res.status(500).json(err);
  });

});

module.exports = router;
