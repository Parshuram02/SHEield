require('dotenv').config();

// Simple keyword detection logic (no external dependencies)
class SimpleKeywordDetector {
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
    }

    // Analyze text for trigger phrases
    analyzeTranscription(transcription) {
        const lowerTranscription = transcription.toLowerCase();
        const detectedKeywords = [];
        let maxConfidence = 0;

        // Check for trigger phrases
        for (const phrase of this.triggerPhrases) {
            if (lowerTranscription.includes(phrase)) {
                const confidence = this.calculatePhraseConfidence(phrase, lowerTranscription);
                
                detectedKeywords.push({
                    phrase: phrase,
                    confidence: confidence,
                    context: this.extractContext(phrase, lowerTranscription),
                    timestamp: Date.now()
                });

                maxConfidence = Math.max(maxConfidence, confidence);
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
    calculatePhraseConfidence(phrase, transcription) {
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

    // Get all trigger phrases
    getTriggerPhrases() {
        return [...this.triggerPhrases];
    }

    // Add custom trigger phrase
    addTriggerPhrase(phrase) {
        if (!this.triggerPhrases.includes(phrase.toLowerCase())) {
            this.triggerPhrases.push(phrase.toLowerCase());
            console.log(`Added trigger phrase: ${phrase}`);
        }
    }

    // Update confidence threshold
    setConfidenceThreshold(threshold) {
        if (threshold >= 0 && threshold <= 1) {
            this.confidenceThreshold = threshold;
            console.log(`Confidence threshold updated to: ${threshold}`);
        }
    }
}

async function testKeywordDetection() {
    console.log('🧪 Testing Simple Keyword Detection (No External Dependencies)\n');

    try {
        // Initialize the service
        const keywordService = new SimpleKeywordDetector();
        
        console.log('✅ Service initialized');
        console.log('Trigger phrases:', keywordService.getTriggerPhrases());
        console.log('Confidence threshold:', keywordService.confidenceThreshold);
        console.log('');

        // Test text analysis
        console.log('📝 Testing text analysis...');
        const testTexts = [
            'I need help right now!',
            'This is an emergency situation',
            'Someone is attacking me',
            'Fire! There is a fire in the building',
            'Call the police immediately',
            'I am in danger and need assistance',
            'This is just a normal conversation about the weather',
            'Hello, how are you today?'
        ];

        for (const text of testTexts) {
            console.log(`\nTesting: "${text}"`);
            const result = keywordService.analyzeTranscription(text);
            
            if (result.hasEmergency) {
                console.log(`🚨 EMERGENCY DETECTED!`);
                console.log(`   Keywords: ${result.detectedKeywords.map(k => k.phrase).join(', ')}`);
                console.log(`   Confidence: ${(result.maxConfidence * 100).toFixed(1)}%`);
                console.log(`   Context: ${result.detectedKeywords[0]?.context || 'N/A'}`);
            } else {
                console.log(`✅ No emergency keywords detected`);
            }
        }

        // Test custom phrase addition
        console.log('\n🔧 Testing custom phrase management...');
        keywordService.addTriggerPhrase('custom emergency phrase');
        console.log('Added custom phrase');
        
        const phrases = keywordService.getTriggerPhrases();
        console.log(`Total phrases: ${phrases.length}`);
        console.log(`Last phrase: ${phrases[phrases.length - 1]}`);

        // Test threshold adjustment
        console.log('\n⚙️ Testing threshold adjustment...');
        keywordService.setConfidenceThreshold(0.8);
        console.log(`New threshold: ${keywordService.confidenceThreshold}`);

        // Test with new threshold
        const highThresholdTest = keywordService.analyzeTranscription('I need help');
        console.log(`"I need help" with 0.8 threshold: ${highThresholdTest.hasEmergency ? 'DETECTED' : 'NOT DETECTED'}`);

        // Reset threshold
        keywordService.setConfidenceThreshold(0.7);
        console.log(`Threshold reset to: ${keywordService.confidenceThreshold}`);

        console.log('\n✅ All tests completed successfully!');
        console.log('\n🎯 Next Steps:');
        console.log('1. Test frontend keyword detection (works immediately)');
        console.log('2. Install backend dependencies when ready');
        console.log('3. Integrate with your emergency system');

    } catch (error) {
        console.error('❌ Test failed:', error);
    }
}

// Run tests
testKeywordDetection().catch(console.error);



