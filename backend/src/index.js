require('dotenv').config();
const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const path = require('path');
const fs = require('fs');
const mongoose = require('mongoose');
const config = require('./config');
const { handleAudioWS } = require('./controllers/audioWsController');
const config = require('./config'); // Assuming you have a config module exporting env vars


// Import routes
const contactsRoutes = require('./routes/contacts');
const alertsRoutes = require('./routes/alerts');
const evidenceRoutes = require('./routes/evidence');
const keywordsRoutes = require('./routes/keywords');
const placesRoutes = require('./routes/places');

const app = express();
const PORT = process.env.PORT || 8000;
const MONGODB_URI = process.env.MONGODB_URI || '';

app.use(express.json());
app.use(express.static(path.join(__dirname, '../uploads')));

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
wss.on('connection', handleAudioWS);

// API Routes
app.use('/api/contacts', contactsRoutes);
app.use('/api/alerts', alertsRoutes);
app.use('/api/evidence', evidenceRoutes);
app.use('/api/keywords', keywordsRoutes);
app.use('/api/places', placesRoutes);

// Test endpoint for audio classification
app.get('/api/test/audio', (req, res) => {
    res.json({
        message: 'Audio classification system is running',
        features: [
            'Real-time audio analysis',
            'Danger sound detection',
            'WebSocket streaming',
            'Audio buffering and classification',
            'SMS alerts via Twilio',
            'Emergency contacts management',
            'Evidence sharing and audio downloads'
        ],
        status: 'active'
    });
});

// Health check endpoint
app.get('/health', (req, res) => {
    res.json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        mongo: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
        twilio: config.twilio.accountSid ? 'confHEieldigured' : 'not configured'
    });
});

// Example REST endpoint
app.get('/', (req, res) => {
    res.send('Audio WebSocket server running');
});

// MongoDB connection event logs
mongoose.connection.on('connected', () => {
    console.log('🟢 MongoDB connected');
});

mongoose.connection.on('error', err => {
    console.error('🔴 MongoDB connection error:', err);
});

mongoose.connection.on('disconnected', () => {
    console.warn('⚠️ MongoDB disconnected');
});

async function start() {
    try {
        if (!MONGODB_URI) {
            console.warn('MONGODB_URI not set. Mongo connection will be skipped.');
        } else {
            await mongoose.connect(MONGODB_URI, {
                useNewUrlParser: true,
                useUnifiedTopology: true,
                serverSelectionTimeoutMS: 5000,
            });
            console.log('Connected to MongoDB');
        }

        server.listen(PORT, () => {
            console.log(`🚀 Server listening on port ${PORT}`);
            console.log(`🔊 WebSocket endpoint: ws://localhost:${PORT}/audio`);
            console.log(`📡 Test endpoint: http://localhost:${PORT}/api/test/audio`);
            console.log(`📞 Contacts API: http://localhost:${PORT}/api/contacts`);
            console.log(`🚨 Alerts API: http://localhost:${PORT}/api/alerts`);
            console.log(`📁 Evidence API: http://localhost:${PORT}/api/evidence`);
        });
    } catch (err) {
        console.error('Failed to start server:', err);
        process.exit(1);
    }
}

start();
