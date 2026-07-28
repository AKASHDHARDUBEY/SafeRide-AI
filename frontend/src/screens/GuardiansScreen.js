import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, KeyboardAvoidingView, Platform, FlatList } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as SecureStore from 'expo-secure-store';

export default function GuardiansScreen({ navigation }) {
  const [guardianInput, setGuardianInput] = useState('');
  const [guardians, setGuardians] = useState([]);

  useEffect(() => {
    loadGuardians();
  }, []);

  const loadGuardians = async () => {
    try {
      const storedGuardians = await SecureStore.getItemAsync('guardians');
      if (storedGuardians) {
        setGuardians(JSON.parse(storedGuardians));
      }
    } catch (error) {
      console.log('Error loading guardians:', error);
    }
  };

  const saveGuardians = async (newGuardians) => {
    try {
      await SecureStore.setItemAsync('guardians', JSON.stringify(newGuardians));
      setGuardians(newGuardians);
    } catch (error) {
      console.log('Error saving guardians:', error);
    }
  };

  const handleAddGuardian = () => {
    if (!guardianInput.trim()) {
      return;
    }
    if (guardians.length >= 3) {
      Alert.alert('Limit Reached', 'You can only add up to 3 guardians for now.');
      return;
    }
    const updated = [...guardians, guardianInput.trim()];
    saveGuardians(updated);
    setGuardianInput('');
  };

  const handleRemoveGuardian = (index) => {
    const updated = guardians.filter((_, i) => i !== index);
    saveGuardians(updated);
  };

  const renderGuardian = ({ item, index }) => (
    <View style={styles.guardianItem}>
      <Ionicons name="person-outline" size={20} color="#3F51B5" />
      <Text style={styles.guardianText}>{item}</Text>
      <TouchableOpacity onPress={() => handleRemoveGuardian(index)}>
        <Ionicons name="trash-outline" size={20} color="#EF5350" />
      </TouchableOpacity>
    </View>
  );

  return (
    <KeyboardAvoidingView 
      style={styles.container} 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.title}>Trusted Guardians</Text>
        <Text style={styles.subtitle}>Add up to 3 trusted contacts to be notified in case of emergency.</Text>
      </View>

      <View style={styles.card}>
        <View style={styles.inputRow}>
          <View style={styles.inputWrapper}>
            <Ionicons name="call-outline" size={20} color="#888" style={styles.icon} />
            <TextInput
              style={styles.input}
              placeholder="Phone Number or Email"
              placeholderTextColor="#888"
              keyboardType="email-address"
              autoCapitalize="none"
              value={guardianInput}
              onChangeText={setGuardianInput}
            />
          </View>
          <TouchableOpacity style={styles.addButton} onPress={handleAddGuardian}>
            <Ionicons name="add" size={24} color="#fff" />
          </TouchableOpacity>
        </View>

        <FlatList
          data={guardians}
          keyExtractor={(item, index) => index.toString()}
          renderItem={renderGuardian}
          ListEmptyComponent={<Text style={styles.emptyText}>No guardians added yet.</Text>}
          style={styles.list}
        />
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
          <Ionicons name="shield" size={24} color="#3F51B5" />
          <Text style={[styles.navText, { color: '#3F51B5', fontWeight: 'bold' }]}>Safety</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.navItem} onPress={() => navigation.navigate('Profile')}>
          <Ionicons name="person-outline" size={24} color="#888" />
          <Text style={styles.navText}>Profile</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#F0F2F5', // Match login background
    paddingTop: Platform.OS === 'ios' ? 50 : 20
  },
  header: {
    marginBottom: 20,
  },
  backButton: {
    marginBottom: 15
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#333'
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    marginTop: 5
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 30,
    padding: 20,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 5,
    flex: 1
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20
  },
  inputWrapper: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f9f9f9',
    borderColor: '#ddd',
    borderWidth: 1,
    borderRadius: 15,
    paddingHorizontal: 15,
    height: 55,
    marginRight: 10
  },
  icon: {
    marginRight: 10
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: '#333'
  },
  addButton: {
    backgroundColor: '#3F51B5', // Deep Indigo
    height: 55,
    width: 55,
    borderRadius: 27.5,
    justifyContent: 'center',
    alignItems: 'center'
  },
  list: {
    flex: 1
  },
  guardianItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0F2F5',
    padding: 15,
    borderRadius: 15,
    marginBottom: 10
  },
  guardianText: {
    flex: 1,
    fontSize: 16,
    color: '#333',
    marginLeft: 10
  },
  emptyText: {
    textAlign: 'center',
    color: '#888',
    marginTop: 20,
    fontSize: 16
  },
  bottomNav: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    borderTopWidth: 1,
    borderTopColor: '#eee',
    paddingTop: 15,
    backgroundColor: '#fff',
    paddingBottom: Platform.OS === 'android' ? 28 : 12,
    marginTop: 20,
    marginHorizontal: -20,
    marginBottom: -20
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
