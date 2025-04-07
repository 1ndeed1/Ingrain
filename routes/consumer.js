const express = require('express');
const router = express.Router();
const Product = require('../models/Product');
const Order = require('../models/Order');
const User = require('../models/User');
const authMiddleware = require('../middleware/auth');
const multer = require('multer');
const path = require('path');

// Multer setup for profile picture upload
const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, 'uploads/'),
    filename: (req, file, cb) => cb(null, Date.now() + path.extname(file.originalname))
});
const upload = multer({ storage });

router.get('/products', authMiddleware, async (req, res) => {
    try {
        const { sort, type } = req.query;
        let query = {};
        if (type) query.cropType = type;

        let products = await Product.find(query).populate('farmerId', 'profile.name');
        if (sort === 'price') products.sort((a, b) => a.price - b.price);
        else if (sort === 'farmer') products.sort((a, b) => (a.farmerId.profile.name || '').localeCompare(b.farmerId.profile.name || ''));
        else products.sort((a, b) => a.name.localeCompare(b.name));

        res.json(products);
    } catch (err) {
        res.status(500).json({ error: 'Server error' });
    }
});

router.post('/orders', authMiddleware, async (req, res) => {
    try {
        const { orders } = req.body;
        if (!orders || !Array.isArray(orders) || orders.length === 0) {
            return res.status(400).json({ error: 'Invalid order data' });
        }

        const orderPromises = orders.map(async (item) => {
            const product = await Product.findById(item.productId);
            if (!product || product.quantityProduced < item.quantity) {
                throw new Error(`Invalid quantity for ${product?.name || 'product'}`);
            }
            return {
                consumerId: req.user._id,
                farmerId: product.farmerId,
                items: [{
                    productId: product._id,
                    name: product.name,
                    quantity: item.quantity,
                    price: product.price
                }],
                total: product.price * item.quantity
            };
        });

        const orderData = await Promise.all(orderPromises);
        const newOrders = await Order.insertMany(orderData);
        res.status(201).json({ message: 'Order placed successfully', orders: newOrders });
    } catch (err) {
        res.status(500).json({ error: err.message || 'Server error' });
    }
});

router.get('/orders', authMiddleware, async (req, res) => {
    try {
        const orders = await Order.find({ consumerId: req.user._id })
            .populate('farmerId', 'profile.name')
            .sort('-createdAt');
        res.json(orders);
    } catch (err) {
        res.status(500).json({ error: 'Server error' });
    }
});

router.get('/contacts', authMiddleware, async (req, res) => {
    try {
        if (req.user.role !== 'consumer') {
            return res.status(403).json({ error: 'Access denied' });
        }
        const orders = await Order.find({ consumerId: req.user._id }).distinct('farmerId');
        const farmers = await User.find({ _id: { $in: orders }, role: 'farmer' })
            .select('profile.name email _id');
        const formattedFarmers = farmers.map(farmer => ({
            _id: farmer._id,
            profile: {
                name: farmer.profile?.name || farmer.email
            }
        }));
        res.json(formattedFarmers);
    } catch (err) {
        console.error('Error fetching contacts:', err);
        res.status(500).json({ error: 'Failed to load contacts' });
    }
});

// Consumer profile routes
router.get('/profile', authMiddleware, async (req, res) => {
    try {
        const user = await User.findById(req.user._id);
        if (!user) return res.status(404).json({ error: 'User not found' });
        res.json(user.profile || { isProfileComplete: false });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
});

router.post('/profile', authMiddleware, upload.single('profilePicture'), async (req, res) => {
    try {
        const { name, bio, contactNumber } = req.body;
        const user = await User.findById(req.user._id);
        const existingProfilePicture = user.profile && user.profile.profilePicture;
        user.profile = {
            name: name || user.email,
            bio: bio || '',
            contactNumber: contactNumber || '',
            profilePicture: req.file ? `/uploads/${req.file.filename}` : existingProfilePicture,
            isProfileComplete: !!name
        };
        await user.save();
        res.status(200).json({ message: 'Profile updated successfully', profile: user.profile });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
});

module.exports = router;