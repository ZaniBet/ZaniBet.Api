var mongoose = require('mongoose');

var SocialTask = new mongoose.Schema({
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
  action: { type: String, required: true },
  kind: { type: String },
  target: { type: mongoose.Schema.Types.ObjectId, refPath: 'kind' },
  network: { type: String, required: true },
  post: {
    message: { type: String, required: true },
    url: { type: String }
  },
  media: {
    type: { type: String, required: true }, // image/video
    url: { type: String, required: true }
  },
  status: { type: String, default: 'pending' }, // pending, draft, canceled, done
  sendAt: { type: Date, required: true }
}, { collection: 'socialtaks' });

//PushJobSchema.index({clientId : 1}, {unique:true});

var SocialTaskModel = mongoose.model( 'SocialTask', SocialTask );

exports.SocialTaskModel = SocialTaskModel;
