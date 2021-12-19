var mongoose = require('mongoose');

var AchievementSchema = new mongoose.Schema({
  _id; { type: String, required: true },
  name: { type: String, required: true },
}, { collection: 'achievement' });

AchievementSchema.index({ clientId : 1 });

var AchievementModel = mongoose.model( 'Achievement', AchievementSchema );
if (process.env.NODE_ENV == "local"){
  AchievementModel.on('index', function(error) {
    // "_id index cannot be sparse"
    console.log("AchievementModel on index", error);
  });
}

exports.AchievementModel = AchievementModel;
