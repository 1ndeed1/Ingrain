const mongoose = require('mongoose');

const orderSchema = new mongoose.Schema({
    consumerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    farmerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    items: [{
        productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
        name: { type: String, required: true },
        quantity: { type: Number, required: true },
        price: { type: Number, required: true },
        version: { type: Number, required: true } // Store product version at order time
    }],
    total: { type: Number, required: true },
    status: { 
        type: String, 
        enum: ['Pending', 'Accepted', 'Pending Payment', 'Shipped', 'Delivered', 'Cancelled', 'Rejected'], 
        default: 'Pending' 
    },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now },
    orderNumber: { type: String, unique: true }, // Unique order identifier
    shippingAddress: { type: String }, // To be populated from consumer profile
    paymentStatus: { type: String, enum: ['Pending', 'Paid', 'Failed'], default: 'Pending' },
    paymentProof: { type: String } // URL to the uploaded payment proof image
});

orderSchema.pre('save', function(next) {
    this.updatedAt = Date.now();
    if (!this.orderNumber) {
        this.orderNumber = `ORD-${Date.now()}-${Math.floor(Math.random() * 1000).toString().padStart(3, '0')}`;
    }
    next();
});

module.exports = mongoose.model('Order', orderSchema);