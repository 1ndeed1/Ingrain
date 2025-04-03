const express = require('express');
const router = express.Router();
const Product = require('../models/Product');
const User = require('../models/User');
const authMiddleware = require('../middleware/auth');
const multer = require('multer');
const path = require('path');

// Multer setup for image upload
const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, 'uploads/'),
    filename: (req, file, cb) => cb(null, Date.now() + path.extname(file.originalname))
});
const upload = multer({ storage });

// Add new crop
router.post('/crops', authMiddleware, upload.single('image'), async (req, res) => {
    try {
        const {
            name, cropType, quantityProduced, investment, price, description,
            scientificName, cropFamily, fertilizerNeeds, soilType, waterNeeds, carbonFootprint
        } = req.body;

        if (!name || !cropType || !quantityProduced || !investment || !price || !description) {
            return res.status(400).json({ error: 'Missing required fields' });
        }

        const newCrop = new Product({
            name,
            cropType,
            quantityProduced: parseFloat(quantityProduced),
            investment: parseFloat(investment),
            price: parseFloat(price),
            description,
            farmerId: req.user._id,
            imageUrl: req.file ? `/uploads/${req.file.filename}` : undefined,
            ...(scientificName && { scientificName }),
            ...(cropFamily && { cropFamily }),
            ...(fertilizerNeeds && { fertilizerNeeds }),
            ...(soilType && { soilType }),
            ...(waterNeeds && { waterNeeds }),
            ...(carbonFootprint && { carbonFootprint })
        });

        await newCrop.save();
        res.status(201).json(newCrop);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to add crop' });
    }
});

// List farmer's crops
router.get('/crops', authMiddleware, async (req, res) => {
    try {
        const crops = await Product.find({ farmerId: req.user._id });
        res.json(crops);
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch crops' });
    }
});

// Delete a crop
router.delete('/crops/:id', authMiddleware, async (req, res) => {
    try {
        const crop = await Product.findOne({ _id: req.params.id, farmerId: req.user._id });
        if (!crop) return res.status(404).json({ error: 'Crop not found' });
        await Product.deleteOne({ _id: req.params.id });
        res.status(200).json({ message: 'Crop deleted' });
    } catch (err) {
        res.status(500).json({ error: 'Failed to delete crop' });
    }
});

// Profile routes
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
        const { name, farmName, location, bio, contactNumber } = req.body;
        const user = await User.findById(req.user._id);
        // Preserve the existing profile picture if no new file is uploaded
        const existingProfilePicture = user.profile && user.profile.profilePicture;
        user.profile = {
            name,
            farmName,
            location,
            bio,
            contactNumber,
            profilePicture: req.file ? `/uploads/${req.file.filename}` : existingProfilePicture,
            isProfileComplete: true
        };
        await user.save();
        res.status(200).json({ message: 'Profile updated successfully' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
});

module.exports = router;