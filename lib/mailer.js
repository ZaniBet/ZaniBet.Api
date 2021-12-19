'use strict';
/*
* Envoi d'un email de bienvenue après inscription sur l'application
*/
exports.sendWelcomeMail = function(app, user){
  return new Promise(function(resolve, reject){
    const sgMail = require('@sendgrid/mail');
    sgMail.setApiKey(process.env.SENDGRID_API_KEY);

    var subject = "Welcome to ZaniBet: confirm the creation of your account";
    var view = "emails/welcome-en";
    if (user.locale == "fr"){
      subject = "Bienvenue sur ZaniBet : confirmer la création de votre compte";
      view = "emails/welcome";
    } else if (user.locale == "pt"){
      subject = "Bem-vindo ao ZaniBet: confirme a criação da sua conta";
      view = "emails/welcome-pt";
    } else if (user.locale == "es"){
      subject = "Bienvenido a ZaniBet: confirma la creación de tu cuenta";
      view = "emails/welcome-es";
    }

    app.render(view, { user: user } , function(err, html){
      console.log(err);
      if (err) return reject(err);
      const msg = {
        to: user.email,
        from: 'no-reply@zanibet.com',
        subject: subject,
        html: html,
      };
      sgMail.send(msg).then(function(response){
        resolve(response);
      }).catch(function(err){
        resolve(err);
      });
    });
  });
};

exports.sendConfirmEmail = function(app, user){
  return new Promise(function(resolve, reject){
    const sgMail = require('@sendgrid/mail');
    sgMail.setApiKey(process.env.SENDGRID_API_KEY);

    var subject = "Confirm the email linked with your ZaniBet account";
    var view = "emails/confirm-email-en";
    if (user.locale == "fr"){
      subject = "Confirmer l'adresse email de votre compte ZaniBet";
      view = "emails/confirm-email";
    } else if (user.locale == "pt"){
      subject = "Confirme o endereço de email da sua conta ZaniBet";
      view = "emails/confirm-email-pt";
    } else if (user.locale == "es"){
      subject = "Confirme la dirección de correo electrónico de su cuenta ZaniBet";
      view = "emails/confirm-email-es";
    }

    app.render(view, { user: user } , function(err, html){
      if (err){
        console.log(err);
        return reject(err);
      }

      const msg = {
        to: user.email,
        from: 'no-reply@zanibet.com',
        subject: subject,
        html: html,
      };
      sgMail.send(msg).then(function(response){
        return resolve(response);
      }).catch(function(err){
        return resolve(err);
      });
    });
  });
};


exports.sendResetPasswordMail = function(app, user){
  return new Promise(function(resolve, reject){
    const sgMail = require('@sendgrid/mail');
    sgMail.setApiKey(process.env.SENDGRID_API_KEY);

    var subject = "Restoring the password of your ZaniBet account";
    var view = "emails/reset-password-en";
    if (user.locale == "fr"){
      subject = "Restauration du mot de passe de votre compte ZaniBet";
      view = "emails/reset-password";
    } else if (user.locale == "pt"){
      subject = "Restaurando a senha da sua conta ZaniBet";
      view = "emails/reset-password-pt";
    } else if (user.locale == "es"){
      subject = "Restaurando la contraseña de su cuenta ZaniBet";
      view = "emails/reset-password-es";
    }

    app.render(view, { user: user } , function(err, html){
      //console.log(err);
      if (err) return reject(err);
      const msg = {
        to: user.email,
        from: 'no-reply@zanibet.com',
        subject: subject,
        html: html,
      };
      sgMail.send(msg).then(function(response){
        resolve(response);
      }).catch(function(err){
        resolve(err);
      });
    });
  });
};

exports.sendResetPasswordConfirm = function(app, user){
  return new Promise(function(resolve, reject){
    const sgMail = require('@sendgrid/mail');
    sgMail.setApiKey(process.env.SENDGRID_API_KEY);

    app.render('emails/reset-password-confirmation', { user: user } , function(err, html){
      //console.log(err);
      if (err) return reject(err);
      const msg = {
        to: user.email,
        from: 'no-reply@zanibet.com',
        subject: 'Le mot de passe de votre compte ZaniBet a été modifié',
        html: html,
      };
      sgMail.send(msg).then(function(response){
        resolve(response);
      }).catch(function(err){
        resolve(err);
      });
    });
  });
};

exports.sendResetEmailConfirm = function(app, oldEmail, user){
  var helper = require('sendgrid').mail;

  var from_email = new helper.Email("no-reply@zanibet.com", "ZaniBet");
  var to_email = new helper.Email(oldEmail);

  app.render('emails/reset-email-confirmation', { user: user }, function(err, html){
    var content = new helper.Content("text/html", html);
    var mail = new helper.Mail(from_email, "L'adresse email de votre compte ZaniBet a été modifié", to_email, content);
    var sg = require('sendgrid').SendGrid(process.env.SENDGRID_API_KEY);
    var requestBody = mail.toJSON();
    var request = sg.emptyRequest();
    request.method = 'POST';
    request.path = '/v3/mail/send';
    request.body = requestBody;
    sg.API(request, function (response) {
      console.log(response.statusCode);
      console.log(response.body);
      console.log(response.headers);
    });
  }, function(err, json){
    if (err) {
      console.error("Error : " + err);
    }
  });
};

exports.sendJackpotAlert = function(app, payout){
  return new Promise(function(resolve, reject){
    const sgMail = require('@sendgrid/mail');
    sgMail.setApiKey(process.env.SENDGRID_API_KEY);

    app.render('emails/jackpotAlert', { user: payout.user, payout: payout } , function(err, html){
      //console.log(err);
      if (err) return reject(err);
      const msg = {
        to: 'contact@zanibet.com',
        from: 'no-reply@zanibet.com',
        subject: 'Un utilisateur à remporté une part du jackpot',
        html: html,
      };
      sgMail.send(msg).then(function(response){
        resolve(response);
      }).catch(function(err){
        resolve(err);
      });
    });
  });
};

exports.sendPaypalReward = function(app, payout, email){
  return new Promise(function(resolve, reject){
    const sgMail = require('@sendgrid/mail');
    sgMail.setApiKey(process.env.SENDGRID_API_KEY);

    app.render('emails/paypalRewardSent', { user: payout.user, payout: payout } , function(err, html){
      //console.log(err);
      if (err) return reject(err);
      const msg = {
        to: email,
        from: 'no-reply@zanibet.com',
        subject: 'Le paiement de votre récompense ZaniBet a été effectué.',
        html: html,
      };
      sgMail.send(msg).then(function(response){
        resolve(response);
      }).catch(function(err){
        resolve(err);
      });
    });
  });
};

exports.sendWorkerAlert = function(app, worker, message){
  return new Promise(function(resolve, reject){
    const sgMail = require('@sendgrid/mail');
    sgMail.setApiKey(process.env.SENDGRID_API_KEY);

    app.render('emails/workerAlert', { message: message, worker: worker } , function(err, html){
      //console.log(err);
      if (err) return resolve(err);
      const msg = {
        to: 'contact@zanibet.com',
        from: 'no-reply@zanibet.com',
        subject: 'Une erreur est survenu dans un worker : ' + worker,
        html: html,
      };
      sgMail.send(msg).then(function(response){
        resolve(response);
      }).catch(function(err){
        resolve(err);
      });
    });
  });
};


exports.sendRewardPaid = function(app, payout){
  return new Promise(function(resolve, reject){
    const sgMail = require('@sendgrid/mail');
    sgMail.setApiKey(process.env.SENDGRID_API_KEY);

    var view = "emails/payout-reward-en";
    var subject = "The payment of your ZaniBet reward has been made.";
    if (payout.user.locale == "fr"){
      subject = "Le paiement de votre récompense ZaniBet a été effectué.";
      view = "emails/payout-reward";
    } else if (payout.user.locale == "pt"){
      subject = "O pagamento da sua recompensa ZaniBet foi feito.";
      view = "emails/payout-reward-pt";
    } else if (payout.user.locale == "es"){
      subject = "El pago de su recompensa ZaniBet se ha realizado.";
      view = "emails/payout-reward-es";
    }

    app.render(view, { user: payout.user, payout: payout } , function(err, html){
      //console.log(err);
      if (err) return reject(err);
      const msg = {
        to: payout.user.paypal,
        from: 'no-reply@zanibet.com',
        subject: subject,
        html: html,
      };
      sgMail.send(msg).then(function(response){
        //console.log(response);
        resolve(response);
      }).catch(function(err){
        //console.log(err);
        resolve(err);
      });
    });
  });
};

exports.sendJackpotPaid = function(app, payout){
  return new Promise(function(resolve, reject){
    const sgMail = require('@sendgrid/mail');
    sgMail.setApiKey(process.env.SENDGRID_API_KEY);

    var view = "emails/payout-jackpot-en";
    var subject = "The payment of your winnings for a ZaniBet winning grid has been made.";
    if (payout.user.locale == "fr"){
      subject = "Le paiement de vos gains pour une grille gagnante ZaniBet a été effectué.";
      view = "emails/payout-jackpot";
    } else if (payout.user.locale == "pt"){
      subject = "O pagamento dos seus ganhos para uma grade vencedora do ZaniBet foi feito.";
      view = "emails/payout-jackpot-pt";
    } else if (payout.user.locale == "es"){
      subject = "El pago de sus ganancias para una grilla ganadora de Zani Bet se ha realizado.";
      view = "emails/payout-jackpot-es";
    }

    app.render(view, { user: payout.user, payout: payout } , function(err, html){
      //console.log(err);
      if (err) return reject(err);
      const msg = {
        to: payout.user.paypal,
        from: 'no-reply@zanibet.com',
        subject: subject,
        html: html,
      };
      sgMail.send(msg).then(function(response){
        //console.log(response);
        resolve(response);
      }).catch(function(err){
        //console.log(err);
        resolve(err);
      });
    });
  });
};
