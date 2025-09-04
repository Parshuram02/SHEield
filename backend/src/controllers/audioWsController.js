const fs = require('fs');
const path = require('path');
const { AlertEvent } = require('../models');

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

    // Detect dangerous sounds based on audio characteristics
    classifyAudio(buffer) {
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
            timestamp: Date.now()
        };
    }

    // Process audio buffer with hysteresis
    processBuffer(audioData) {
        // Convert audio data to float array if needed
        let buffer;
        if (audioData instanceof Buffer) {
            buffer = new Float32Array(audioData.buffer);
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

        // Analyze current frame
        const analysis = this.classifyAudio(buffer);
        
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
                console.log('Received audio chunk:', data.length || data.byteLength);
                
                // Analyze audio in real-time
                const analysis = analyzer.processBuffer(data);
                
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
                                userId: 'unknown', // Will be set when user auth is implemented
                                type: analysis.classification,
                                trigger: {
                                    source: 'model',
                                    model: 'audio_analyzer'
                                },
                                confidence: analysis.dangerScore,
                                audioFiles: [filename],
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
                            } catch (err) {
                                console.error('Failed to save danger alert:', err);
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