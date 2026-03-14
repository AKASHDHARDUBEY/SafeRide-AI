const tripRepo = require('../repositories/tripRepository');
const cacheRepo = require('../repositories/cacheRepository');

class TripService {
    async createTrip(tripId, userId, destination) {
        // 1. Save trip to MongoDB
        const trip = await tripRepo.createTrip({
            tripId,
            userId,
            destination,
            polyline: 'DUMMY_ENCODED_POLYLINE', // Replace with real Google Maps API call
            status: 'ACTIVE'
        });

        // 2. Cache the polyline in Redis for fast access
        await cacheRepo.setTripPolyline(tripId, trip.polyline);

        return trip;
    }

    async endTrip(tripId) {
        // 1. Update status in MongoDB
        await tripRepo.updateTripStatus(tripId, 'COMPLETED');

        // 2. Clear cached data from Redis
        await cacheRepo.clearTripCache(tripId);
    }

    async logIncident(tripId, coords, distance) {
        const incident = {
            timestamp: new Date(),
            deviationDistance: distance,
            coordinates: {
                lat: coords.latitude,
                lng: coords.longitude
            },
            alertStatus: 'SENT'
        };

        await tripRepo.addIncidentLog(tripId, incident);
    }
}

module.exports = new TripService();
