import React, { useState, useEffect } from 'react';
import { 
  View, Text, TextInput, TouchableOpacity, FlatList, StyleSheet, KeyboardAvoidingView, Platform 
} from 'react-native';
import SocketService from '../services/SocketService';

export default function EmergencyChatScreen({ route, navigation }) {
  // Params passed during navigation or emergency open
  const { tripId, userRole, userName } = route.params || { 
    tripId: 'TRIP_123', 
    userRole: 'VICTIM', // or 'GUARDIAN'
    userName: 'Akash' 
  };

  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  const [currentLocation, setCurrentLocation] = useState(null);

  useEffect(() => {
    // 1. Join Socket Room for this specific Emergency Trip
    if (SocketService.socket) {
      SocketService.socket.emit('joinEmergencyRoom', { tripId });

      // 2. Listen for incoming Real-time Messages
      SocketService.socket.on('receiveEmergencyMessage', (newMessage) => {
        setMessages((prevMessages) => [...prevMessages, newMessage]);
      });

      // 3. Listen for Live Location Updates from Victim
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
  }, [tripId]);

  const sendMessage = () => {
    if (!inputText.trim()) return;

    const messageData = {
      tripId,
      sender: userRole,     // 'VICTIM' or 'GUARDIAN'
      senderName: userName,
      text: inputText
    };

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
    >
      {/* Top Banner: Live Status & Location Link */}
      <View style={styles.topBanner}>
        <Text style={styles.bannerTitle}>🚨 Emergency Safety Hub</Text>
        {currentLocation ? (
          <Text style={styles.locationText}>
            📍 Live GPS: {currentLocation.latitude.toFixed(4)}, {currentLocation.longitude.toFixed(4)}
          </Text>
        ) : (
          <Text style={styles.locationText}>📡 Syncing Live Location...</Text>
        )}
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
  topBanner: { backgroundColor: '#EF5350', padding: 15, paddingTop: 40, alignItems: 'center' },
  bannerTitle: { color: '#FFF', fontSize: 18, fontWeight: 'bold' },
  locationText: { color: '#FFEEEB', fontSize: 13, marginTop: 4 },
  messageBubble: { padding: 12, borderRadius: 12, marginBottom: 10, maxWidth: '80%' },
  myBubble: { alignSelf: 'flex-end', backgroundColor: '#3F51B5' },
  otherBubble: { alignSelf: 'flex-start', backgroundColor: '#E0E0E0' },
  senderName: { fontSize: 11, color: '#DDD', marginBottom: 2, fontWeight: 'bold' },
  messageText: { color: '#FFF', fontSize: 15 },
  timeText: { fontSize: 10, color: '#BBB', textAlign: 'right', marginTop: 4 },
  inputContainer: { flexDirection: 'row', padding: 10, backgroundColor: '#FFF', borderTopWidth: 1, borderColor: '#EEE' },
  textInput: { flex: 1, height: 45, backgroundColor: '#F0F2F5', borderRadius: 20, paddingHorizontal: 15, fontSize: 15 },
  sendButton: { backgroundColor: '#3F51B5', borderRadius: 20, paddingHorizontal: 20, justifyContent: 'center', marginLeft: 8 },
  sendButtonText: { color: '#FFF', fontWeight: 'bold' }
});
