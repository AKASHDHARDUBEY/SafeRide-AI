const mongoose = require('mongoose');

const TripSchema = new mongoose.Schema({
    tripId: { type: String, required: true, unique: true },
    userId: { type: String, required: true },
    destination: String,
    polyline: String, // Encoded polyline from Google Maps
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
    }]
});

module.exports = mongoose.model('Trip', TripSchema);
