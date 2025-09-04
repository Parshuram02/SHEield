const DangerClassifier = require('./src/services/dangerClassifier');
const { AlertEvent, Contact } = require('./src/models');
const mongoose = require('mongoose');
const config = require('./src/config');

async function testAudioDetection() {
    console.log('🧪 Testing Audio Detection and Alert System...\n');

    try {
        // Connect to MongoDB
        await mongoose.connect(config.mongodb.uri);
        console.log('✅ Connected to MongoDB');

        // Initialize classifier
        const classifier = new DangerClassifier();
        console.log('✅ Classifier initialized');

        // Create test emergency contact if none exists
        const existingContacts = await Contact.find({ userId: 'default' });
        if (existingContacts.length === 0) {
            const testContact = new Contact({
                userId: 'default',
                name: 'Test Emergency Contact',
                phone: '+1234567890',
                phoneE164: '+1234567890',
                relationship: 'test',
                verifiedAt: new Date()
            });
            await testContact.save();
            console.log('✅ Test emergency contact created');
        } else {
            console.log('✅ Emergency contacts found:', existingContacts.length);
        }

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

        // Test classifications
        console.log('\n🔍 Testing audio classifications...');
        
        const normalResult = await classifier.classifyAudio(normalAudio, 16000);
        console.log('Normal Audio:', {
            isDangerous: normalResult.isDangerous,
            type: normalResult.dangerType,
            confidence: normalResult.confidence
        });

        const screamResult = await classifier.classifyAudio(screamAudio, 16000);
        console.log('Scream Audio:', {
            isDangerous: screamResult.isDangerous,
            type: screamResult.dangerType,
            confidence: screamResult.confidence
        });

        const crashResult = await classifier.classifyAudio(crashAudio, 16000);
        console.log('Crash Audio:', {
            isDangerous: crashResult.isDangerous,
            type: crashResult.dangerType,
            confidence: crashResult.confidence
        });

        // Test alert event creation
        if (screamResult.isDangerous) {
            console.log('\n🚨 Creating test alert event...');
            
            const alertEvent = new AlertEvent({
                userId: 'default',
                type: screamResult.dangerType,
                trigger: {
                    source: 'test',
                    model: 'enhanced_heuristic'
                },
                confidence: screamResult.confidence,
                audioFiles: [{
                    filename: 'test_scream_audio.webm',
                    originalName: 'test_scream_audio.webm',
                    mimeType: 'audio/webm',
                    size: 1024,
                    duration: 1.0,
                    uploadPath: '/uploads/test_scream_audio.webm'
                }],
                notes: 'Test scream detection',
                meta: {
                    testRun: true,
                    analysis: screamResult
                }
            });

            await alertEvent.save();
            console.log('✅ Test alert event created:', alertEvent._id);
            
            // Verify alert was saved
            const savedAlert = await AlertEvent.findById(alertEvent._id);
            console.log('✅ Alert verified in database:', {
                id: savedAlert._id,
                type: savedAlert.type,
                confidence: savedAlert.confidence,
                createdAt: savedAlert.createdAt
            });
        }

        console.log('\n✅ Audio detection test completed successfully!');
        console.log('\n💡 Next steps:');
        console.log('1. Start the backend: npm run dev');
        console.log('2. Start the frontend: npm run dev');
        console.log('3. Test with real audio input');
        console.log('4. Check MongoDB for alert events');
        console.log('5. Verify Twilio alerts (if configured)');

    } catch (error) {
        console.error('❌ Test failed:', error);
    } finally {
        await mongoose.disconnect();
        console.log('🔌 Disconnected from MongoDB');
    }
}

// Run test
testAudioDetection();
