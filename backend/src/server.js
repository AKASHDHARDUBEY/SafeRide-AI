const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const dotenv = require('dotenv');
dotenv.config();

const connectDB = require('./config/db');
const tripController = require('./controllers/tripController');
const watchdogService = require('./services/watchdogService');

const app = express();
app.use(cors());
app.use(express.json());

// Health check endpoint
app.get('/', (req, res) => {
    res.json({ status: 'ok', message: '🚀 Safety Backend is running' });
});

// REST Endpoint for Emergency SOS (Fallback)
const notifyService = require('./services/notifyService');
app.post('/api/sos', async (req, res) => {
    const { userId, userName, latitude, longitude, emergencyPhone, guardianFcmToken } = req.body;
    console.log(`🚨 HTTP REST EMERGENCY SOS RECEIVED FROM: ${userName || userId}`);
    
    const userData = { name: userName || 'SafeRide User' };
    const guardianData = { phone: emergencyPhone, fcmToken: guardianFcmToken };
    const coords = { latitude, longitude };

    const results = await notifyService.dispatchEmergencyAlert(userData, guardianData, coords);
    res.json({ status: 'SUCCESS', message: 'SOS Dispatched via REST', results });
});

const server = http.createServer(app);
const io = new Server(server, {
    cors: { origin: "*" }
});

// Connect Database
connectDB();

// Start Watchdog Service
watchdogService.startWatchdog();

// Socket.io Logic
io.on('connection', (socket) => {
    console.log('📱 Device Connected:', socket.id);

    socket.on('startTrip', (data) => tripController.handleStartTrip(socket, data));
    socket.on('updateLocation', (data) => tripController.handleLocationUpdate(socket, data));
    socket.on('endTrip', (data) => tripController.handleEndTrip(socket, data));
    socket.on('getHistory', (data) => tripController.getTripHistory(socket, data));
    socket.on('triggerSOS', (data) => tripController.handleEmergencySOS(socket, data));

    // 💬 Emergency Room Socket Events
    socket.on('joinEmergencyRoom', ({ tripId }) => {
        socket.join(tripId);
        console.log(`📡 Socket ${socket.id} joined Emergency Room: ${tripId}`);
    });

    socket.on('sendEmergencyMessage', (data) => {
        tripController.handleChatMessage(io, data);
    });

    socket.on('disconnect', () => {
        console.log('📱 Device Disconnected:', socket.id);
    });
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
});
