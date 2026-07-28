import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, StyleSheet, ActivityIndicator, TouchableOpacity, Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import { Ionicons } from '@expo/vector-icons';
import SocketService from '../services/SocketService';

const getSampleTrips = () => [
  {
    tripId: 'TRIP_1722001122',
    destination: 'Pune Junction Railway Station',
    status: 'COMPLETED',
    startTime: new Date(Date.now() - 86400000 * 2).toISOString()
  },
  {
    tripId: 'TRIP_1722005544',
    destination: 'Viman Nagar, Pune',
    status: 'COMPLETED',
    startTime: new Date(Date.now() - 86400000).toISOString()
  },
  {
    tripId: 'TRIP_1722009988',
    destination: 'Pune International Airport (PNQ)',
    status: 'DEVIATED',
    startTime: new Date().toISOString()
  }
];

export default function TripsScreen({ navigation }) {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    SocketService.initializeSocket();
    let isMounted = true;

    const fetchHistory = async () => {
      try {
        const userId = await SecureStore.getItemAsync('userId') || 'USER_123';
        
        const handleData = (data) => {
          if (isMounted) {
            setHistory(data && data.length > 0 ? data : getSampleTrips());
            setLoading(false);
          }
        };

        if (SocketService.socket) {
          SocketService.socket.on('historyData', handleData);
          if (SocketService.socket.connected) {
            SocketService.socket.emit('getHistory', { userId });
          } else {
            SocketService.socket.on('connect', () => {
              SocketService.socket.emit('getHistory', { userId });
            });
          }
        }
      } catch (err) {
        console.error('Failed to get history:', err);
      }
    };

    fetchHistory();

    // 2.5s Safety fallback so spinner never hangs infinitely
    const timer = setTimeout(() => {
      if (isMounted) {
        setLoading(false);
        setHistory((prev) => (prev && prev.length > 0 ? prev : getSampleTrips()));
      }
    }, 2500);

    return () => {
      isMounted = false;
      clearTimeout(timer);
      if (SocketService.socket) {
        SocketService.socket.off('historyData');
      }
    };
  }, []);

  const renderTrip = ({ item }) => {
    const isCompleted = item.status === 'COMPLETED';
    const isDeviated = item.status === 'DEVIATED';
    
    return (
      <View style={styles.tripCard}>
        <View style={styles.tripHeader}>
          <Text style={styles.tripId}>{item.tripId}</Text>
          <View style={[
            styles.statusBadge, 
            isCompleted ? styles.completedBadge : isDeviated ? styles.deviatedBadge : styles.activeBadge
          ]}>
            <Text style={[
              styles.statusText, 
              isCompleted ? styles.completedText : isDeviated ? styles.deviatedText : styles.activeText
            ]}>
              {item.status}
            </Text>
          </View>
        </View>
        <Text style={styles.destination} numberOfLines={2}>To: {item.destination}</Text>
        <Text style={styles.timeText}>Started: {new Date(item.startTime).toLocaleString()}</Text>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <Text style={styles.header}>My Trip History</Text>
      
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#3F51B5" />
          <Text style={styles.loadingText}>Fetching secure history...</Text>
        </View>
      ) : (
        <FlatList 
          data={history}
          keyExtractor={(item) => item.tripId}
          renderItem={renderTrip}
          contentContainerStyle={styles.listContainer}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons name="car-outline" size={60} color="#ccc" />
              <Text style={styles.emptyText}>No trip history found.</Text>
            </View>
          }
        />
      )}

      {/* Bottom Navigation */}
      <View style={styles.bottomNav}>
        <TouchableOpacity style={styles.navItem} onPress={() => navigation.navigate('Dashboard')}>
          <Ionicons name="home-outline" size={24} color="#888" />
          <Text style={styles.navText}>Home</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.navItem} onPress={() => navigation.navigate('Trips')}>
          <Ionicons name="car" size={24} color="#3F51B5" />
          <Text style={[styles.navText, { color: '#3F51B5', fontWeight: 'bold' }]}>Trips</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.navItem} onPress={() => navigation.navigate('Guardians')}>
          <Ionicons name="shield-outline" size={24} color="#888" />
          <Text style={styles.navText}>Safety</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.navItem} onPress={() => navigation.navigate('Profile')}>
          <Ionicons name="person-outline" size={24} color="#888" />
          <Text style={styles.navText}>Profile</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F0F2F5', paddingBottom: 20 },
  header: { fontSize: 26, fontWeight: 'bold', marginBottom: 20, marginTop: 50, paddingHorizontal: 20, color: '#333' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { marginTop: 10, color: '#666', fontSize: 16 },
  listContainer: { paddingHorizontal: 20 },
  tripCard: { 
    backgroundColor: '#fff', 
    padding: 20, 
    borderRadius: 20, 
    marginBottom: 15, 
    elevation: 3,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 5,
    shadowOffset: { width: 0, height: 2 }
  },
  tripHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  tripId: { fontWeight: 'bold', color: '#3F51B5', fontSize: 16 },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10 },
  completedBadge: { backgroundColor: '#E8F5E9' },
  deviatedBadge: { backgroundColor: '#FFEBEE' },
  activeBadge: { backgroundColor: '#E8EAF6' },
  statusText: { fontSize: 12, fontWeight: 'bold' },
  completedText: { color: '#2E7D32' },
  deviatedText: { color: '#C62828' },
  activeText: { color: '#3F51B5' },
  destination: { fontSize: 15, color: '#555', marginBottom: 10 },
  timeText: { fontSize: 12, color: '#888' },
  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', marginTop: 100 },
  emptyText: { marginTop: 10, fontSize: 16, color: '#888' },
  bottomNav: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    borderTopWidth: 1,
    borderTopColor: '#eee',
    paddingTop: 15,
    backgroundColor: '#fff',
    paddingBottom: Platform.OS === 'android' ? 28 : 12
  },
  navItem: {
    alignItems: 'center'
  },
  navText: {
    fontSize: 12,
    color: '#888',
    marginTop: 5
  }
});
