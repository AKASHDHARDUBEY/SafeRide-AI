const tripRepo = require('../repositories/tripRepository');
const cacheRepo = require('../repositories/cacheRepository');
const { Client } = require("@googlemaps/google-maps-services-js");

const googleMapsClient = new Client({});

class TripService {
    async createTrip(tripId, userId, destination, origin = 'Pune, India') {
        let encodedPolyline = 'DUMMY_ENCODED_POLYLINE';

        try {
            if (process.env.GOOGLE_MAPS_KEY) {
                const response = await googleMapsClient.directions({
                    params: {
                        origin: origin,
                        destination: destination,
                        key: process.env.GOOGLE_MAPS_KEY
                    }
                });

                if (response.data.routes && response.data.routes.length > 0) {
                    encodedPolyline = response.data.routes[0].overview_polyline.points;
                    console.log(`🗺️ Fetched Real Polyline for ${tripId}`);
                }
            } else {
                console.warn('⚠️ GOOGLE_MAPS_KEY is missing. Using dummy polyline.');
            }
        } catch (error) {
            console.error('❌ Error fetching Google Maps polyline:', error.message);
        }

        // 1. Save trip to MongoDB
        const trip = await tripRepo.createTrip({
            tripId,
            userId,
            destination,
            polyline: encodedPolyline,
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
