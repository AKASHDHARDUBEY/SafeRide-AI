import React, { useState, useEffect } from 'react';
import { 
  View, Text, StyleSheet, TouchableOpacity, Modal, Alert, 
  Platform, ScrollView, ActivityIndicator 
} from 'react-native';
import { WebView } from 'react-native-webview';
import * as SecureStore from 'expo-secure-store';
import { Ionicons } from '@expo/vector-icons';

const BACKEND_URL = 'http://10.254.200.153:5001';
const RAZORPAY_KEY_ID = 'rzp_test_TJE8QzJSXhFEBD';

export default function UpgradeProScreen({ navigation }) {
  const [modalVisible, setModalVisible] = useState(false);
  const [checkoutHtml, setCheckoutHtml] = useState('');
  const [isPremium, setIsPremium] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    checkPremiumStatus();
  }, []);

  // Check if user already has Pro
  const checkPremiumStatus = async () => {
    try {
      const userId = await SecureStore.getItemAsync('user_uid');
      if (!userId) return;
      const res = await fetch(`${BACKEND_URL}/api/payment/status/${userId}`);
      const data = await res.json();
      if (data.success && data.isPremium) {
        setIsPremium(true);
      }
    } catch (err) {}
  };

  // 1. Create Order on Backend
  const startPayment = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${BACKEND_URL}/api/payment/create-order`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      const data = await response.json();

      if (data.success) {
        generateRazorpayHtml(data.order.id);
        setModalVisible(true);
      } else {
        Alert.alert('Error', 'Could not initiate payment.');
      }
    } catch (err) {
      Alert.alert('Error', 'Server connection failed. Make sure backend is running.');
    } finally {
      setLoading(false);
    }
  };

  // Generate Razorpay Checkout HTML for WebView
  const generateRazorpayHtml = (orderId) => {
    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <script src="https://checkout.razorpay.com/v1/checkout.js"></script>
          <style>
            body { 
              background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); 
              display: flex; justify-content: center; align-items: center; 
              height: 100vh; margin: 0; font-family: Arial; 
            }
            .loader { color: #fff; font-size: 18px; text-align: center; }
          </style>
        </head>
        <body>
          <div class="loader">
            <p>Opening Secure Payment...</p>
            <p style="font-size:14px; opacity:0.8;">Powered by Razorpay</p>
          </div>
          <script>
            var options = {
              "key": "${RAZORPAY_KEY_ID}",
              "amount": "100",
              "currency": "INR",
              "name": "SafeRide AI",
              "description": "Pro Safety Upgrade - INR 1",
              "order_id": "${orderId}",
              "theme": { "color": "#3F51B5" },
              "handler": function (response) {
                window.ReactNativeWebView.postMessage(JSON.stringify({
                  status: 'SUCCESS',
                  data: response
                }));
              },
              "modal": {
                "ondismiss": function() {
                  window.ReactNativeWebView.postMessage(JSON.stringify({ status: 'CANCELLED' }));
                }
              },
              "prefill": {
                "name": "SafeRide User",
                "contact": "9999999999"
              }
            };
            var rzp1 = new Razorpay(options);
            rzp1.on('payment.failed', function (response) {
              window.ReactNativeWebView.postMessage(JSON.stringify({
                status: 'FAILED',
                error: response.error
              }));
            });
            rzp1.open();
          </script>
        </body>
      </html>
    `;
    setCheckoutHtml(html);
  };

  const handleWebViewMessage = async (event) => {
    try {
      const res = JSON.parse(event.nativeEvent.data);
      setModalVisible(false);

      if (res.status === 'SUCCESS') {
        setLoading(true);
        const userId = await SecureStore.getItemAsync('user_uid');

        const verifyRes = await fetch(`${BACKEND_URL}/api/payment/verify-payment`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            razorpay_order_id: res.data.razorpay_order_id,
            razorpay_payment_id: res.data.razorpay_payment_id,
            razorpay_signature: res.data.razorpay_signature,
            userId: userId || 'USER_GUEST'
          })
        });

        const verifyData = await verifyRes.json();
        setLoading(false);

        if (verifyData.success) {
          setIsPremium(true);
          await SecureStore.setItemAsync('isPremium', 'true');
          Alert.alert(
            'Success', 
            'Pro Safety Features Unlocked Successfully!\n\n- Unlimited Emergency Contacts\n- Fast2SMS Direct Alert\n- Real-Time Emergency Chat\n- Anti-Tamper Watchdog'
          );
        } else {
          Alert.alert('Payment Failed', 'Signature verification failed. Please try again.');
        }
      } else if (res.status === 'CANCELLED') {
        Alert.alert('Payment Cancelled', 'You cancelled the payment.');
      } else if (res.status === 'FAILED') {
        Alert.alert('Payment Failed', res.error?.description || 'Payment could not be processed.');
      }
    } catch (err) {
      setModalVisible(false);
      Alert.alert('Error', 'Something went wrong processing the payment.');
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color="#FFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Choose Your Plan</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>

        <View style={styles.card}>
          <View style={styles.planHeader}>
            <Ionicons name="shield-outline" size={28} color="#888" />
            <Text style={styles.planName}>Free Plan</Text>
          </View>
          <Text style={styles.price}>INR 0 <Text style={styles.priceSub}>/ Forever</Text></Text>
          
          <View style={styles.featureRow}>
            <Ionicons name="checkmark-circle" size={18} color="#2ECC71" />
            <Text style={styles.featureText}>1 Emergency Contact</Text>
          </View>
          <View style={styles.featureRow}>
            <Ionicons name="checkmark-circle" size={18} color="#2ECC71" />
            <Text style={styles.featureText}>Basic SOS Alert</Text>
          </View>
          <View style={styles.featureRow}>
            <Ionicons name="checkmark-circle" size={18} color="#2ECC71" />
            <Text style={styles.featureText}>Standard Map Tracking</Text>
          </View>
          <View style={styles.featureRow}>
            <Ionicons name="close-circle" size={18} color="#CCC" />
            <Text style={[styles.featureText, { color: '#BBB' }]}>Fast2SMS Direct Alert</Text>
          </View>
          <View style={styles.featureRow}>
            <Ionicons name="close-circle" size={18} color="#CCC" />
            <Text style={[styles.featureText, { color: '#BBB' }]}>Emergency Chat Hub</Text>
          </View>

          <View style={styles.currentPlanBadge}>
            <Text style={styles.currentPlanText}>{isPremium ? 'Basic Plan' : 'Current Plan'}</Text>
          </View>
        </View>

        <View style={[styles.card, styles.proCard]}>
          <View style={styles.recommendedBadge}>
            <Text style={styles.recommendedText}>RECOMMENDED</Text>
          </View>

          <View style={styles.planHeader}>
            <Ionicons name="diamond-outline" size={28} color="#3F51B5" />
            <Text style={[styles.planName, { color: '#3F51B5' }]}>Pro Protection</Text>
          </View>
          <Text style={[styles.price, { color: '#3F51B5' }]}>
            INR 1 <Text style={styles.priceSub}>/ One-time Demo</Text>
          </Text>

          <View style={styles.featureRow}>
            <Ionicons name="checkmark-circle" size={18} color="#3F51B5" />
            <Text style={styles.featureText}>Unlimited Emergency Contacts</Text>
          </View>
          <View style={styles.featureRow}>
            <Ionicons name="checkmark-circle" size={18} color="#3F51B5" />
            <Text style={styles.featureText}>Fast2SMS Direct Mobile Alert</Text>
          </View>
          <View style={styles.featureRow}>
            <Ionicons name="checkmark-circle" size={18} color="#3F51B5" />
            <Text style={styles.featureText}>Firebase Push Notifications</Text>
          </View>
          <View style={styles.featureRow}>
            <Ionicons name="checkmark-circle" size={18} color="#3F51B5" />
            <Text style={styles.featureText}>Real-Time Emergency Chat Hub</Text>
          </View>
          <View style={styles.featureRow}>
            <Ionicons name="checkmark-circle" size={18} color="#3F51B5" />
            <Text style={styles.featureText}>Anti-Tamper Signal Watchdog</Text>
          </View>
          <View style={styles.featureRow}>
            <Ionicons name="checkmark-circle" size={18} color="#3F51B5" />
            <Text style={styles.featureText}>AI Safe Route Prediction</Text>
          </View>

          <TouchableOpacity 
            style={isPremium ? styles.activeBtn : styles.proBtn} 
            onPress={isPremium ? null : startPayment}
            disabled={isPremium || loading}
          >
            {loading ? (
              <ActivityIndicator color="#FFF" />
            ) : (
              <Text style={styles.btnText}>
                {isPremium ? 'Pro Active' : 'Upgrade to Pro (INR 1)'}
              </Text>
            )}
          </TouchableOpacity>
        </View>

        <View style={styles.testInfoCard}>
          <Text style={styles.testInfoTitle}>Testing Instructions (Razorpay Test Mode):</Text>
          <Text style={styles.testInfoItem}>
            1. <Text style={{ fontWeight: 'bold' }}>Netbanking</Text>: Select <Text style={{ fontWeight: 'bold', color: '#3F51B5' }}>SBI or HDFC</Text> -> Tap Pay -> Tap <Text style={{ fontWeight: 'bold', color: '#2ECC71' }}>"Success"</Text> button.
          </Text>
          <Text style={styles.testInfoItem}>
            2. <Text style={{ fontWeight: 'bold' }}>UPI</Text>: Type UPI ID <Text style={{ fontWeight: 'bold', color: '#3F51B5' }}>success@razorpay</Text> -> Tap Pay.
          </Text>
          <Text style={styles.testInfoItem}>
            3. <Text style={{ fontWeight: 'bold' }}>Card</Text>: Use Indian Test Card <Text style={{ fontWeight: 'bold', color: '#3F51B5' }}>4585 3333 3333 3333</Text> (Expiry: 12/28, CVV: 123).
          </Text>
        </View>

      </ScrollView>

      {/* Razorpay WebView Modal */}
      <Modal visible={modalVisible} animationType="slide" onRequestClose={() => setModalVisible(false)}>
        <View style={{ flex: 1 }}>
          <TouchableOpacity 
            style={styles.closeModal} 
            onPress={() => setModalVisible(false)}
          >
            <Ionicons name="close" size={24} color="#FFF" />
            <Text style={styles.closeModalText}>Close Payment</Text>
          </TouchableOpacity>
          {checkoutHtml ? (
            <WebView 
              source={{ html: checkoutHtml }}
              onMessage={handleWebViewMessage}
              javaScriptEnabled={true}
              domStorageEnabled={true}
              startInLoadingState={true}
              renderLoading={() => (
                <View style={styles.webviewLoading}>
                  <ActivityIndicator size="large" color="#3F51B5" />
                  <Text style={{ marginTop: 10, color: '#666' }}>Loading Razorpay...</Text>
                </View>
              )}
            />
          ) : null}
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F0F2F8' },
  header: { 
    backgroundColor: '#3F51B5', 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'space-between',
    paddingTop: Platform.OS === 'ios' ? 50 : 38,
    paddingBottom: 15,
    paddingHorizontal: 15
  },
  backBtn: { padding: 5 },
  headerTitle: { color: '#FFF', fontSize: 19, fontWeight: 'bold' },
  scrollContent: { padding: 18, paddingBottom: 40 },

  card: { 
    backgroundColor: '#FFF', 
    borderRadius: 18, 
    padding: 22, 
    marginBottom: 18, 
    elevation: 3,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 }
  },
  proCard: { 
    borderColor: '#3F51B5', 
    borderWidth: 2.5, 
    backgroundColor: '#F5F7FF' 
  },
  recommendedBadge: { 
    backgroundColor: '#3F51B5', 
    paddingHorizontal: 12, 
    paddingVertical: 5, 
    borderRadius: 6, 
    alignSelf: 'flex-start', 
    marginBottom: 12 
  },
  recommendedText: { color: '#FFF', fontSize: 11, fontWeight: 'bold', letterSpacing: 0.5 },

  planHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  planName: { fontSize: 20, fontWeight: 'bold', color: '#333', marginLeft: 10 },
  price: { fontSize: 32, fontWeight: 'bold', color: '#222', marginBottom: 15 },
  priceSub: { fontSize: 14, color: '#888', fontWeight: 'normal' },

  featureRow: { flexDirection: 'row', alignItems: 'center', marginVertical: 5 },
  featureText: { fontSize: 14, color: '#444', marginLeft: 8 },

  currentPlanBadge: { 
    backgroundColor: '#E8F5E9', 
    paddingVertical: 12, 
    borderRadius: 10, 
    alignItems: 'center', 
    marginTop: 18 
  },
  currentPlanText: { color: '#2ECC71', fontWeight: 'bold', fontSize: 14 },

  proBtn: { 
    backgroundColor: '#3F51B5', 
    height: 52, 
    borderRadius: 12, 
    justifyContent: 'center', 
    alignItems: 'center', 
    marginTop: 18,
    elevation: 4,
    shadowColor: '#3F51B5',
    shadowOpacity: 0.3,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 }
  },
  activeBtn: { 
    backgroundColor: '#2ECC71', 
    height: 52, 
    borderRadius: 12, 
    justifyContent: 'center', 
    alignItems: 'center', 
    marginTop: 18 
  },
  btnText: { color: '#FFF', fontWeight: 'bold', fontSize: 17 },

  testInfoCard: { 
    backgroundColor: '#FFF', 
    borderRadius: 12, 
    padding: 15, 
    marginTop: 10,
    elevation: 2,
    borderColor: '#E0E0E0',
    borderWidth: 1
  },
  testInfoTitle: { fontSize: 13, fontWeight: 'bold', color: '#333', marginBottom: 8 },
  testInfoItem: { fontSize: 12, color: '#555', marginVertical: 3, lineHeight: 18 },

  closeModal: { 
    backgroundColor: '#EF5350', 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'center',
    paddingTop: Platform.OS === 'ios' ? 50 : 38,
    paddingBottom: 12,
    paddingHorizontal: 15
  },
  closeModalText: { color: '#FFF', fontWeight: 'bold', fontSize: 16, marginLeft: 8 },

  webviewLoading: { 
    position: 'absolute', 
    top: 0, left: 0, right: 0, bottom: 0,
    justifyContent: 'center', 
    alignItems: 'center',
    backgroundColor: '#F5F7FA'
  }
});
