const express = require('express');
const app = express();
const path = require('path');
const ejsMate = require('ejs-mate');
const mongoose = require('mongoose');
require('dotenv').config();
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const cookieParser = require('cookie-parser');
const session = require('cookie-session');
const flash = require('connect-flash');

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI);

// Middleware
app.engine('ejs', ejsMate);
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(cookieParser());
app.use(express.static('public'));

// Express Session Middleware
app.use(session({
    secret: 'secret-key', // Replace with your own secret
    resave: false,
    saveUninitialized: false
}));

// Connect Flash Middleware
app.use(flash());

// Global Variables for Flash Messages
app.use((req, res, next) => {
    res.locals.success_msg = req.flash('success_msg');
    res.locals.error_msg = req.flash('error_msg');
    next();
});

// Import User model
const User = require('./models/User');

// Middleware to check authentication and pass user info to EJS templates
const checkAuth = (req, res, next) => {
    const token = req.cookies.token;
    if (token) {
        try {
            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            req.user = decoded;
            res.locals.user = { username: decoded.username }; // Ensure user is always set
        } catch (error) {
            res.clearCookie('token');
        }
    } else {
        res.locals.user = null; // Ensure user is always set
    }
    next();
};

app.use(checkAuth);

// Fix card img urls
// const { getImgUrl } = require('./utils/getImgUrl');

// app.get('/fix-card-img-urls', async (req, res) => {
//     const cards = await Card.find();
//     cards.forEach(card => {
//         const { url } = getImgUrl(card);
//         card.img_url = url.toLowerCase();
//         card.save();
//     })
//     res.send('Card img urls fixed');
// });

// Routes
const cardRoutes = require('./routes/cardRoutes');
app.use('/api', cardRoutes);

const deckRoutes = require('./routes/deckRoutes');
app.use('/decks', deckRoutes);

app.get('/', (req, res) => {
    res.render('index', { title: 'Home' });
});

const Deck = require('./models/Deck');

app.get('/users/:id', async (req, res) => {
    const { id } = req.params;
    const viewedUser = await User.findById(id).select('username');
    const decks = await Deck.find({ user: id });
    res.render('decks', { title: 'Profile', viewedUser, decks });
});

app.get('/register', (req, res) => {
    res.render('register', { title: 'Register' });
});

app.post('/register', async (req, res) => {
    const { username, email, password } = req.body;
    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = new User({ username, email, password: hashedPassword });
    await newUser.save();
    req.flash('success_msg', 'You are now registered and can log in');
    res.redirect('/login');
});

app.get('/login', (req, res) => {
    res.render('login', { title: 'Login' });
});

app.post('/login', async (req, res) => {
    const { identifier, password } = req.body;
    let user;

    // Check if the identifier is an email or username
    if (identifier.includes('@')) {
        user = await User.findOne({ email: identifier });
    } else {
        user = await User.findOne({ username: identifier });
    }

    if (!user) {
        req.flash('error_msg', 'Invalid credentials');
        return res.redirect('/login');
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
        req.flash('error_msg', 'Invalid credentials');
        return res.redirect('/login');
    }

    const token = jwt.sign({ _id: user._id, username: user.username }, process.env.JWT_SECRET, { expiresIn: '24h' });
    res.cookie('token', token, { httpOnly: true });
    req.flash('success_msg', 'You are now logged in');
    res.redirect('/dashboard');
});

app.get('/logout', (req, res) => {
    res.clearCookie('token');
    req.flash('success_msg', 'You are logged out');
    res.redirect('/');
});

app.get('/dashboard', (req, res) => {
    if (!req.user) {
        req.flash('error_msg', 'Please log in to view this resource');
        return res.redirect('/login');
    }
    res.render('dashboard', { title: 'Dashboard' });
});

// Include Card schema
const Card = require('./models/Card');

// Card routes
app.get('/cards', async (req, res) => {
    const cards = await Card.find().sort({ style: 1, type: 1, name: 1, card_level: 1 });
    res.render('cards', { title: 'Cards', cards });
});

const nodemailer = require('nodemailer');
const crypto = require('crypto');

let resetTokens = {};

// Request Password Reset
app.get('/request-reset', (req, res) => {
    res.render('request-reset', { title: 'Request Password Reset' });
});

app.post('/request-reset', async (req, res) => {
    const { email } = req.body;
    const user = await User.findOne({ email });
    if (!user) {
        req.flash('error_msg', 'No user found with that email');
        return res.redirect('/request-reset');
    }

    const token = crypto.randomBytes(20).toString('hex');
    resetTokens[token] = user._id;

    const transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
            user: process.env.EMAIL_USER,
            pass: process.env.EMAIL_PASS
        }
    });

    const mailOptions = {
        to: user.email,
        from: process.env.EMAIL_USER,
        subject: 'Password Reset Request',
        text: `You are receiving this because you (or someone else) have requested the reset of the password for your account.
Please click on the following link, or paste it into your browser to complete the process:
http://${req.headers.host}/reset-password/${token}\n\n`
    };

    await transporter.sendMail(mailOptions);
    req.flash('success_msg', 'Password reset email sent');
    res.redirect('/request-reset');
});

// Reset Password
app.get('/reset-password/:token', (req, res) => {
    const { token } = req.params;
    const userId = resetTokens[token];
    if (!userId) {
        req.flash('error_msg', 'Invalid or expired token');
        return res.redirect('/request-reset');
    }
    res.render('reset-password', { title: 'Reset Password', token });
});

app.post('/reset-password/:token', async (req, res) => {
    const { token } = req.params;
    const userId = resetTokens[token];
    if (!userId) {
        req.flash('error_msg', 'Invalid or expired token');
        return res.redirect('/request-reset');
    }

    const { password } = req.body;
    const hashedPassword = await bcrypt.hash(password, 10);
    await User.findByIdAndUpdate(userId, { password: hashedPassword });

    delete resetTokens[token];
    req.flash('success_msg', 'Password has been reset');
    res.redirect('/login');
});

const port = process.env.PORT || 3000;

app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
});
