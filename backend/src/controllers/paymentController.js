const Razorpay = require('razorpay');
const crypto = require('crypto');
const User = require('../models/User');

// Initialize Razorpay SDK with Test Keys
const razorpay = new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_KEY_SECRET,
});

class PaymentController {

    // 1. Create ₹1 Order (App button click triggers this)
    async createOrder(req, res) {
        try {
            const options = {
                amount: 100, // ₹1 = 100 Paise (Razorpay uses paise)
                currency: 'INR',
                receipt: `receipt_${Date.now()}`,
                notes: {
                    app: 'SafeRide AI',
                    plan: 'Pro Safety Upgrade'
                }
            };

            const order = await razorpay.orders.create(options);
            console.log('💳 Razorpay Order Created:', order.id);
            res.json({ success: true, order });
        } catch (err) {
            console.error('❌ Razorpay Order Error:', err.message);
            res.status(500).json({ success: false, message: 'Failed to create payment order' });
        }
    }

    // 2. Verify Payment Signature (Security: HMAC-SHA256)
    async verifyPayment(req, res) {
        const { razorpay_order_id, razorpay_payment_id, razorpay_signature, userId } = req.body;

        try {
            // Generate expected signature using Razorpay Key Secret
            const body = razorpay_order_id + '|' + razorpay_payment_id;
            const expectedSignature = crypto
                .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
                .update(body.toString())
                .digest('hex');

            if (expectedSignature === razorpay_signature) {
                // ✅ Payment is genuine! Update user to Premium in MongoDB
                if (userId) {
                    await User.findOneAndUpdate(
                        { userId },
                        { 
                            isPremium: true, 
                            paymentId: razorpay_payment_id,
                            paymentOrderId: razorpay_order_id,
                            premiumActivatedAt: new Date()
                        },
                        { upsert: true, new: true }
                    );
                }

                console.log(`🎉 Payment Verified & Pro Unlocked for User: ${userId}`);
                return res.json({ success: true, message: 'Payment verified! Pro Features Unlocked.' });
            } else {
                console.log('❌ Invalid Payment Signature');
                return res.status(400).json({ success: false, message: 'Invalid Payment Signature' });
            }
        } catch (err) {
            console.error('❌ Verification Error:', err.message);
            res.status(500).json({ success: false, message: 'Payment verification failed' });
        }
    }

    // 3. Check Premium Status
    async checkPremiumStatus(req, res) {
        const { userId } = req.params;
        try {
            const user = await User.findOne({ userId });
            res.json({ 
                success: true, 
                isPremium: user ? user.isPremium : false,
                paymentId: user ? user.paymentId : null
            });
        } catch (err) {
            res.status(500).json({ success: false, message: err.message });
        }
    }
}

module.exports = new PaymentController();
