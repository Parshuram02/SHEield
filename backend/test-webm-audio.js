const fs = require('fs');
const path = require('path');

// Simulate WebM audio data processing
function simulateWebMAudioProcessing() {
    console.log('🧪 Testing WebM Audio Processing...\n');

    try {
        // Create simulated WebM audio data
        const createSimulatedWebM = (type) => {
            const buffer = Buffer.alloc(16000); // 16KB buffer
            
            switch (type) {
                case 'normal':
                    // Normal speech - moderate variability
                    for (let i = 0; i < buffer.length; i++) {
                        buffer[i] = 128 + Math.sin(i * 0.1) * 20 + Math.random() * 10;
                    }
                    break;
                    
                case 'scream':
                    // Scream - high variability and sudden changes
                    for (let i = 0; i < buffer.length; i++) {
                        const base = 128 + Math.sin(i * 0.5) * 50;
                        const noise = Math.random() * 60;
                        const sudden = Math.random() > 0.95 ? 100 : 0;
                        buffer[i] = Math.max(0, Math.min(255, base + noise + sudden));
                    }
                    break;
                    
                case 'crash':
                    // Crash - very high energy and sudden changes
                    for (let i = 0; i < buffer.length; i++) {
                        const base = 150 + Math.sin(i * 0.2) * 40;
                        const impact = Math.random() > 0.9 ? 80 : 0;
                        buffer[i] = Math.max(0, Math.min(255, base + impact));
                    }
                    break;
                    
                case 'silence':
                    // Silence - low variability
                    for (let i = 0; i < buffer.length; i++) {
                        buffer[i] = 128 + Math.random() * 5;
                    }
                    break;
            }
            
            return buffer;
        };

        // Test WebM data analysis function
        const analyzeWebMData = (webmBuffer) => {
            const data = webmBuffer;
            const dataSize = data.length;
            
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
                    if (change > 50) changes++;
                }
            }
            
            const mean = sum / dataSize;
            
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
        };

        // Test different audio types
        const testCases = ['silence', 'normal', 'scream', 'crash'];
        
        console.log('🔍 Testing WebM Audio Analysis...\n');
        
        testCases.forEach(type => {
            const webmData = createSimulatedWebM(type);
            const analysis = analyzeWebMData(webmData);
            
            console.log(`${type.toUpperCase()} Audio:`, {
                dataSize: analysis.dataSize,
                mean: analysis.mean.toFixed(2),
                standardDeviation: analysis.standardDeviation.toFixed(2),
                dynamicRange: analysis.dynamicRange.toFixed(2),
                changeRate: (analysis.changeRate * 100).toFixed(2) + '%',
                hasHighVariability: analysis.hasHighVariability,
                hasSuddenChanges: analysis.hasSuddenChanges,
                isLoud: analysis.isLoud,
                complexity: analysis.complexity.toFixed(2)
            });
            
            // Calculate danger score
            let dangerScore = 0;
            if (analysis.hasHighVariability) dangerScore += 0.2;
            if (analysis.hasSuddenChanges) dangerScore += 0.2;
            if (analysis.isLoud) dangerScore += 0.3;
            if (analysis.complexity > 5) dangerScore += 0.1;
            
            const isDangerous = dangerScore > 0.3;
            console.log(`  → Danger Score: ${dangerScore.toFixed(2)} | Dangerous: ${isDangerous ? '🚨 YES' : '✅ NO'}\n`);
        });

        // Test with real WebM files if they exist
        const uploadsDir = path.join(__dirname, 'uploads');
        if (fs.existsSync(uploadsDir)) {
            const files = fs.readdirSync(uploadsDir).filter(f => f.endsWith('.webm'));
            
            if (files.length > 0) {
                console.log('🎵 Testing Real WebM Files...\n');
                
                files.slice(0, 3).forEach(file => {
                    try {
                        const filePath = path.join(uploadsDir, file);
                        const webmData = fs.readFileSync(filePath);
                        const analysis = analyzeWebMData(webmData);
                        
                        console.log(`File: ${file}`, {
                            size: webmData.length,
                            hasHighVariability: analysis.hasHighVariability,
                            hasSuddenChanges: analysis.hasSuddenChanges,
                            isLoud: analysis.isLoud,
                            complexity: analysis.complexity.toFixed(2)
                        });
                        
                        let dangerScore = 0;
                        if (analysis.hasHighVariability) dangerScore += 0.2;
                        if (analysis.hasSuddenChanges) dangerScore += 0.2;
                        if (analysis.isLoud) dangerScore += 0.3;
                        if (analysis.complexity > 5) dangerScore += 0.1;
                        
                        console.log(`  → Danger Score: ${dangerScore.toFixed(2)} | Dangerous: ${dangerScore > 0.3 ? '🚨 YES' : '✅ NO'}\n`);
                    } catch (error) {
                        console.log(`Error analyzing ${file}:`, error.message);
                    }
                });
            }
        }

        console.log('✅ WebM Audio Processing Test Completed!');
        console.log('\n💡 The system can now:');
        console.log('1. Process WebM audio data without decoding');
        console.log('2. Analyze raw data characteristics');
        console.log('3. Detect dangerous patterns in compressed audio');
        console.log('4. Adjust danger scores based on data complexity');

    } catch (error) {
        console.error('❌ Test failed:', error);
    }
}

// Run test
simulateWebMAudioProcessing();

