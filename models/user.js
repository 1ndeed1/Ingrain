const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    role: { type: String, enum: ['farmer', 'consumer'], required: true },
    profile: {
        name: { type: String }, // Farmer's or consumer's name
        farmName: { type: String }, // For farmers only (optional for consumers)
        location: { type: String }, // City or region (optional)
        bio: { type: String }, // Short description (optional)
        address: { type: String }, // Consumer address
        dob: { type: Date }, // Date of birth, corrected from 'DOB'
        contactNumber: { type: String }, // Optional contact info
        profilePicture: { type: String }, // URL to profile picture (optional)
        isProfileComplete: { type: Boolean, default: false } // Flag to track profile setup
    }
});

module.exports = mongoose.model('User', userSchema);