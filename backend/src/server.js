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
    const { userId, userName, latitude, longitude, emergencyPhone, guardianFcmToken, tripId } = req.body;
    console.log(`🚨 HTTP REST EMERGENCY SOS RECEIVED FROM: ${userName || userId}`);
    
    const userData = { name: userName || 'SafeRide User' };
    const guardianData = { phone: emergencyPhone, fcmToken: guardianFcmToken };
    const coords = { latitude, longitude };

    const results = await notifyService.dispatchEmergencyAlert(userData, guardianData, coords);

    // Save emergency SOS message to MongoDB Chat History & broadcast!
    const tripRepo = require('./repositories/tripRepository');
    const roomTarget = tripId || 'EMERGENCY_ROOM';
    const mapsLink = `https://maps.google.com/?q=${latitude},${longitude}`;
    const sosChatMessage = {
        sender: 'SYSTEM',
        senderName: '🚨 SYSTEM ALERT',
        text: `🚨 EMERGENCY SOS! ${userName || userId} is in danger! Track live location: ${mapsLink}`,
        timestamp: new Date()
    };
    await tripRepo.saveChatMessage(roomTarget, sosChatMessage).catch(() => {});
    io.to(roomTarget).emit('receiveEmergencyMessage', sosChatMessage);

    res.json({ status: 'SUCCESS', message: 'SOS Dispatched via REST', results });
});

// REST Endpoint to fetch Chat History for a trip
app.get('/api/chat/:tripId', async (req, res) => {
    const tripRepo = require('./repositories/tripRepository');
    try {
        const messages = await tripRepo.getChatMessages(req.params.tripId);
        res.json({ status: 'SUCCESS', messages });
    } catch (err) {
        res.status(500).json({ status: 'ERROR', message: err.message });
    }
});

// 💳 Razorpay Payment Routes
const paymentController = require('./controllers/paymentController');
app.post('/api/payment/create-order', (req, res) => paymentController.createOrder(req, res));
app.post('/api/payment/verify-payment', (req, res) => paymentController.verifyPayment(req, res));
app.get('/api/payment/status/:userId', (req, res) => paymentController.checkPremiumStatus(req, res));

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
    socket.on('triggerSOS', (data) => tripController.handleEmergencySOS(socket, data, io));

    // 💬 Emergency Room Socket Events
    socket.on('joinEmergencyRoom', ({ tripId }) => {
        socket.join(tripId);
        console.log(`📡 Socket ${socket.id} joined Emergency Room: ${tripId}`);
    });

    socket.on('sendEmergencyMessage', (data) => {
        tripController.handleChatMessage(io, data);
    });

    socket.on('getChatHistory', (data) => {
        tripController.handleGetChatHistory(socket, data);
    });

    socket.on('disconnect', () => {
        console.log('📱 Device Disconnected:', socket.id);
    });
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
});
