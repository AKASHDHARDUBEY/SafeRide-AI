const geolib = require('geolib');
const cacheRepo = require('../repositories/cacheRepository');
const { decodePolyline, minDistanceToPolyline } = require('../utils/geoUtils');

const DEVIATION_THRESHOLD = 200; // meters

class DeviationService {
    async checkDeviation(tripId, currentCoords) {
        const encodedPolyline = await cacheRepo.getTripPolyline(tripId);
        if (!encodedPolyline) {
            console.warn(`⚠️ No polyline found in cache for trip: ${tripId}`);
            return { deviated: false, distance: 0 };
        }

        // Decode the polyline into an array of lat/lng points
        const routePoints = decodePolyline(encodedPolyline);

        // Calculate the minimum distance from current position to the route
        const distance = minDistanceToPolyline(
            { latitude: currentCoords.latitude, longitude: currentCoords.longitude },
            routePoints
        );

        console.log(`📍 Distance from route: ${distance.toFixed(1)} meters`);

        if (distance > DEVIATION_THRESHOLD) {
            return { deviated: true, distance };
        }
        return { deviated: false, distance };
    }
}

module.exports = new DeviationService();
