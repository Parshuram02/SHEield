const crypto = require('crypto');
const path = require('path');
const fs = require('fs').promises;
const { AlertEvent } = require('../models');
const config = require('../config');

class EvidenceService {
    constructor() {
        this.uploadDir = path.join(__dirname, '../../uploads');
        this.ensureUploadDir();
    }

    // Ensure upload directory exists
    async ensureUploadDir() {
        try {
            await fs.access(this.uploadDir);
        } catch (error) {
            await fs.mkdir(this.uploadDir, { recursive: true });
        }
    }

    // Generate unique share token
    generateShareToken() {
        return crypto.randomBytes(32).toString('hex');
    }

    // Generate signed URL for secure access
    generateSignedUrl(filename, expiresIn = 3600) {
        const expiresAt = new Date(Date.now() + expiresIn * 1000);
        const token = crypto.randomBytes(16).toString('hex');
        
        return {
            url: `/api/evidence/secure/${filename}?token=${token}&expires=${expiresAt.getTime()}`,
            expiresAt,
            token
        };
    }

    // Create comprehensive evidence record
    async createEvidence(alertData) {
        try {
            const {
                userId,
                type,
                confidence,
                trigger,
                location,
                device,
                audioFiles,
                classification,
                meta,
                ipAddress,
                userAgent
            } = alertData;

            // Generate share token for public access
            const shareToken = this.generateShareToken();
            const shareExpiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

            // Create audit trail entry
            const auditEntry = {
                action: 'created',
                timestamp: new Date(),
                userId,
                details: `Alert event created for ${type} with ${confidence * 100}% confidence`,
                ipAddress,
                userAgent
            };

            // Create evidence record
            const evidence = {
                shareToken,
                shareExpiresAt,
                isPublic: false,
                accessCount: 0,
                lastAccessedAt: null
            };

            // Create AlertEvent with enhanced evidence
            const alertEvent = new AlertEvent({
                userId,
                type,
                confidence,
                trigger: {
                    ...trigger,
                    timestamp: new Date(),
                    confidence
                },
                location: {
                    ...location,
                    timestamp: new Date()
                },
                device,
                audioFiles: audioFiles.map(file => ({
                    filename: file.filename,
                    originalName: file.originalName,
                    mimeType: file.mimeType,
                    size: file.size,
                    duration: file.duration,
                    uploadPath: file.uploadPath,
                    cloudUrl: file.cloudUrl,
                    signedUrl: file.signedUrl,
                    expiresAt: file.expiresAt
                })),
                classification,
                meta: {
                    transcription: meta.transcription || '',
                    detectedKeywords: meta.detectedKeywords || [],
                    audioQuality: meta.audioQuality || 'unknown',
                    backgroundNoise: meta.backgroundNoise || 'unknown',
                    userNotes: meta.userNotes || '',
                    tags: meta.tags || [],
                    priority: meta.priority || 'medium'
                },
                evidence,
                audit: [auditEntry],
                occurredAt: new Date()
            });

            await alertEvent.save();
            console.log(`✅ Evidence created for alert: ${alertEvent._id}`);

            return {
                success: true,
                alertEventId: alertEvent._id,
                shareToken,
                shareUrl: `/evidence/${shareToken}`
            };

        } catch (error) {
            console.error('❌ Error creating evidence:', error);
            throw error;
        }
    }

    // Store audio file securely
    async storeAudioFile(audioBuffer, originalName, mimeType) {
        try {
            const timestamp = Date.now();
            const randomId = crypto.randomBytes(8).toString('hex');
            const filename = `audio_${timestamp}_${randomId}.webm`;
            const filePath = path.join(this.uploadDir, filename);

            // Write file to disk
            await fs.writeFile(filePath, audioBuffer);

            // Get file stats
            const stats = await fs.stat(filePath);
            const fileSize = stats.size;

            // Generate signed URL
            const signedUrlData = this.generateSignedUrl(filename, 24 * 60 * 60); // 24 hours

            const audioFile = {
                filename,
                originalName,
                mimeType,
                size: fileSize,
                duration: 0, // Will be calculated if needed
                uploadPath: filePath,
                cloudUrl: null, // For future cloud storage integration
                signedUrl: signedUrlData.url,
                expiresAt: signedUrlData.expiresAt
            };

            console.log(`✅ Audio file stored: ${filename} (${fileSize} bytes)`);
            return audioFile;

        } catch (error) {
            console.error('❌ Error storing audio file:', error);
            throw error;
        }
    }

    // Get evidence by share token
    async getEvidenceByToken(shareToken) {
        try {
            const alertEvent = await AlertEvent.findOne({
                'evidence.shareToken': shareToken,
                'evidence.shareExpiresAt': { $gt: new Date() }
            }).populate('userId', 'email phoneE164');

            if (!alertEvent) {
                return { success: false, error: 'Evidence not found or expired' };
            }

            // Update access statistics
            await AlertEvent.updateOne(
                { _id: alertEvent._id },
                {
                    $inc: { 'evidence.accessCount': 1 },
                    $set: { 'evidence.lastAccessedAt': new Date() }
                }
            );

            // Add audit entry
            await AlertEvent.updateOne(
                { _id: alertEvent._id },
                {
                    $push: {
                        audit: {
                            action: 'evidence_accessed',
                            timestamp: new Date(),
                            details: 'Evidence accessed via share token',
                            ipAddress: 'unknown',
                            userAgent: 'unknown'
                        }
                    }
                }
            );

            return {
                success: true,
                evidence: this.formatEvidenceForSharing(alertEvent)
            };

        } catch (error) {
            console.error('❌ Error getting evidence by token:', error);
            throw error;
        }
    }

    // Format evidence for public sharing
    formatEvidenceForSharing(alertEvent) {
        const {
            type,
            confidence,
            trigger,
            location,
            occurredAt,
            audioFiles,
            classification,
            meta,
            evidence
        } = alertEvent;

        return {
            id: alertEvent._id,
            type,
            confidence: Math.round(confidence * 100),
            occurredAt,
            location: {
                lat: location.lat,
                lng: location.lng,
                address: location.address || 'Location not available'
            },
            audioFiles: audioFiles.map(file => ({
                filename: file.filename,
                size: file.size,
                duration: file.duration,
                accessUrl: file.signedUrl
            })),
            classification: {
                primary: classification.primary,
                model: classification.model
            },
            meta: {
                transcription: meta.transcription,
                detectedKeywords: meta.detectedKeywords,
                audioQuality: meta.audioQuality,
                priority: meta.priority
            },
            shareToken: evidence.shareToken,
            expiresAt: evidence.shareExpiresAt
        };
    }

    // Update evidence with additional information
    async updateEvidence(alertEventId, updates) {
        try {
            const updateData = {
                ...updates,
                updatedAt: new Date()
            };

            // Add audit entry
            if (updates.actions || updates.meta || updates.recipients) {
                updateData.$push = {
                    audit: {
                        action: 'evidence_updated',
                        timestamp: new Date(),
                        details: 'Evidence updated with new information',
                        ipAddress: 'unknown',
                        userAgent: 'unknown'
                    }
                };
            }

            const alertEvent = await AlertEvent.findByIdAndUpdate(
                alertEventId,
                updateData,
                { new: true }
            );

            if (!alertEvent) {
                return { success: false, error: 'Alert event not found' };
            }

            console.log(`✅ Evidence updated for alert: ${alertEventId}`);
            return { success: true, alertEvent };

        } catch (error) {
            console.error('❌ Error updating evidence:', error);
            throw error;
        }
    }

    // Delete evidence and associated files
    async deleteEvidence(alertEventId) {
        try {
            const alertEvent = await AlertEvent.findById(alertEventId);
            if (!alertEvent) {
                return { success: false, error: 'Alert event not found' };
            }

            // Delete audio files from disk
            for (const audioFile of alertEvent.audioFiles) {
                try {
                    await fs.unlink(audioFile.uploadPath);
                    console.log(`🗑️ Deleted audio file: ${audioFile.filename}`);
                } catch (error) {
                    console.warn(`⚠️ Could not delete audio file: ${audioFile.filename}`, error.message);
                }
            }

            // Delete from database
            await AlertEvent.findByIdAndDelete(alertEventId);
            console.log(`🗑️ Deleted evidence: ${alertEventId}`);

            return { success: true };

        } catch (error) {
            console.error('❌ Error deleting evidence:', error);
            throw error;
        }
    }

    // Get evidence statistics
    async getEvidenceStats(userId = null) {
        try {
            const matchStage = userId ? { userId } : {};

            const stats = await AlertEvent.aggregate([
                { $match: matchStage },
                {
                    $group: {
                        _id: null,
                        totalEvents: { $sum: 1 },
                        totalAudioFiles: { $sum: { $size: '$audioFiles' } },
                        totalSize: { $sum: { $sum: '$audioFiles.size' } },
                        avgConfidence: { $avg: '$confidence' },
                        byType: {
                            $push: {
                                type: '$type',
                                confidence: '$confidence'
                            }
                        }
                    }
                }
            ]);

            return {
                success: true,
                stats: stats[0] || {
                    totalEvents: 0,
                    totalAudioFiles: 0,
                    totalSize: 0,
                    avgConfidence: 0,
                    byType: []
                }
            };

        } catch (error) {
            console.error('❌ Error getting evidence stats:', error);
            throw error;
        }
    }

    // Clean up expired evidence
    async cleanupExpiredEvidence() {
        try {
            const expiredEvents = await AlertEvent.find({
                'evidence.shareExpiresAt': { $lt: new Date() }
            });

            for (const event of expiredEvents) {
                await this.deleteEvidence(event._id);
            }

            console.log(`🧹 Cleaned up ${expiredEvents.length} expired evidence records`);
            return { success: true, cleanedCount: expiredEvents.length };

        } catch (error) {
            console.error('❌ Error cleaning up expired evidence:', error);
            throw error;
        }
    }
}

module.exports = EvidenceService;
