require('dotenv').config();
const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const path = require('path');
const fs = require('fs');
const mongoose = require('mongoose');
const { handleAudioWS } = require('./controllers/audioWsController');

const app = express();
const PORT = process.env.PORT || 8000;
const MONGODB_URI = process.env.MONGODB_URI || '';

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

async function start() {
    try {
        if (!MONGODB_URI) {
            console.warn('MONGODB_URI not set. Mongo connection will be skipped.');
        } else {
            await mongoose.connect(MONGODB_URI, {
                serverSelectionTimeoutMS: 5000,
            });
            console.log('Connected to MongoDB');
        }

        server.listen(PORT, () => {
            console.log(`Server listening on port ${PORT}`);
        });
    } catch (err) {
        console.error('Failed to start server:', err);
        process.exit(1);
    }
}

start();