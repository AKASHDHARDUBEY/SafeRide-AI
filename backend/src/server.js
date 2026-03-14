const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const dotenv = require('dotenv');
dotenv.config();

const connectDB = require('./config/db');
const tripController = require('./controllers/tripController');

const app = express();
app.use(cors());
app.use(express.json());

// Health check endpoint
app.get('/', (req, res) => {
    res.json({ status: 'ok', message: '🚀 Safety Backend is running' });
});

const server = http.createServer(app);
const io = new Server(server, {
    cors: { origin: "*" }
});

// Connect Database
connectDB();

// Socket.io Logic
io.on('connection', (socket) => {
    console.log('📱 Device Connected:', socket.id);

    socket.on('startTrip', (data) => tripController.handleStartTrip(socket, data));
    socket.on('updateLocation', (data) => tripController.handleLocationUpdate(socket, data));
    socket.on('endTrip', (data) => tripController.handleEndTrip(socket, data));

    socket.on('disconnect', () => {
        console.log('📱 Device Disconnected:', socket.id);
    });
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
});
