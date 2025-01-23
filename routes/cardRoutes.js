const express = require('express');
const router = express.Router();
const Card = require('../models/Card');
const { v4: uuidv4 } = require('uuid');
const { ensureAuthenticated } = require('../middleware/auth');

// Route to get all cards
router.get('/cards', async (req, res) => {
    const { text, style, rarity, type, set, level, name_or_title } = req.query;
    const query = {};

    if (text) {
        query['text'] = new RegExp(text, 'i'); // Use regex for case-insensitive matching
    }
    if (style) {
        query['style'] = new RegExp(style, 'i'); // Use regex for case-insensitive matching
    }
    if (rarity) {
        query['rarity'] = new RegExp(rarity, 'i'); // Use regex for case-insensitive matching
    }
    if (type) {
        query['type'] = new RegExp(type, 'i'); // Use regex for case-insensitive matching
    }
    if (set) {
        query['set'] = new RegExp(set, 'i'); // Use regex for case-insensitive matching
    }
    if (level) {
        query['card_level'] = level; // Use regex for case-insensitive matching
    }

    if (name_or_title) {
        query['$or'] = [
            { 'name': new RegExp(name_or_title, 'i') },
            { 'title': new RegExp(name_or_title, 'i') }
        ];
    }

    try {
        const cards = await Card.find(query).sort({ style: 1, type: 1, name: 1, card_level: 1});
        res.json(cards);
    } catch (err) {
        res.status(500).json({ error: 'Error fetching cards' });
    }
})
    


// Route to create a new card
router.post('/cards', async (req, res) => {
    const card = new Card({
        _id: uuidv4(),
        octgn_id: req.body.octgn_id,
        card_number: req.body.card_number,
        name: req.body.name,
        fullName: req.body.fullName,
        title: req.body.title,
        style: req.body.style,
        type: req.body.type,
        rarity: req.body.rarity,
        set: req.body.set,
        card_level: req.body.card_level,
        pur: req.body.pur,
        power_rating: req.body.power_rating,
        text: req.body.text,
        limit_per_deck: req.body.limit_per_deck,
        img_url: req.body.img_url,
        errata: req.body.errata,
        rulings: req.body.rulings
    });

    try {
        const newCard = await card.save();
        res.status(201).json(newCard);
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
});

module.exports = router;
