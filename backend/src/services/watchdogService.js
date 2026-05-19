// src/services/watchdogService.js
const tripRepo = require('../repositories/tripRepository');
const cacheRepo = require('../repositories/cacheRepository');
const notifyService = require('./notifyService');

class WatchdogService {
    startWatchdog() {
        console.log('🐕 Watchdog Service Started: Monitoring active trips for signal loss...');
        
        // Run every 30 seconds
        setInterval(async () => {
            try {
                // 1. Get all active trips from DB
                const activeTrips = await tripRepo.findActiveTrips();
                
                for (let trip of activeTrips) {
                    const tripId = trip.tripId;
                    
                    // 2. Check if last_loc exists in Redis
                    const lastLoc = await cacheRepo.getLastLocation(tripId);
                    
                    if (!lastLoc) {
                        // 3. If no location found in Redis, it means 60 seconds passed without update
                        console.log(`⚠️ SIGNAL LOST DETECTED FOR TRIP: ${tripId}! No updates for 60 seconds.`);
                        
                        // Send alert
                        const coords = trip.lastKnownLocation || { latitude: 0, longitude: 0 };
                        await notifyService.sendSilentAlert(tripId, coords);
                        
                        // Log incident in DB to prevent infinite alerting and mark trip as DEVIATED
                        await tripRepo.addIncidentLog(tripId, {
                            timestamp: new Date(),
                            deviationDistance: -1, // -1 indicates signal loss
                            coordinates: { lat: coords.latitude, lng: coords.longitude },
                            alertStatus: 'SENT'
                        });
                        
                    }
                }
            } catch (err) {
                console.error('❌ Watchdog error:', err.message);
            }
        }, 30000); // Check every 30 seconds
    }
}

module.exports = new WatchdogService();
