module.exports = function (app) {
  app.use('/', require('./front/auth'));
  app.use('/help', require('./front/help'));
  app.use('/', require('./front/referrer'));

  // BETA API ROUTES
  app.use('/api', require('./api/auth'));
  app.use('/api', require('./api/user'));
  //app.use('/api', require('./api/gameticket'));
  //app.use('/api', require('./api/grille'));
  app.use('/api', require('./api/reward'));
  app.use('/api', require('./api/payout'));
  app.use('/api', require('./api/help'));
  app.use('/api', require('./api/competition'));
  app.use('/api', require('./api/fixture'));
  app.use('/api', require('./api/data'));
  //app.use('/api', require('./api/ironsource'));
  app.use('/api', require('./api/adscend'));
  app.use('/api', require('./api/adgate'));
  app.use('/api', require('./api/transaction'));
  //app.use('/api', require('./api/ayetstudios'));
  //app.use('/api', require('./api/appodeal'));
  app.use('/api', require('./api/mopub'));
  app.use('/api', require('./api/zh'));
  app.use('/api', require('./api/pollfish'));

  // v1 API ROUTES
  //app.use('/api/v1', require('./api/v1/grille'));
  //app.use('/api/v1', require('./api/v1/gameticket'));
  app.use('/api/v1', require('./api/v1/reward'));
  app.use('/api/v1', require('./api/v1/user'));
  app.use('/api/v1', require('./api/v1/payout'));
  app.use('/api/v1', require('./api/v1/auth'));
  app.use('/api/v1', require('./api/v1/competition'));

  // v2 API ROUTES
  //app.use('/api/v2', require('./api/v2/grille'));
  //app.use('/api/v2', require('./api/v2/gameticket'));
  app.use('/api/v2', require('./api/v2/reward'));
  app.use('/api/v2', require('./api/v2/user'));
  app.use('/api/v2', require('./api/v2/payout'));

  // v3 API ROUTES
  app.use('/api/v3', require('./api/v3/user'));
  app.use('/api/v3', require('./api/v3/reward'));
  //app.use('/api/v3', require('./api/v3/grille'));
  //app.use('/api/v3', require('./api/v3/gameticket'));


  //app.use('/api/v4', require('./api/v4/gameticket'));
  app.use('/api/v4', require('./api/v4/grille'));
  app.use('/api/v4', require('./api/v4/user'));

  // v5 API ROUTE
  app.use('/api/v5', require('./api/v5/gameticket'));
  app.use('/api/v5', require('./api/v5/grille'));

  // v6 API ROUTE
  app.use('/api/v6', require('./api/v6/gameticket'));
  app.use('/api/v6', require('./api/v6/grille'));


  if (process.env.NODE_ENV == 'dev' || process.env.NODE_ENV == 'local'){
    /* Espace d'administration */
    app.use('/back', require('./back/dashboard'));
    app.use('/back', require('./back/install'));
    app.use('/back', require('./back/user'));
    app.use('/back', require('./back/gameticket'));
    app.use('/back', require('./back/help'));
    app.use('/back', require('./back/competition'));
    app.use('/back', require('./back/team'));
    app.use('/back', require('./back/fixture'));
    app.use('/back', require('./back/grille'));
    app.use('/back', require('./back/payout'));
    app.use('/back', require('./back/notification'));
    app.use('/back', require('./back/designer'));
    app.use('/back', require('./back/email'));
    app.use('/back', require('./back/stats'));
    app.use('/back', require('./back/reward'));
    app.use('/back', require('./back/gift'));
    app.use('/back', require('./back/worker'));
    app.use('/back', require('./back/paypal'));
    app.use('/back', require('./back/transaction'));


    app.use('/predict', require('./predict/test'));

    /* Correcteurs de bug */
    app.use('/fixer', require('./fixer/gameticket'));
    app.use('/fixer', require('./fixer/fixture'));
    app.use('/fixer', require('./fixer/referral'));
    app.use('/fixer', require('./fixer/reward'));
    app.use('/fixer', require('./fixer/user'));
    app.use('/fixer', require('./fixer/payout'));
    app.use('/fixer', require('./fixer/grille'));
    app.use('/fixer', require('./fixer/competition'));


    /* Vérificateur du système de jeu */
    app.use('/checker', require('./checker/gameticket'));
    app.use('/checker', require('./checker/user'));
    app.use('/checker', require('./checker/fixture'));
    app.use('/checker', require('./checker/grille'));

    /* Installation des composants du jeu */
    app.use('/install', require('./install/gameticket'));

  }

}
