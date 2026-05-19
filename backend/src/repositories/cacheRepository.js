const redisClient = require('../config/redis');

class CacheRepository {
    async setTripPolyline(tripId, polyline) {
        await redisClient.set(`trip:${tripId}:polyline`, polyline);
    }

    async getTripPolyline(tripId) {
        return await redisClient.get(`trip:${tripId}:polyline`);
    }

    async updateLastLocation(tripId, coords) {
        const key = `trip:${tripId}:last_loc`;
        await redisClient.set(key, JSON.stringify(coords));
        // Expire key in 60 seconds. If not updated by then, signal is lost.
        await redisClient.expire(key, 60);
    }

    async getLastLocation(tripId) {
        const loc = await redisClient.get(`trip:${tripId}:last_loc`);
        return loc ? JSON.parse(loc) : null;
    }

    async clearTripCache(tripId) {
        await redisClient.del(`trip:${tripId}:polyline`);
        await redisClient.del(`trip:${tripId}:last_loc`);
    }
}

module.exports = new CacheRepository();
