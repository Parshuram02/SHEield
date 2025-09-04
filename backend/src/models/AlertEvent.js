const mongoose = require('mongoose');
const { Schema } = mongoose;

const LocationSchema = new Schema(
    {
        lat: { type: Number },
        lng: { type: Number },
        accuracyMeters: { type: Number },
        source: { type: String, enum: ['device', 'ip', 'manual'], default: 'device' },
    },
    { _id: false }
);

const RecipientSchema = new Schema(
    {
        contactId: { type: Schema.Types.ObjectId, ref: 'Contact' },
        status: { type: String, enum: ['pending', 'sent', 'delivered', 'failed'], default: 'pending' },
        provider: { type: String, enum: ['twilio', 'none'], default: 'twilio' },
        providerMessageId: { type: String },
        deliveredAt: { type: Date },
        failedAt: { type: Date },
        error: { type: String },
    },
    { _id: false }
);

const AlertEventSchema = new Schema(
    {
        userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
        type: {
            type: String,
            enum: ['scream', 'crash', 'running', 'keyword', 'manual', 'unknown'],
            default: 'unknown',
            index: true,
        },
        confidence: { type: Number, min: 0, max: 1 },
        
        // Enhanced trigger information
        trigger: {
            source: { type: String, enum: ['model', 'keyword', 'manual'], required: true },
            model: { type: String },
            keyword: { type: String },
            timestamp: { type: Date, default: Date.now },
            confidence: { type: Number, min: 0, max: 1 }
        },
        
        // Enhanced location with address
        location: {
            ...LocationSchema.obj,
            address: { type: String }, // Human-readable address
            timestamp: { type: Date, default: Date.now }
        },
        
        // Enhanced device information
        device: {
            platform: { type: String, enum: ['ios', 'android', 'web'] },
            userAgent: { type: String },
            appVersion: { type: String },
            deviceId: { type: String },
            networkType: { type: String, enum: ['wifi', 'cellular', 'unknown'] }
        },
        
        // Enhanced audio evidence
        audioFiles: [{
            filename: { type: String, required: true },
            originalName: { type: String },
            mimeType: { type: String },
            size: { type: Number }, // in bytes
            duration: { type: Number }, // in seconds
            uploadPath: { type: String },
            cloudUrl: { type: String }, // For cloud storage
            signedUrl: { type: String }, // Temporary signed URL
            expiresAt: { type: Date } // When signed URL expires
        }],
        
        // Enhanced classification data
        classification: {
            primary: { type: String }, // Main classification
            secondary: [String], // Additional classifications
            model: { type: String }, // Model used for classification
            version: { type: String }, // Model version
            processingTime: { type: Number } // Time taken for classification in ms
        },
        
        // Enhanced action tracking
        actions: {
            smsSent: { type: Boolean, default: false },
            siren: { type: Boolean, default: false },
            flash: { type: Boolean, default: false },
            policeCalled: { type: Boolean, default: false },
            emergencyServices: { type: Boolean, default: false },
            userNotified: { type: Boolean, default: false }
        },
        
        // Enhanced recipient tracking
        recipients: [{
            ...RecipientSchema.obj,
            sentAt: { type: Date },
            retryCount: { type: Number, default: 0 },
            lastRetryAt: { type: Date }
        }],
        
        // Enhanced metadata
        meta: {
            transcription: { type: String }, // Speech-to-text result
            detectedKeywords: [String], // Keywords that triggered the alert
            audioQuality: { type: String, enum: ['good', 'fair', 'poor'] },
            backgroundNoise: { type: String, enum: ['low', 'medium', 'high'] },
            userNotes: { type: String }, // User-provided notes
            tags: [String], // Custom tags for categorization
            priority: { type: String, enum: ['low', 'medium', 'high', 'critical'], default: 'medium' }
        },
        
        // Evidence sharing
        evidence: {
            shareToken: { type: String, unique: true, sparse: true }, // For public sharing
            shareExpiresAt: { type: Date }, // When share token expires
            isPublic: { type: Boolean, default: false }, // Whether evidence is publicly accessible
            accessCount: { type: Number, default: 0 }, // Number of times evidence was accessed
            lastAccessedAt: { type: Date }
        },
        
        // Audit trail
        audit: [{
            action: { type: String, required: true }, // 'created', 'updated', 'sms_sent', 'evidence_shared'
            timestamp: { type: Date, default: Date.now },
            userId: { type: Schema.Types.ObjectId, ref: 'User' },
            details: { type: String },
            ipAddress: { type: String },
            userAgent: { type: String }
        }],
        
        notes: { type: String },
        occurredAt: { type: Date, default: Date.now, index: true },
    },
    {
        timestamps: true,
        versionKey: false,
    }
);

module.exports = mongoose.model('AlertEvent', AlertEventSchema);


