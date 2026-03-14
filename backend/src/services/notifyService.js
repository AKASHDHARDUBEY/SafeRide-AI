const admin = require('../config/firebase');

class NotifyService {
    async sendSilentAlert(tripId, coords) {
        const message = {
            data: {
                title: '🚨 SAFETY ALERT',
                body: `Emergency! User has deviated from route. Location: ${coords.latitude}, ${coords.longitude}`,
                tripId: tripId,
                latitude: String(coords.latitude),
                longitude: String(coords.longitude),
                priority: 'high'
            },
            topic: 'emergency_contacts' // Or a specific device token
        };

        try {
            if (admin.apps && admin.apps.length > 0) {
                await admin.messaging().send(message);
                console.log('🔔 Silent Dispatch Sent to Authorities');
            } else {
                console.log('🔔 [MOCK] Silent Dispatch would be sent:', JSON.stringify(message.data));
            }
        } catch (err) {
            console.error('❌ Notification Error:', err.message);
        }
    }
}

module.exports = new NotifyService();
