const admin = require('firebase-admin');
const dotenv = require('dotenv');
dotenv.config();

// Only initialize if the service account file exists
try {
    const serviceAccount = require(process.env.FIREBASE_SERVICE_ACCOUNT_PATH);
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
    });
    console.log('✅ Firebase Admin Initialized');
} catch (err) {
    console.warn('⚠️ Firebase Admin SDK not configured. Notifications will be disabled.');
}

module.exports = admin;
