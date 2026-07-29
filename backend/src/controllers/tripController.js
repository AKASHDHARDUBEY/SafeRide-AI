// src/controllers/tripController.js
const tripService = require('../services/tripService');
const deviationService = require('../services/deviationService');
const notifyService = require('../services/notifyService');
const cacheRepo = require('../repositories/cacheRepository');
const tripRepo = require('../repositories/tripRepository');

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

        const { dest, origin, userId, guardians } = data;
        const tripId = `TRIP_${Date.now()}`;

        try {
            await tripService.createTrip(tripId, userId || 'anonymous', dest, origin, guardians);
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
                const trip = await tripRepo.findTripById(tripId);
                await notifyService.sendSilentAlert(tripId, { latitude, longitude }, trip?.guardians || []);
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

    async getTripHistory(socket, data) {
        const { userId } = data;
        if (!userId) {
            return socket.emit('error', { message: 'userId is required' });
        }
        try {
            const trips = await tripRepo.findTripsByUser(userId);
            socket.emit('historyData', trips);
        } catch (err) {
            console.error("Error fetching history:", err.message);
            socket.emit('error', { message: 'Failed to fetch history' });
        }
    }

    async handleEmergencySOS(socket, data, io) {
        const { userId, userName, latitude, longitude, emergencyPhone, guardianFcmToken, tripId } = data;

        console.log(`Emergency SOS received from: ${userName || userId}`);

        const userData = { name: userName || 'SafeRide User' };
        const guardianData = { 
            phone: emergencyPhone, 
            fcmToken: guardianFcmToken 
        };
        const coords = { latitude, longitude };

        const results = await notifyService.dispatchEmergencyAlert(userData, guardianData, coords);

        socket.emit('sosDispatched', { 
            status: 'SUCCESS', 
            message: 'Emergency SMS and App Alert sent to guardians',
            results 
        });

        const roomTarget = tripId || 'TRIP_123';
        const mapsLink = `https://maps.google.com/?q=${latitude},${longitude}`;
        const sosChatMessage = {
            sender: 'SYSTEM',
            senderName: 'SYSTEM ALERT',
            text: `EMERGENCY SOS: ${userName || userId} is in danger! Track live location: ${mapsLink}`,
            timestamp: new Date()
        };

        if (io) {
            io.to(roomTarget).emit('receiveEmergencyMessage', sosChatMessage);
        } else {
            socket.emit('receiveEmergencyMessage', sosChatMessage);
        }
        await tripRepo.saveChatMessage(roomTarget, sosChatMessage).catch(() => {});
    }

    async handleChatMessage(io, data) {
        const { tripId, sender, senderName, text } = data;

        const messageData = {
            sender,
            senderName,
            text,
            timestamp: new Date()
        };

        try {
            await tripRepo.saveChatMessage(tripId, messageData);
            io.to(tripId).emit('receiveEmergencyMessage', messageData);
            console.log(`Message in room ${tripId} from [${senderName}]: ${text}`);
        } catch (err) {
            console.error('Error saving chat message:', err.message);
        }
    }

    async handleGetChatHistory(socket, data) {
        const { tripId } = data;
        if (!tripId) return;
        try {
            const messages = await tripRepo.getChatMessages(tripId);
            socket.emit('chatHistoryData', messages);
        } catch (err) {
            console.error('Error fetching chat history:', err.message);
        }
    }
}

module.exports = new TripController();
