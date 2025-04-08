const express = require('express');
const router = express.Router();
const Product = require('../models/Product');
const Order = require('../models/Order');
const User = require('../models/User');
const authMiddleware = require('../middleware/auth');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const mongoose = require('mongoose'); 

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const uploadDir = 'public/uploads/';
        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true });
        }
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        cb(null, Date.now() + path.extname(file.originalname));
    }
});
const upload = multer({
    storage: storage,
    limits: { fileSize: 5 * 1024 * 1024 },
    fileFilter: (req, file, cb) => {
        if (file.mimetype.startsWith('image/')) {
            cb(null, true);
        } else {
            cb(new Error('Only image files are allowed!'), false);
        }
    }
});

router.post('/profile', authMiddleware, upload.single('profilePicture'), async (req, res) => {
    try {
        const { name, dob, address } = req.body;
        const user = await User.findById(req.user._id);
        if (!user) return res.status(404).json({ error: 'User not found' });

        if (!name || !dob || !address) {
            return res.status(400).json({ error: 'Name, date of birth, and address are required' });
        }

        user.profile = {
            name,
            dob: new Date(dob),
            address,
            profilePicture: req.file ? `/uploads/${req.file.filename}` : user.profile?.profilePicture || '/uploads/default.jpg',
            isProfileComplete: true
        };

        await user.save();
        res.status(200).json({
            message: 'Profile updated successfully',
            profile: user.profile
        });
    } catch (err) {
        if (err.message.includes('Only image files are allowed!')) {
            return res.status(400).json({ error: 'Only image files are allowed!' });
        }
        res.status(500).json({ error: 'Server error: ' + err.message });
    }
});

router.get('/profile', authMiddleware, async (req, res) => {
    try {
        const user = await User.findById(req.user._id);
        if (!user) return res.status(404).json({ error: 'User not found' });
        
        if (!user.profile) {
            user.profile = { isProfileComplete: false };
            await user.save();
        }
        
        res.status(200).json(user.profile);
    } catch (err) {
        res.status(500).json({ error: 'Server error' });
    }
});

router.get('/products', authMiddleware, async (req, res) => {
    try {
        const { sort, type, ids } = req.query;
        let query = {};
        if (type) query.cropType = type;
        if (ids) query._id = { $in: ids.split(',') };

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
        const { orders, status = 'Pending' } = req.body;
        if (!orders || !Array.isArray(orders) || orders.length === 0) {
            return res.status(400).json({ error: 'Invalid order data' });
        }

        const orderData = [];
        const updatedProducts = [];

        for (const item of orders) {
            const product = await Product.findById(item.productId);
            if (!product) throw new Error(`Product ${item.productId} not found`);
            if (product.quantityAvailable < item.quantity) {
                throw new Error(`Insufficient stock for ${product.name}. Available: ${product.quantityAvailable} kg`);
            }
            if (product.version !== item.version) {
                throw new Error(`Product ${product.name} has been updated. Please refresh and try again.`);
            }

            product.quantityAvailable -= item.quantity;
            product.version += 1;
            await product.save();
            updatedProducts.push(product);

            const existingOrder = orderData.find(o => o.farmerId.toString() === product.farmerId.toString());
            if (existingOrder) {
                existingOrder.items.push({
                    productId: product._id,
                    name: product.name,
                    quantity: item.quantity,
                    price: product.price,
                    version: product.version
                });
                existingOrder.total += product.price * item.quantity;
            } else {
                orderData.push({
                    consumerId: req.user._id,
                    farmerId: product.farmerId,
                    items: [{
                        productId: product._id,
                        name: product.name,
                        quantity: item.quantity,
                        price: product.price,
                        version: product.version
                    }],
                    total: product.price * item.quantity,
                    status,
                    shippingAddress: (await User.findById(req.user._id)).profile?.address || 'Not provided'
                });
            }
        }

        const newOrders = await Order.insertMany(orderData);

        const io = req.app.get('io');
        newOrders.forEach(order => {
            io.to(order.farmerId.toString()).emit('newOrder', { 
                orderId: order._id, 
                consumerId: req.user._id 
            });
        });

        res.status(201).json({ 
            message: 'Order placed successfully', 
            orders: newOrders,
            orderNumbers: newOrders.map(o => o.orderNumber)
        });
    } catch (err) {
        console.error('Order creation error:', err.message);
        if (err.message.includes('Insufficient stock') || err.message.includes('updated')) {
            for (const product of updatedProducts) {
                product.quantityAvailable += item.quantity;
                product.version += 1;
                await product.save();
            }
        }
        res.status(400).json({ error: err.message || 'Server error during order placement' });
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

router.get('/orders/:orderNumber', authMiddleware, async (req, res) => {
    try {
        const order = await Order.findOne({ orderNumber: req.params.orderNumber, consumerId: req.user._id })
            .populate('farmerId', 'profile.name')
            .populate('items.productId');
        if (!order) return res.status(404).json({ error: 'Order not found' });
        res.json(order);
    } catch (err) {
        res.status(500).json({ error: 'Server error' });
    }
});

router.post('/orders/:orderId/cancel', authMiddleware, async (req, res) => {
    try {
        const order = await Order.findOne({ _id: req.params.orderId, consumerId: req.user._id });
        if (!order || order.status !== 'Pending') {
            throw new Error('Order cannot be cancelled');
        }

        for (const item of order.items) {
            const product = await Product.findById(item.productId);
            product.quantityAvailable += item.quantity;
            product.version += 1;
            await product.save();
        }

        order.status = 'Cancelled';
        await order.save();

        res.json({ message: 'Order cancelled successfully' });
    } catch (err) {
        res.status(400).json({ error: err.message || 'Server error during cancellation' });
    }
});

router.post('/orders/:orderNumber/pay', authMiddleware, upload.single('paymentProof'), async (req, res) => {
    try {
        const order = await Order.findOne({ orderNumber: req.params.orderNumber, consumerId: req.user._id, status: 'Accepted' });
        if (!order) return res.status(404).json({ error: 'Order not found or not accepted yet' });
        if (!req.file) return res.status(400).json({ error: 'Payment proof is required' });

        order.paymentProof = `/uploads/${req.file.filename}`;
        order.status = 'Pending Payment';
        order.paymentStatus = 'Pending';
        await order.save();

        const io = req.app.get('io');
        io.to(order.farmerId.toString()).emit('orderUpdate', { orderId: order._id, status: 'Pending Payment' });

        res.json({ message: 'Payment proof submitted successfully' });
    } catch (err) {
        res.status(500).json({ error: err.message || 'Server error during payment submission' });
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

module.exports = router;