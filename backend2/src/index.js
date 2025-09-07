require('dotenv').config();

const contactsRouter = require('./routes/contacts');
// Middleware
const cors = require('cors');

const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const path = require('path');
const fs = require('fs');
const { handleAudioWS } = require('./controllers/audioWsController');
const mongoose = require('mongoose');
const twilio = require('twilio');

// Assuming you have a Contact model under models/Contact.js
const Contact = require('./models/contact');

// MongoDB connection function
async function connectDB() {
  const uri = process.env.MONGODB_URI || 'mongodb+srv://abhinav31102004_db_user:abh_abh_4545@cluster45.zhfibye.mongodb.net/SHEield';
  try {
    await mongoose.connect(uri);
    console.log('✅ Connected to MongoDB');
  } catch (err) {
    console.error('❌ MongoDB connection error:', err);
    process.exit(1);
  }
}

// Call connectDB at startup
connectDB();

const app = express();
const PORT = process.env.PORT || 8000;

// Setup Twilio client
const twilioClient = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);

app.use(cors({
  origin: "*", // allow requests from any origin
  methods: ["GET", "POST", "PUT", "DELETE"]
}));
app.use(express.json());

// Mount contacts router
app.use('/api/contacts', contactsRouter);

// Ensure uploads folder exists
const uploadsDir = path.join(__dirname, '../uploads');
try {
  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
    console.log('Uploads folder created:', uploadsDir);
  } else {
    console.log('Uploads folder already exists:', uploadsDir);
  }
} catch (err) {
  console.error('Error creating uploads folder:', err);
}

// Create HTTP server and WebSocket server
const server = http.createServer(app);
const wss = new WebSocket.Server({ server, path: '/audio' });

// Handle WebSocket connections for audio
wss.on('connection', handleAudioWS);

// Example REST endpoint
app.get('/', (req, res) => {
  res.send('Audio WebSocket server running');
});

// Twilio SMS sending endpoint to alert primary contact
app.post('/api/alert-primary-contact', async (req, res) => {
  try {
    const { latitude, longitude } = req.body;

    if (!latitude || !longitude) {
      return res.status(400).json({ success: false, error: "Missing latitude or longitude" });
    }

    // Find primary contact from database
    const primaryContact = await Contact.findOne({ isPrimary: true });
    if (!primaryContact) {
      return res.status(404).json({ success: false, error: "Primary contact not found" });
    }

    const phoneNumber = primaryContact.phoneE164 || primaryContact.phone;
    if (!phoneNumber) {
      return res.status(400).json({ success: false, error: "Primary contact phone number is missing" });
    }

    // Compose alert message with Google Maps location link
    const message = `Alert: I am not safe mere peeche JHONNY pada hai balls dikha rha save me. My current location is: https://www.google.com/maps?q=${latitude},${longitude}`;

    // Send SMS with Twilio
    const sms = await twilioClient.messages.create({
      body: message,
      from: process.env.TWILIO_FROM_NUMBER,
      to: phoneNumber,
    });

    res.status(200).json({ success: true, sid: sms.sid });
  } catch (error) {
    console.error('Twilio SMS error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Start server
server.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});
