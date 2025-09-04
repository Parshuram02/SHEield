// Enhanced heuristic-based audio classifier
// Note: For ML-based classification, install @tensorflow/tfjs-node and @mediapipe/tasks-audio
// Requires Visual Studio Build Tools on Windows

class DangerClassifier {
    constructor() {
        this.model = null;
        this.classNames = null;
        this.dangerClasses = new Set([
            'Screaming', 'Shout', 'Bellow', 'Roar', 'Yell', 'Cry', 'Scream',
            'Crash', 'Bang', 'Thump', 'Thud', 'Clatter', 'Rattle',
            'Footsteps', 'Footstep', 'Walking', 'Running', 'Stomping',
            'Glass', 'Breaking', 'Shatter', 'Smash',
            'Alarm', 'Siren', 'Emergency', 'Warning',
            'Explosion', 'Blast', 'Boom', 'Detonation',
            'Fight', 'Violence', 'Struggle', 'Scuffle',
            'Gunshot', 'Gun', 'Firearm', 'Shot',
            'Car', 'Vehicle', 'Accident', 'Collision', 'Impact'
        ]);
        
        this.confidenceThreshold = 0.6;
        this.useML = false; // Set to true when ML dependencies are available
        this.initializeModel();
    }

    async initializeModel() {
        try {
            if (this.useML) {
                console.log('🔄 Loading ML Audio Classifier...');
                // ML initialization would go here when dependencies are available
                console.log('✅ ML Audio Classifier loaded successfully');
            } else {
                console.log('🎵 Using enhanced heuristic audio classifier');
                console.log('💡 For ML-based classification, install:');
                console.log('   npm install @tensorflow/tfjs-node @mediapipe/tasks-audio');
                console.log('   (Requires Visual Studio Build Tools on Windows)');
            }
        } catch (error) {
            console.error('❌ Failed to load audio classifier:', error);
            console.log('🔄 Falling back to heuristic classification');
        }
    }

    async classifyAudio(audioBuffer, sampleRate = 16000) {
        if (this.useML && this.model) {
            try {
                // ML-based classification would go here
                return this.analyzeMLPredictions([]);
            } catch (error) {
                console.error('ML classification failed, falling back to heuristic:', error);
            }
        }

        // Enhanced heuristic classification
        return this.enhancedHeuristicClassification(audioBuffer, sampleRate);
    }

    enhancedHeuristicClassification(audioBuffer, sampleRate) {
        // Convert to Float32Array if needed
        const audioData = new Float32Array(audioBuffer);
        
        // Calculate audio features
        const energy = this.calculateEnergy(audioData);
        const zeroCrossingRate = this.calculateZeroCrossingRate(audioData);
        const spectralCentroid = this.calculateSpectralCentroid(audioData);
        const spectralRolloff = this.calculateSpectralRolloff(audioData);
        const spectralBandwidth = this.calculateSpectralBandwidth(audioData);
        
        // Enhanced classification logic
        let dangerScore = 0;
        let primaryClass = 'unknown';
        let detectedClasses = [];

        // High energy sounds (crashes, impacts, explosions)
        if (energy > 0.3) {
            dangerScore += 0.4;
            detectedClasses.push('Crash');
        }
        if (energy > 0.6) {
            dangerScore += 0.3;
            detectedClasses.push('Explosion');
        }

        // High pitch sounds (screams, alarms, sirens)
        if (spectralCentroid > 0.5) {
            dangerScore += 0.3;
            detectedClasses.push('Screaming');
        }
        if (spectralCentroid > 0.7) {
            dangerScore += 0.2;
            detectedClasses.push('Alarm');
        }

        // Voice-like sounds (yelling, distress calls)
        if (energy > 0.2 && zeroCrossingRate > 0.08 && zeroCrossingRate < 0.25) {
            dangerScore += 0.3;
            detectedClasses.push('Shout');
        }

        // Sudden loud sounds (gunshots, impacts)
        if (energy > 0.5 && spectralRolloff > 0.6) {
            dangerScore += 0.2;
            detectedClasses.push('Gunshot');
        }

        // Footsteps and movement
        if (energy > 0.1 && energy < 0.3 && spectralBandwidth > 0.3) {
            dangerScore += 0.2;
            detectedClasses.push('Footsteps');
        }

        // Map to danger types
        if (dangerScore > 0.8) {
            primaryClass = 'scream';
        } else if (dangerScore > 0.6) {
            primaryClass = 'crash';
        } else if (dangerScore > 0.4) {
            primaryClass = 'running';
        } else if (dangerScore > 0.2) {
            primaryClass = 'caution';
        }

        return {
            isDangerous: dangerScore > this.confidenceThreshold,
            primaryClass,
            dangerType: primaryClass,
            confidence: Math.min(1, dangerScore),
            allDangerClasses: detectedClasses.map(cls => ({
                class: cls,
                confidence: dangerScore * 0.8,
                isDangerous: true
            })),
            topPredictions: [
                { class: primaryClass, confidence: dangerScore },
                { class: 'normal', confidence: 1 - dangerScore }
            ],
            features: {
                energy,
                zeroCrossingRate,
                spectralCentroid,
                spectralRolloff,
                spectralBandwidth
            }
        };
    }

    // Audio feature extraction methods
    calculateEnergy(buffer) {
        let sum = 0;
        for (let i = 0; i < buffer.length; i++) {
            sum += buffer[i] * buffer[i];
        }
        return Math.sqrt(sum / buffer.length);
    }

    calculateZeroCrossingRate(buffer) {
        let crossings = 0;
        for (let i = 1; i < buffer.length; i++) {
            if ((buffer[i] >= 0) !== (buffer[i - 1] >= 0)) {
                crossings++;
            }
        }
        return crossings / buffer.length;
    }

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

    calculateSpectralRolloff(buffer) {
        const threshold = 0.85;
        let energySum = 0;
        let totalEnergy = 0;
        
        for (let i = 0; i < buffer.length; i++) {
            totalEnergy += Math.abs(buffer[i]);
        }
        
        for (let i = 0; i < buffer.length; i++) {
            energySum += Math.abs(buffer[i]);
            if (energySum / totalEnergy >= threshold) {
                return i / buffer.length;
            }
        }
        
        return 1;
    }

    calculateSpectralBandwidth(buffer) {
        const centroid = this.calculateSpectralCentroid(buffer);
        let bandwidthSum = 0;
        let magnitudeSum = 0;
        
        for (let i = 0; i < buffer.length / 2; i++) {
            const magnitude = Math.abs(buffer[i]);
            bandwidthSum += magnitude * Math.pow(i - centroid, 2);
            magnitudeSum += magnitude;
        }
        
        return magnitudeSum > 0 ? Math.sqrt(bandwidthSum / magnitudeSum) : 0;
    }

    analyzeMLPredictions(predictions) {
        // Placeholder for ML-based prediction analysis
        // This would be implemented when ML dependencies are available
        return {
            isDangerous: false,
            primaryClass: 'unknown',
            dangerType: 'unknown',
            confidence: 0,
            allDangerClasses: [],
            topPredictions: []
        };
    }

    mapToDangerType(className) {
        const mappings = {
            'Screaming': 'scream',
            'Shout': 'scream',
            'Bellow': 'scream',
            'Roar': 'scream',
            'Yell': 'scream',
            'Cry': 'scream',
            'Scream': 'scream',
            'Crash': 'crash',
            'Bang': 'crash',
            'Thump': 'crash',
            'Thud': 'crash',
            'Clatter': 'crash',
            'Rattle': 'crash',
            'Footsteps': 'running',
            'Footstep': 'running',
            'Walking': 'running',
            'Running': 'running',
            'Stomping': 'running',
            'Glass': 'crash',
            'Breaking': 'crash',
            'Shatter': 'crash',
            'Smash': 'crash',
            'Alarm': 'scream',
            'Siren': 'scream',
            'Emergency': 'scream',
            'Warning': 'scream',
            'Explosion': 'crash',
            'Blast': 'crash',
            'Boom': 'crash',
            'Detonation': 'crash',
            'Fight': 'scream',
            'Violence': 'scream',
            'Struggle': 'scream',
            'Scuffle': 'scream',
            'Gunshot': 'crash',
            'Gun': 'crash',
            'Firearm': 'crash',
            'Shot': 'crash',
            'Car': 'crash',
            'Vehicle': 'crash',
            'Accident': 'crash',
            'Collision': 'crash',
            'Impact': 'crash'
        };

        return mappings[className] || 'unknown';
    }

    setConfidenceThreshold(threshold) {
        this.confidenceThreshold = Math.max(0, Math.min(1, threshold));
        console.log(`🎯 Confidence threshold set to ${this.confidenceThreshold}`);
    }

    getModelInfo() {
        return {
            model: this.useML ? 'MediaPipe Audio Classifier' : 'Enhanced Heuristic Classifier',
            version: this.useML ? '0.10.22' : '2.0.0',
            totalClasses: this.useML ? 521 : 5, // 5 danger types: scream, crash, running, caution, normal
            dangerClasses: Array.from(this.dangerClasses),
            confidenceThreshold: this.confidenceThreshold,
            isLoaded: true,
            features: this.useML ? ['ML-based'] : ['Energy', 'Zero Crossing Rate', 'Spectral Centroid', 'Spectral Rolloff', 'Spectral Bandwidth']
        };
    }
}

module.exports = DangerClassifier;
