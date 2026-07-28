import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth } from '../config/firebase';
import * as SecureStore from 'expo-secure-store';

export default function LoginScreen({ navigation }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleEmailLogin = async () => {
    const cleanEmail = email.trim();
    if (!cleanEmail || !password) {
      Alert.alert('Error', 'Please enter email and password.');
      return;
    }

    setLoading(true);

    try {
      const userCredential = await signInWithEmailAndPassword(auth, cleanEmail, password);
      await SecureStore.setItemAsync('userId', userCredential.user.uid);
      await SecureStore.setItemAsync('userEmail', userCredential.user.email || cleanEmail);
      navigation.replace('Dashboard');
    } catch (error) {
      console.log('Login error:', error.code, error.message);
      let userMsg = error.message;
      if (error.code === 'auth/invalid-email') {
        userMsg = 'Invalid email format. Make sure your email looks like name@gmail.com.';
      } else if (error.code === 'auth/user-not-found' || error.code === 'auth/invalid-credential') {
        userMsg = "No account found with this email/password. Tap 'Sign Up' below to create one!";
      }

      Alert.alert(
        'Login Failed',
        `${userMsg}\n\nWould you like to enter in Demo Mode?`,
        [
          { text: 'Try Again', style: 'cancel' },
          {
            text: 'Demo Mode',
            onPress: async () => {
              await SecureStore.setItemAsync('userId', 'USER_123');
              await SecureStore.setItemAsync('userEmail', cleanEmail || 'user@example.com');
              navigation.replace('Dashboard');
            }
          }
        ]
      );
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    Alert.alert(
      'Google Sign-In', 
      'Google authentication requires expo-auth-session or @react-native-google-signin set up with your Google OAuth Client IDs.'
    );
  };

  return (
    <View style={styles.container}>
      <Text style={styles.logoText}>🛡️ SafeRide AI</Text>
      <Text style={styles.title}>Welcome Back</Text>
      <Text style={styles.subtitle}>Log in to your secure guardian hub</Text>

      <TextInput 
        style={styles.input} 
        placeholder="Email Address" 
        keyboardType="email-address"
        autoCapitalize="none"
        value={email}
        onChangeText={setEmail}
      />

      <TextInput 
        style={styles.input} 
        placeholder="Password" 
        secureTextEntry 
        value={password}
        onChangeText={setPassword}
      />

      <TouchableOpacity style={styles.loginBtn} onPress={handleEmailLogin} disabled={loading}>
        <Text style={styles.loginBtnText}>{loading ? 'Logging in...' : 'Secure Login'}</Text>
      </TouchableOpacity>

      <View style={styles.dividerContainer}>
        <View style={styles.line} />
        <Text style={styles.dividerText}>OR</Text>
        <View style={styles.line} />
      </View>

      {/* Google Sign In Button */}
      <TouchableOpacity style={styles.googleBtn} onPress={handleGoogleSignIn}>
        <Text style={styles.googleBtnText}>🌐 Sign in with Google</Text>
      </TouchableOpacity>

      <TouchableOpacity onPress={() => navigation.navigate('Signup')} style={{ marginTop: 25 }}>
        <Text style={styles.signupText}>Don't have an account? <Text style={styles.bold}>Sign Up</Text></Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 25, justifyContent: 'center', backgroundColor: '#fff' },
  logoText: { fontSize: 24, fontWeight: 'bold', color: '#3F51B5', textAlign: 'center', marginBottom: 10 },
  title: { fontSize: 26, fontWeight: 'bold', textAlign: 'center', color: '#222' },
  subtitle: { fontSize: 14, color: '#666', textAlign: 'center', marginBottom: 30 },
  input: { height: 50, borderColor: '#E0E0E0', borderWidth: 1, borderRadius: 10, paddingHorizontal: 15, marginBottom: 15, backgroundColor: '#F9FAFB' },
  loginBtn: { backgroundColor: '#3F51B5', height: 50, borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginTop: 5 },
  loginBtnText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  dividerContainer: { flexDirection: 'row', alignItems: 'center', marginVertical: 20 },
  line: { flex: 1, height: 1, backgroundColor: '#E0E0E0' },
  dividerText: { marginHorizontal: 10, color: '#888', fontSize: 12 },
  googleBtn: { borderWidth: 1, borderColor: '#DDD', height: 50, borderRadius: 12, justifyContent: 'center', alignItems: 'center', backgroundColor: '#FFF' },
  googleBtnText: { color: '#333', fontSize: 15, fontWeight: '600' },
  signupText: { textAlign: 'center', color: '#666' },
  bold: { color: '#3F51B5', fontWeight: 'bold' }
});
