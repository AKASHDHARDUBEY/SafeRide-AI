import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, Platform } from 'react-native';
import { signOut } from 'firebase/auth';
import { auth } from '../config/firebase';
import * as SecureStore from 'expo-secure-store';
import { Ionicons } from '@expo/vector-icons';

export default function ProfileScreen({ navigation }) {
  const [user, setUser] = useState(null);
  const [phone, setPhone] = useState('Not Set');
  const [emergencyContact, setEmergencyContact] = useState('Not Set');
  const [isPremium, setIsPremium] = useState(false);

  useEffect(() => {
    const currentUser = auth.currentUser;
    if (currentUser) {
      setUser(currentUser);
    }
    loadSavedDetails();
    loadPremiumStatus();
  }, []);

  const loadSavedDetails = async () => {
    const savedPhone = await SecureStore.getItemAsync('user_phone');
    const savedContact = await SecureStore.getItemAsync('emergency_contact');
    const savedEmail = await SecureStore.getItemAsync('userEmail');
    if (savedPhone) setPhone(savedPhone);
    if (savedContact) setEmergencyContact(savedContact);
    if (!auth.currentUser && savedEmail) {
      setUser({ displayName: 'Akash Dubey', email: savedEmail });
    }
  };

  const loadPremiumStatus = async () => {
    const premiumFlag = await SecureStore.getItemAsync('isPremium');
    if (premiumFlag === 'true') {
      setIsPremium(true);
      return;
    }
    // Also check from backend
    try {
      const userId = await SecureStore.getItemAsync('user_uid');
      if (userId) {
        const res = await fetch(`http://10.254.200.153:5001/api/payment/status/${userId}`);
        const data = await res.json();
        if (data.success && data.isPremium) {
          setIsPremium(true);
          await SecureStore.setItemAsync('isPremium', 'true');
        }
      }
    } catch (err) {}
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
      await SecureStore.deleteItemAsync('userId');
      await SecureStore.deleteItemAsync('userEmail');
      await SecureStore.deleteItemAsync('user_uid');
      await SecureStore.deleteItemAsync('isPremium');
      Alert.alert('Logged Out', 'You have been safely logged out.');
      navigation.replace('Login');
    } catch (error) {
      Alert.alert('Error', 'Could not log out.');
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        {/* Header Avatar */}
        <View style={styles.headerBox}>
          <View style={styles.avatarCircle}>
            <Text style={styles.avatarInitial}>
              {user?.displayName ? user.displayName.charAt(0).toUpperCase() : 'A'}
            </Text>
          </View>
          <Text style={styles.userName}>{user?.displayName || 'Akash Dubey'}</Text>
          <Text style={styles.userEmail}>{user?.email || 'akash@example.com'}</Text>
          {isPremium && (
            <View style={styles.proBadge}>
              <Text style={styles.proBadgeText}>⭐ PRO MEMBER</Text>
            </View>
          )}
        </View>

        {/* Profile Details List */}
        <View style={styles.infoCard}>
          <Text style={styles.cardTitle}>Account & Emergency Info</Text>
          
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Phone Number</Text>
            <Text style={styles.infoValue}>{phone}</Text>
          </View>

          <View style={styles.divider} />

          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Primary Guardian Contact</Text>
            <Text style={[styles.infoValue, { color: '#2ECC71', fontWeight: 'bold' }]}>
              {emergencyContact}
            </Text>
          </View>

          <View style={styles.divider} />

          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Safety Shield Status</Text>
            <Text style={[styles.infoValue, { color: '#3F51B5', fontWeight: 'bold' }]}>
              {isPremium ? 'Pro Active ⭐' : 'Free Plan 🟢'}
            </Text>
          </View>
        </View>

        {/* Upgrade to Pro Button */}
        <TouchableOpacity 
          style={isPremium ? styles.proActiveBtn : styles.upgradeBtn} 
          onPress={() => navigation.navigate('UpgradePro')}
        >
          <Text style={styles.upgradeBtnText}>
            {isPremium ? '⭐ Pro Features Active' : '💎 Upgrade to Pro (₹1)'}
          </Text>
        </TouchableOpacity>

        {/* Logout Button */}
        <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
          <Text style={styles.logoutBtnText}>Log Out</Text>
        </TouchableOpacity>
      </View>

      {/* Bottom Navigation */}
      <View style={styles.bottomNav}>
        <TouchableOpacity style={styles.navItem} onPress={() => navigation.navigate('Dashboard')}>
          <Ionicons name="home-outline" size={24} color="#888" />
          <Text style={styles.navText}>Home</Text>
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
          <Ionicons name="person" size={24} color="#3F51B5" />
          <Text style={[styles.navText, { color: '#3F51B5', fontWeight: 'bold' }]}>Profile</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F7FA' },
  content: { flex: 1, padding: 20, justifyContent: 'center' },
  headerBox: { alignItems: 'center', marginTop: 20, marginBottom: 20 },
  avatarCircle: { width: 80, height: 80, borderRadius: 40, backgroundColor: '#3F51B5', justifyContent: 'center', alignItems: 'center', marginBottom: 12 },
  avatarInitial: { color: '#FFF', fontSize: 32, fontWeight: 'bold' },
  userName: { fontSize: 22, fontWeight: 'bold', color: '#222' },
  userEmail: { fontSize: 14, color: '#666', marginTop: 2 },
  infoCard: { backgroundColor: '#FFF', borderRadius: 15, padding: 20, elevation: 3, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 8 },
  cardTitle: { fontSize: 16, fontWeight: 'bold', color: '#333', marginBottom: 15 },
  infoRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 10 },
  infoLabel: { fontSize: 14, color: '#666' },
  infoValue: { fontSize: 14, fontWeight: '600', color: '#222' },
  divider: { height: 1, backgroundColor: '#F0F0F0', marginVertical: 4 },
  logoutBtn: { backgroundColor: '#EF5350', height: 50, borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginTop: 12 },
  logoutBtnText: { color: '#FFF', fontSize: 16, fontWeight: 'bold' },
  proBadge: { backgroundColor: '#3F51B5', paddingHorizontal: 14, paddingVertical: 5, borderRadius: 15, marginTop: 8 },
  proBadgeText: { color: '#FFF', fontSize: 12, fontWeight: 'bold' },
  upgradeBtn: { backgroundColor: '#3F51B5', height: 50, borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginTop: 20 },
  proActiveBtn: { backgroundColor: '#2ECC71', height: 50, borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginTop: 20 },
  upgradeBtnText: { color: '#FFF', fontSize: 16, fontWeight: 'bold' },
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
