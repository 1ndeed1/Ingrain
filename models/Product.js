const mongoose = require('mongoose');

const ProductSchema = new mongoose.Schema({
    name: { type: String, required: true },
    cropType: { type: String, required: true },
    quantityProduced: { type: Number, required: true }, // Total produced
    quantityAvailable: { type: Number, required: true, default: 0 }, // Available for sale
    investment: { type: Number, required: true },
    price: { type: Number, required: true },
    description: { type: String, required: true },
    farmerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    imageUrl: { type: String },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now },
    version: { type: Number, default: 0 }, // For optimistic concurrency control

    // Optional Fields
    scientificName: { type: String },
    cropFamily: { type: String },
    fertilizerNeeds: { type: String },
    soilType: { type: String, enum: ['loamy', 'sandy', 'clay', 'silt'] },
    waterNeeds: { type: String, enum: ['low', 'moderate', 'high'] },
    carbonFootprint: { type: String }
});

ProductSchema.pre('save', function(next) {
    this.updatedAt = Date.now();
    next();
});

module.exports = mongoose.model('Product', ProductSchema);