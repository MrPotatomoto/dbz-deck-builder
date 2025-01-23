const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const deckSchema = new Schema({
    name: { type: String, required: true },
    description: { type: String, default: '' },
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    cards: [{
        _id: { type: String, ref: 'Card', required: true },
        quantity: { type: Number, default: 1 } // Add quantity attribute
    }],
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Deck', deckSchema);
