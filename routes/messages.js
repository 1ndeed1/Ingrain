const express = require('express');
const router = express.Router();
const Message = require('../models/Message');
const authMiddleware = require('../middleware/auth');

router.get('/', authMiddleware, async (req, res) => {
    try {
        const messages = await Message.find({
            $or: [{ senderId: req.user._id }, { receiverId: req.user._id }]
        })
            .populate('senderId', 'profile.name email')
            .populate('receiverId', 'profile.name email')
            .populate('productId', 'name')
            .populate('orderId', 'items')
            .sort('-timestamp');
        const formattedMessages = messages.map(msg => ({
            ...msg._doc,
            senderId: {
                _id: msg.senderId._id,
                profile: {
                    name: msg.senderId.profile?.name || msg.senderId.email
                }
            },
            receiverId: {
                _id: msg.receiverId._id,
                profile: {
                    name: msg.receiverId.profile?.name || msg.receiverId.email
                }
            }
        }));
        res.json(formattedMessages);
    } catch (err) {
        res.status(500).json({ error: 'Server error' });
    }
});

module.exports = router;