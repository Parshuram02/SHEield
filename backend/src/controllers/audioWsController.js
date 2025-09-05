const fs = require('fs');
const path = require('path');
const { AlertEvent, Contact } = require('../models');
const DangerClassifier = require('../services/dangerClassifier');
const twilio = require('twilio');
const config = require('../config');

// Audio analysis and classification
class AudioAnalyzer {
    constructor() {
        this.bufferSize = 4096;
        this.sampleRate = 44100;
        this.buffer = [];
        this.frameCount = 0;
        this.lastClassification = null;
        this.dangerThreshold = 0.3;
        this.hysteresisFrames = 1; // Require N consecutive positive frames
        this.positiveFrameCount = 0;
        this.yamnetClassifier = new DangerClassifier();
        this.useYamnet = true; // Set to false to fall back to heuristic
    }

    // Calculate audio energy from buffer
    calculateEnergy(buffer) {
        let sum = 0;
        for (let i = 0; i < buffer.length; i++) {
            sum += buffer[i] * buffer[i];
        }
        return Math.sqrt(sum / buffer.length);
    }

    // Calculate zero crossing rate (indicates frequency content)
    calculateZeroCrossingRate(buffer) {
        let crossings = 0;
        for (let i = 1; i < buffer.length; i++) {
            if ((buffer[i] >= 0) !== (buffer[i - 1] >= 0)) {
                crossings++;
            }
        }
        return crossings / buffer.length;
    }

    // Simplified spectral centroid (pitch indicator)
    calculateSpectralCentroid(buffer) {
        let weightedSum = 0;
        let magnitudeSum = 0;
        
        for (let i = 0; i < buffer.length / 2; i++) {
            const magnitude = Math.abs(buffer[i]);
            weightedSum += i * magnitude;
            magnitudeSum += magnitude;
        }
        
        return magnitudeSum > 0 ? weightedSum / magnitudeSum : 0;
    }

    // Detect dangerous sounds using YAMNet or fallback to heuristic
    async classifyAudio(buffer) {
        if (this.useYamnet && this.yamnetClassifier.model) {
            try {
                // Convert buffer to Float32Array for YAMNet
                const audioData = new Float32Array(buffer);
                const result = await this.yamnetClassifier.classifyAudio(audioData, this.sampleRate);
                
                return {
                    classification: result.dangerType,
                    dangerScore: result.confidence,
                    isDangerous: result.isDangerous,
                    primaryClass: result.primaryClass,
                    allDangerClasses: result.allDangerClasses,
                    topPredictions: result.topPredictions,
                    model: 'YAMNet',
                    timestamp: Date.now()
                };
            } catch (error) {
                console.warn('YAMNet classification failed, falling back to heuristic:', error.message);
                this.useYamnet = false; // Disable YAMNet for this session
            }
        }

        // Fallback to heuristic classification
        const energy = this.calculateEnergy(buffer);
        const zeroCrossingRate = this.calculateZeroCrossingRate(buffer);
        const spectralCentroid = this.calculateSpectralCentroid(buffer);

        // Heuristic-based classification
        let dangerScore = 0;
        let classification = 'normal';

        // High energy sounds (crashes, impacts)
        if (energy > 0.4) {
            dangerScore += 0.4;
        }

        // High pitch sounds (screams, alarms)
        if (spectralCentroid > 0.6) {
            dangerScore += 0.3;
        }

        // Voice-like sounds (yelling, distress calls)
        if (energy > 0.2 && zeroCrossingRate > 0.1 && zeroCrossingRate < 0.3) {
            dangerScore += 0.3;
        }

        // Sudden loud sounds (gunshots, explosions)
        if (energy > 0.6) {
            dangerScore += 0.2;
        }

        // Map to danger categories
        if (dangerScore > 0.8) {
            classification = 'scream';
        } else if (dangerScore > 0.6) {
            classification = 'crash';
        } else if (dangerScore > 0.4) {
            classification = 'running';
        } else if (dangerScore > 0.2) {
            classification = 'caution';
        }

        return {
            classification,
            dangerScore: Math.min(1, dangerScore),
            energy,
            zeroCrossingRate,
            spectralCentroid,
            model: 'heuristic',
            timestamp: Date.now()
        };
    }

    // Process audio buffer with hysteresis
    async processBuffer(audioData) {
        // For WebM audio data, we'll use a simplified approach
        // Since WebM is compressed, we'll analyze the raw data characteristics
        let buffer;
        
        if (audioData instanceof Buffer) {
            // For WebM data, create a synthetic audio buffer based on data characteristics
            // This is a simplified approach - in production, you'd decode the WebM first
            const dataSize = audioData.length;
            const syntheticLength = Math.min(4096, Math.floor(dataSize / 4)); // Create synthetic buffer
            buffer = new Float32Array(syntheticLength);
            
            // Fill with synthetic audio data based on WebM characteristics
            for (let i = 0; i < syntheticLength; i++) {
                const byteIndex = Math.floor((i / syntheticLength) * dataSize);
                const byteValue = audioData[byteIndex] || 0;
                // Convert byte to float (-1 to 1 range)
                buffer[i] = (byteValue - 128) / 128;
            }
        } else if (audioData instanceof Float32Array) {
            buffer = audioData;
        } else {
            buffer = new Float32Array(audioData);
        }

        // Add to circular buffer
        this.buffer.push(buffer);
        this.frameCount++;

        // Keep last 5 seconds of audio
        const maxFrames = Math.floor(5 * this.sampleRate / this.bufferSize);
        if (this.buffer.length > maxFrames) {
            this.buffer.shift();
        }

        // Analyze current frame - use both synthetic buffer and raw data analysis
        const analysis = await this.classifyAudio(buffer);
        
        // Also analyze raw WebM data characteristics for additional insights
        if (audioData instanceof Buffer) {
            const rawAnalysis = this.analyzeWebMData(audioData);
            // Combine both analyses
            analysis.rawDataAnalysis = rawAnalysis;
            
            // Adjust danger score based on raw data characteristics
            let rawDangerBoost = 0;
            if (rawAnalysis.hasHighVariability) rawDangerBoost += 0.2;
            if (rawAnalysis.hasSuddenChanges) rawDangerBoost += 0.2;
            if (rawAnalysis.isLoud) rawDangerBoost += 0.3;
            if (rawAnalysis.complexity > 5) rawDangerBoost += 0.1;
            
            analysis.dangerScore = Math.min(1, analysis.dangerScore + rawDangerBoost);
            
            // Log raw analysis for debugging
            console.log('WebM Raw Analysis:', {
                dataSize: rawAnalysis.dataSize,
                hasHighVariability: rawAnalysis.hasHighVariability,
                hasSuddenChanges: rawAnalysis.hasSuddenChanges,
                isLoud: rawAnalysis.isLoud,
                complexity: rawAnalysis.complexity,
                dangerBoost: rawDangerBoost
            });
        }
        
        // Apply hysteresis to reduce false positives
        if (analysis.dangerScore > this.dangerThreshold) {
            this.positiveFrameCount++;
        } else {
            this.positiveFrameCount = 0;
        }

        // Only trigger if we have enough consecutive positive frames
        const isDangerous = this.positiveFrameCount >= this.hysteresisFrames;
        
        this.lastClassification = {
            ...analysis,
            isDangerous,
            frameCount: this.frameCount
        };

        return this.lastClassification;
    }

    // Get buffered audio for analysis
    getBufferedAudio() {
        return this.buffer;
    }

    // Clear buffer
    clearBuffer() {
        this.buffer = [];
        this.frameCount = 0;
        this.positiveFrameCount = 0;
    }

    // Analyze WebM data characteristics without decoding
    analyzeWebMData(webmBuffer) {
        const data = webmBuffer;
        const dataSize = data.length;
        
        // Calculate basic statistics
        let sum = 0;
        let variance = 0;
        let maxValue = 0;
        let minValue = 255;
        let changes = 0;
        
        for (let i = 0; i < dataSize; i++) {
            const value = data[i];
            sum += value;
            maxValue = Math.max(maxValue, value);
            minValue = Math.min(minValue, value);
            
            if (i > 0) {
                const change = Math.abs(value - data[i - 1]);
                if (change > 50) changes++; // Significant change threshold
            }
        }
        
        const mean = sum / dataSize;
        
        // Calculate variance
        for (let i = 0; i < dataSize; i++) {
            variance += Math.pow(data[i] - mean, 2);
        }
        variance /= dataSize;
        
        const standardDeviation = Math.sqrt(variance);
        const dynamicRange = maxValue - minValue;
        const changeRate = changes / dataSize;
        
        return {
            dataSize,
            mean,
            standardDeviation,
            dynamicRange,
            changeRate,
            hasHighVariability: standardDeviation > 30,
            hasSuddenChanges: changeRate > 0.1,
            isLoud: mean > 150 || dynamicRange > 100,
            complexity: standardDeviation * changeRate
        };
    }
}

// Initialize Twilio client (only if credentials are provided)
let twilioClient = null;
if (config.twilio.accountSid && config.twilio.authToken && config.twilio.accountSid.startsWith('AC')) {
    try {
        twilioClient = twilio(config.twilio.accountSid, config.twilio.authToken);
        console.log('✅ Twilio client initialized');
    } catch (error) {
        console.warn('⚠️ Failed to initialize Twilio client:', error.message);
    }
} else {
    console.log('⚠️ Twilio credentials not configured - SMS alerts disabled');
}

// Function to send emergency alerts to contacts
async function sendEmergencyAlert(alertEvent, audioFile) {
    try {
        // Get emergency contacts (for now, using a default user ID)
        const contacts = await Contact.find({ 
            userId: 'default', // Will be replaced with actual user ID when auth is implemented
            verifiedAt: { $exists: true }
        });

        if (contacts.length === 0) {
            console.log('No emergency contacts found');
            return;
        }

        const baseUrl = 'http://localhost:8000'; // Will be configurable
        const evidenceUrl = `${baseUrl}/api/evidence/${alertEvent._id}`;

        // Create alert message
        const message = `🚨 EMERGENCY ALERT 🚨\n` +
            `Dangerous sound detected!\n` +
            `Type: ${alertEvent.type.toUpperCase()}\n` +
            `Confidence: ${(alertEvent.confidence * 100).toFixed(1)}%\n` +
            `Time: ${new Date(alertEvent.occurredAt).toLocaleTimeString()}\n` +
            `Evidence: ${evidenceUrl}`;

        // Send to each contact
        for (const contact of contacts) {
            try {
                if (twilioClient) {
                    // Send SMS
                    const smsResult = await twilioClient.messages.create({
                        body: message,
                        from: config.twilio.fromNumber,
                        to: contact.phoneE164
                    });
                    console.log(`SMS sent to ${contact.name}: ${smsResult.sid}`);

                    // Send WhatsApp if configured
                    if (config.twilio.whatsappFrom) {
                        const waResult = await twilioClient.messages.create({
                            body: message,
                            from: config.twilio.whatsappFrom,
                            to: `whatsapp:${contact.phoneE164}`
                        });
                        console.log(`WhatsApp sent to ${contact.name}: ${waResult.sid}`);
                    }
                } else {
                    console.log(`⚠️ Twilio not configured - would send alert to ${contact.name} (${contact.phoneE164})`);
                    console.log(`Message: ${message}`);
                }
            } catch (error) {
                console.error(`Failed to send alert to ${contact.name}:`, error);
            }
        }
    } catch (error) {
        console.error('Error sending emergency alerts:', error);
    }
}

// This function handles incoming audio data chunks from the WebSocket
function handleAudioWS(ws) {
    let chunkIndex = 0;
    const analyzer = new AudioAnalyzer();
    
    // Send initial connection confirmation
    ws.send(JSON.stringify({ 
        type: 'connection', 
        status: 'connected',
        message: 'Audio analysis ready'
    }));

    ws.on('message', async (data) => {
        try {
            // Handle different message types
            if (typeof data === 'string') {
                const message = JSON.parse(data);
                
                if (message.type === 'danger_alert') {
                    // Frontend detected danger - log and process
                    console.log('Frontend danger alert:', message);
                    
                    // Create alert event
                    const alertEvent = new AlertEvent({
                        userId: message.userId || 'unknown',
                        type: 'manual',
                        trigger: {
                            source: 'frontend',
                            model: 'client_vad'
                        },
                        confidence: message.analysis?.dangerScore || 0.5,
                        location: message.location || null,
                        audioFiles: [],
                        notes: 'Frontend VAD detected dangerous sound',
                        meta: {
                            frontendAnalysis: message.analysis,
                            timestamp: message.timestamp
                        }
                    });

                    try {
                        await alertEvent.save();
                        console.log('Alert event saved:', alertEvent._id);
                        
                        // Send confirmation back to frontend
                        ws.send(JSON.stringify({
                            type: 'alert_confirmed',
                            alertId: alertEvent._id,
                            status: 'saved'
                        }));
                    } catch (err) {
                        console.error('Failed to save alert event:', err);
                        ws.send(JSON.stringify({
                            type: 'alert_error',
                            error: 'Failed to save alert'
                        }));
                    }
                }
                return;
            }

            // Handle binary audio data
            if (data instanceof Buffer || data instanceof ArrayBuffer) {
                console.log('Received audio chunk:', data.length || data.byteLength, 'bytes');
                
                // Log audio chunk details for debugging
                if (data.length > 0) {
                    console.log('Audio chunk details:', {
                        size: data.length,
                        timestamp: new Date().toISOString(),
                        chunkIndex: chunkIndex
                    });
                }
                
                // Analyze audio in real-time
                const analysis = await analyzer.processBuffer(data);
                
                // Log analysis results for debugging
                console.log('Audio analysis:', {
                    isDangerous: analysis.isDangerous,
                    classification: analysis.classification,
                    dangerScore: analysis.dangerScore,
                    confidence: analysis.confidence,
                    chunkIndex: chunkIndex
                });
                
                // Send real-time analysis back to frontend
                ws.send(JSON.stringify({
                    type: 'audio_analysis',
                    analysis: analysis,
                    chunkIndex: chunkIndex
                }));

                // If dangerous sound detected, save audio and create alert
                if (analysis.isDangerous) {
                    const filename = `danger_audio_${Date.now()}_${chunkIndex}.webm`;
                    const filePath = path.join(__dirname, '../../uploads', filename);
                    
                    // Save dangerous audio chunk
                    fs.writeFile(filePath, data, async (err) => {
                        if (err) {
                            console.error('Error saving danger audio:', err);
                            ws.send(JSON.stringify({ 
                                type: 'error', 
                                message: 'Failed to save danger audio.' 
                            }));
                        } else {
                            console.log('Danger audio saved:', filename);
                            
                            // Create alert event for dangerous sound
                            const alertEvent = new AlertEvent({
                                userId: 'default', // Using string userId for testing
                                type: analysis.classification,
                                trigger: {
                                    source: 'model',
                                    model: 'audio_analyzer'
                                },
                                confidence: analysis.dangerScore,
                                audioFiles: [{
                                    filename: filename,
                                    originalName: filename,
                                    mimeType: 'audio/webm',
                                    size: data.length,
                                    duration: 1.0,
                                    uploadPath: `/uploads/${filename}`
                                }],
                                notes: `Dangerous sound detected: ${analysis.classification}`,
                                meta: {
                                    analysis: analysis,
                                    audioFile: filename
                                }
                            });

                            try {
                                await alertEvent.save();
                                console.log('Danger alert saved:', alertEvent._id);
                                
                                // Send danger alert to frontend
                                ws.send(JSON.stringify({
                                    type: 'danger_detected',
                                    alertId: alertEvent._id,
                                    classification: analysis.classification,
                                    confidence: analysis.dangerScore,
                                    audioFile: filename,
                                    timestamp: Date.now()
                                }));
                                
                                // Automatically send emergency alerts to contacts
                                await sendEmergencyAlert(alertEvent, filename);
                                
                            } catch (err) {
                                console.error('Failed to save danger alert:', err.message);
                                
                                // Send alert to frontend even if database save fails
                                ws.send(JSON.stringify({
                                    type: 'danger_detected',
                                    alertId: 'temp_' + Date.now(),
                                    classification: analysis.classification,
                                    confidence: analysis.dangerScore,
                                    audioFile: filename,
                                    timestamp: Date.now(),
                                    warning: 'Database unavailable - alert not saved'
                                }));
                            }
                        }
                    });
                } else {
                    // Save normal audio chunk (optional, for debugging)
                    const filename = `audio_chunk_${Date.now()}_${chunkIndex}.webm`;
                    const filePath = path.join(__dirname, '../../uploads', filename);
                    
                    fs.writeFile(filePath, data, (err) => {
                        if (err) {
                            console.error('Error saving audio chunk:', err);
                            ws.send(JSON.stringify({ 
                                type: 'error', 
                                message: 'Failed to save audio.' 
                            }));
                        } else {
                            console.log('Audio chunk saved:', filename);
                            ws.send(JSON.stringify({ 
                                type: 'audio_saved',
                                status: 'success', 
                                filename,
                                analysis: analysis
                            }));
                        }
                    });
                }
                
                chunkIndex++;
            }
        } catch (err) {
            console.error('Error processing audio message:', err);
            ws.send(JSON.stringify({ 
                type: 'error', 
                message: 'Failed to process audio data.' 
            }));
        }
    });

    ws.on('close', () => {
        console.log('WebSocket connection closed');
        analyzer.clearBuffer();
    });

    ws.on('error', (err) => {
        console.error('WebSocket error:', err);
        analyzer.clearBuffer();
    });
}

module.exports = { handleAudioWS };