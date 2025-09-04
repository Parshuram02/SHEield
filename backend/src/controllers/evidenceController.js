const EvidenceService = require('../services/evidenceService');
const { AlertEvent } = require('../models');
const path = require('path');
const fs = require('fs').promises;

const evidenceService = new EvidenceService();

// Get evidence by share token (public access)
const getEvidenceByToken = async (req, res) => {
    try {
        const { token } = req.params;
        
        const result = await evidenceService.getEvidenceByToken(token);
        
        if (!result.success) {
            return res.status(404).json({
                success: false,
                error: result.error
            });
        }

        res.json({
            success: true,
            evidence: result.evidence
        });

    } catch (error) {
        console.error('Error getting evidence by token:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to retrieve evidence'
        });
    }
};

// Get evidence page (HTML view)
const getEvidencePage = async (req, res) => {
    try {
        const { id } = req.params;
        
        const alertEvent = await AlertEvent.findById(id)
            .populate('userId', 'email phoneE164')
            .populate('recipients.contactId', 'name phoneE164');

        if (!alertEvent) {
            return res.status(404).json({
                success: false,
                error: 'Evidence not found'
            });
        }

        const evidence = evidenceService.formatEvidenceForSharing(alertEvent);
        const htmlPage = createEvidencePage(evidence, alertEvent);

        res.setHeader('Content-Type', 'text/html');
        res.send(htmlPage);

    } catch (error) {
        console.error('Error getting evidence page:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to generate evidence page'
        });
    }
};

// Download audio file securely
const downloadAudio = async (req, res) => {
    try {
        const { alertId, filename } = req.params;
        
        const alertEvent = await AlertEvent.findById(alertId);
        if (!alertEvent) {
            return res.status(404).json({
                success: false,
                error: 'Alert event not found'
            });
        }

        const audioFile = alertEvent.audioFiles.find(file => file.filename === filename);
        if (!audioFile) {
            return res.status(404).json({
                success: false,
                error: 'Audio file not found'
            });
        }

        // Check if file exists
        try {
            await fs.access(audioFile.uploadPath);
        } catch (error) {
            return res.status(404).json({
                success: false,
                error: 'Audio file not found on disk'
            });
        }

        // Set headers for download
        res.setHeader('Content-Type', audioFile.mimeType || 'audio/webm');
        res.setHeader('Content-Disposition', `attachment; filename="${audioFile.originalName || filename}"`);
        res.setHeader('Content-Length', audioFile.size);

        // Stream the file
        const fileStream = require('fs').createReadStream(audioFile.uploadPath);
        fileStream.pipe(res);

    } catch (error) {
        console.error('Error downloading audio:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to download audio file'
        });
    }
};

// Get evidence statistics
const getEvidenceStats = async (req, res) => {
    try {
        const { userId } = req.query;
        
        const result = await evidenceService.getEvidenceStats(userId);
        
        res.json(result);

    } catch (error) {
        console.error('Error getting evidence stats:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to get evidence statistics'
        });
    }
};

// Update evidence
const updateEvidence = async (req, res) => {
    try {
        const { id } = req.params;
        const updates = req.body;
        
        const result = await evidenceService.updateEvidence(id, updates);
        
        if (!result.success) {
            return res.status(404).json(result);
        }

        res.json(result);

    } catch (error) {
        console.error('Error updating evidence:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to update evidence'
        });
    }
};

// Delete evidence
const deleteEvidence = async (req, res) => {
    try {
        const { id } = req.params;
        
        const result = await evidenceService.deleteEvidence(id);
        
        if (!result.success) {
            return res.status(404).json(result);
        }

        res.json(result);

    } catch (error) {
        console.error('Error deleting evidence:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to delete evidence'
        });
    }
};

// Clean up expired evidence
const cleanupExpiredEvidence = async (req, res) => {
    try {
        const result = await evidenceService.cleanupExpiredEvidence();
        
        res.json(result);

    } catch (error) {
        console.error('Error cleaning up expired evidence:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to cleanup expired evidence'
        });
    }
};

// Create evidence from alert data
const createEvidence = async (req, res) => {
    try {
        const alertData = req.body;
        
        const result = await evidenceService.createEvidence(alertData);
        
        res.status(201).json(result);

    } catch (error) {
        console.error('Error creating evidence:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to create evidence'
        });
    }
};

// Generate HTML evidence page
function createEvidencePage(evidence, alertEvent) {
    const { type, confidence, occurredAt, location, audioFiles, classification, meta } = evidence;
    
    const formatDate = (date) => new Date(date).toLocaleString();
    const formatFileSize = (bytes) => {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    };

    return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Emergency Evidence - ${type.toUpperCase()}</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; background: #f5f5f5; }
        .container { max-width: 800px; margin: 0 auto; padding: 20px; }
        .header { background: #dc2626; color: white; padding: 20px; border-radius: 8px; margin-bottom: 20px; }
        .header h1 { font-size: 24px; margin-bottom: 10px; }
        .alert-type { background: #fef3c7; color: #92400e; padding: 4px 12px; border-radius: 20px; font-size: 14px; font-weight: 600; display: inline-block; }
        .confidence { font-size: 18px; font-weight: 600; color: #dc2626; }
        .section { background: white; padding: 20px; border-radius: 8px; margin-bottom: 20px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
        .section h2 { color: #374151; margin-bottom: 15px; border-bottom: 2px solid #e5e7eb; padding-bottom: 10px; }
        .grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 15px; }
        .info-item { padding: 10px; background: #f9fafb; border-radius: 6px; }
        .info-label { font-size: 12px; color: #6b7280; text-transform: uppercase; font-weight: 600; margin-bottom: 5px; }
        .info-value { font-size: 16px; color: #111827; font-weight: 500; }
        .audio-files { display: grid; gap: 15px; }
        .audio-item { padding: 15px; background: #f9fafb; border-radius: 6px; border-left: 4px solid #3b82f6; }
        .audio-controls { margin-top: 10px; }
        .audio-controls audio { width: 100%; }
        .download-btn { background: #3b82f6; color: white; padding: 8px 16px; border: none; border-radius: 6px; text-decoration: none; display: inline-block; margin-top: 10px; }
        .download-btn:hover { background: #2563eb; }
        .meta-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 10px; }
        .tag { background: #e0e7ff; color: #3730a3; padding: 2px 8px; border-radius: 12px; font-size: 12px; display: inline-block; margin: 2px; }
        .footer { text-align: center; color: #6b7280; font-size: 14px; margin-top: 40px; padding: 20px; border-top: 1px solid #e5e7eb; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🚨 Emergency Evidence Report</h1>
            <div class="alert-type">${type.toUpperCase()}</div>
            <div class="confidence">Confidence: ${confidence}%</div>
        </div>

        <div class="section">
            <h2>📍 Incident Details</h2>
            <div class="grid">
                <div class="info-item">
                    <div class="info-label">Date & Time</div>
                    <div class="info-value">${formatDate(occurredAt)}</div>
                </div>
                <div class="info-item">
                    <div class="info-label">Location</div>
                    <div class="info-value">${location.address || `${location.lat}, ${location.lng}`}</div>
                </div>
                <div class="info-item">
                    <div class="info-label">Coordinates</div>
                    <div class="info-value">${location.lat}, ${location.lng}</div>
                </div>
                <div class="info-item">
                    <div class="info-label">Classification</div>
                    <div class="info-value">${classification.primary || 'Unknown'}</div>
                </div>
            </div>
        </div>

        <div class="section">
            <h2>🎵 Audio Evidence</h2>
            <div class="audio-files">
                ${audioFiles.map(file => `
                    <div class="audio-item">
                        <div class="info-label">Audio File</div>
                        <div class="info-value">${file.originalName || file.filename}</div>
                        <div class="meta-grid">
                            <div class="info-item">
                                <div class="info-label">Size</div>
                                <div class="info-value">${formatFileSize(file.size)}</div>
                            </div>
                            <div class="info-item">
                                <div class="info-label">Duration</div>
                                <div class="info-value">${file.duration || 'Unknown'}s</div>
                            </div>
                        </div>
                        <div class="audio-controls">
                            <audio controls>
                                <source src="/api/evidence/${alertEvent._id}/audio/${file.filename}" type="audio/webm">
                                Your browser does not support the audio element.
                            </audio>
                            <a href="/api/evidence/${alertEvent._id}/audio/${file.filename}" class="download-btn">Download Audio</a>
                        </div>
                    </div>
                `).join('')}
            </div>
        </div>

        <div class="section">
            <h2>📝 Additional Information</h2>
            <div class="grid">
                ${meta.transcription ? `
                    <div class="info-item">
                        <div class="info-label">Transcription</div>
                        <div class="info-value">${meta.transcription}</div>
                    </div>
                ` : ''}
                ${meta.detectedKeywords && meta.detectedKeywords.length > 0 ? `
                    <div class="info-item">
                        <div class="info-label">Detected Keywords</div>
                        <div class="info-value">
                            ${meta.detectedKeywords.map(keyword => `<span class="tag">${keyword}</span>`).join('')}
                        </div>
                    </div>
                ` : ''}
                ${meta.audioQuality ? `
                    <div class="info-item">
                        <div class="info-label">Audio Quality</div>
                        <div class="info-value">${meta.audioQuality}</div>
                    </div>
                ` : ''}
                ${meta.priority ? `
                    <div class="info-item">
                        <div class="info-label">Priority</div>
                        <div class="info-value">${meta.priority}</div>
                    </div>
                ` : ''}
            </div>
        </div>

        <div class="footer">
            <p>This evidence report was generated automatically by the SHEield Safety System</p>
            <p>Share Token: ${evidence.shareToken}</p>
            <p>Expires: ${formatDate(evidence.expiresAt)}</p>
        </div>
    </div>
</body>
</html>`;
}

module.exports = {
    getEvidenceByToken,
    getEvidencePage,
    downloadAudio,
    getEvidenceStats,
    updateEvidence,
    deleteEvidence,
    cleanupExpiredEvidence,
    createEvidence
};
