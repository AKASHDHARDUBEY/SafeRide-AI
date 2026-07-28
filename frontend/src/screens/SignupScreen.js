import React, { useState } from 'react';
import { 
  View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, ScrollView, Platform 
} from 'react-native';
import { createUserWithEmailAndPassword, updateProfile } from 'firebase/auth';
import { auth } from '../config/firebase';
import * as SecureStore from 'expo-secure-store';

export default function SignupScreen({ navigation }) {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [emergencyContact, setEmergencyContact] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSignup = async () => {
    const cleanEmail = email.trim();
    if (!fullName || !cleanEmail || !phone || !emergencyContact || !password) {
      Alert.alert('Missing Fields', 'Please fill in all details including your emergency contact.');
      return;
    }

    if (password.length < 6) {
      Alert.alert('Weak Password', 'Password must be at least 6 characters.');
      return;
    }

    setLoading(true);

    try {
      // 1. Create User in Firebase Auth
      const userCredential = await createUserWithEmailAndPassword(auth, cleanEmail, password);
      const user = userCredential.user;

      // 2. Set the User's Display Name in Firebase
      await updateProfile(user, { displayName: fullName });

      // 3. Store Extra Info (Phone & Emergency Contact) in SecureStore
      await SecureStore.setItemAsync('user_phone', phone);
      await SecureStore.setItemAsync('emergency_contact', emergencyContact);
      await SecureStore.setItemAsync('userId', user.uid);
      await SecureStore.setItemAsync('userEmail', cleanEmail);

      Alert.alert('Success', 'Account created successfully!', [
        { text: 'OK', onPress: () => navigation.replace('Dashboard') }
      ]);
    } catch (error) {
      console.log('Signup error:', error.code, error.message);
      let msg = error.message;
      if (error.code === 'auth/email-already-in-use') {
        msg = 'An account with this email already exists. Please log in instead.';
      } else if (error.code === 'auth/invalid-email') {
        msg = 'Invalid email format. Please check your email address.';
      }

      Alert.alert(
        'Signup Failed',
        `${msg}\n\nWould you like to enter in Demo Mode?`,
        [
          { text: 'Try Again', style: 'cancel' },
          {
            text: 'Demo Mode',
            onPress: async () => {
              await SecureStore.setItemAsync('user_phone', phone);
              await SecureStore.setItemAsync('emergency_contact', emergencyContact);
              await SecureStore.setItemAsync('userId', 'USER_123');
              await SecureStore.setItemAsync('userEmail', cleanEmail);
              navigation.replace('Dashboard');
            }
          }
        ]
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Create Account</Text>
      <Text style={styles.subtitle}>Setup your safety guardian profile</Text>

      <Text style={styles.label}>Full Name</Text>
      <TextInput 
        style={styles.input} 
        placeholder="Jane Doe" 
        value={fullName} 
        onChangeText={setFullName} 
      />

      <Text style={styles.label}>Email Address</Text>
      <TextInput 
        style={styles.input} 
        placeholder="jane@example.com" 
        keyboardType="email-address"
        autoCapitalize="none"
        value={email} 
        onChangeText={setEmail} 
      />

      <Text style={styles.label}>Your Phone Number</Text>
      <TextInput 
        style={styles.input} 
        placeholder="+91 9876543210" 
        keyboardType="phone-pad"
        value={phone} 
        onChangeText={setPhone} 
      />

      <Text style={styles.label}>Emergency Contact Phone (Guardian)</Text>
      <TextInput 
        style={styles.input} 
        placeholder="Parent/Friend Phone Number" 
        keyboardType="phone-pad"
        value={emergencyContact} 
        onChangeText={setEmergencyContact} 
      />

      <Text style={styles.label}>Password</Text>
      <TextInput 
        style={styles.input} 
        placeholder="At least 6 characters" 
        secureTextEntry 
        value={password} 
        onChangeText={setPassword} 
      />

      <TouchableOpacity style={styles.button} onPress={handleSignup} disabled={loading}>
        <Text style={styles.buttonText}>{loading ? 'Creating Account...' : 'Register & Secure'}</Text>
      </TouchableOpacity>

      <TouchableOpacity onPress={() => navigation.navigate('Login')} style={{ marginTop: 20 }}>
        <Text style={styles.linkText}>Already have an account? <Text style={styles.bold}>Log In</Text></Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { 
    padding: 25, 
    backgroundColor: '#fff', 
    flexGrow: 1, 
    justifyContent: 'center',
    paddingTop: Platform.OS === 'ios' ? 50 : 30
  },
  title: { fontSize: 28, fontWeight: 'bold', color: '#3F51B5', marginBottom: 5 },
  subtitle: { fontSize: 14, color: '#666', marginBottom: 25 },
  label: { fontSize: 13, fontWeight: '600', color: '#333', marginBottom: 5 },
  input: { height: 48, borderColor: '#E0E0E0', borderWidth: 1, borderRadius: 10, paddingHorizontal: 15, marginBottom: 15, backgroundColor: '#F9FAFB' },
  button: { backgroundColor: '#3F51B5', height: 50, borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginTop: 10 },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  linkText: { textAlign: 'center', color: '#666', fontSize: 14 },
  bold: { color: '#3F51B5', fontWeight: 'bold' }
});
