const mongoose = require('mongoose');
const { Schema } = mongoose;

const userSchema = new Schema({
    username: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    decks: [{ type: Schema.Types.ObjectId, ref: 'Deck' }] // Add reference to decks
});

const User = mongoose.model('User', userSchema);

module.exports = User;
