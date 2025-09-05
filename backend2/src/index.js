
const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const path = require('path');
const fs = require('fs');
const { handleAudioWS } = require('./controllers/audioWsController');

const app = express();
const PORT = process.env.PORT || 8000;

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

server.listen(PORT, () => {
    console.log(`Server listening on port ${PORT}`);
});