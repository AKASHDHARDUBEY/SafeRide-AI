import React from 'react';
import { SafeAreaView, StatusBar, StyleSheet } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';

// Register background location task safely
try {
  require('./src/tasks/LocationTask');
} catch (e) {
  console.warn('Background location task registration deferred:', e.message);
}

// Import Screens
import LoginScreen from './src/screens/LoginScreen';
import SignupScreen from './src/screens/SignupScreen';
import TripScreen from './src/screens/TripScreen';
import GuardiansScreen from './src/screens/GuardiansScreen';
import TripsScreen from './src/screens/TripsScreen';
import ProfileScreen from './src/screens/ProfileScreen';
import EmergencyChatScreen from './src/screens/EmergencyChatScreen';
import UpgradeProScreen from './src/screens/UpgradeProScreen';

const Stack = createStackNavigator();

export default function App() {
  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#f5f5f5" />
      <NavigationContainer>
        <Stack.Navigator initialRouteName="Login" screenOptions={{ headerShown: false }}>
          <Stack.Screen name="Login" component={LoginScreen} />
          <Stack.Screen name="Signup" component={SignupScreen} />
          <Stack.Screen name="Dashboard" component={TripScreen} />
          <Stack.Screen name="Guardians" component={GuardiansScreen} />
          <Stack.Screen name="Trips" component={TripsScreen} />
          <Stack.Screen name="Profile" component={ProfileScreen} />
          <Stack.Screen name="EmergencyChat" component={EmergencyChatScreen} />
          <Stack.Screen name="UpgradePro" component={UpgradeProScreen} />
        </Stack.Navigator>
      </NavigationContainer>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
});
