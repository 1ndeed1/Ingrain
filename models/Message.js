const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
    senderId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }, // Sender (farmer or consumer)
    receiverId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }, // Receiver
    content: { type: String, required: true }, // Message text
    timestamp: { type: Date, default: Date.now }, // When the message was sent
    productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', default: null }, // Optional reference to a product
    orderId: { type: mongoose.Schema.Types.ObjectId, ref: 'Order', default: null }, // Optional reference to an order
    read: { type: Boolean, default: false } // Track if the receiver has read it
});

module.exports = mongoose.model('Message', messageSchema);