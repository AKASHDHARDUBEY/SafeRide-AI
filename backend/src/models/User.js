const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
    userId: { type: String, required: true, unique: true },
    name: String,
    email: String,
    phone: String,
    isPremium: { type: Boolean, default: false },
    paymentId: String,
    paymentOrderId: String,
    premiumActivatedAt: Date,
    createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('User', UserSchema);
