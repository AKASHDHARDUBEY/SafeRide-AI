import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import * as Location from 'expo-location';
import SocketService from '../services/SocketService';
import { LOCATION_TASK_NAME } from '../tasks/LocationTask';

export default function TripScreen() {
  const [destination, setDestination] = useState('');
  const [isTracking, setIsTracking] = useState(false);
  const [location, setLocation] = useState(null);
  const [locationSubscription, setLocationSubscription] = useState(null);

  // Use refs for cleanup inside useEffect with [] dependency
  const isTrackingRef = React.useRef(isTracking);
  const locationSubRef = React.useRef(locationSubscription);

  useEffect(() => {
    isTrackingRef.current = isTracking;
    locationSubRef.current = locationSubscription;
  }, [isTracking, locationSubscription]);

  useEffect(() => {
    (async () => {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission to access location was denied');
        return;
      }

      let currentLocation = await Location.getCurrentPositionAsync({});
      setLocation({
        latitude: currentLocation.coords.latitude,
        longitude: currentLocation.coords.longitude,
        latitudeDelta: 0.0922,
        longitudeDelta: 0.0421,
      });
    })();

    SocketService.initializeSocket();

    return () => {
      if (isTrackingRef.current) {
        Location.stopLocationUpdatesAsync(LOCATION_TASK_NAME).catch(() => {});
        if (locationSubRef.current) {
          locationSubRef.current.remove();
        }
      }
      SocketService.disconnect();
    };
  }, []);

  const handleStartTrip = async () => {
    if (!destination) {
      Alert.alert('Destination required', 'Please enter your destination to start the trip.');
      return;
    }

    // 1. Request Foreground Permission
    const { status: fgStatus } = await Location.requestForegroundPermissionsAsync();
    if (fgStatus !== 'granted') {
      Alert.alert('Permission Denied', 'Foreground location permission is required');
      return;
    }

    // 2. Request Background Permission
    const { status: bgStatus } = await Location.requestBackgroundPermissionsAsync();
    
    // Initialize Trip in Backend
    const origin = location ? `${location.latitude},${location.longitude}` : 'Pune, India';
    SocketService.startTrip(destination, origin);

    if (bgStatus === 'granted') {
      // Start the Background Task
      await Location.startLocationUpdatesAsync(LOCATION_TASK_NAME, {
        accuracy: Location.Accuracy.High,
        timeInterval: 5000, 
        foregroundService: {
          notificationTitle: "Safety Shield Active",
          notificationBody: "Your ride is being monitored for safety.",
          notificationColor: "#0066cc",
        },
      });
      Alert.alert("Safety Shield Activated", "Passive background monitoring is now active.");
    } else {
      // Fallback: Foreground Tracking Only
      const sub = await Location.watchPositionAsync(
        { accuracy: Location.Accuracy.High, timeInterval: 5000 },
        (loc) => {
          if (SocketService.activeTripId) {
            SocketService.emitLocationUpdate({
              tripId: SocketService.activeTripId,
              latitude: loc.coords.latitude,
              longitude: loc.coords.longitude
            });
            console.log(`[Foreground Update] Sent for ${SocketService.activeTripId}`);
          }
        }
      );
      setLocationSubscription(sub);
      Alert.alert("Foreground Shield Activated", "Monitoring is active but you must keep the app open (Background permission denied).");
    }

    setIsTracking(true);
  };

  const handleEndTrip = async () => {
    Location.stopLocationUpdatesAsync(LOCATION_TASK_NAME).catch(() => {});
    if (locationSubscription) {
      locationSubscription.remove();
      setLocationSubscription(null);
    }
    SocketService.endTrip();
    setIsTracking(false);
    setDestination('');
    Alert.alert("Trip Ended", "Monitoring has been stopped.");
  };

  return (
    <View style={styles.container}>
      <View style={styles.mapPlaceholder}>
        <Text style={styles.mapText}>Map Dashboard (Tracking Active)</Text>
      </View>

      <View style={styles.panel}>
        <Text style={styles.title}>Where are you heading?</Text>
        <TextInput
          style={styles.input}
          placeholder="Enter destination address..."
          placeholderTextColor="#888"
          value={destination}
          onChangeText={setDestination}
          editable={!isTracking}
        />

        {!isTracking ? (
          <TouchableOpacity style={styles.startButton} onPress={handleStartTrip}>
            <Text style={styles.buttonText}>Start Secure Trip</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity style={styles.stopButton} onPress={handleEndTrip}>
            <Text style={styles.buttonText}>End Trip</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5'
  },
  mapPlaceholder: {
    flex: 2,
    backgroundColor: '#eaeaea',
    justifyContent: 'center',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderColor: '#ddd'
  },
  mapText: {
    fontSize: 18,
    color: '#888'
  },
  panel: {
    flex: 1,
    padding: 20,
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    marginTop: -20,
    elevation: 10,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: -5 }
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 15,
    color: '#333'
  },
  input: {
    height: 50,
    borderColor: '#ddd',
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 15,
    marginBottom: 20,
    fontSize: 16,
    backgroundColor: '#f9f9f9'
  },
  startButton: {
    backgroundColor: '#28a745',
    height: 50,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center'
  },
  stopButton: {
    backgroundColor: '#dc3545',
    height: 50,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center'
  },
  buttonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600'
  }
});
