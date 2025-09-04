require('dotenv').config();
const KeywordDetectionService = require('./src/services/keywordDetectionService');

async function testKeywordDetection() {
    console.log('🧪 Testing Keyword Detection Service\n');

    try {
        // Initialize the service
        const keywordService = new KeywordDetectionService();
        
        console.log('✅ Service initialized');
        console.log('Available providers:', keywordService.getAvailableProviders());
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

    } catch (error) {
        console.error('❌ Test failed:', error);
    }
}

async function testAPIEndpoints() {
    console.log('\n🌐 Testing API Endpoints\n');

    const baseUrl = 'http://localhost:8000';
    const apiKey = process.env.API_KEY || 'change-me';

    const endpoints = [
        { method: 'GET', path: '/api/keywords/providers', description: 'Get providers' },
        { method: 'GET', path: '/api/keywords/phrases', description: 'Get trigger phrases' },
        { method: 'GET', path: '/api/keywords/stats', description: 'Get statistics' },
        { method: 'POST', path: '/api/keywords/test', description: 'Test text detection' }
    ];

    for (const endpoint of endpoints) {
        try {
            console.log(`Testing ${endpoint.method} ${endpoint.path} - ${endpoint.description}`);
            
            const response = await fetch(`${baseUrl}${endpoint.path}`, {
                method: endpoint.method,
                headers: {
                    'Content-Type': 'application/json',
                    'x-api-key': apiKey
                },
                ...(endpoint.method === 'POST' && {
                    body: JSON.stringify({ text: 'This is a test for help me emergency' })
                })
            });

            if (response.ok) {
                const data = await response.json();
                console.log(`✅ Success: ${JSON.stringify(data, null, 2)}`);
            } else {
                console.log(`❌ Failed: ${response.status} ${response.statusText}`);
            }
        } catch (error) {
            console.log(`❌ Error: ${error.message}`);
        }
        console.log('');
    }
}

async function runTests() {
    console.log('🚀 Starting Keyword Detection Tests\n');
    
    await testKeywordDetection();
    
    // Only test API if server is running
    try {
        await testAPIEndpoints();
    } catch (error) {
        console.log('⚠️ API tests skipped - server may not be running');
    }
}

if (require.main === module) {
    runTests().catch(console.error);
}

module.exports = { testKeywordDetection, testAPIEndpoints };
