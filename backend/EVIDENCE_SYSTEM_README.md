# 🚨 SHEield Evidence Creation and Storage System

## Overview

The SHEield Evidence System provides comprehensive emergency alert evidence management, including secure audio storage, detailed metadata tracking, and public sharing capabilities. This system ensures all emergency alerts are properly documented with timestamp, location, device information, and audio evidence.

## 🏗️ System Architecture

### Core Components

1. **EvidenceService** (`src/services/evidenceService.js`)
   - Central service for evidence management
   - Handles audio file storage and retrieval
   - Manages share tokens and public access
   - Provides audit trail functionality

2. **EvidenceController** (`src/controllers/evidenceController.js`)
   - REST API endpoints for evidence management
   - Public and authenticated access routes
   - HTML evidence page generation
   - Secure file download handling

3. **Enhanced AlertEvent Model** (`src/models/AlertEvent.js`)
   - Comprehensive evidence schema
   - Device and location tracking
   - Classification and metadata storage
   - Audit trail and access statistics

## 🔐 Security Features

### Authentication & Authorization
- **API Key Authentication**: Required for protected endpoints
- **Public Access**: Share tokens for limited public viewing
- **Secure Downloads**: Tokenized file access with expiration

### Data Protection
- **Secure File Storage**: Local file system with path validation
- **Signed URLs**: Temporary access tokens for audio files
- **Access Tracking**: Monitor who views evidence and when
- **Audit Trail**: Complete history of all evidence actions

## 📊 Evidence Data Structure

### AlertEvent Schema
```javascript
{
  // Basic Information
  userId: ObjectId,
  type: String, // scream, crash, keyword, manual, etc.
  confidence: Number, // 0-1 confidence score
  
  // Trigger Details
  trigger: {
    source: String, // model, keyword, manual
    model: String, // AI model used
    keyword: String, // Detected keyword
    timestamp: Date,
    confidence: Number
  },
  
  // Location & Device
  location: {
    lat: Number,
    lng: Number,
    accuracyMeters: Number,
    address: String,
    timestamp: Date
  },
  device: {
    platform: String, // ios, android, web
    userAgent: String,
    appVersion: String,
    deviceId: String,
    networkType: String
  },
  
  // Audio Evidence
  audioFiles: [{
    filename: String,
    originalName: String,
    mimeType: String,
    size: Number, // bytes
    duration: Number, // seconds
    uploadPath: String,
    cloudUrl: String,
    signedUrl: String,
    expiresAt: Date
  }],
  
  // Classification
  classification: {
    primary: String,
    secondary: [String],
    model: String,
    version: String,
    processingTime: Number
  },
  
  // Actions & Recipients
  actions: {
    smsSent: Boolean,
    siren: Boolean,
    flash: Boolean,
    policeCalled: Boolean,
    emergencyServices: Boolean,
    userNotified: Boolean
  },
  
  // Metadata
  meta: {
    transcription: String,
    detectedKeywords: [String],
    audioQuality: String,
    backgroundNoise: String,
    userNotes: String,
    tags: [String],
    priority: String
  },
  
  // Evidence Sharing
  evidence: {
    shareToken: String,
    shareExpiresAt: Date,
    isPublic: Boolean,
    accessCount: Number,
    lastAccessedAt: Date
  },
  
  // Audit Trail
  audit: [{
    action: String,
    timestamp: Date,
    userId: ObjectId,
    details: String,
    ipAddress: String,
    userAgent: String
  }]
}
```

## 🌐 API Endpoints

### Public Routes (No Authentication)
```
GET /api/evidence/public/:token     # Get evidence by share token
GET /api/evidence/:id               # Get evidence page (HTML)
GET /api/evidence/:alertId/audio/:filename  # Download audio file
```

### Protected Routes (Require API Key)
```
POST   /api/evidence                # Create new evidence
GET    /api/evidence/stats          # Get evidence statistics
POST   /api/evidence/:id/update     # Update evidence
DELETE /api/evidence/:id            # Delete evidence
POST   /api/evidence/cleanup        # Clean up expired evidence
```

## 🎯 Key Features

### 1. Comprehensive Evidence Creation
- **Automatic Logging**: Every alert creates a complete evidence record
- **Device Information**: Platform, user agent, app version tracking
- **Location Data**: GPS coordinates with accuracy and address
- **Audio Metadata**: File size, duration, format, and quality metrics

### 2. Secure Audio Storage
- **Local Storage**: Secure file system storage with unique naming
- **Signed URLs**: Temporary access tokens for secure file sharing
- **Access Control**: Token-based authentication for file downloads
- **File Validation**: Path traversal protection and MIME type validation

### 3. Public Sharing System
- **Share Tokens**: Unique, secure tokens for public evidence access
- **Expiration Control**: Configurable token expiration (default: 7 days)
- **Access Tracking**: Monitor who views evidence and when
- **Beautiful Pages**: Professional HTML evidence presentation

### 4. Audit Trail & Analytics
- **Complete History**: Track all evidence actions and modifications
- **Access Statistics**: Monitor evidence usage and popularity
- **User Tracking**: Record who accessed evidence and from where
- **Performance Metrics**: Processing times and confidence scores

### 5. Evidence Management
- **Search & Filter**: Find evidence by type, keywords, or metadata
- **Bulk Operations**: Update multiple evidence records
- **Cleanup Tools**: Automatic removal of expired evidence
- **Export Capabilities**: Download evidence and metadata

## 🚀 Usage Examples

### Creating Evidence
```javascript
const evidenceService = new EvidenceService();

const alertData = {
  userId: 'user123',
  type: 'keyword',
  confidence: 0.85,
  trigger: {
    source: 'keyword',
    model: 'web_speech_api',
    keyword: 'help me'
  },
  location: {
    lat: 40.7128,
    lng: -74.0060,
    accuracyMeters: 10,
    address: 'New York, NY, USA'
  },
  device: {
    platform: 'web',
    userAgent: 'Mozilla/5.0...',
    appVersion: '1.0.0'
  },
  audioFiles: [audioFileData],
  classification: classificationData,
  meta: metadata
};

const result = await evidenceService.createEvidence(alertData);
console.log('Evidence created:', result.alertEventId);
console.log('Share URL:', result.shareUrl);
```

### Storing Audio Files
```javascript
const audioFile = await evidenceService.storeAudioFile(
  audioBuffer,
  'emergency_recording.webm',
  'audio/webm'
);

console.log('Audio stored:', audioFile.filename);
console.log('Signed URL:', audioFile.signedUrl);
```

### Retrieving Evidence
```javascript
const evidence = await evidenceService.getEvidenceByToken(shareToken);
if (evidence.success) {
  console.log('Evidence type:', evidence.evidence.type);
  console.log('Location:', evidence.evidence.location.address);
  console.log('Audio files:', evidence.evidence.audioFiles.length);
}
```

## 🔧 Configuration

### Environment Variables
```bash
# File storage
UPLOAD_DIR=./uploads
MAX_FILE_SIZE=10485760  # 10MB

# Share token settings
SHARE_TOKEN_EXPIRY=604800  # 7 days in seconds
SIGNED_URL_EXPIRY=86400    # 24 hours in seconds

# Security
ENABLE_PUBLIC_ACCESS=true
REQUIRE_AUTHENTICATION=true
```

### File Storage
- **Local Storage**: Default upload directory with automatic creation
- **Cloud Storage**: Ready for AWS S3, Google Cloud Storage integration
- **CDN Support**: Signed URLs work with CDN services
- **Backup**: Automatic file backup and recovery

## 📱 Frontend Integration

### EvidenceManager Component
The frontend includes a comprehensive `EvidenceManager` component that provides:
- **Evidence List**: Searchable, filterable evidence display
- **Detail Views**: Comprehensive evidence information
- **Audio Playback**: Built-in audio player with download options
- **Sharing Tools**: Copy share links to clipboard
- **Statistics Dashboard**: Evidence metrics and analytics

### Key Features
- **Responsive Design**: Works on all device sizes
- **Real-time Updates**: Live evidence status and updates
- **Search & Filter**: Find evidence quickly and efficiently
- **Export Options**: Download evidence and metadata
- **User Management**: Role-based access control

## 🧪 Testing

### Test Script
Run the evidence system test:
```bash
cd backend
node test-evidence.js
```

### Test Coverage
- Evidence creation and storage
- Audio file management
- Share token functionality
- Statistics and analytics
- Update and deletion operations
- Cleanup procedures

## 🔒 Security Considerations

### File Security
- **Path Validation**: Prevent directory traversal attacks
- **MIME Type Checking**: Validate file types before storage
- **Size Limits**: Prevent large file uploads
- **Access Control**: Token-based file access with expiration

### Data Protection
- **Encryption**: Sensitive data encryption at rest
- **Access Logging**: Complete audit trail of all access
- **Token Security**: Cryptographically secure share tokens
- **Rate Limiting**: Prevent abuse of public endpoints

### Privacy Compliance
- **GDPR Ready**: Data retention and deletion policies
- **User Consent**: Clear consent for evidence sharing
- **Data Minimization**: Only collect necessary information
- **Right to Erasure**: Complete evidence deletion capability

## 🚀 Future Enhancements

### Planned Features
- **Cloud Storage**: AWS S3, Google Cloud Storage integration
- **Video Support**: Enhanced multimedia evidence handling
- **AI Analysis**: Automated evidence classification and tagging
- **Real-time Streaming**: Live evidence sharing and collaboration
- **Mobile Apps**: Native iOS and Android applications
- **API Webhooks**: Real-time notifications and integrations

### Scalability Improvements
- **Database Optimization**: Indexing and query optimization
- **Caching Layer**: Redis-based caching for performance
- **Load Balancing**: Horizontal scaling for high traffic
- **CDN Integration**: Global content delivery network
- **Microservices**: Service-oriented architecture

## 📚 API Documentation

### Request/Response Examples
See the `test-evidence.js` file for comprehensive API usage examples.

### Error Handling
All endpoints return consistent error responses:
```json
{
  "success": false,
  "error": "Error description"
}
```

### Rate Limiting
- Public endpoints: 100 requests per hour
- Protected endpoints: 1000 requests per hour
- File uploads: 10 files per hour

## 🆘 Support & Troubleshooting

### Common Issues
1. **File Upload Failures**: Check disk space and permissions
2. **Share Token Expired**: Generate new share token
3. **Audio Playback Issues**: Verify file format and browser support
4. **Authentication Errors**: Check API key and permissions

### Debug Mode
Enable debug logging:
```bash
DEBUG=evidence:* node server.js
```

### Performance Monitoring
- **Response Times**: Monitor API endpoint performance
- **File Storage**: Track disk usage and cleanup efficiency
- **Access Patterns**: Analyze evidence usage statistics
- **Error Rates**: Monitor system health and reliability

## 📄 License

This evidence system is part of the SHEield Safety Platform and is proprietary software.

---

**🚨 Emergency Use**: This system is designed for emergency situations. Always prioritize human safety over technical perfection.

**🔒 Security First**: Regularly review security settings and update access controls as needed.

**📊 Monitor Usage**: Track system performance and usage patterns to optimize for your specific needs.




