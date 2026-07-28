import io from 'socket.io-client';

class SocketService {
  constructor() {
    this.socket = null;
    this.serverUrl = 'http://10.254.200.153:5001'; // Local backend
    this.activeTripId = null;
  }

  initializeSocket() {
    if (!this.socket) {
      console.log('🔌 Attempting socket connection to:', this.serverUrl);
      this.socket = io(this.serverUrl, {
        timeout: 5000,
        transports: ['websocket', 'polling']
      });

      this.socket.on('connect', () => {
        console.log('✅ Socket connected to backend, id:', this.socket.id);
      });

      this.socket.on('connect_error', (err) => {
        console.log('❌ Socket connection error:', err.message);
      });

      this.socket.on('tripStarted', (data) => {
        console.log('Trip started with ID:', data.tripId);
        this.activeTripId = data.tripId;
      });

      this.socket.on('sosDispatched', (data) => {
        console.log('🚨 SOS Response from server:', JSON.stringify(data));
      });

      this.socket.on('tripEnded', () => {
        console.log('Trip ended');
        this.activeTripId = null;
      });

      this.socket.on('disconnect', () => {
        console.log('Socket disconnected from backend');
      });
    }
  }

  emitLocationUpdate(data) {
    if (this.socket) {
      this.socket.emit('updateLocation', data);
    } else {
      console.warn('Socket not initialized. Cannot send location.');
    }
  }

  startTrip(destination, origin = 'Pune, India') {
    if (this.socket) {
      this.socket.emit('startTrip', { dest: destination, origin });
    }
  }

  endTrip() {
    if (this.socket && this.activeTripId) {
      this.socket.emit('endTrip', { tripId: this.activeTripId });
    }
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }
}

export default new SocketService();
