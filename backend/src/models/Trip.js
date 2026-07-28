const mongoose = require('mongoose');

const TripSchema = new mongoose.Schema({
    tripId: { type: String, required: true, unique: true },
    userId: { type: String, required: true },
    destination: String,
    polyline: String, // Encoded polyline from Google Maps
    guardians: [String], // Trusted Guardian Sync
    status: { type: String, enum: ['ACTIVE', 'COMPLETED', 'DEVIATED'], default: 'ACTIVE' },
    startTime: { type: Date, default: Date.now },
    endTime: Date,
    lastKnownLocation: {
        lat: Number,
        lng: Number
    },
    incidents: [{
        timestamp: { type: Date, default: Date.now },
        deviationDistance: Number,
        coordinates: {
            lat: Number,
            lng: Number
        },
        alertStatus: { type: String, enum: ['SENT', 'ACKNOWLEDGED'], default: 'SENT' }
    }],
    messages: [{
        sender: String, // 'VICTIM' or 'GUARDIAN'
        senderName: String,
        text: String,
        timestamp: { type: Date, default: Date.now }
    }]
});

module.exports = mongoose.model('Trip', TripSchema);
