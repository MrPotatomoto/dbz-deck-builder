const express = require('express');
const router = express.Router();
const Deck = require('../models/Deck');
const { ensureAuthenticated } = require('../middleware/auth');

// Get all decks
router.get('/', ensureAuthenticated, async (req, res) => {
    try {
        const decks = await Deck.find({}).populate('cards').populate('user');
        res.render('decks', { title: 'Decks', decks, viewedUser: false });
    } catch (err) {
        req.flash('error_msg', 'Failed to load decks');
        res.redirect('/');
    }
});

// Route to render create deck form 
router.get('/create-deck', ensureAuthenticated, (req, res) => {
    res.render('create-deck', { title: 'Create Deck' });
});

// Get a specific deck
router.get('/:id', ensureAuthenticated, async (req, res) => {
    try {
        const deck = await Deck.findById(req.params.id).populate('cards._id').populate('user');
        const isOwner = deck.user.equals(req.user._id);

        // Check if the card details are populated
        // console.log('Deck cards:', deck.cards); // Log the deck cards for debugging
        // console.log(deck)

        // Concatenate name and title with a hyphen if title exists
        deck.cards = deck.cards.map(card => {
            card._id.displayName = card._id.title ? `${card._id.name} - ${card._id.title}` : card._id.name;
            card._id.img_url = card._id.img_url.replace("'", "%27");
            return card;
        });

        // Group cards by type
        const groupedCards = deck.cards.reduce((acc, card) => {
            const type = card._id.type || 'Unknown';
            if (!acc[type]) {
                acc[type] = [];
            }
            acc[type].push(card);
            return acc;
        }, {});

        res.render('deck', { title: deck.name, deck, isOwner, groupedCards });
    } catch (err) {
        console.error('Error loading deck:', err); // Log the error
        req.flash('error_msg', 'Failed to load deck');
        res.redirect('/decks');
    }
});

// Create a new deck
router.post('/', ensureAuthenticated, async (req, res) => {
    const deck = new Deck({
        name: req.body.name,
        description: req.body.description || 'Edit your deck\'s description here',
        user: req.user._id,
        cards: (req.body.cards || []).map(cardId => ({
            _id: new ObjectId(cardId)
        }))
    });

    try {
        const newDeck = await deck.save();
        req.flash('success_msg', 'Deck created successfully');
        res.redirect(`/decks/${newDeck._id}`);
    } catch (err) {
        req.flash('error_msg', 'Failed to create deck');
        res.redirect('/decks/create-deck');
    }
});


router.post('/:id', ensureAuthenticated, async (req, res) => {
    try {
        // console.log('Received data:', req.body); // Log the received data
        const deck = await Deck.findById(req.params.id);
        const cards = req.body.cards || [];

        const { name, description } = req.body;

        deck.name = name;
        deck.description = description;
        deck.updatedAt = new Date();

        deck.cards = cards.map(card => ({
            _id: card._id,
            quantity: card.quantity || 1 // Set default quantity to 1
        }));

        await deck.save();
        console.log('Deck saved successfully'); // Log success instead of flashing a message
        res.json({ success: true });
    } catch (err) {
        console.error('Error saving deck:', err); // Log the error
        req.flash('error_msg', 'Failed to save deck');
        res.json({ success: false, message: err.message });
    }
});

router.delete('/:id', ensureAuthenticated, async (req, res) => {
    try {
        await Deck.findByIdAndDelete(req.params.id);
        req.flash('success_msg', 'Deck deleted successfully');
        res.json({ success: true });
    } catch (err) {
        req.flash('error_msg', 'Failed to delete deck');
        res.status(500).json({ success: false, message: err.message });
    }
});



module.exports = router;
