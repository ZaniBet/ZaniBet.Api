var mongoose = require('mongoose');

var BetSchema = new mongoose.Schema({
  type: { type: String }, // 1N2 , BOTH_GOAL, LESS_MORE_GOAL, FIRST_GOAL, AMOUNT_GOAL
  fixture: { type: mongoose.Schema.Types.ObjectId, ref: 'Fixture' },
  result: Number, // 0 = Equal - 1 = home win - 2 = away win / 0-2, 2-4,5+
  status: String, // win, loose, canceled
  winner: Number
}, { _id: false });

var PayoutSchema = new mongoose.Schema({
  amount: { type: Number, default: 0 },
  point: { type: Number, default: 0 }, // ZaniCoins
  bonus: { type: Number, default: 0 },
  status: { type: String } // waiting_paiement , paid
}, { _id: false });

var StandingSchema = new mongoose.Schema({
  id: { type: String, required: true },
  points: { type: Number, default: 0 },
  rank: { type: Number, default: -1 },
}, { _id: false });

var GrilleSchema = new mongoose.Schema({
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
  reference: { type: String, unique: true },
  type: { type: String, required: true }, // MULTI, SIMPLE, TOURNAMENT
  gameTicket: { type: mongoose.Schema.Types.ObjectId, ref: 'GameTicket' },
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  bets : { type: [BetSchema], default: [BetSchema] },
  status: { type: String, default: 'waiting_validation' }, // waiting_validation, canceled, waiting_result, loose, win
  numberOfBetsWin: { type: Number, default: 0 },
  payout: { type: PayoutSchema, default: PayoutSchema }, // gain généré par la grille
  standing: { type: StandingSchema },
  impressionId: { type: String },
  flashed: { type: Boolean },
  ip: { type: String },
  instanceId: { type: String },
  advertisingId: { type: String }
}, { collection: 'grille' });

/*GrilleSchema.index({
  _id: 1,
  createdAt: 1,
  updatedAt: 1,
  type: 1,
  status: 1,
  gameTicket: 1,
  user: 1,
  ip: 1,
  instanceId: 1
});*/

GrilleSchema.index({
  gameTicket: 1,
  "standing.rank": 1,
  status: 1
}, { background: true });

GrilleSchema.index({
  user: 1,
  ip: 1,
}, { background: true });


GrilleSchema.pre('update', function() {
  this.update({},{ $set: { updatedAt: new Date() } });
});


var GrilleModel = mongoose.model( 'Grille', GrilleSchema );
if (process.env.NODE_ENV == "local"){
  GrilleModel.on('index', function(error) {
    // "_id index cannot be sparse"
    console.log("GrilleModel on index", error);
  });
}

exports.GrilleModel = GrilleModel;
