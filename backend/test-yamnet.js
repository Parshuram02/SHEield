const DangerClassifier = require('./src/services/dangerClassifier');

async function testAudioClassifier() {
    console.log('🧪 Testing Enhanced Audio Classifier...\n');

    try {
        // Initialize classifier
        const classifier = new DangerClassifier();
        
        // Wait for initialization
        console.log('⏳ Initializing classifier...');
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        // Get model info
        const modelInfo = classifier.getModelInfo();
        console.log('📊 Model Info:', modelInfo);
        
        // Create test audio buffers
        console.log('\n🎵 Creating test audio samples...');
        
        // Test 1: Normal sine wave (should be safe)
        const normalAudio = new Float32Array(16000);
        for (let i = 0; i < normalAudio.length; i++) {
            normalAudio[i] = 0.1 * Math.sin(2 * Math.PI * 440 * i / 16000);
        }
        
        // Test 2: High energy audio (simulating crash)
        const crashAudio = new Float32Array(16000);
        for (let i = 0; i < crashAudio.length; i++) {
            crashAudio[i] = 0.8 * Math.sin(2 * Math.PI * 100 * i / 16000) + 0.2 * Math.random();
        }
        
        // Test 3: High frequency audio (simulating scream)
        const screamAudio = new Float32Array(16000);
        for (let i = 0; i < screamAudio.length; i++) {
            screamAudio[i] = 0.6 * Math.sin(2 * Math.PI * 800 * i / 16000);
        }
        
        console.log('🔍 Classifying normal audio...');
        const normalResult = await classifier.classifyAudio(normalAudio, 16000);
        console.log('Normal Audio - Is Dangerous:', normalResult.isDangerous, 'Confidence:', normalResult.confidence);
        
        console.log('🔍 Classifying crash audio...');
        const crashResult = await classifier.classifyAudio(crashAudio, 16000);
        console.log('Crash Audio - Is Dangerous:', crashResult.isDangerous, 'Type:', crashResult.dangerType, 'Confidence:', crashResult.confidence);
        
        console.log('🔍 Classifying scream audio...');
        const screamResult = await classifier.classifyAudio(screamAudio, 16000);
        console.log('Scream Audio - Is Dangerous:', screamResult.isDangerous, 'Type:', screamResult.dangerType, 'Confidence:', screamResult.confidence);
        
        // Test confidence threshold adjustment
        console.log('\n🎯 Testing confidence threshold...');
        classifier.setConfidenceThreshold(0.3);
        const lowThresholdResult = await classifier.classifyAudio(crashAudio, 16000);
        console.log('With 0.3 threshold - Is Dangerous:', lowThresholdResult.isDangerous);
        
        classifier.setConfidenceThreshold(0.8);
        const highThresholdResult = await classifier.classifyAudio(crashAudio, 16000);
        console.log('With 0.8 threshold - Is Dangerous:', highThresholdResult.isDangerous);
        
        console.log('\n✅ Audio classifier test completed successfully!');
        console.log('\n💡 To enable ML-based classification:');
        console.log('1. Install Visual Studio Build Tools');
        console.log('2. Run: npm install @tensorflow/tfjs-node @mediapipe/tasks-audio');
        console.log('3. Set useML = true in DangerClassifier constructor');
        
    } catch (error) {
        console.error('❌ Audio classifier test failed:', error);
    }
}

// Run test
testAudioClassifier();
