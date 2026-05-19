// src/controllers/tripController.js
const tripService = require('../services/tripService');
const deviationService = require('../services/deviationService');
const notifyService = require('../services/notifyService');
const cacheRepo = require('../repositories/cacheRepository');

class TripController {

    validateLocationData(data) {
        if (!data.tripId || !data.latitude || !data.longitude) {
            throw new Error("Missing required location fields: tripId, latitude, or longitude");
        }
        if (typeof data.latitude !== 'number' || typeof data.longitude !== 'number') {
            throw new Error("Invalid coordinate format: Latitude and Longitude must be numbers");
        }
        return true;
    }

    async handleStartTrip(socket, data) {
        if (!data.dest) {
            return socket.emit('error', { message: 'Destination is required' });
        }

        const { dest, userId } = data;
        const tripId = `TRIP_${Date.now()}`;

        try {
            await tripService.createTrip(tripId, userId || 'anonymous', dest);
            socket.emit('tripStarted', { tripId });
            console.log(`🚀 Trip Started: ${tripId}`);
        } catch (err) {
            console.error('❌ Error starting trip:', err.message);
            socket.emit('error', { message: 'Failed to start trip' });
        }
    }

    async handleLocationUpdate(socket, data) {
        try {
            this.validateLocationData(data);

            const { tripId, latitude, longitude } = data;
            console.log(`📍 Received Update [${tripId}]: Lat ${latitude.toFixed(4)}, Lng ${longitude.toFixed(4)}`);
            
            await cacheRepo.updateLastLocation(tripId, { latitude, longitude });
            const result = await deviationService.checkDeviation(tripId, { latitude, longitude });

            if (result.deviated) {
                console.log(`⚠️ DEVIATION DETECTED for ${tripId}!`);
                await notifyService.sendSilentAlert(tripId, { latitude, longitude });
                await tripService.logIncident(tripId, { latitude, longitude }, result.distance);
            }
        } catch (err) {
            console.error('❌ Validation/Processing Error:', err.message);
            socket.emit('error', { message: err.message });
        }
    }

    async handleEndTrip(socket, data) {
        const { tripId } = data;
        if (!tripId) return socket.emit('error', { message: 'tripId is required' });

        try {
            await tripService.endTrip(tripId);
            socket.emit('tripEnded', { tripId });
            console.log(`🏁 Trip Ended: ${tripId}`);
        } catch (err) {
            console.error('❌ Error ending trip:', err.message);
        }
    }
}

module.exports = new TripController();
