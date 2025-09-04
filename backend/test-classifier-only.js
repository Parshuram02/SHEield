const DangerClassifier = require('./src/services/dangerClassifier');

async function testClassifierOnly() {
    console.log('🧪 Testing Audio Classifier Only...\n');

    try {
        // Initialize classifier
        const classifier = new DangerClassifier();
        console.log('✅ Classifier initialized');

        // Create test audio samples
        console.log('\n🎵 Creating test audio samples...');
        
        // Test 1: Normal audio (should be safe)
        const normalAudio = new Float32Array(16000);
        for (let i = 0; i < normalAudio.length; i++) {
            normalAudio[i] = 0.05 * Math.sin(2 * Math.PI * 440 * i / 16000);
        }
        
        // Test 2: Scream-like audio (should trigger danger)
        const screamAudio = new Float32Array(16000);
        for (let i = 0; i < screamAudio.length; i++) {
            screamAudio[i] = 0.7 * Math.sin(2 * Math.PI * 800 * i / 16000) + 0.3 * Math.random();
        }
        
        // Test 3: Crash-like audio (should trigger danger)
        const crashAudio = new Float32Array(16000);
        for (let i = 0; i < crashAudio.length; i++) {
            crashAudio[i] = 0.8 * Math.sin(2 * Math.PI * 100 * i / 16000) + 0.4 * Math.random();
        }

        // Test 4: Very loud audio (should definitely trigger)
        const loudAudio = new Float32Array(16000);
        for (let i = 0; i < loudAudio.length; i++) {
            loudAudio[i] = 0.9 * Math.sin(2 * Math.PI * 600 * i / 16000) + 0.5 * Math.random();
        }

        // Test classifications
        console.log('\n🔍 Testing audio classifications...');
        
        const normalResult = await classifier.classifyAudio(normalAudio, 16000);
        console.log('Normal Audio:', {
            isDangerous: normalResult.isDangerous,
            type: normalResult.dangerType,
            confidence: normalResult.confidence,
            features: normalResult.features
        });

        const screamResult = await classifier.classifyAudio(screamAudio, 16000);
        console.log('Scream Audio:', {
            isDangerous: screamResult.isDangerous,
            type: screamResult.dangerType,
            confidence: screamResult.confidence,
            features: screamResult.features
        });

        const crashResult = await classifier.classifyAudio(crashAudio, 16000);
        console.log('Crash Audio:', {
            isDangerous: crashResult.isDangerous,
            type: crashResult.dangerType,
            confidence: crashResult.confidence,
            features: crashResult.features
        });

        const loudResult = await classifier.classifyAudio(loudAudio, 16000);
        console.log('Loud Audio:', {
            isDangerous: loudResult.isDangerous,
            type: loudResult.dangerType,
            confidence: loudResult.confidence,
            features: loudResult.features
        });

        // Test confidence threshold adjustment
        console.log('\n🎯 Testing confidence threshold...');
        classifier.setConfidenceThreshold(0.2); // Very low threshold
        const lowThresholdResult = await classifier.classifyAudio(screamAudio, 16000);
        console.log('With 0.2 threshold - Is Dangerous:', lowThresholdResult.isDangerous);
        
        classifier.setConfidenceThreshold(0.8); // High threshold
        const highThresholdResult = await classifier.classifyAudio(screamAudio, 16000);
        console.log('With 0.8 threshold - Is Dangerous:', highThresholdResult.isDangerous);

        // Summary
        console.log('\n📊 Summary:');
        console.log('Normal audio detected as dangerous:', normalResult.isDangerous);
        console.log('Scream audio detected as dangerous:', screamResult.isDangerous);
        console.log('Crash audio detected as dangerous:', crashResult.isDangerous);
        console.log('Loud audio detected as dangerous:', loudResult.isDangerous);

        if (screamResult.isDangerous || crashResult.isDangerous || loudResult.isDangerous) {
            console.log('\n✅ Audio classifier is working correctly!');
        } else {
            console.log('\n⚠️ Audio classifier may need threshold adjustment');
        }

    } catch (error) {
        console.error('❌ Test failed:', error);
    }
}

// Run test
testClassifierOnly();

