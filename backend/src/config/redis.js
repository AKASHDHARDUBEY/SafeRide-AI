const redis = require('redis');
const dotenv = require('dotenv');
dotenv.config();

const client = redis.createClient({ url: process.env.REDIS_URL });

client.on('error', (err) => console.log('❌ Redis Client Error', err));

(async () => {
    await client.connect();
    console.log('✅ Redis Connected');
})();

module.exports = client;
