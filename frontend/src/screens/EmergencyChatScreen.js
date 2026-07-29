import React, { useState, useEffect } from 'react';
import { 
  View, Text, TextInput, TouchableOpacity, FlatList, StyleSheet, KeyboardAvoidingView, Platform 
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as SecureStore from 'expo-secure-store';
import SocketService from '../services/SocketService';

export default function EmergencyChatScreen({ route, navigation }) {
  // Params passed during navigation or emergency open
  const routeParams = route.params || {};
  const activeTripId = routeParams.tripId || SocketService.activeTripId || 'EMERGENCY_ROOM';
  const userRole = routeParams.userRole || 'VICTIM';
  const userName = routeParams.userName || 'Akash';
  const initialMessage = routeParams.initialMessage;

  const [messages, setMessages] = useState(initialMessage ? [initialMessage] : []);
  const [inputText, setInputText] = useState('');
  const [currentLocation, setCurrentLocation] = useState(null);

  const cacheKey = `chat_cache_${activeTripId}`;

  // Helper to save messages to local SecureStore
  const saveMessagesToLocalCache = async (msgs) => {
    try {
      if (msgs && msgs.length > 0) {
        await SecureStore.setItemAsync(cacheKey, JSON.stringify(msgs));
      }
    } catch (e) {}
  };

  useEffect(() => {
    // 1. Ensure Socket is initialized & join room
    SocketService.initializeSocket();

    // 2. First load instantly from local SecureStore cache
    SecureStore.getItemAsync(cacheKey).then(cached => {
      if (cached) {
        try {
          const parsed = JSON.parse(cached);
          if (Array.isArray(parsed) && parsed.length > 0) {
            setMessages(prev => {
              const map = new Map();
              parsed.forEach(m => map.set(`${m.text}_${m.sender}`, m));
              prev.forEach(m => map.set(`${m.text}_${m.sender}`, m));
              return Array.from(map.values());
            });
          }
        } catch (e) {}
      }
    });

    // 3. Fetch saved chat history from MongoDB via REST API
    fetch(`http://10.254.200.153:5001/api/chat/${activeTripId}`)
      .then(res => res.json())
      .then(data => {
        if (data.status === 'SUCCESS' && Array.isArray(data.messages) && data.messages.length > 0) {
          setMessages(prev => {
            const map = new Map();
            data.messages.forEach(m => map.set(`${m.text}_${m.sender}`, m));
            prev.forEach(m => map.set(`${m.text}_${m.sender}`, m));
            const merged = Array.from(map.values());
            saveMessagesToLocalCache(merged);
            return merged;
          });
        }
      })
      .catch(err => console.log('Error fetching chat history:', err.message));

    if (SocketService.socket) {
      SocketService.socket.emit('joinEmergencyRoom', { tripId: activeTripId });
      SocketService.socket.emit('getChatHistory', { tripId: activeTripId });

      // Listen for socket history data
      SocketService.socket.on('chatHistoryData', (history) => {
        if (Array.isArray(history) && history.length > 0) {
          setMessages(prev => {
            const map = new Map();
            history.forEach(m => map.set(`${m.text}_${m.sender}`, m));
            prev.forEach(m => map.set(`${m.text}_${m.sender}`, m));
            const merged = Array.from(map.values());
            saveMessagesToLocalCache(merged);
            return merged;
          });
        }
      });

      // Listen for incoming Real-time Messages
      SocketService.socket.on('receiveEmergencyMessage', (newMessage) => {
        setMessages((prevMessages) => {
          const exists = prevMessages.some(
            m => m.text === newMessage.text && m.sender === newMessage.sender && Math.abs(new Date(m.timestamp) - new Date(newMessage.timestamp)) < 2000
          );
          if (exists) return prevMessages;
          const updated = [...prevMessages, newMessage];
          saveMessagesToLocalCache(updated);
          return updated;
        });
      });

      // Listen for Live Location Updates from Victim
      SocketService.socket.on('locationUpdated', (locData) => {
        setCurrentLocation(locData);
      });
    }

    // Cleanup listeners when leaving screen
    return () => {
      if (SocketService.socket) {
        SocketService.socket.off('receiveEmergencyMessage');
        SocketService.socket.off('locationUpdated');
      }
    };
  }, [activeTripId]);

  const sendMessage = () => {
    if (!inputText.trim()) return;

    const messageData = {
      tripId: activeTripId,
      sender: userRole,
      senderName: userName || (userRole === 'VICTIM' ? 'Rider' : 'Guardian'),
      text: inputText.trim(),
      timestamp: new Date().toISOString()
    };

    // Optimistic UI Update: add message immediately & cache locally
    setMessages((prevMessages) => {
      const updated = [...prevMessages, messageData];
      saveMessagesToLocalCache(updated);
      return updated;
    });

    // Emit message to Backend
    if (SocketService.socket) {
      SocketService.socket.emit('sendEmergencyMessage', messageData);
    }
    setInputText('');
  };

  return (
    <KeyboardAvoidingView 
      style={styles.container} 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 25}
    >
      {/* Top Banner with Back Arrow */}
      <View style={styles.topBanner}>
        <TouchableOpacity 
          style={styles.backButton} 
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={26} color="#FFF" />
        </TouchableOpacity>

        <View style={styles.bannerHeader}>
          <Text style={styles.bannerTitle}>🚨 Emergency Safety Hub</Text>
          {currentLocation ? (
            <Text style={styles.locationText}>
              📍 Live GPS: {currentLocation.latitude.toFixed(4)}, {currentLocation.longitude.toFixed(4)}
            </Text>
          ) : (
            <Text style={styles.locationText}>📡 Syncing Live Location...</Text>
          )}
        </View>
      </View>

      {/* Chat Messages List */}
      <FlatList
        data={messages}
        keyExtractor={(item, index) => index.toString()}
        renderItem={({ item }) => {
          const isMyMessage = item.sender === userRole;
          return (
            <View style={[
              styles.messageBubble, 
              isMyMessage ? styles.myBubble : styles.otherBubble
            ]}>
              <Text style={styles.senderName}>{item.senderName}</Text>
              <Text style={styles.messageText}>{item.text}</Text>
              <Text style={styles.timeText}>
                {new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </Text>
            </View>
          );
        }}
        contentContainerStyle={{ padding: 15 }}
      />

      {/* Message Input Box */}
      <View style={styles.inputContainer}>
        <TextInput
          style={styles.textInput}
          placeholder="Type an emergency message..."
          placeholderTextColor="#888"
          value={inputText}
          onChangeText={setInputText}
        />
        <TouchableOpacity style={styles.sendButton} onPress={sendMessage}>
          <Text style={styles.sendButtonText}>Send</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F7FA' },
  topBanner: { 
    backgroundColor: '#EF5350', 
    paddingHorizontal: 15, 
    paddingTop: Platform.OS === 'ios' ? 45 : 35, 
    paddingBottom: 15,
    flexDirection: 'row', 
    alignItems: 'center' 
  },
  backButton: {
    paddingRight: 10,
    justifyContent: 'center'
  },
  bannerHeader: {
    flex: 1,
    alignItems: 'center',
    marginRight: 26
  },
  bannerTitle: { color: '#FFF', fontSize: 17, fontWeight: 'bold' },
  locationText: { color: '#FFEEEB', fontSize: 13, marginTop: 4 },
  messageBubble: { padding: 12, borderRadius: 12, marginBottom: 10, maxWidth: '80%' },
  myBubble: { alignSelf: 'flex-end', backgroundColor: '#3F51B5' },
  otherBubble: { alignSelf: 'flex-start', backgroundColor: '#E0E0E0' },
  senderName: { fontSize: 11, color: '#DDD', marginBottom: 2, fontWeight: 'bold' },
  messageText: { color: '#FFF', fontSize: 15 },
  timeText: { fontSize: 10, color: '#BBB', textAlign: 'right', marginTop: 4 },
  inputContainer: { 
    flexDirection: 'row', 
    paddingHorizontal: 12, 
    paddingTop: 10,
    paddingBottom: Platform.OS === 'android' ? 28 : 15,
    backgroundColor: '#FFF', 
    borderTopWidth: 1, 
    borderColor: '#EEE' 
  },
  textInput: { flex: 1, height: 45, backgroundColor: '#F0F2F5', borderRadius: 20, paddingHorizontal: 15, fontSize: 15 },
  sendButton: { backgroundColor: '#3F51B5', borderRadius: 20, paddingHorizontal: 20, justifyContent: 'center', marginLeft: 8 },
  sendButtonText: { color: '#FFF', fontWeight: 'bold' }
});
