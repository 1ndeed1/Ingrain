// models/User.js
const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    role: { type: String, enum: ['farmer', 'consumer'], required: true },
    profile: {
        name: { type: String }, // Farmer's name
        farmName: { type: String }, // Name of the farm
        location: { type: String }, // City or region
        bio: { type: String }, // Short description of the farm
        contactNumber: { type: String }, // Optional contact info
        profilePicture: { type: String }, // URL to a profile picture (optional)
        isProfileComplete: { type: Boolean, default: false } // Flag to track if profile is set up
    }
});

module.exports = mongoose.model('User', userSchema);