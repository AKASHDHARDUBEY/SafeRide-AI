const admin = require('firebase-admin');
const dotenv = require('dotenv');
dotenv.config();

const path = require('path');

// Only initialize if the service account file exists
try {
    const filePath = path.resolve(process.cwd(), process.env.FIREBASE_SERVICE_ACCOUNT_PATH || './firebase-adminsdk.json');
    const serviceAccount = require(filePath);
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
    });
    console.log('✅ Firebase Admin Initialized Successfully!');
} catch (err) {
    console.warn('⚠️ Firebase Admin SDK error:', err.message);
}

module.exports = admin;
