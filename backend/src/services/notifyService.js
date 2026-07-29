const axios = require('axios');
const admin = require('../config/firebase');

class NotifyService {

  async sendEmergencySMS(phoneNumber, userName, latitude, longitude) {
    const cleanPhone = String(phoneNumber || '').replace(/[^0-9]/g, '').slice(-10);
    if (!cleanPhone || cleanPhone.length !== 10) {
      console.error('Fast2SMS Error: Invalid phone number format:', phoneNumber);
      return { success: false, error: 'Invalid 10-digit phone number' };
    }

    const mapsLink = `https://maps.google.com/?q=${latitude},${longitude}`;
    const messageText = `EMERGENCY SOS: ${userName} is in danger! Live location: ${mapsLink}`;

    try {
      const response = await axios.post(
        'https://www.fast2sms.com/dev/bulkV2',
        {
          route: 'q',
          message: messageText,
          language: 'english',
          flash: 0,
          numbers: cleanPhone
        },
        {
          headers: {
            authorization: process.env.FAST2SMS_API_KEY,
            'Content-Type': 'application/json'
          }
        }
      );

      console.log('Fast2SMS Emergency SMS Sent:', response.data);
      return { success: true, data: response.data };
    } catch (err) {
      console.error('Fast2SMS Error:', err.response ? err.response.data : err.message);
      return { success: false, error: err.message };
    }
  }

  async sendFCMPushNotification(targetToken, userName, latitude, longitude) {
    const mapsLink = `https://maps.google.com/?q=${latitude},${longitude}`;

    const message = {
      notification: {
        title: 'EMERGENCY SOS ALERT',
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
        console.log('FCM Push Notification Sent via Firebase Admin SDK:', response);
        return { success: true, response };
      } else {
        console.log('Mock FCM Push Notification triggered for:', message);
        return { success: true, mock: true };
      }
    } catch (err) {
      console.error('FCM Notification Error:', err.message);
      return { success: false, error: err.message };
    }
  }

  async dispatchEmergencyAlert(userData, guardianData, coords) {
    const { name } = userData;
    const { phone, fcmToken } = guardianData;
    const { latitude, longitude } = coords;

    const results = { sms: null, fcm: null };

    if (phone && process.env.FAST2SMS_API_KEY && process.env.ENABLE_REAL_SMS === 'true') {
      results.sms = await this.sendEmergencySMS(phone, name, latitude, longitude);
    } else if (phone) {
      console.log(`Fast2SMS bypassed for ${phone}. Set ENABLE_REAL_SMS=true to re-enable.`);
      results.sms = { success: true, pausedToSaveCredit: true };
    }

    results.fcm = await this.sendFCMPushNotification(fcmToken, name, latitude, longitude);

    return results;
  }

  async sendSilentAlert(tripId, coords, guardians = []) {
    const message = {
      data: {
        title: 'SAFETY ALERT',
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
          console.log(`Sending alert to Guardian: ${guardian}`);
        });

        if (process.env.FAST2SMS_API_KEY) {
          for (const guardian of guardians) {
            const phoneMatch = guardian.match(/\d{10}/);
            if (phoneMatch) {
              await this.sendEmergencySMS(phoneMatch[0], 'SafeRide User', coords.latitude, coords.longitude);
            }
          }
        }
      }

      if (admin.apps && admin.apps.length > 0) {
        await admin.messaging().send(message);
        console.log('Silent Dispatch Sent to Topic');
      } else {
        console.log('Mock Silent Dispatch sent to topic:', JSON.stringify(message.data));
      }
    } catch (err) {
      console.error('Notification Error:', err.message);
    }
  }
}

module.exports = new NotifyService();
