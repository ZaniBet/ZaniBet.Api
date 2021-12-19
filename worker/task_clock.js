//var schedule = require('node-schedule');
var moment = require('moment');
var pushGrilleWorker = require('../worker/push/push_grilles_worker');

//var notificationJob = schedule.scheduleJob('*/1 * * * *', function(){
  console.log("Run Push Grilles Job", moment());
  pushGrilleWorker.startJob();
//});

//console.log("Push Grilles Job Next Invocation", notificationJob.nextInvocation());
//console.log("Fixture Job Next Invocation", fixtureJob.nextInvocation());
//console.log("Grille Job Next Invocation", grilleJob.nextInvocation());
//console.log("Fake Ads Job Next Invocation", fakeAdsJob.nextInvocation());
//console.log("Payout Job Next Invocation", payoutJob.nextInvocation());
