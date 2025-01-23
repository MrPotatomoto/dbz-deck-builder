const jwt = require('jsonwebtoken');

function ensureAuthenticated(req, res, next) {
    const token = req.cookies.token;
    if (!token) {
        req.flash('error_msg', 'Please log in to view this resource');
        return res.redirect('/login');
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.user = decoded;
        next();
    } catch (err) {
        req.flash('error_msg', 'Please log in to view this resource');
        res.clearCookie('token');
        res.redirect('/login');
    }
}

module.exports = { ensureAuthenticated };
