const Trip = require('../models/Trip');

class TripRepository {
    async createTrip(tripData) {
        const trip = new Trip(tripData);
        return await trip.save();
    }

    async findTripById(tripId) {
        return await Trip.findOne({ tripId });
    }

    async updateTripStatus(tripId, status) {
        return await Trip.findOneAndUpdate(
            { tripId },
            { status, endTime: status === 'COMPLETED' ? new Date() : undefined },
            { new: true }
        );
    }

    async addIncidentLog(tripId, incident) {
        return await Trip.findOneAndUpdate(
            { tripId },
            { 
                status: 'DEVIATED',
                $push: { incidents: incident }
            },
            { new: true }
        );
    }

    async updateLastKnownLocation(tripId, coords) {
        return await Trip.findOneAndUpdate(
            { tripId },
            { lastKnownLocation: coords },
            { new: true }
        );
    }
}

module.exports = new TripRepository();
