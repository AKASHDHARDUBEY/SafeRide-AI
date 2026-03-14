/**
 * Haversine Formula - Calculates distance between two GPS coordinates
 * Returns distance in meters
 */
function haversineDistance(coord1, coord2) {
    const toRad = (value) => (value * Math.PI) / 180;
    const R = 6371000; // Earth's radius in meters

    const dLat = toRad(coord2.latitude - coord1.latitude);
    const dLng = toRad(coord2.longitude - coord1.longitude);

    const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(toRad(coord1.latitude)) *
        Math.cos(toRad(coord2.latitude)) *
        Math.sin(dLng / 2) * Math.sin(dLng / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
}

/**
 * Decodes an encoded Google Maps polyline string into an array of lat/lng points
 * @param {string} encoded - The encoded polyline string
 * @returns {Array<{latitude: number, longitude: number}>}
 */
function decodePolyline(encoded) {
    const points = [];
    let index = 0, lat = 0, lng = 0;

    while (index < encoded.length) {
        let b, shift = 0, result = 0;

        do {
            b = encoded.charCodeAt(index++) - 63;
            result |= (b & 0x1f) << shift;
            shift += 5;
        } while (b >= 0x20);

        const dlat = (result & 1) ? ~(result >> 1) : (result >> 1);
        lat += dlat;

        shift = 0;
        result = 0;

        do {
            b = encoded.charCodeAt(index++) - 63;
            result |= (b & 0x1f) << shift;
            shift += 5;
        } while (b >= 0x20);

        const dlng = (result & 1) ? ~(result >> 1) : (result >> 1);
        lng += dlng;

        points.push({
            latitude: lat / 1e5,
            longitude: lng / 1e5
        });
    }

    return points;
}

/**
 * Finds the minimum distance from a point to any segment on a polyline
 * @param {Object} point - {latitude, longitude}
 * @param {Array} polylinePoints - Array of {latitude, longitude}
 * @returns {number} distance in meters
 */
function minDistanceToPolyline(point, polylinePoints) {
    let minDist = Infinity;

    for (let i = 0; i < polylinePoints.length; i++) {
        const dist = haversineDistance(point, polylinePoints[i]);
        if (dist < minDist) {
            minDist = dist;
        }
    }

    return minDist;
}

module.exports = {
    haversineDistance,
    decodePolyline,
    minDistanceToPolyline
};
