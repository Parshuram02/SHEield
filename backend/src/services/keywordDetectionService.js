const speech = require('@google-cloud/speech');
const { Deepgram } = require('deepgram');
const { AssemblyAI } = require('assemblyai');
const config = require('../config');

class KeywordDetectionService {
    constructor() {
        this.triggerPhrases = [
            'help me',
            'emergency',
            'danger',
            'sos',
            'call police',
            'need help',
            'assault',
            'fire',
            'accident',
            'robbery',
            'attack',
            'threat',
            'dangerous',
            'unsafe',
            'panic'
        ];
        
        this.confidenceThreshold = 0.7;
        this.initializeProviders();
    }

    // Initialize speech recognition providers
    initializeProviders() {
        try {
            // Google Cloud Speech
            if (config.speech.google && config.speech.google !== 'your_google_credentials_file') {
                try {
                    this.googleClient = new speech.SpeechClient({
                        keyFilename: config.speech.google,
                        // Or use credentials directly:
                        // credentials: JSON.parse(process.env.GOOGLE_APPLICATION_CREDENTIALS)
                    });
                    console.log('✅ Google Cloud Speech initialized');
                } catch (error) {
                    console.log('⚠️ Google Cloud Speech not available:', error.message);
                }
            }

            // Deepgram
            if (config.speech.deepgram && config.speech.deepgram !== 'your_deepgram_key') {
                try {
                    const { Deepgram } = require('deepgram');
                    this.deepgramClient = new Deepgram(config.speech.deepgram);
                    console.log('✅ Deepgram initialized');
                } catch (error) {
                    console.log('⚠️ Deepgram not available:', error.message);
                }
            }

            // AssemblyAI
            if (config.speech.assemblyAi && config.speech.assemblyAi !== 'your_assemblyai_key') {
                try {
                    this.assemblyAiClient = new AssemblyAI(config.speech.assemblyAi);
                    console.log('✅ AssemblyAI initialized');
                } catch (error) {
                    console.log('⚠️ AssemblyAI not available:', error.message);
                }
            }

            if (!this.googleClient && !this.deepgramClient && !this.assemblyAiClient) {
                console.log('⚠️ No speech recognition providers configured');
            }
        } catch (error) {
            console.error('Error initializing speech providers:', error);
        }
    }

    // Detect keywords in audio using Google Cloud Speech
    async detectKeywordsGoogle(audioBuffer, language = 'en-US') {
        if (!this.googleClient) {
            throw new Error('Google Cloud Speech not configured');
        }

        try {
            const audio = {
                content: audioBuffer.toString('base64')
            };

            const config = {
                encoding: 'WEBM_OPUS',
                sampleRateHertz: 48000,
                languageCode: language,
                enableWordTimeOffsets: true,
                enableWordConfidence: true,
                model: 'latest_long',
                useEnhanced: true
            };

            const request = {
                audio: audio,
                config: config
            };

            const [response] = await this.googleClient.recognize(request);
            const transcription = response.results
                .map(result => result.alternatives[0].transcript)
                .join(' ');

            return this.analyzeTranscription(transcription, response.results);
        } catch (error) {
            console.error('Google Speech recognition error:', error);
            throw error;
        }
    }

    // Detect keywords using Deepgram
    async detectKeywordsDeepgram(audioBuffer, language = 'en-US') {
        if (!this.deepgramClient) {
            throw new Error('Deepgram not configured');
        }

        try {
            const response = await this.deepgramClient.listen.transcribeFile(audioBuffer, {
                model: 'nova-2',
                language: language,
                punctuate: true,
                diarize: true,
                smart_format: true
            });

            const transcription = response.results?.channels[0]?.alternatives[0]?.transcript || '';
            return this.analyzeTranscription(transcription, response.results);
        } catch (error) {
            console.error('Deepgram recognition error:', error);
            throw error;
        }
    }

    // Detect keywords using AssemblyAI
    async detectKeywordsAssemblyAI(audioBuffer, language = 'en') {
        if (!this.assemblyAiClient) {
            throw new Error('AssemblyAI not configured');
        }

        try {
            const response = await this.assemblyAiClient.transcripts.create({
                audio: audioBuffer,
                language_code: language,
                punctuate: true,
                format_text: true
            });

            const transcription = response.text || '';
            return this.analyzeTranscription(transcription, response);
        } catch (error) {
            console.error('AssemblyAI recognition error:', error);
            throw error;
        }
    }

    // Analyze transcription for trigger phrases
    analyzeTranscription(transcription, rawResults = null) {
        const lowerTranscription = transcription.toLowerCase();
        const detectedKeywords = [];
        let maxConfidence = 0;

        // Check for trigger phrases
        for (const phrase of this.triggerPhrases) {
            if (lowerTranscription.includes(phrase)) {
                // Calculate confidence based on phrase length and context
                let confidence = this.calculatePhraseConfidence(phrase, lowerTranscription, rawResults);
                
                detectedKeywords.push({
                    phrase: phrase,
                    confidence: confidence,
                    context: this.extractContext(phrase, lowerTranscription),
                    timestamp: Date.now()
                });

                maxConfidence = Math.max(maxConfidence, confidence);
            }
        }

        // Check for emergency keywords (single words)
        const emergencyWords = ['help', 'danger', 'fire', 'police', 'sos', 'attack'];
        for (const word of emergencyWords) {
            if (lowerTranscription.includes(word)) {
                const confidence = this.calculateWordConfidence(word, lowerTranscription);
                if (confidence > 0.6) {
                    detectedKeywords.push({
                        phrase: word,
                        confidence: confidence,
                        context: this.extractContext(word, lowerTranscription),
                        timestamp: Date.now(),
                        type: 'single_word'
                    });
                    maxConfidence = Math.max(maxConfidence, confidence);
                }
            }
        }

        return {
            transcription: transcription,
            detectedKeywords: detectedKeywords,
            hasEmergency: detectedKeywords.length > 0,
            maxConfidence: maxConfidence,
            timestamp: Date.now(),
            language: 'en-US'
        };
    }

    // Calculate confidence for phrase detection
    calculatePhraseConfidence(phrase, transcription, rawResults) {
        let confidence = 0.5; // Base confidence

        // Longer phrases get higher base confidence
        if (phrase.length > 10) confidence += 0.2;
        if (phrase.length > 20) confidence += 0.1;

        // Check if phrase appears multiple times
        const occurrences = (transcription.match(new RegExp(phrase, 'gi')) || []).length;
        if (occurrences > 1) confidence += 0.2;

        // Check surrounding context for urgency indicators
        const urgencyWords = ['now', 'immediately', 'urgent', 'quick', 'fast', 'emergency'];
        const hasUrgency = urgencyWords.some(word => transcription.includes(word));
        if (hasUrgency) confidence += 0.1;

        // Check for repetition (indicates distress)
        const repeatedWords = this.findRepeatedWords(transcription);
        if (repeatedWords.length > 0) confidence += 0.1;

        return Math.min(1.0, confidence);
    }

    // Calculate confidence for single word detection
    calculateWordConfidence(word, transcription) {
        let confidence = 0.4; // Lower base confidence for single words

        // Check frequency
        const occurrences = (transcription.match(new RegExp(word, 'gi')) || []).length;
        if (occurrences > 1) confidence += 0.2;

        // Check for emphasis indicators
        const emphasisPatterns = [
            new RegExp(`${word}\\s*!+`, 'gi'),  // Word followed by exclamation marks
            new RegExp(`${word}\\s*\\?+`, 'gi'), // Word followed by question marks
            new RegExp(`${word}\\s*\\*+`, 'gi')  // Word surrounded by asterisks
        ];

        const hasEmphasis = emphasisPatterns.some(pattern => pattern.test(transcription));
        if (hasEmphasis) confidence += 0.2;

        return Math.min(1.0, confidence);
    }

    // Extract context around detected phrase
    extractContext(phrase, transcription) {
        const phraseIndex = transcription.indexOf(phrase);
        if (phraseIndex === -1) return '';

        const start = Math.max(0, phraseIndex - 50);
        const end = Math.min(transcription.length, phraseIndex + phrase.length + 50);
        
        return transcription.substring(start, end).trim();
    }

    // Find repeated words (indicates distress)
    findRepeatedWords(transcription) {
        const words = transcription.split(/\s+/);
        const wordCount = {};
        const repeated = [];

        words.forEach(word => {
            if (word.length > 2) { // Ignore very short words
                wordCount[word] = (wordCount[word] || 0) + 1;
                if (wordCount[word] === 3) { // Word appears 3+ times
                    repeated.push(word);
                }
            }
        });

        return repeated;
    }

    // Get available providers
    getAvailableProviders() {
        const providers = [];
        if (this.googleClient) providers.push('google');
        if (this.deepgramClient) providers.push('deepgram');
        if (this.assemblyAiClient) providers.push('assemblyai');
        return providers;
    }

    // Get recommended provider based on audio characteristics
    getRecommendedProvider(audioBuffer) {
        const providers = this.getAvailableProviders();
        
        if (providers.length === 0) {
            return null;
        }

        // For real-time detection, prefer Deepgram or AssemblyAI
        if (providers.includes('deepgram')) {
            return 'deepgram';
        }
        
        if (providers.includes('assemblyai')) {
            return 'assemblyai';
        }

        // Google is good for longer audio
        if (providers.includes('google')) {
            return 'google';
        }

        return providers[0];
    }

    // Main method to detect keywords
    async detectKeywords(audioBuffer, provider = 'auto', language = 'en-US') {
        try {
            let result;

            if (provider === 'auto') {
                provider = this.getRecommendedProvider(audioBuffer);
            }

            switch (provider) {
                case 'google':
                    result = await this.detectKeywordsGoogle(audioBuffer, language);
                    break;
                case 'deepgram':
                    result = await this.detectKeywordsDeepgram(audioBuffer, language);
                    break;
                case 'assemblyai':
                    result = await this.detectKeywordsAssemblyAI(audioBuffer, language);
                    break;
                default:
                    throw new Error(`Unknown provider: ${provider}`);
            }

            return {
                ...result,
                provider: provider,
                success: true
            };

        } catch (error) {
            console.error(`Keyword detection failed with provider ${provider}:`, error);
            return {
                transcription: '',
                detectedKeywords: [],
                hasEmergency: false,
                maxConfidence: 0,
                timestamp: Date.now(),
                provider: provider,
                success: false,
                error: error.message
            };
        }
    }

    // Add custom trigger phrases
    addTriggerPhrase(phrase) {
        if (!this.triggerPhrases.includes(phrase.toLowerCase())) {
            this.triggerPhrases.push(phrase.toLowerCase());
            console.log(`Added trigger phrase: ${phrase}`);
        }
    }

    // Remove trigger phrase
    removeTriggerPhrase(phrase) {
        const index = this.triggerPhrases.indexOf(phrase.toLowerCase());
        if (index > -1) {
            this.triggerPhrases.splice(index, 1);
            console.log(`Removed trigger phrase: ${phrase}`);
        }
    }

    // Get all trigger phrases
    getTriggerPhrases() {
        return [...this.triggerPhrases];
    }

    // Update confidence threshold
    setConfidenceThreshold(threshold) {
        if (threshold >= 0 && threshold <= 1) {
            this.confidenceThreshold = threshold;
            console.log(`Confidence threshold updated to: ${threshold}`);
        }
    }
}

module.exports = KeywordDetectionService;
