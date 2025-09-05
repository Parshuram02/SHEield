
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

// MongoDB connection function
async function connectDB() {
    const uri = 'mongodb+srv://abhinav31102004_db_user:abh_abh_4545@cluster45.zhfibye.mongodb.net/SHEield';
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

app.use(cors({
  origin: "*", // allow requests from any origin
  methods: ["GET", "POST", "PUT", "DELETE"]
}));
app.use(express.json());
// Mount contacts router

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
app.use('/api/contacts', contactsRouter);
server.listen(PORT, () => {
    console.log(`Server listening on port ${PORT}`);
});