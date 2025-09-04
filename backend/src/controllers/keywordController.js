const KeywordDetectionService = require('../services/keywordDetectionService');
const { AlertEvent } = require('../models');

const keywordService = new KeywordDetectionService();

// Detect keywords in uploaded audio
exports.detectKeywords = async (req, res) => {
    try {
        const { audioBuffer, provider = 'auto', language = 'en-US' } = req.body;
        
        if (!audioBuffer) {
            return res.status(400).json({ 
                error: 'Audio buffer is required' 
            });
        }

        // Convert base64 to buffer if needed
        let audioData;
        if (typeof audioBuffer === 'string') {
            audioData = Buffer.from(audioBuffer, 'base64');
        } else {
            audioData = audioBuffer;
        }

        // Detect keywords
        const result = await keywordService.detectKeywords(audioData, provider, language);
        
        // If emergency keywords detected, create alert event
        if (result.hasEmergency && result.maxConfidence >= 0.7) {
            try {
                const alertEvent = new AlertEvent({
                    userId: req.body.userId || 'unknown',
                    type: 'keyword',
                    trigger: {
                        source: 'keyword',
                        model: result.provider || 'unknown'
                    },
                    confidence: result.maxConfidence,
                    notes: `Keyword detected: ${result.detectedKeywords.map(k => k.phrase).join(', ')}`,
                    meta: {
                        transcription: result.transcription,
                        detectedKeywords: result.detectedKeywords,
                        provider: result.provider,
                        language: result.language
                    }
                });

                await alertEvent.save();
                console.log('Keyword alert event created:', alertEvent._id);
                
                result.alertEventId = alertEvent._id;
            } catch (error) {
                console.error('Failed to create keyword alert event:', error);
                result.alertEventError = error.message;
            }
        }

        res.json({
            success: true,
            ...result
        });

    } catch (error) {
        console.error('Keyword detection error:', error);
        res.status(500).json({ 
            success: false,
            error: 'Failed to detect keywords',
            details: error.message
        });
    }
};

// Get available speech recognition providers
exports.getProviders = async (req, res) => {
    try {
        const providers = keywordService.getAvailableProviders();
        
        res.json({
            success: true,
            providers: providers,
            configured: providers.length > 0
        });
    } catch (error) {
        console.error('Error getting providers:', error);
        res.status(500).json({ 
            success: false,
            error: 'Failed to get providers' 
        });
    }
};

// Get trigger phrases
exports.getTriggerPhrases = async (req, res) => {
    try {
        const phrases = keywordService.getTriggerPhrases();
        
        res.json({
            success: true,
            phrases: phrases,
            count: phrases.length
        });
    } catch (error) {
        console.error('Error getting trigger phrases:', error);
        res.status(500).json({ 
            success: false,
            error: 'Failed to get trigger phrases' 
        });
    }
};

// Add custom trigger phrase
exports.addTriggerPhrase = async (req, res) => {
    try {
        const { phrase } = req.body;
        
        if (!phrase || typeof phrase !== 'string') {
            return res.status(400).json({ 
                success: false,
                error: 'Valid phrase is required' 
            });
        }

        keywordService.addTriggerPhrase(phrase);
        
        res.json({
            success: true,
            message: `Trigger phrase "${phrase}" added successfully`,
            phrases: keywordService.getTriggerPhrases()
        });
    } catch (error) {
        console.error('Error adding trigger phrase:', error);
        res.status(500).json({ 
            success: false,
            error: 'Failed to add trigger phrase' 
        });
    }
};

// Remove trigger phrase
exports.removeTriggerPhrase = async (req, res) => {
    try {
        const { phrase } = req.params;
        
        if (!phrase) {
            return res.status(400).json({ 
                success: false,
                error: 'Phrase is required' 
            });
        }

        keywordService.removeTriggerPhrase(phrase);
        
        res.json({
            success: true,
            message: `Trigger phrase "${phrase}" removed successfully`,
            phrases: keywordService.getTriggerPhrases()
        });
    } catch (error) {
        console.error('Error removing trigger phrase:', error);
        res.status(500).json({ 
            success: false,
            error: 'Failed to remove trigger phrase' 
        });
    }
};

// Update confidence threshold
exports.updateThreshold = async (req, res) => {
    try {
        const { threshold } = req.body;
        
        if (typeof threshold !== 'number' || threshold < 0 || threshold > 1) {
            return res.status(400).json({ 
                success: false,
                error: 'Threshold must be a number between 0 and 1' 
            });
        }

        keywordService.setConfidenceThreshold(threshold);
        
        res.json({
            success: true,
            message: `Confidence threshold updated to ${threshold}`,
            threshold: threshold
        });
    } catch (error) {
        console.error('Error updating threshold:', error);
        res.status(500).json({ 
            success: false,
            error: 'Failed to update threshold' 
        });
    }
};

// Test keyword detection with sample text
exports.testDetection = async (req, res) => {
    try {
        const { text, language = 'en-US' } = req.body;
        
        if (!text || typeof text !== 'string') {
            return res.status(400).json({ 
                success: false,
                error: 'Valid text is required' 
            });
        }

        // Analyze text for keywords without audio processing
        const result = keywordService.analyzeTranscription(text);
        
        res.json({
            success: true,
            text: text,
            ...result
        });
    } catch (error) {
        console.error('Error testing keyword detection:', error);
        res.status(500).json({ 
            success: false,
            error: 'Failed to test keyword detection' 
        });
    }
};

// Get keyword detection statistics
exports.getStats = async (req, res) => {
    try {
        const phrases = keywordService.getTriggerPhrases();
        const providers = keywordService.getAvailableProviders();
        
        res.json({
            success: true,
            stats: {
                totalTriggerPhrases: phrases.length,
                availableProviders: providers.length,
                configuredProviders: providers,
                confidenceThreshold: keywordService.confidenceThreshold
            }
        });
    } catch (error) {
        console.error('Error getting stats:', error);
        res.status(500).json({ 
            success: false,
            error: 'Failed to get statistics' 
        });
    }
};
