var gcm = require('node-gcm');

exports.sendSingleMessage = function(fcmToken, title, msg){
  if (process.env.NODE_ENV == "local" || process.env.NODE_ENV == "dev"){
    console.log("Skip sendSingleMessage car nous sommes dans un environnement local");
    return;
  }

  var sender = new gcm.Sender(process.env.GCM_API_KEY);
  // Prepare a message to be sent
  var message = new gcm.Message();
  message.addNotification({
    title: title,
    body: msg,
    icon: 'tab_reward'
  });

  // Actually send the message
  sender.send(message, { registrationTokens: fcmToken }, function (err, response) {
    if (err){
      console.error(err);
    } else {
      //console.log(response);
    }
  });
}

exports.sendTopicMessage = function(topic, title, msg){
  return new Promise(function(resolve, reject){
    if (process.env.NODE_ENV == "local" || process.env.NODE_ENV == "dev"){
      console.log("Skip sendTopicMessage car nous sommes dans un environnement local");
      return resolve("OK");
    }

    var sender = new gcm.Sender(process.env.GCM_API_KEY);
    // Prepare a message to be sent
    var message = new gcm.Message();
    message.addNotification({
      title: title,
      body: msg,
      icon: 'tab_reward'
    });

    // Actually send the message
    //console.log(topic);
    console.log("'" +topic + '\' in topics');
    sender.send(message, { condition: "'" +topic + '\' in topics' }, function (err, response) {
      if (err){
        //console.log(response);
        console.error(err);
        return reject(err);
      } else {
        console.log(response);
        return resolve(response);
      }
    });
  });
};
