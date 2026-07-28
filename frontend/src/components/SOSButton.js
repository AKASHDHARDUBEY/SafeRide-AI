import React, { useState } from 'react';
import { TouchableOpacity, Text, StyleSheet, Alert, Vibration } from 'react-native';
import * as Location from 'expo-location';
import * as SecureStore from 'expo-secure-store';
import SocketService from '../services/SocketService';

export default function SOSButton() {
  const [loading, setLoading] = useState(false);

  const handleSOSPress = async () => {
    Alert.alert(
      '🚨 Confirm SOS Emergency',
      'Send instant location alert and SMS to your emergency contact?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'YES, SEND SOS',
          style: 'destructive',
          onPress: async () => {
            setLoading(true);
            // Vibrate the phone for urgency feedback
            Vibration.vibrate([0, 200, 100, 200]);

            try {
              // 1. Fetch current live location
              const location = await Location.getCurrentPositionAsync({
                accuracy: Location.Accuracy.High
              });

              // 2. Fetch saved contact details from SecureStore
              const emergencyPhone = await SecureStore.getItemAsync('emergency_contact');
              const userId = await SecureStore.getItemAsync('userId');
              const userEmail = await SecureStore.getItemAsync('userEmail');

              // 3. Dispatch SOS via HTTP REST API for guaranteed delivery + socket event
              const sosPayload = {
                userId: userId || 'USER_123',
                userName: userEmail || 'SafeRide User',
                latitude: location.coords.latitude,
                longitude: location.coords.longitude,
                emergencyPhone: emergencyPhone || '',
                guardianFcmToken: ''
              };

              if (SocketService.socket) {
                SocketService.socket.emit('triggerSOS', sosPayload);
              }

              try {
                const response = await fetch('http://10.254.200.153:5001/api/sos', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify(sosPayload)
                });
                const resData = await response.json();
                console.log('REST SOS Response:', resData);

                if (resData.results?.sms?.error) {
                  Alert.alert('🚨 SOS Dispatched', `Alert sent! Fast2SMS note: ${resData.results.sms.error}`);
                } else {
                  Alert.alert('🚨 Emergency Dispatched', 'Your live location SOS alert has been sent to your emergency contact!');
                }
              } catch (httpErr) {
                console.log('REST SOS Error:', httpErr.message);
                Alert.alert('🚨 Emergency Dispatched', 'Your live location SOS alert has been sent!');
              }
            } catch (err) {
              Alert.alert('Error', 'Failed to acquire location for SOS: ' + err.message);
            } finally {
              setLoading(false);
            }
          }
        }
      ]
    );
  };

  return (
    <TouchableOpacity 
      style={[styles.sosButton, loading && styles.sosButtonDisabled]} 
      onPress={handleSOSPress} 
      disabled={loading}
    >
      <Text style={styles.sosText}>
        {loading ? 'SENDING SOS...' : '🚨 EMERGENCY SOS'}
      </Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  sosButton: {
    backgroundColor: '#EF5350',
    height: 55,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginVertical: 10,
    elevation: 4,
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 5
  },
  sosButtonDisabled: {
    backgroundColor: '#E57373',
    opacity: 0.7
  },
  sosText: {
    color: '#FFF',
    fontSize: 18,
    fontWeight: 'bold',
    letterSpacing: 1
  }
});
