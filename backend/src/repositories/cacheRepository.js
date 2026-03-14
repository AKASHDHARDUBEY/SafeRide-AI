const redisClient = require('../config/redis');

class CacheRepository {
    async setTripPolyline(tripId, polyline) {
        await redisClient.set(`trip:${tripId}:polyline`, polyline);
    }

    async getTripPolyline(tripId) {
        return await redisClient.get(`trip:${tripId}:polyline`);
    }

    async updateLastLocation(tripId, coords) {
        await redisClient.set(`trip:${tripId}:last_loc`, JSON.stringify(coords));
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
