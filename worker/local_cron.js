var schedule = require('node-schedule');
var cmd = require('node-cmd');
var moment = require('moment');

var ticketJob = schedule.scheduleJob('*/1 * * * *', function(){
  console.log("RUN TICKET JOB", moment());
  cmd.get(
    'DEBUG=node-gcm node worker/ticket_worker.js',
    function(err, data, stderr){
      console.log("err:", err);
      console.log("stderr:", stderr);
      console.log(data);
    }
  );
});

var fixtureJob = schedule.scheduleJob('*/1 * * * *', function(){
  console.log("RUN FIXTURE JOB", moment());
  cmd.get(
    'DEBUG=node-gcm node worker/sportmonks/fixture_worker.js',
    function(err, data, stderr){
      console.log("err:", err);
      console.log("stderr:", stderr);
      console.log(data);
    }
  );
});

var multiGrilleJob = schedule.scheduleJob('*/1 * * * *', function(){
  console.log("RUN GRILLE JOB", moment());
  cmd.get(
    'DEBUG=node-gcm node worker/grille_worker.js',
    function(err, data, stderr){
      console.log("err:", err);
      console.log("stderr:", stderr);
      console.log(data);
    }
  );
});

var singleGrilleJob = schedule.scheduleJob('*/1 * * * *', function(){
  console.log("RUN SINGLE GRILLE JOB", moment());
  cmd.get(
    'DEBUG=node-gcm node worker/single_grille_worker.js',
    function(err, data, stderr){
      console.log("err:", err);
      console.log("stderr:", stderr);
      console.log(data);
    }
  );
});

var fakeAdsJob = schedule.scheduleJob('/10 * * * * *', function(){
  console.log("RUN FAKE ADS JOB", moment());
  cmd.get(
    'node worker/fake_ads_worker.js',
    function(err, data, stderr){
      console.log("err:", err);
      console.log("stderr:", stderr);
      console.log(data);
    }
  );
});

var payoutJob = schedule.scheduleJob('*/10 * * * *', function(){
  console.log("RUN PAYOUT JOB", moment());
  cmd.get(
    'node worker/payout_worker.js',
    function(err, data, stderr){
      console.log("err:", err);
      console.log("stderr:", stderr);
      console.log(data);
    }
  );
});

console.log("Ticket Job Next Invocation", ticketJob.nextInvocation());
//console.log("Fixture Job Next Invocation", fixtureJob.nextInvocation());
//console.log("Multi Grille Job Next Invocation", multiGrilleJob.nextInvocation());
//console.log("Single Grille Job Next Invocation", singleGrilleJob.nextInvocation());
//console.log("Fake Ads Job Next Invocation", fakeAdsJob.nextInvocation());
//console.log("Payout Job Next Invocation", payoutJob.nextInvocation());
