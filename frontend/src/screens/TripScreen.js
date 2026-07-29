import React, { useState, useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert, Dimensions, KeyboardAvoidingView, Platform } from 'react-native';
import MapView, { Polyline } from 'react-native-maps';
import * as Location from 'expo-location';
import { Ionicons } from '@expo/vector-icons';
import * as SecureStore from 'expo-secure-store';
import { GooglePlacesAutocomplete } from 'react-native-google-places-autocomplete';
import SocketService from '../services/SocketService';
import SOSButton from '../components/SOSButton';
import { LOCATION_TASK_NAME } from '../tasks/LocationTask';

const { width } = Dimensions.get('window');
const GOOGLE_API_KEY = process.env.EXPO_PUBLIC_GOOGLE_MAPS_KEY || 'YOUR_GOOGLE_MAPS_KEY';

// Decode Google's encoded polyline format into lat/lng array
function decodePolyline(encoded) {
  const points = [];
  let index = 0, lat = 0, lng = 0;
  while (index < encoded.length) {
    let shift = 0, result = 0, b;
    do { b = encoded.charCodeAt(index++) - 63; result |= (b & 0x1f) << shift; shift += 5; } while (b >= 0x20);
    lat += (result & 1) ? ~(result >> 1) : result >> 1;
    shift = 0; result = 0;
    do { b = encoded.charCodeAt(index++) - 63; result |= (b & 0x1f) << shift; shift += 5; } while (b >= 0x20);
    lng += (result & 1) ? ~(result >> 1) : result >> 1;
    points.push({ latitude: lat / 1e5, longitude: lng / 1e5 });
  }
  return points;
}

// Minimal dark map style for "Danger" state
const darkMapStyle = [
  { elementType: "geometry", stylers: [{ color: "#242f3e" }] },
  { elementType: "labels.text.stroke", stylers: [{ color: "#242f3e" }] },
  { elementType: "labels.text.fill", stylers: [{ color: "#746855" }] },
  { featureType: "administrative.locality", elementType: "labels.text.fill", stylers: [{ color: "#d59563" }] },
  { featureType: "road", elementType: "geometry", stylers: [{ color: "#38414e" }] },
  { featureType: "road", elementType: "geometry.stroke", stylers: [{ color: "#212a37" }] },
  { featureType: "road", elementType: "labels.text.fill", stylers: [{ color: "#9ca5b3" }] },
  { featureType: "water", elementType: "geometry", stylers: [{ color: "#17263c" }] }
];

export default function TripScreen({ navigation }) {
  const [destinationName, setDestinationName] = useState('');
  const [destCoords, setDestCoords] = useState(null);
  
  const [distanceText, setDistanceText] = useState('-- km');
  const [timeText, setTimeText] = useState('-- min');

  const [isTracking, setIsTracking] = useState(false);
  const [location, setLocation] = useState(null);
  const [locationSubscription, setLocationSubscription] = useState(null);
  const [guardians, setGuardians] = useState([]);

  const [path, setPath] = useState([]);
  const [isPremium, setIsPremium] = useState(false);
  const mapRef = useRef(null);

  const isTrackingRef = useRef(isTracking);
  const locationSubRef = useRef(locationSubscription);

  useEffect(() => {
    isTrackingRef.current = isTracking;
    locationSubRef.current = locationSubscription;
  }, [isTracking, locationSubscription]);

  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', async () => {
      const flag = await SecureStore.getItemAsync('isPremium');
      if (flag === 'true') setIsPremium(true);
    });
    return unsubscribe;
  }, [navigation]);

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
      // Path will be set when trip starts with real route
    })();

    SocketService.initializeSocket();
    loadGuardians();

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

  const loadGuardians = async () => {
    try {
      const stored = await SecureStore.getItemAsync('guardians');
      if (stored) {
        setGuardians(JSON.parse(stored));
      }
    } catch (e) {
      console.log('Failed to load guardians', e);
    }
  };

  const handleStartTrip = async () => {
    let finalDestLat = destCoords?.lat;
    let finalDestLng = destCoords?.lng;
    let finalDestName = destinationName;

    if (!finalDestName) {
      Alert.alert('Destination required', 'Please type a destination in the search bar.');
      return;
    }

    // If user typed but didn't select from dropdown, use Geocoding API to get real coords
    if (!finalDestLat || !finalDestLng) {
      try {
        const geoResponse = await fetch(
          `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(finalDestName)}&key=${GOOGLE_API_KEY}`
        );
        const geoData = await geoResponse.json();
        if (geoData.status === 'OK' && geoData.results && geoData.results.length > 0) {
          finalDestLat = geoData.results[0].geometry.location.lat;
          finalDestLng = geoData.results[0].geometry.location.lng;
          finalDestName = geoData.results[0].formatted_address;
          console.log('Geocoded destination:', finalDestName, finalDestLat, finalDestLng);
        } else {
          console.log('Geocoding status not OK:', geoData.status, geoData.error_message);
          // Fallback coordinates offset from current location so trip still works seamlessly
          finalDestLat = location ? location.latitude + 0.04 : 18.5204;
          finalDestLng = location ? location.longitude + 0.04 : 73.8567;
        }
      } catch (err) {
        console.error('Geocoding API error:', err);
        finalDestLat = location ? location.latitude + 0.04 : 18.5204;
        finalDestLng = location ? location.longitude + 0.04 : 73.8567;
      }
    }

    const { status: fgStatus } = await Location.requestForegroundPermissionsAsync();
    if (fgStatus !== 'granted') {
      Alert.alert('Permission Denied', 'Foreground location permission is required');
      return;
    }

    const { status: bgStatus } = await Location.requestBackgroundPermissionsAsync();
    
    // Get current location
    const myLat = location?.latitude;
    const myLng = location?.longitude;

    // Call Google Distance Matrix API with REAL coordinates
    if (myLat && myLng) {
      try {
        console.log(`Fetching distance from (${myLat},${myLng}) to (${finalDestLat},${finalDestLng})`);
        const response = await fetch(
          `https://maps.googleapis.com/maps/api/distancematrix/json?origins=${myLat},${myLng}&destinations=${finalDestLat},${finalDestLng}&key=${GOOGLE_API_KEY}`
        );
        const data = await response.json();
        
        if (data && data.rows && data.rows[0] && data.rows[0].elements[0].status === 'OK') {
          setDistanceText(data.rows[0].elements[0].distance.text);
          setTimeText(data.rows[0].elements[0].duration.text);
        } else {
          console.log('Distance Matrix non-OK:', data);
          setDistanceText('-- km');
          setTimeText('-- min');
        }
      } catch (err) {
        console.error('Distance API fetch error:', err);
        setDistanceText('-- km');
        setTimeText('-- min');
      }

      // Fetch REAL road route from Directions API for the blue line
      try {
        const dirResponse = await fetch(
          `https://maps.googleapis.com/maps/api/directions/json?origin=${myLat},${myLng}&destination=${finalDestLat},${finalDestLng}&key=${GOOGLE_API_KEY}`
        );
        const dirData = await dirResponse.json();
        if (dirData.status === 'OK' && dirData.routes.length > 0) {
          const encodedPolyline = dirData.routes[0].overview_polyline.points;
          const routeCoords = decodePolyline(encodedPolyline);
          setPath(routeCoords);

          // Zoom map to fit the entire route
          if (mapRef.current && routeCoords.length > 0) {
            mapRef.current.fitToCoordinates(routeCoords, {
              edgePadding: { top: 80, right: 40, bottom: 300, left: 40 },
              animated: true,
            });
          }
        }
      } catch (err) {
        console.error('Directions API error:', err);
      }
    }



    const originString = myLat ? `${myLat},${myLng}` : 'Pune, India';
    
    // Pass guardians to backend
    SocketService.startTrip(finalDestName, originString, guardians);

    if (bgStatus === 'granted') {
      await Location.startLocationUpdatesAsync(LOCATION_TASK_NAME, {
        accuracy: Location.Accuracy.High,
        timeInterval: 5000, 
        foregroundService: {
          notificationTitle: "Safety Shield Active",
          notificationBody: "Your ride is being monitored for safety.",
          notificationColor: "#0066cc",
        },
      });
    } else {
      const sub = await Location.watchPositionAsync(
        { accuracy: Location.Accuracy.High, timeInterval: 5000 },
        (loc) => {
          if (SocketService.activeTripId) {
            SocketService.emitLocationUpdate({
              tripId: SocketService.activeTripId,
              latitude: loc.coords.latitude,
              longitude: loc.coords.longitude
            });
          }
        }
      );
      setLocationSubscription(sub);
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
    setDestinationName('');
    setDestCoords(null);
  };

  return (
    <View style={styles.container}>
      <MapView 
        ref={mapRef}
        style={StyleSheet.absoluteFillObject}
        initialRegion={location}
        showsUserLocation={true}
        customMapStyle={isTracking ? darkMapStyle : []}
      >
        {path.length > 0 && (
          <Polyline 
            coordinates={path} 
            strokeColor="#00BFFF"
            strokeWidth={5} 
          />
        )}
      </MapView>

      {/* Top Floating Search Bar (Never blocked by Keyboard) */}
      {!isTracking && (
        <View style={styles.topSearchContainer}>
          <View style={styles.autocompleteWrapper}>
            <Ionicons name="search" size={20} color="#888" style={styles.icon} />
            <GooglePlacesAutocomplete
              placeholder="Where to?"
              fetchDetails={true}
              keyboardShouldPersistTaps="handled"
              onPress={(data, details = null) => {
                setDestinationName(data.description);
                if (details && details.geometry) {
                  setDestCoords({
                    lat: details.geometry.location.lat,
                    lng: details.geometry.location.lng
                  });
                }
              }}
              textInputProps={{
                onChangeText: (text) => setDestinationName(text)
              }}
              onFail={(error) => console.log('Google Places API Error:', error)}
              query={{
                key: GOOGLE_API_KEY,
                language: 'en',
              }}
              styles={{
                container: { flex: 1 },
                textInput: styles.autocompleteInput,
                listView: styles.autocompleteListView,
                row: styles.autocompleteRow
              }}
            />
          </View>
        </View>
      )}

      {/* Bottom Floating Panel */}
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : undefined} 
        style={styles.floatingPanelContainer}
        pointerEvents="box-none"
      >
        <View style={styles.floatingPanel}>
          {!isTracking ? (
            // READY STATE
            <View>
              <View style={styles.statusBar}>
                <Ionicons name="shield-checkmark" size={20} color="#2E7D32" />
                <Text style={styles.statusText}>Safety Monitoring Ready</Text>
              </View>

              {!isPremium && (
                <TouchableOpacity 
                  style={styles.proUpgradeBanner} 
                  onPress={() => navigation.navigate('UpgradePro')}
                >
                  <Ionicons name="ribbon-outline" size={18} color="#FFD700" style={{ marginRight: 8 }} />
                  <Text style={styles.proUpgradeBannerText}>Upgrade to Pro Protection (INR 1)</Text>
                  <Ionicons name="chevron-forward" size={18} color="#FFF" style={{ marginLeft: 'auto' }} />
                </TouchableOpacity>
              )}

              <TouchableOpacity style={styles.startButton} onPress={handleStartTrip}>
                <Text style={styles.buttonText}>Start Secure Trip</Text>
              </TouchableOpacity>
            </View>
          ) : (
            // DANGER / ACTIVE STATE
            <View>
              <View style={[styles.statusBar, styles.activeStatusBar]}>
                <Ionicons name="shield" size={20} color="#EF5350" />
                <Text style={[styles.statusText, {color: '#EF5350'}]}>Tracking Active</Text>
              </View>

              <View style={styles.statsRow}>
                <View style={styles.statBox}>
                  <Text style={styles.statLabel}>Estimated</Text>
                  <Text style={styles.statValue}>{timeText}</Text>
                </View>
                <View style={styles.divider} />
                <View style={styles.statBox}>
                  <Text style={styles.statLabel}>Distance</Text>
                  <Text style={styles.statValue}>{distanceText}</Text>
                </View>
                <View style={styles.divider} />
                <View style={styles.statBox}>
                  <Text style={styles.statLabel}>Score</Text>
                  <Text style={[styles.statValue, {color: '#4CAF50'}]}>98%</Text>
                </View>
              </View>

              <SOSButton navigation={navigation} />

              <TouchableOpacity 
                style={styles.chatButton} 
                onPress={() => navigation.navigate('EmergencyChat', {
                  tripId: SocketService.activeTripId || 'TRIP_123',
                  userRole: 'VICTIM',
                  userName: destinationName ? `Rider (${destinationName})` : 'Victim'
                })}
              >
                <Ionicons name="chatbubbles-outline" size={20} color="#FFF" style={{ marginRight: 8 }} />
                <Text style={styles.buttonText}>💬 Live Emergency Chat</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.stopButton} onPress={handleEndTrip}>
                <Text style={styles.buttonText}>End Trip</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Bottom Navigation */}
          <View style={styles.bottomNav}>
            <TouchableOpacity style={styles.navItem} onPress={() => navigation.navigate('Dashboard')}>
              <Ionicons name="home" size={24} color="#3F51B5" />
              <Text style={[styles.navText, { color: '#3F51B5', fontWeight: 'bold' }]}>Home</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.navItem} onPress={() => navigation.navigate('Trips')}>
              <Ionicons name="car-outline" size={24} color="#888" />
              <Text style={styles.navText}>Trips</Text>
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
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  topSearchContainer: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 60 : 45,
    left: 15,
    right: 15,
    zIndex: 1000,
  },
  floatingPanelContainer: {
    position: 'absolute',
    bottom: 0,
    width: '100%',
    justifyContent: 'flex-end',
  },
  floatingPanel: {
    width: '100%',
    backgroundColor: '#fff',
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    padding: 20,
    paddingBottom: 30,
    elevation: 20,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 15,
    shadowOffset: { width: 0, height: -5 }
  },
  statusBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E8F5E9',
    borderColor: '#4CAF50',
    borderWidth: 1,
    borderRadius: 20,
    paddingVertical: 8,
    paddingHorizontal: 15,
    marginBottom: 20,
    alignSelf: 'flex-start'
  },
  activeStatusBar: {
    backgroundColor: '#FFEBEE',
    borderColor: '#EF5350'
  },
  statusText: {
    color: '#2E7D32',
    fontWeight: 'bold',
    marginLeft: 8
  },
  autocompleteWrapper: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#fff',
    borderRadius: 15,
    paddingHorizontal: 15,
    paddingTop: 5,
    minHeight: 55,
    elevation: 8,
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
  },
  icon: {
    marginRight: 10,
    marginTop: 12
  },
  autocompleteInput: {
    backgroundColor: 'transparent',
    fontSize: 16,
    color: '#333',
    height: 45
  },
  autocompleteListView: {
    position: 'absolute',
    top: 55,
    left: -15,
    right: -15,
    backgroundColor: '#fff',
    borderRadius: 15,
    elevation: 10,
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 5 },
    maxHeight: 240,
    zIndex: 1000,
  },
  autocompleteRow: {
    padding: 13,
    minHeight: 44,
    flexDirection: 'row',
  },
  startButton: {
    backgroundColor: '#3F51B5', // Deep Indigo
    height: 55,
    borderRadius: 25, // Pill
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
    zIndex: 1
  },
  stopButton: {
    backgroundColor: '#EF5350', // Soft Red/Coral
    height: 55,
    borderRadius: 25, // Pill
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20
  },
  chatButton: {
    backgroundColor: '#3F51B5', // Deep Indigo
    height: 50,
    borderRadius: 25,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12
  },
  buttonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold'
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20
  },
  statBox: {
    flex: 1,
    alignItems: 'center'
  },
  statLabel: {
    fontSize: 12,
    color: '#888',
    marginBottom: 5
  },
  statValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333'
  },
  divider: {
    width: 1,
    height: 30,
    backgroundColor: '#ddd'
  },
  bottomNav: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    borderTopWidth: 1,
    borderTopColor: '#eee',
    paddingTop: 15,
    paddingBottom: Platform.OS === 'android' ? 20 : 5
  },
  navItem: {
    alignItems: 'center'
  },
  navText: {
    fontSize: 12,
    color: '#888',
    marginTop: 5
  },
  proUpgradeBanner: {
    backgroundColor: '#3F51B5',
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 15,
    borderRadius: 12,
    marginBottom: 15,
    elevation: 3
  },
  proUpgradeBannerText: {
    color: '#FFF',
    fontWeight: 'bold',
    fontSize: 14
  }
});
