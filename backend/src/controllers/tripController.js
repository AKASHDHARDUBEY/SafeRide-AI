const tripService = require('../services/tripService');
const deviationService = require('../services/deviationService');
const notifyService = require('../services/notifyService');
const cacheRepo = require('../repositories/cacheRepository');

class TripController {
    async handleStartTrip(socket, data) {
        const { dest, userId } = data;
        const tripId = `TRIP_${Date.now()}`;

        try {
            // 1. Start trip in DB and Cache
            await tripService.createTrip(tripId, userId || 'anonymous', dest);

            socket.emit('tripStarted', { tripId });
            console.log(`🚀 Trip Started: ${tripId}`);
        } catch (err) {
            console.error('❌ Error starting trip:', err.message);
            socket.emit('error', { message: 'Failed to start trip' });
        }
    }

    async handleLocationUpdate(socket, data) {
        const { tripId, latitude, longitude } = data;

        try {
            // 1. Update current location in Redis
            await cacheRepo.updateLastLocation(tripId, { latitude, longitude });

            // 2. Check for deviation
            const result = await deviationService.checkDeviation(tripId, { latitude, longitude });

            if (result.deviated) {
                console.log(`⚠️ DEVIATION DETECTED for ${tripId}! Distance: ${result.distance.toFixed(1)}m`);

                // 3. Send silent alert
                await notifyService.sendSilentAlert(tripId, { latitude, longitude });

                // 4. Log incident in MongoDB
                await tripService.logIncident(tripId, { latitude, longitude }, result.distance);
            }
        } catch (err) {
            console.error('❌ Error processing location update:', err.message);
        }
    }

    async handleEndTrip(socket, data) {
        const { tripId } = data;

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
