const jwt = require('jsonwebtoken');
const User = require('../models/User');

module.exports = async (req, res, next) => {
    const token = req.header('Authorization')?.replace('Bearer ', '') || 
                  req.cookies.token || 
                  req.body.token;

    if (!token) {
        if (req.url.startsWith('/farmer') || req.url.startsWith('/consumer')) {
            return res.redirect('/login');
        }
        return res.status(401).json({ message: 'No token provided' });
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.user = await User.findById(decoded.userId);
        if (!req.user) {
            if (req.url.startsWith('/farmer') || req.url.startsWith('/consumer')) {
                return res.redirect('/login');
            }
            return res.status(404).json({ message: 'User not found' });
        }
        next();
    } catch (err) {
        if (req.url.startsWith('/farmer') || req.url.startsWith('/consumer')) {
            return res.redirect('/login');
        }
        res.status(401).json({ message: 'Invalid token' });
    }
};
