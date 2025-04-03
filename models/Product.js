const mongoose = require('mongoose');

const ProductSchema = new mongoose.Schema({
    name: { type: String, required: true },
    cropType: { type: String, required: true },
    quantityProduced: { type: Number, required: true }, // Quantity in kg
    investment: { type: Number, required: true },
    price: { type: Number, required: true },
    description: { type: String, required: true },
    farmerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    imageUrl: { type: String },
    createdAt: { type: Date, default: Date.now },

    // Optional Fields
    scientificName: { type: String },
    cropFamily: { type: String },
    fertilizerNeeds: { type: String },
    soilType: { type: String, enum: ['loamy', 'sandy', 'clay', 'silt'] },
    waterNeeds: { type: String, enum: ['low', 'moderate', 'high'] },
    carbonFootprint: { type: String }
});

module.exports = mongoose.model('Product', ProductSchema);