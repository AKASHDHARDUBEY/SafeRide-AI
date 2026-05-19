const BaseRepository = require('./BaseRepository');
const Trip = require('../models/Trip');

class TripRepository extends BaseRepository {
    constructor() {
        super(Trip);
    }

    async createTrip(tripData) {
        const trip = new Trip(tripData);
        return await trip.save();
    }

    async findTripById(tripId) {
        return await Trip.findOne({ tripId });
    }

    async findActiveTrips() {
        return await Trip.find({ status: 'ACTIVE' });
    }

    async updateTripStatus(tripId, status) {
        return await Trip.findOneAndUpdate(
            { tripId },
            { status, endTime: status === 'COMPLETED' ? new Date() : undefined },
            { returnDocument: 'after' }
        );
    }

    async addIncidentLog(tripId, incident) {
        return await Trip.findOneAndUpdate(
            { tripId },
            {
                status: 'DEVIATED',
                $push: { incidents: incident }
            },
            { returnDocument: 'after' }
        );
    }

    async updateLastKnownLocation(tripId, coords) {
        return await Trip.findOneAndUpdate(
            { tripId },
            { lastKnownLocation: coords },
            { returnDocument: 'after' }
        );
    }
}

module.exports = new TripRepository();
