const { AlertEvent } = require('../models');
const path = require('path');
const fs = require('fs');

// Get evidence for an alert event
exports.getEvidence = async (req, res) => {
    try {
        const { id } = req.params;
        
        const alertEvent = await AlertEvent.findById(id)
            .populate('recipients.contactId', 'name phoneE164 relationship');
        
        if (!alertEvent) {
            return res.status(404).json({ error: 'Alert event not found' });
        }
        
        // Create a simple HTML page to display evidence
        const html = createEvidencePage(alertEvent);
        
        res.setHeader('Content-Type', 'text/html');
        res.send(html);
        
    } catch (error) {
        console.error('Error fetching evidence:', error);
        res.status(500).json({ error: 'Failed to fetch evidence' });
    }
};

// Download audio file
exports.downloadAudio = async (req, res) => {
    try {
        const { alertId, filename } = req.params;
        
        // Verify the alert event exists
        const alertEvent = await AlertEvent.findById(alertId);
        if (!alertEvent) {
            return res.status(404).json({ error: 'Alert event not found' });
        }
        
        // Check if the file exists in the alert's audio files
        if (!alertEvent.audioFiles.includes(filename)) {
            return res.status(404).json({ error: 'Audio file not found' });
        }
        
        const filePath = path.join(__dirname, '../../uploads', filename);
        
        if (!fs.existsSync(filePath)) {
            return res.status(404).json({ error: 'Audio file not found on disk' });
        }
        
        // Set headers for audio download
        res.setHeader('Content-Type', 'audio/webm');
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
        
        // Stream the file
        const fileStream = fs.createReadStream(filePath);
        fileStream.pipe(res);
        
    } catch (error) {
        console.error('Error downloading audio:', error);
        res.status(500).json({ error: 'Failed to download audio file' });
    }
};

// Create HTML evidence page
function createEvidencePage(alertEvent) {
    const audioFiles = alertEvent.audioFiles || [];
    const audioFileLinks = audioFiles.map(filename => 
        `<li><a href="/api/evidence/${alertEvent._id}/audio/${filename}" target="_blank">${filename}</a></li>`
    ).join('');
    
    const recipients = alertEvent.recipients || [];
    const recipientRows = recipients.map(recipient => 
        `<tr>
            <td>${recipient.contactId?.name || 'Unknown'}</td>
            <td>${recipient.contactId?.phoneE164 || 'N/A'}</td>
            <td><span class="status ${recipient.status}">${recipient.status}</span></td>
            <td>${recipient.deliveredAt ? new Date(recipient.deliveredAt).toLocaleString() : 'N/A'}</td>
        </tr>`
    ).join('');
    
    return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Emergency Alert Evidence - ${alertEvent._id}</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; background: #f5f5f5; }
        .container { max-width: 800px; margin: 0 auto; background: white; padding: 20px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
        .header { background: #dc3545; color: white; padding: 15px; border-radius: 5px; margin-bottom: 20px; }
        .section { margin-bottom: 20px; padding: 15px; border: 1px solid #ddd; border-radius: 5px; }
        .section h3 { margin-top: 0; color: #333; }
        .status { padding: 4px 8px; border-radius: 4px; font-size: 12px; font-weight: bold; }
        .status.sent { background: #ffc107; color: #000; }
        .status.delivered { background: #28a745; color: white; }
        .status.failed { background: #dc3545; color: white; }
        .status.pending { background: #6c757d; color: white; }
        table { width: 100%; border-collapse: collapse; margin-top: 10px; }
        th, td { padding: 8px; text-align: left; border-bottom: 1px solid #ddd; }
        th { background: #f8f9fa; font-weight: bold; }
        .audio-files { list-style: none; padding: 0; }
        .audio-files li { margin: 5px 0; }
        .audio-files a { color: #007bff; text-decoration: none; }
        .audio-files a:hover { text-decoration: underline; }
        .timestamp { color: #6c757d; font-size: 14px; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🚨 Emergency Alert Evidence</h1>
            <p>Alert ID: ${alertEvent._id}</p>
        </div>
        
        <div class="section">
            <h3>Alert Details</h3>
            <p><strong>Type:</strong> ${alertEvent.type}</p>
            <p><strong>Confidence:</strong> ${(alertEvent.confidence * 100).toFixed(1)}%</p>
            <p><strong>Trigger:</strong> ${alertEvent.trigger.source} - ${alertEvent.trigger.model}</p>
            <p><strong>Time:</strong> <span class="timestamp">${new Date(alertEvent.occurredAt).toLocaleString()}</span></p>
            ${alertEvent.location ? `<p><strong>Location:</strong> ${alertEvent.location.lat.toFixed(4)}, ${alertEvent.location.lng.toFixed(4)}</p>` : ''}
            ${alertEvent.notes ? `<p><strong>Notes:</strong> ${alertEvent.notes}</p>` : ''}
        </div>
        
        ${audioFiles.length > 0 ? `
        <div class="section">
            <h3>Audio Evidence</h3>
            <ul class="audio-files">
                ${audioFileLinks}
            </ul>
        </div>
        ` : ''}
        
        ${recipients.length > 0 ? `
        <div class="section">
            <h3>Notification Status</h3>
            <table>
                <thead>
                    <tr>
                        <th>Contact</th>
                        <th>Phone</th>
                        <th>Status</th>
                        <th>Delivered At</th>
                    </tr>
                </thead>
                <tbody>
                    ${recipientRows}
                </tbody>
            </table>
        </div>
        ` : ''}
        
        <div class="section">
            <h3>Actions Taken</h3>
            <p><strong>SMS Sent:</strong> ${alertEvent.actions.smsSent ? 'Yes' : 'No'}</p>
            <p><strong>Siren:</strong> ${alertEvent.actions.siren ? 'Yes' : 'No'}</p>
            <p><strong>Flash:</strong> ${alertEvent.actions.flash ? 'Yes' : 'No'}</p>
        </div>
        
        <div class="section">
            <p><em>This evidence page was generated automatically by the SHEield safety system.</em></p>
            <p><em>Generated at: ${new Date().toLocaleString()}</em></p>
        </div>
    </div>
</body>
</html>`;
}
