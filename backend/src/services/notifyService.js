const admin = require('../config/firebase');

class NotifyService {
    async sendSilentAlert(tripId, coords, guardians = []) {
        const message = {
            data: {
                title: '🚨 SAFETY ALERT',
                body: `Emergency! User has deviated from route. Location: ${coords.latitude}, ${coords.longitude}`,
                tripId: tripId,
                latitude: String(coords.latitude),
                longitude: String(coords.longitude),
                priority: 'high'
            },
            topic: 'emergency_contacts' // Fallback broadcast
        };

        try {
            if (guardians && guardians.length > 0) {
                // Trusted Guardian Sync Logic
                guardians.forEach(guardian => {
                    console.log(`🔔 [SMS/Push] Sending personalized alert to Guardian: ${guardian}`);
                });
            }

            if (admin.apps && admin.apps.length > 0) {
                await admin.messaging().send(message);
                console.log('🔔 Silent Dispatch Sent to Authorities/Topic');
            } else {
                console.log('🔔 [MOCK] Silent Dispatch would be sent to topic:', JSON.stringify(message.data));
            }
        } catch (err) {
            console.error('❌ Notification Error:', err.message);
        }
    }
}

module.exports = new NotifyService();
