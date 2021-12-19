var mongoose = require('mongoose');
var uniqid = require('uniqid');

var BetTypeSchema = new mongoose.Schema({
  type: { type: String, required: true }, // 1N2, BOTH_GOAL, LESS_MORE_GOAL, FIRST_GOAL
  result: { type: Number, default: -1 },
  status: { type: String, default: "pending" } // pending, done, canceled
}, { _id: false });

var TournamentSchema = new mongoose.Schema({
  _id: { type: String, default: uniqid() },
  rewardType: { type: String, default: 'ZaniCoin'}, // ZaniCoin, ZaniHash
  level: { type: Number, default: 1 },
  totalPlayers: { type: Number, default: 0 },
  totalPlayersPaid: { type: Number, default: 1 },
  playCost: { type: Number, default: 20000 },
  fees: { type: Number, default: 0 },
  pot: { type: Number, default: 0 },
  sharing: { type: Number, default: 15 }
});

var GameTicketSchema = new mongoose.Schema({
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
  active: { type: Boolean, default: true },
  type: { type: String, required: true }, // MATCHDAY, SINGLE, TOURNAMENT
  openDate : { type: Date, required: true },
  limitDate: { type: Date, required: true },
  resultDate: { type: Date, required: true  },
  competition: { type: String, ref: 'Competition' },
  matchDay: { type: Number, required: true },
  fixtures : [ { type: mongoose.Schema.Types.ObjectId, ref: 'Fixture' } ],
  name: { type: String, required: true },
  cover: { type: String, required: true }, // deprecated
  picture: { type: String, default: ""},
  thumbnail: { type: String , required: true},
  jackpot : { type: Number, required: true },
  pointsPerBet: { type: Number, default: 5 },
  bonus: { type: Number, default: 0 }, // deprecated
  bonusActivation: { type: Number, default: 4 }, // deprecated
  bonuses: [
    {
      _id: { type: String, required: true }, // MIN-WINNING-BETS-ZC, CLEAR-ROUND-BETS-ZC, MIN-WINNING-BETS-CHIPS
      threshold: { type: Number, required: true }, // Seuil d'activation du bonus
      bonus: { type: Number, required: true } // Valeur du bonus
    }
  ],
  notifications: [
    {
      _id: { type: String, required: true }, // PUSH_OPEN
      date: { type: Date, required: true }
    }
  ],
  jeton: { type: Number, default: 0 },
  maxNumberOfPlay : { type: Number, default: 8 },
  status: { type: String, default: 'close' }, // close / open / waiting_result / ended / canceled
  /*push: {
  open: { type: Boolean, default: false },
  limit: { type: Boolean, default: false }
},*/
passFixtureCheck: { type: Boolean, default: false },
betsType: [BetTypeSchema],
tournament: TournamentSchema
}, { collection: 'gameTicket' });

/*GameTicketSchema.index({
  _id: 1,
  openDate: 1,
  limitDate: 1,
  resultDate: 1,
  type: 1,
  status: 1,
  active: 1,
}, { background: true });*/

GameTicketSchema.pre('update', function() {
  this.update({},{ $set: { updatedAt: new Date() } });
});


var GameTicketModel = mongoose.model( 'GameTicket', GameTicketSchema );
if (process.env.NODE_ENV == "local"){
  GameTicketModel.on('index', function(error) {
    // "_id index cannot be sparse"
    console.log("GameTicketModel on index", error);
  });
}

exports.GameTicketModel = GameTicketModel;
