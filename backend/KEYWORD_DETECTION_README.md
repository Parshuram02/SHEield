# Keyword Detection System

This system provides real-time keyword detection for emergency situations using both client-side and server-side speech recognition.

## Features

### 🎤 Client-Side Detection (Web Speech API)
- **Lightweight**: Uses browser's built-in speech recognition
- **Real-time**: Continuous listening with configurable sensitivity
- **Configurable**: Adjustable confidence thresholds and trigger phrases
- **No API Keys**: Works immediately without external services

### 🚀 Server-Side Detection (Cloud STT)
- **High Accuracy**: Professional speech recognition services
- **Multiple Providers**: Google Cloud Speech, Deepgram, AssemblyAI
- **Advanced Analysis**: Context-aware keyword detection
- **Confidence Scoring**: Intelligent phrase matching with confidence levels

## Architecture

```
Frontend (KeywordDetector.tsx)
    ↓ Web Speech API
    ↓ HTTP/WebSocket
Backend (KeywordDetectionService)
    ↓ Cloud STT Providers
    ↓ AlertEvent Creation
    ↓ Emergency Notifications
```

## Setup

### 1. Install Dependencies

```bash
npm install
```

### 2. Environment Variables

Add these to your `.env` file:

```env
# Speech Recognition APIs (Optional - for server-side detection)
GOOGLE_APPLICATION_CREDENTIALS=path/to/google-credentials.json
DEEPGRAM_API_KEY=your_deepgram_key
ASSEMBLYAI_API_KEY=your_assemblyai_key

# Required
API_KEY=your_secret_api_key
MONGODB_URI=mongodb://localhost:27017/sheield
```

### 3. Speech Recognition Providers

#### Google Cloud Speech
1. Create a Google Cloud project
2. Enable Speech-to-Text API
3. Create service account and download credentials JSON
4. Set `GOOGLE_APPLICATION_CREDENTIALS` to the JSON file path

#### Deepgram
1. Sign up at [deepgram.com](https://deepgram.com)
2. Get your API key
3. Set `DEEPGRAM_API_KEY` in `.env`

#### AssemblyAI
1. Sign up at [assemblyai.com](https://assemblyai.com)
2. Get your API key
3. Set `ASSEMBLYAI_API_KEY` in `.env`

## Usage

### Frontend Component

```tsx
import KeywordDetector from './components/KeywordDetector';

function App() {
  const handleKeywordDetected = (keyword, confidence, transcription) => {
    console.log(`🚨 Emergency keyword detected: ${keyword}`);
    // Handle emergency situation
  };

  return (
    <KeywordDetector 
      onKeywordDetected={handleKeywordDetected}
      isEnabled={true}
    />
  );
}
```

### Backend API

#### Detect Keywords in Audio
```bash
POST /api/keywords/detect
Content-Type: application/json
x-api-key: your_api_key

{
  "audioBuffer": "base64_encoded_audio",
  "provider": "auto",
  "language": "en-US"
}
```

#### Test Text Detection
```bash
POST /api/keywords/test
Content-Type: application/json
x-api-key: your_api_key

{
  "text": "I need help immediately!"
}
```

#### Get Available Providers
```bash
GET /api/keywords/providers
x-api-key: your_api_key
```

#### Manage Trigger Phrases
```bash
# Get all phrases
GET /api/keywords/phrases

# Add new phrase
POST /api/keywords/phrases
{
  "phrase": "custom emergency phrase"
}

# Remove phrase
DELETE /api/keywords/phrases/custom%20emergency%20phrase
```

## Trigger Phrases

### Default Emergency Phrases
- `help me`
- `emergency`
- `danger`
- `sos`
- `call police`
- `need help`
- `assault`
- `fire`
- `accident`
- `robbery`
- `attack`
- `threat`
- `dangerous`
- `unsafe`
- `panic`

### Custom Phrases
Add your own trigger phrases via the API or modify the service directly.

## Confidence Scoring

The system uses intelligent confidence scoring based on:

- **Phrase Length**: Longer phrases get higher confidence
- **Repetition**: Multiple occurrences increase confidence
- **Urgency Indicators**: Words like "now", "immediately", "urgent"
- **Emphasis**: Exclamation marks, ALL CAPS, repeated letters
- **Context**: Surrounding words and sentence structure

## Testing

### Run Keyword Detection Tests
```bash
node test-keywords.js
```

### Test API Endpoints
```bash
# Start server first
npm run dev

# Then run tests
node test-keywords.js
```

## Configuration

### Sensitivity Threshold
Adjust the confidence threshold (0.1 - 1.0) to control false positives:
- **Lower (0.1-0.3)**: More sensitive, more false positives
- **Medium (0.4-0.7)**: Balanced detection
- **Higher (0.8-1.0)**: Less sensitive, fewer false positives

### Continuous Mode
Enable continuous listening for real-time detection:
- **On**: Continuously listens and restarts automatically
- **Off**: Manual start/stop required

### Provider Selection
- **Auto**: Automatically selects best available provider
- **Manual**: Specify provider (google, deepgram, assemblyai)

## Integration with Emergency System

When keywords are detected:

1. **AlertEvent Created**: New emergency event in database
2. **SMS Notifications**: Emergency contacts notified via Twilio
3. **Evidence Storage**: Audio and transcription saved
4. **Location Tracking**: GPS coordinates included (if available)

## Troubleshooting

### Common Issues

#### "Speech recognition not supported"
- Use Chrome, Edge, or Safari
- Ensure microphone permissions granted
- Check browser console for errors

#### "No speech recognition providers configured"
- Set up at least one cloud STT provider
- Check environment variables
- Verify API keys are valid

#### Low detection accuracy
- Adjust sensitivity threshold
- Add custom trigger phrases
- Check audio quality and microphone
- Use cloud STT for better accuracy

### Debug Mode

Enable detailed logging:
```javascript
// In KeywordDetectionService
console.log('Debug mode enabled');
// Check server logs for detailed information
```

## Performance Considerations

### Client-Side (Web Speech API)
- **Pros**: No API costs, immediate availability, low latency
- **Cons**: Browser dependency, variable accuracy, limited features

### Server-Side (Cloud STT)
- **Pros**: High accuracy, advanced features, consistent performance
- **Cons**: API costs, network latency, requires internet connection

### Recommendations
- **Development/Testing**: Use client-side detection
- **Production**: Combine both for redundancy
- **High-Security**: Use server-side with multiple providers

## Security

- All API endpoints require API key authentication
- Audio data is processed securely
- No sensitive data is logged
- API keys are stored in environment variables

## Future Enhancements

- [ ] Multi-language support
- [ ] Custom ML models
- [ ] Offline keyword detection
- [ ] Voice biometrics
- [ ] Advanced context analysis
- [ ] Machine learning confidence scoring

## Support

For issues or questions:
1. Check the troubleshooting section
2. Review server logs
3. Test with the provided test scripts
4. Verify environment configuration

