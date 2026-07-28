const axios = require('axios');
const admin = require('../config/firebase');

class NotifyService {

  // 1️⃣ Fast2SMS SMS Sender
  async sendEmergencySMS(phoneNumber, userName, latitude, longitude) {
    const cleanPhone = String(phoneNumber || '').replace(/[^0-9]/g, '').slice(-10);
    if (!cleanPhone || cleanPhone.length !== 10) {
      console.error('❌ Fast2SMS Error: Invalid phone number format:', phoneNumber);
      return { success: false, error: 'Invalid 10-digit phone number' };
    }

    const mapsLink = `https://maps.google.com/?q=${latitude},${longitude}`;
    const messageText = `🚨 EMERGENCY SOS! ${userName} is in danger! Track live location: ${mapsLink}`;

    try {
      const response = await axios.post(
        'https://www.fast2sms.com/dev/bulkV2',
        {
          route: 'q',          // Quick SMS route (No DLT registration needed for dev testing)
          message: messageText,
          language: 'english',
          flash: 0,
          numbers: cleanPhone  // 10-digit phone number (e.g., '9876543210')
        },
        {
          headers: {
            authorization: process.env.FAST2SMS_API_KEY,
            'Content-Type': 'application/json'
          }
        }
      );

      console.log('📱 Fast2SMS Emergency SMS Sent:', response.data);
      return { success: true, data: response.data };
    } catch (err) {
      console.error('❌ Fast2SMS Error:', err.response ? err.response.data : err.message);
      return { success: false, error: err.message };
    }
  }

  // 2️⃣ Firebase FCM Push Notification Sender
  async sendFCMPushNotification(targetToken, userName, latitude, longitude) {
    const mapsLink = `https://maps.google.com/?q=${latitude},${longitude}`;

    const message = {
      notification: {
        title: '🚨 EMERGENCY SOS ALERT!',
        body: `${userName} is in danger! Tap to view live location.`
      },
      data: {
        latitude: String(latitude),
        longitude: String(longitude),
        mapsLink: mapsLink,
        type: 'EMERGENCY'
      }
    };

    if (targetToken && targetToken.trim().length > 0) {
      message.token = targetToken;
    } else {
      message.topic = 'emergency_contacts';
    }

    try {
      if (admin.apps && admin.apps.length > 0) {
        const response = await admin.messaging().send(message);
        console.log('🔔 FCM Push Notification Sent via Firebase Admin SDK:', response);
        return { success: true, response };
      } else {
        console.log('🔔 [MOCK FCM] Push Notification triggered for:', message);
        return { success: true, mock: true };
      }
    } catch (err) {
      console.error('❌ FCM Notification Error:', err.message);
      return { success: false, error: err.message };
    }
  }

  // 3️⃣ Master Alert Dispatcher (used by SOS and deviation alerts)
  async dispatchEmergencyAlert(userData, guardianData, coords) {
    const { name } = userData;
    const { phone, fcmToken } = guardianData;
    const { latitude, longitude } = coords;

    const results = { sms: null, fcm: null };

    // Send SMS via Fast2SMS (Only if ENABLE_REAL_SMS === 'true' to save credit)
    if (phone && process.env.FAST2SMS_API_KEY && process.env.ENABLE_REAL_SMS === 'true') {
      results.sms = await this.sendEmergencySMS(phone, name, latitude, longitude);
    } else if (phone) {
      console.log(`📱 [PAUSED SMS TO SAVE CREDIT] Fast2SMS bypassed for ${phone}. Set ENABLE_REAL_SMS=true in backend/.env to re-enable.`);
      results.sms = { success: true, pausedToSaveCredit: true };
    }

    // Always send App Notification via Firebase FCM Push Notification
    results.fcm = await this.sendFCMPushNotification(fcmToken, name, latitude, longitude);

    return results;
  }

  // 4️⃣ Legacy: Deviation alert (called from handleLocationUpdate)
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
      topic: 'emergency_contacts'
    };

    try {
      if (guardians && guardians.length > 0) {
        guardians.forEach(guardian => {
          console.log(`🔔 [SMS/Push] Sending personalized alert to Guardian: ${guardian}`);
        });

        // If Fast2SMS is configured, send SMS to guardians with phone numbers
        if (process.env.FAST2SMS_API_KEY) {
          for (const guardian of guardians) {
            // Guardian could be a phone number or name
            const phoneMatch = guardian.match(/\d{10}/);
            if (phoneMatch) {
              await this.sendEmergencySMS(phoneMatch[0], 'SafeRide User', coords.latitude, coords.longitude);
            }
          }
        }
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
