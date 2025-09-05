// Test server startup without MongoDB
require('dotenv').config();
const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const path = require('path');
const fs = require('fs');
const config = require('./src/config');

const app = express();
const PORT = config.server.port;

// Middleware
app.use(express.json());
app.use(express.static(path.join(__dirname, 'uploads')));

// Ensure uploads folder exists
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
    console.log('Uploads folder created:', uploadsDir);
} else {
    console.log('Uploads folder already exists:', uploadsDir);
}

// Create HTTP server and WebSocket server
const server = http.createServer(app);
const wss = new WebSocket.Server({ server, path: '/audio' });

// Simple WebSocket handler for testing
wss.on('connection', (ws) => {
    console.log('WebSocket client connected');
    
    ws.send(JSON.stringify({ 
        type: 'connection', 
        status: 'connected',
        message: 'Audio analysis ready (no database)'
    }));

    ws.on('message', (data) => {
        console.log('Received message:', data.length || data.byteLength, 'bytes');
        
        // Send back a simple response
        ws.send(JSON.stringify({
            type: 'audio_analysis',
            analysis: {
                isDangerous: false,
                classification: 'normal',
                dangerScore: 0.1,
                confidence: 0.1,
                model: 'test',
                timestamp: Date.now()
            },
            chunkIndex: 0
        }));
    });

    ws.on('close', () => {
        console.log('WebSocket client disconnected');
    });
});

// Test endpoint
app.get('/api/test/audio', (req, res) => {
    res.json({
        message: 'Audio classification system is running (no database)',
        features: [
            'Real-time audio analysis',
            'WebSocket streaming',
            'Audio processing (without database storage)',
            'Test mode active'
        ],
        status: 'active',
        database: 'disabled'
    });
});

// Health check endpoint
app.get('/health', (req, res) => {
    res.json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        mongo: 'disabled',
        mode: 'test'
    });
});

// Root endpoint
app.get('/', (req, res) => {
    res.send('Audio WebSocket server running (test mode - no database)');
});

// Start server
server.listen(PORT, () => {
    console.log(`✅ Test server started on port ${PORT}`);
    console.log(`WebSocket endpoint: ws://localhost:${PORT}/audio`);
    console.log(`Test endpoint: http://localhost:${PORT}/api/test/audio`);
    console.log(`Health check: http://localhost:${PORT}/health`);
    console.log('⚠️ Running in test mode - no database connection');
});

console.log('🧪 Starting test server without database...');



